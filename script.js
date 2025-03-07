/************************************************************
 * script.js
 * Gère la connexion WebSocket, la logique de pause/lecture,
 * la barre de progression, ET la colorimétrie via ColorThief
 * + variations (barre plus sombre, titre/artiste plus clair)
 * + utilisation HSL pour éviter le blanc (saturation min, L max).
 ************************************************************/

let currentInterval = null;
let timeLeft = 0;
let isPaused = false;
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

/**
 * Écoute de l'événement "General.Custom"
 * -> Si widget = "spot2sbPlayer", on traite le message
 */
client.on('General.Custom', ({ event, data }) => {
  if (data?.widget !== 'spot2sbPlayer') return;
  console.log("Nouveau message spot2sbPlayer reçu:", data);

  // 1) Etat lecture/pause
  if (data.state === 'paused') {
    pauseProgressBar();
    return;
  } else if (data.state === 'playing') {
    resumeProgressBar();
    return;
  }

  // 2) Nouvelle piste
  if (data.songName) {
    const { songName, artistName, albumArtUrl, duration } = data;
    trackDuration = duration || 180;
    loadNewTrack(songName, artistName, albumArtUrl, trackDuration);
  }
});

/************************************************************
 * loadNewTrack
 * - Met à jour la pochette, le fond flou
 * - Barre + texte => variations de couleur
 *   (barre plus sombre, titre/artiste/timer plus clairs)
 ************************************************************/
function loadNewTrack(songName, artistName, albumArtUrl, durationSec) {
  const bgBlur        = document.getElementById("bg-blur");
  const coverArt      = document.getElementById("cover-art");
  const trackNameEl   = document.getElementById("track-name");
  const artistNameEl  = document.getElementById("artist-name");
  const timeBarFill   = document.getElementById("time-bar-fill");
  const timeRemaining = document.getElementById("time-remaining");

  // Mise à jour de base
  bgBlur.style.backgroundImage = `url('${albumArtUrl}')`;
  coverArt.style.backgroundImage = `url('${albumArtUrl}')`;
  trackNameEl.textContent = songName;
  artistNameEl.textContent = artistName;
  timeBarFill.style.width = "100%";

  timeLeft = durationSec;
  timeRemaining.textContent = formatTime(timeLeft);

  // Stop l'ancien interval
  if (currentInterval) {
    clearInterval(currentInterval);
    currentInterval = null;
  }

  // Si param "barColor" => on l'utilise
  if (customBarColor) {
    timeBarFill.style.backgroundColor = '#' + customBarColor;
  } else {
    // Sinon, ColorThief + transformations
    const colorThief = new ColorThief();
    const img = new Image();
    img.crossOrigin = "anonymous"; // nécessaire si l'image autorise CORS
    img.src = albumArtUrl;

    img.onload = function() {
      // Couleur dominante brute
      let [r, g, b] = colorThief.getColor(img);

      // 1) On la rend "vibrante" => impose min saturation, max luminosité
      [r, g, b] = makeVibrant(r, g, b, 0.5, 0.8); 
      // minSat=0.5 => saturation >= 0.5
      // maxLight=0.8 => luminosité <= 0.8 => pas de blanc

      // 2) On crée des variations en RGB
      //   Barre plus sombre => factor < 1
      const barColorArr    = adjustColor(r, g, b, 0.8);
      //   Titre beaucoup plus clair => factor > 1
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
 * formatTime(sec)
 * -> "mm:ss"
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

  // Reconversion
  return hslToRgb(h, s, l);
}

/************************************************************
 * rgbToHsl(r, g, b)
 * -> renvoie [h, s, l] (h, s, l ∈ [0..1])
 ************************************************************/
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

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

  const q = (l < 0.5) ? (l * (1 + s)) : (l + s - l * s);
  const p = 2 * l - q;

  const r = hue2rgb(p, q, h + 1/3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1/3);

  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255)
  ];
}
