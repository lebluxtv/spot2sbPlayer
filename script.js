/************************************************************
 * script.js
 * Gère la connexion WebSocket, la logique de pause/lecture,
 * la barre de progression, ET la colorimétrie via ColorThief,
 * sans réinitialiser la barre si la chanson ne change pas.
 * On tient compte de data.state pour figer la barre en pause.
 ************************************************************/

let currentInterval = null; // pour le setInterval
let timeLeft = 0;           // temps restant local (en secondes)
let trackDuration = 180;    // durée totale (par défaut)
let isPaused = false;

// Paramètres d'URL (ex. ?width=700&barColor=ff0000)
const urlParams = new URLSearchParams(window.location.search);
const customWidth    = urlParams.get('width');
const customBarColor = urlParams.get('barColor');

// Ajuste la largeur si demandée
if (customWidth) {
  document.querySelector('.player').style.width = customWidth + 'px';
}

// Création du client WebSocket (via streamerbot-client)
const client = new StreamerbotClient({
  host: '127.0.0.1',
  port: 8080,
  endpoint: '/',
  password: 'streamer.bot'
});

// Variables globales pour éviter de recharger la barre
let lastSongName = "";  // mémorise le titre de la dernière piste gérée

/************************************************************
 * Écoute de "General.Custom"
 ************************************************************/
client.on('General.Custom', ({ event, data }) => {
  // Filtre sur widget
  if (data?.widget !== 'spot2sbPlayer') return;
  console.log("Nouveau message spot2sbPlayer reçu:", data);

  // On récupère l'état => "playing" ou "paused"
  const stateValue = data.state || "paused"; // par défaut, on met "paused"

  // 1) État lecture/pause
  if (stateValue === 'paused') {
    pauseProgressBar();
  } else {
    // stateValue === 'playing'
    resumeProgressBar();
  }

  // 2) Nouvelle info de piste
  if (data.songName) {
    const songName    = data.songName;
    const artistName  = data.artistName;
    const albumArtUrl = data.albumArtUrl || "";
    const durationSec = data.duration   || 180; // durée totale
    const progressSec = data.progress   || 0;   // avancement actuel

    // a) La piste a changé ?
    if (songName !== lastSongName) {
      // => on ré-initialise
      lastSongName = songName;
      loadNewTrack(songName, artistName, albumArtUrl, durationSec, progressSec);
    } else {
      // => même piste, on recadre juste si on a avancé/reculé
      syncProgress(progressSec);
    }
  }
});

/************************************************************
 * loadNewTrack(songName, artistName, albumArtUrl, durationSec, progressSec)
 * -> Pour une NOUVELLE piste : on réinitialise images, couleurs,
 *    timer local, etc. en tenant compte du progress déjà écoulé.
 ************************************************************/
function loadNewTrack(songName, artistName, albumArtUrl, durationSec, progressSec) {
  // Sélections
  const bgBlur        = document.getElementById("bg-blur");
  const coverArt      = document.getElementById("cover-art");
  const trackNameEl   = document.getElementById("track-name");
  const artistNameEl  = document.getElementById("artist-name");
  const timeBarFill   = document.getElementById("time-bar-fill");
  const timeRemaining = document.getElementById("time-remaining");

  // MàJ du fond, pochette, textes
  bgBlur.style.backgroundImage   = `url('${albumArtUrl}')`;
  coverArt.style.backgroundImage = `url('${albumArtUrl}')`;
  trackNameEl.textContent        = songName;
  artistNameEl.textContent       = artistName;

  // Calcule la durée et le temps restant
  trackDuration = durationSec;
  timeLeft      = Math.max(0, durationSec - progressSec);
  // Ex: si la chanson dure 180s et on est déjà à 42s, timeLeft=138

  // Mise à jour de l'affichage
  timeRemaining.textContent = formatTime(timeLeft);
  const percent = (timeLeft / durationSec) * 100;
  timeBarFill.style.width = percent + "%";

  // Stop l'ancien interval
  if (currentInterval) {
    clearInterval(currentInterval);
    currentInterval = null;
  }

  // Couleur de la barre (barColor param ou ColorThief)
  if (customBarColor) {
    timeBarFill.style.backgroundColor = '#' + customBarColor;
  } else {
    const colorThief = new ColorThief();
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = albumArtUrl;

    img.onload = function() {
      let [r, g, b] = colorThief.getColor(img);

      // Rendez la couleur plus "vibrante"
      [r, g, b] = makeVibrant(r, g, b, 0.5, 0.8);

      // Variations
      const barColorArr    = adjustColor(r, g, b, 0.8);
      const titleColorArr  = adjustColor(r, g, b, 1.4);
      const artistColorArr = adjustColor(r, g, b, 1.2);
      const timerColorArr  = adjustColor(r, g, b, 1.2);

      timeBarFill.style.backgroundColor = rgbString(barColorArr);
      trackNameEl.style.color          = rgbString(titleColorArr);
      artistNameEl.style.color         = rgbString(artistColorArr);
      timeRemaining.style.color        = rgbString(timerColorArr);
    };
  }

  // Relance la progression
  isPaused = false;
  currentInterval = setInterval(() => {
    if (!isPaused) {
      timeLeft--;
      if (timeLeft <= 0) {
        timeLeft = 0;
        clearInterval(currentInterval);
        currentInterval = null;
      }
      timeRemaining.textContent = formatTime(timeLeft);
      const pct = (timeLeft / durationSec) * 100;
      timeBarFill.style.width = pct + "%";
    }
  }, 1000);
}

/************************************************************
 * syncProgress(progressSec)
 * -> La chanson n'a pas changé, mais on a reçu un nouveau progress
 *    (l'utilisateur a avancé/reculé dans la musique). On recadre
 *    la barre et le timer sans tout ré-initialiser.
 ************************************************************/
function syncProgress(progressSec) {
  // Si la chanson dure trackDuration=180 et progress=60, alors timeLeft=120
  const newTimeLeft = Math.max(0, trackDuration - progressSec);

  const diff = Math.abs(newTimeLeft - timeLeft);
  // S'il y a un gros écart, on recadre brutalement
  if (diff > 2) {
    timeLeft = newTimeLeft;
    document.getElementById("time-remaining").textContent = formatTime(timeLeft);
    const pct = (timeLeft / trackDuration) * 100;
    document.getElementById("time-bar-fill").style.width = pct + "%";
  }
}

/************************************************************
 * Pause / Reprise
 ************************************************************/
function pauseProgressBar() {
  isPaused = true;
}
function resumeProgressBar() {
  isPaused = false;
}

/************************************************************
 * formatTime(sec) -> "mm:ss"
 ************************************************************/
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0"+s : s}`;
}

/************************************************************
 * adjustColor(r, g, b, factor)
 * factor > 1 => éclaircit, factor < 1 => assombrit
 ************************************************************/
function adjustColor(r, g, b, factor) {
  const nr = Math.round(r * factor);
  const ng = Math.round(g * factor);
  const nb = Math.round(b * factor);
  return [
    Math.min(255, Math.max(0, nr)),
    Math.min(255, Math.max(0, ng)),
    Math.min(255, Math.max(0, nb))
  ];
}

/************************************************************
 * rgbString([r, g, b])
 ************************************************************/
function rgbString([r, g, b]) {
  return `rgb(${r}, ${g}, ${b})`;
}

/************************************************************
 * makeVibrant(r, g, b, minSat, maxLight)
 * -> Convertit en HSL, force S >= minSat, L <= maxLight
 * -> Retourne [R, G, B] "vibrants" (évite le blanc)
 ************************************************************/
function makeVibrant(r, g, b, minSat, maxLight) {
  let [h, s, l] = rgbToHsl(r, g, b);

  // Forcer min de saturation
  if (s < minSat) {
    s = minSat;
  }
  // Limiter la luminosité
  if (l > maxLight) {
    l = maxLight;
  }

  return hslToRgb(h, s, l);
}

/************************************************************
 * rgbToHsl(r, g, b)
 * -> renvoie [h, s, l] ∈ [0..1]
 ************************************************************/
function rgbToHsl(r, g, b) {
  r /= 255; 
  g /= 255; 
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  let l = (max + min) / 2;

  if (max === min) {
    // gris neutre
    h = 0;
    s = 0;
  } else {
    const diff = max - min;
    s = (l > 0.5) ? diff / (2 - max - min) : diff / (max + min);

    switch (max) {
      case r:
        h = (g - b) / diff + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / diff + 2;
        break;
      case b:
        h = (r - g) / diff + 4;
        break;
    }
    h /= 6;
  }
  return [h, s, l];
}

/************************************************************
 * hslToRgb(h, s, l)
 * -> renvoie [r, g, b] ∈ [0..255]
 ************************************************************/
function hslToRgb(h, s, l) {
  if (s === 0) {
    // gris neutre
    const val = Math.round(l * 255);
    return [val, val, val];
  }

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  const q = (l < 0.5) ? (l * (1 + s)) : (l + s - l*s);
  const p = 2*l - q;

  const r = hue2rgb(p, q, h + 1/3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1/3);

  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255)
  ];
}
