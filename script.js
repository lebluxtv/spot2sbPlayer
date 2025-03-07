/************************************************************
 * script.js
 * Gère la connexion WebSocket, la logique de pause/lecture,
 * la barre de progression, ET la colorimétrie via ColorThief
 * + variations (barre plus sombre, titre/artiste plus clair)
 * + utilisation HSL pour éviter le blanc (saturation min, L max).
 *
 * Nouveauté : on distingue "nouvelle piste" vs "même piste".
 ************************************************************/

let currentInterval = null;
let timeLeft = 0;         // secondes restantes pour la chanson
let trackDuration = 180;  // durée totale (défaut)
let isPaused = false;

// Récupération des paramètres d'URL (width, barColor)
const urlParams = new URLSearchParams(window.location.search);
const customWidth = urlParams.get('width');
const customBarColor = urlParams.get('barColor');

// Ajuste la largeur si demandée
if (customWidth) {
  document.querySelector('.player').style.width = customWidth + 'px';
}

// Création du client WebSocket
const client = new StreamerbotClient({
  host: '127.0.0.1',
  port: 8080,
  endpoint: '/',
  password: 'streamer.bot'
});

// Mémorise le dernier titre affiché, pour détecter un changement de piste
let lastSongName = "";

/************************************************************
 * 1) Réception des messages "General.Custom"
 ************************************************************/
client.on('General.Custom', ({ event, data }) => {
  if (data?.widget !== 'spot2sbPlayer') return; // Filtre
  console.log("Nouveau message spot2sbPlayer reçu:", data);

  // Cas 1 : Pause / Lecture
  if (data.state === 'paused') {
    pauseProgressBar();
    return;
  }
  else if (data.state === 'playing') {
    resumeProgressBar();
    return;
  }

  // Cas 2 : Nouvelle info de piste
  if (data.songName) {
    const songName    = data.songName;
    const artistName  = data.artistName;
    const albumArtUrl = data.albumArtUrl || "";
    const durationSec = data.duration   || 180;
    const progressSec = data.progress   || 0;   // en secondes

    // Vérifie si on a changé de piste
    if (songName !== lastSongName) {
      // -> NOUVELLE PISTE
      lastSongName = songName;

      // Lance la fonction complète
      loadNewTrack(songName, artistName, albumArtUrl, durationSec, progressSec);
    } else {
      // -> MÊME PISTE
      // On ne relance pas tout, on se contente de recadrer la progression
      syncProgress(progressSec);
    }
  }
});

/************************************************************
 * 2) loadNewTrack(...)
 *    - Nouvelle chanson -> on (ré)initialise images, couleurs, timer
 ************************************************************/
function loadNewTrack(songName, artistName, albumArtUrl, durationSec, progressSec) {
  // Sélections
  const bgBlur        = document.getElementById("bg-blur");
  const coverArt      = document.getElementById("cover-art");
  const trackNameEl   = document.getElementById("track-name");
  const artistNameEl  = document.getElementById("artist-name");
  const timeBarFill   = document.getElementById("time-bar-fill");
  const timeRemaining = document.getElementById("time-remaining");

  // Mise à jour du fond, pochette, texte
  bgBlur.style.backgroundImage = `url('${albumArtUrl}')`;
  coverArt.style.backgroundImage = `url('${albumArtUrl}')`;
  trackNameEl.textContent = songName;
  artistNameEl.textContent = artistName;

  // Durée & position initiale
  trackDuration = durationSec;
  // Ex: si progressSec=42, alors il reste (durationSec - 42)
  timeLeft = Math.max(0, trackDuration - progressSec);

  // Affiche le temps restant
  timeRemaining.textContent = formatTime(timeLeft);

  // Barre de progression (on calcule le pourcentage de temps déjà passé)
  const percentPassed = (progressSec / durationSec) * 100;
  // La barre, nous l’affichons à "100 - percentPassed"
  const percentRemaining = 100 - percentPassed;
  timeBarFill.style.width = percentRemaining + "%";

  // Stop l'ancien interval s'il existait
  if (currentInterval) {
    clearInterval(currentInterval);
    currentInterval = null;
  }

  // Couleur de la barre
  if (customBarColor) {
    timeBarFill.style.backgroundColor = '#' + customBarColor;
  } else {
    // ColorThief
    const colorThief = new ColorThief();
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = albumArtUrl;

    img.onload = function() {
      let [r, g, b] = colorThief.getColor(img);

      // "vibrant"
      [r, g, b] = makeVibrant(r, g, b, 0.5, 0.8);

      // Variation
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

  // Lance l'interval de décrémentation
  isPaused = false;
  currentInterval = setInterval(() => {
    if (!isPaused) {
      timeLeft--;
      if (timeLeft < 0) timeLeft = 0;

      timeRemaining.textContent = formatTime(timeLeft);
      const percent = (timeLeft / durationSec) * 100;
      timeBarFill.style.width = percent + "%";

      if (timeLeft <= 0) {
        clearInterval(currentInterval);
        currentInterval = null;
      }
    }
  }, 1000);
}

/************************************************************
 * 3) syncProgress(progressSec)
 *    - Même chanson -> on ajuste juste la progression
 *    - Sans relancer tout le loadNewTrack
 ************************************************************/
function syncProgress(progressSec) {
  // On recalcule timeLeft = (durée - progressSec)
  let newTimeLeft = Math.max(0, trackDuration - progressSec);

  // Si la différence est trop grande (ex: on a sauté 1min), 
  // on "synchronise" en direct.
  // Sinon, on peut ignorer si la différence est < 1s 
  // (au choix selon votre besoin).
  const diff = Math.abs(newTimeLeft - timeLeft);
  if (diff > 1) {
    timeLeft = newTimeLeft;
    console.log(`syncProgress -> timeLeft recalé à ${timeLeft}s`);

    // On met à jour la barre
    const timeBarFill = document.getElementById("time-bar-fill");
    const timeRemaining = document.getElementById("time-remaining");

    timeRemaining.textContent = formatTime(timeLeft);
    const percent = (timeLeft / trackDuration) * 100;
    timeBarFill.style.width = percent + "%";
  }
}

/************************************************************
 * 4) Pause / Reprise
 ************************************************************/
function pauseProgressBar() {
  isPaused = true;
}
function resumeProgressBar() {
  isPaused = false;
}

/************************************************************
 * 5) Fonctions utilitaires
 ************************************************************/
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0" + s : s}`;
}

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

function rgbString([r, g, b]) {
  return `rgb(${r}, ${g}, ${b})`;
}

function makeVibrant(r, g, b, minSat, maxLight) {
  let [h, s, l] = rgbToHsl(r, g, b);

  if (s < minSat) s = minSat;
  if (l > maxLight) l = maxLight;

  return hslToRgb(h, s, l);
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  let l = (max + min) / 2;

  if (max === min) {
    h = 0; s = 0;
  } else {
    const diff = max - min;
    s = (l > 0.5) ? diff / (2 - max - min) : diff / (max + min);
    switch (max) {
      case r: h = (g - b) / diff + (g < b ? 6 : 0); break;
      case g: h = (b - r) / diff + 2; break;
      case b: h = (r - g) / diff + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) {
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
