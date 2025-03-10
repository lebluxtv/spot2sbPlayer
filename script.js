/************************************************************
 * script.js
 * Gère la connexion WebSocket, la logique de pause/lecture,
 * la barre de progression, ET la colorimétrie via ColorThief,
 * sans réinitialiser la barre si la chanson ne change pas.
 * On tient compte de data.state pour figer la barre en pause.
 ************************************************************/

// Interval pour la progression
let currentInterval = null;

// Variables pour la durée, la progression et l'état pause
let timeLeft = 0;           // temps restant local (en secondes)
let trackDuration = 180;    // durée totale (par défaut)
let isPaused = false;

// Récupération des paramètres d'URL (ex: ?width=700&barColor=ff0000)
const urlParams = new URLSearchParams(window.location.search);
const customWidth    = urlParams.get('width');
const customBarColor = urlParams.get('barColor');

// Ajuste la largeur si demandée
if (customWidth) {
  document.querySelector('.player').style.width = customWidth + 'px';
}

// Création du client WebSocket (via streamerbot-client)
const client = new StreamerbotClient({
  host: '127.0.0.1',  // à adapter selon votre config
  port: 8080,
  endpoint: '/',
  password: 'streamer.bot'
});

// Pour éviter de recharger la barre si c'est le même titre
let lastSongName = "";

/************************************************************
 * Écoute de "General.Custom"
 ************************************************************/
client.on('General.Custom', ({ event, data }) => {
  // Filtre sur widget
  if (data?.widget !== 'spot2sbPlayer') return;
  console.log("Nouveau message spot2sbPlayer reçu:", data);

  // (0) Si noSong = true => on masque la div .player et on s'arrête
  if (data.noSong === true) {
    document.querySelector('.player').style.display = 'none';
    return;
  } else {
    // Sinon, on l'affiche
    document.querySelector('.player').style.display = 'block';
  }

  // (1) État lecture/pause (ex. data.state = "playing" ou "paused")
  const stateValue = data.state || "paused"; 
  if (stateValue === 'paused') {
    pauseProgressBar();
  } else {
    // stateValue === "playing"
    resumeProgressBar();
  }

  // (2) Nouvelle info de piste
  //     (songName, artistName, albumArtUrl, duration, progress)
  if (data.songName) {
    const songName    = data.songName;
    const artistName  = data.artistName;
    const albumArtUrl = data.albumArtUrl || "";
    const durationSec = data.duration   || 180; 
    const progressSec = data.progress   || 0;

    // a) La piste a changé ?
    if (songName !== lastSongName) {
      lastSongName = songName;
      loadNewTrack(songName, artistName, albumArtUrl, durationSec, progressSec);
    } else {
      // Même piste => recadrer la progression si besoin
      syncProgress(progressSec);
    }
  }
});

/************************************************************
 * loadNewTrack
 * - Met à jour la pochette, le fond flou
 * - Gère la barre de progression (avec progress déjà écoulé)
 * - Gère la colorimétrie (barColor param ou ColorThief)
 ************************************************************/
function loadNewTrack(songName, artistName, albumArtUrl, durationSec, progressSec) {
  // Sélections DOM
  const bgBlur        = document.getElementById("bg-blur");
  const coverArt      = document.getElementById("cover-art");
  const trackNameEl   = document.getElementById("track-name");
  const artistNameEl  = document.getElementById("artist-name");
  const timeBarFill   = document.getElementById("time-bar-fill");
  const timeRemaining = document.getElementById("time-remaining");

  // Fond flou + pochette
  bgBlur.style.backgroundImage   = `url('${albumArtUrl}')`;
  coverArt.style.backgroundImage = `url('${albumArtUrl}')`;
  trackNameEl.textContent        = songName;
  artistNameEl.textContent       = artistName;

  // Calcul durée et temps restant
  trackDuration = durationSec;
  timeLeft      = Math.max(0, durationSec - progressSec);

  // Mise à jour du timer et de la barre
  timeRemaining.textContent = formatTime(timeLeft);
  const percent = (timeLeft / durationSec) * 100;
  timeBarFill.style.width = percent + "%";

  // Stop l'ancien interval
  if (currentInterval) {
    clearInterval(currentInterval);
    currentInterval = null;
  }

  // Couleur de la barre
  if (customBarColor) {
    // Si on a un paramètre barColor, on l'applique directement
    timeBarFill.style.backgroundColor = '#' + customBarColor;
  } else {
    // Sinon, on utilise ColorThief pour calculer une couleur dominante
    const colorThief = new ColorThief();
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = albumArtUrl;

    img.onload = function() {
      let [r, g, b] = colorThief.getColor(img);

      // On la rend plus "vibrante" => impose min saturation, max luminosité
      [r, g, b] = makeVibrant(r, g, b, 0.5, 0.8);

      // On crée quelques variations
      const barColorArr    = adjustColor(r, g, b, 0.8);  // barre
      const titleColorArr  = adjustColor(r, g, b, 1.4);  // titre
      const artistColorArr = adjustColor(r, g, b, 1.2);  // artiste
      const timerColorArr  = adjustColor(r, g, b, 1.2);  // timer

      timeBarFill.style.backgroundColor = rgbString(barColorArr);
      trackNameEl.style.color          = rgbString(titleColorArr);
      artistNameEl.style.color         = rgbString(artistColorArr);
      timeRemaining.style.color        = rgbString(timerColorArr);
    };
  }

  // Lancement de l'interval pour décrémenter timeLeft
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
 * -> La piste est la même, mais la progress a changé
 ************************************************************/
function syncProgress(progressSec) {
  const newTimeLeft = Math.max(0, trackDuration - progressSec);
  const diff = Math.abs(newTimeLeft - timeLeft);

  // Si la différence est > 2s, on recadre
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
 * formatTime
 * -> Convertit un nombre de secondes en "mm:ss"
 ************************************************************/
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0"+s : s}`;
}

/************************************************************
 * adjustColor(r, g, b, factor)
 * -> factor > 1 => éclaircit, factor < 1 => assombrit
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
 * rgbString
 ************************************************************/
function rgbString([r, g, b]) {
  return `rgb(${r}, ${g}, ${b})`;
}

/************************************************************
 * makeVibrant(r, g, b, minSat, maxLight)
 * -> Convertit en HSL, force S >= minSat, L <= maxLight
 ************************************************************/
function makeVibrant(r, g, b, minSat, maxLight) {
  let [h, s, l] = rgbToHsl(r, g, b);

  if (s < minSat) s = minSat;
  if (l > maxLight) l = maxLight;

  return hslToRgb(h, s, l);
}

/************************************************************
 * rgbToHsl
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
    s = (l > 0.5)
      ? diff / (2 - max - min)
      : diff / (max + min);

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
 * hslToRgb
 ************************************************************/
function hslToRgb(h, s, l) {
  if (s === 0) {
    // gris
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
