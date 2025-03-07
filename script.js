/************************************************************
 * script.js
 * Gère la connexion WebSocket, la logique de pause/lecture,
 * la barre de progression, ET la colorimétrie via ColorThief
 * + variations (barre plus sombre, titre/artiste plus clair)
 * + utilisation HSL pour éviter le blanc (saturation min, L max).
 * 
 * Maintenant, on gère aussi un champ "progress" (en secondes)
 * pour afficher la barre au bon endroit si l'utilisateur 
 * avance/recul dans la musique.
 ************************************************************/

let currentInterval = null;
let timeLeft = 0;
let isPaused = false;

// Valeur par défaut (en secondes) si data.duration est absent
let trackDuration = 180;

// 1) Récupération des paramètres d'URL
const urlParams = new URLSearchParams(window.location.search);
const customWidth = urlParams.get('width');
const customBarColor = urlParams.get('barColor');

// 2) Appliquer la largeur personnalisée si demandée
if (customWidth) {
  const playerElement = document.querySelector('.player');
  playerElement.style.width = customWidth + 'px';
}

// Création du client WebSocket (via streamerbot-client)
const client = new StreamerbotClient({
  host: '127.0.0.1',
  port: 8080,
  endpoint: '/',
  password: 'streamer.bot'
});

// Pour éviter de recharger 2 fois la même chanson
let lastSongName = "";

// Écoute unique de l'événement "General.Custom"
client.on('General.Custom', ({ event, data }) => {
  // Filtre sur widget
  if (data?.widget !== 'spot2sbPlayer') return;
  console.log("Nouveau message spot2sbPlayer reçu:", data);

  // 1) Gestion pause / play
  if (data.state === 'paused') {
    pauseProgressBar();
    return;
  } 
  else if (data.state === 'playing') {
    resumeProgressBar();
    return;
  }

  // 2) Gestion nouvelle piste
  if (data.songName) {
    // Vérification anti-doublon
    // (si on ne veut recharger la couleur que si le titre change)
    // => Vous pouvez adapter selon votre besoin.
    if (data.songName === lastSongName) {
      // Si la chanson est la même mais que "progress" a changé,
      // on pourrait faire un "update partiel". 
      // Ici on recharge tout de façon simple :
      console.log("Même titre détecté, on recharge la barre si le progress diffère...");
    }
    lastSongName = data.songName;

    // Récupération des champs
    const songName    = data.songName;
    const artistName  = data.artistName;
    const albumArtUrl = data.albumArtUrl || "";
    // Durée totale (secondes)
    trackDuration     = data.duration || 180; 
    // Progression actuelle (secondes)
    const progressSec = data.progress ? parseInt(data.progress, 10) : 0;
    // Sécurité : si progressSec dépasse la durée, on limite à la durée
    const initialTimeLeft = Math.max(0, trackDuration - progressSec);

    // On charge la piste en précisant le temps restant
    loadNewTrack(songName, artistName, albumArtUrl, trackDuration, initialTimeLeft);
  }
});

/************************************************************
 * loadNewTrack
 * - Met à jour la pochette, le fond flou
 * - Gère la barre de progression (partant de "initialTimeLeft")
 * - Gère la colorimétrie (barColor param ou ColorThief)
 ************************************************************/
function loadNewTrack(songName, artistName, albumArtUrl, durationSec, initialTimeLeft) {
  const bgBlur        = document.getElementById("bg-blur");
  const coverArt      = document.getElementById("cover-art");
  const trackNameEl   = document.getElementById("track-name");
  const artistNameEl  = document.getElementById("artist-name");
  const timeBarFill   = document.getElementById("time-bar-fill");
  const timeRemaining = document.getElementById("time-remaining");

  // Mise à jour de base (fond flou, pochette, textes)
  bgBlur.style.backgroundImage = `url('${albumArtUrl}')`;
  coverArt.style.backgroundImage = `url('${albumArtUrl}')`;
  trackNameEl.textContent = songName;
  artistNameEl.textContent = artistName;

  // Barre pleine au départ
  timeBarFill.style.width = "100%";

  // On stocke la durée et le temps restant
  trackDuration = durationSec;
  timeLeft      = initialTimeLeft;
  timeRemaining.textContent = formatTime(timeLeft);

  // Stop l'ancien interval s'il existait
  if (currentInterval) {
    clearInterval(currentInterval);
    currentInterval = null;
  }

  // Si param "barColor" => on l’utilise directement
  if (customBarColor) {
    timeBarFill.style.backgroundColor = '#' + customBarColor;
  } else {
    // Sinon, on utilise ColorThief pour calculer la couleur dominante
    const colorThief = new ColorThief();
    const img = new Image();
    img.crossOrigin = "anonymous"; // nécessaire si l'image autorise CORS
    img.src = albumArtUrl;

    img.onload = function() {
      // Couleur dominante brute
      let [r, g, b] = colorThief.getColor(img);

      // 1) On la rend "vibrante" => impose minSat=0.5, maxLight=0.8
      [r, g, b] = makeVibrant(r, g, b, 0.5, 0.8);

      // 2) On crée des variations en RGB
      //   Barre plus sombre => factor < 1
      const barColorArr    = adjustColor(r, g, b, 0.8);
      //   Titre plus clair => factor > 1
      const titleColorArr  = adjustColor(r, g, b, 1.4);
      //   Artiste & Timer un peu plus clairs
      const artistColorArr = adjustColor(r, g, b, 1.2);
      const timerColorArr  = adjustColor(r, g, b, 1.2);

      timeBarFill.style.backgroundColor = rgbString(barColorArr);
      trackNameEl.style.color          = rgbString(titleColorArr);
      artistNameEl.style.color         = rgbString(artistColorArr);
      timeRemaining.style.color        = rgbString(timerColorArr);
    };
  }

  // Relance la progression (1s interval)
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
      const percent = (timeLeft / durationSec) * 100;
      timeBarFill.style.width = percent + "%";
    }
  }, 1000);
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
  return `${m}:${s < 10 ? "0" + s : s}`;
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
