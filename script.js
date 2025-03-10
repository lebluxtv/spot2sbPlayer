/************************************************************
 * script.js
 * Barre de progression : commence à 100% (pleine) et diminue
 * jusqu'à 0%. Titre défilant seulement si trop long.
 ************************************************************/

/** Interval pour la progression **/
let currentInterval = null;

/** Variables pour la durée, la progression écoulée et l'état pause **/
let timeSpent = 0;         // secondes déjà écoulées
let trackDuration = 180;   // durée totale (par défaut)
let isPaused = false;

/** Récupération des paramètres d'URL (ex: ?width=700&barColor=ff0000) **/
const urlParams = new URLSearchParams(window.location.search);
const customWidth    = urlParams.get('width');
const customBarColor = urlParams.get('barColor');

/** Ajuste la largeur si demandée **/
if (customWidth) {
  document.querySelector('.player').style.width = customWidth + 'px';
}

/** Création du client WebSocket (via streamerbot-client) **/
const client = new StreamerbotClient({
  host: '127.0.0.1',  // à adapter
  port: 8080,
  endpoint: '/',
  password: 'streamer.bot'
});

/** Pour éviter de recharger la barre si c'est le même titre **/
let lastSongName = "";

/************************************************************
 * Écoute de "General.Custom"
 ************************************************************/
client.on('General.Custom', ({ event, data }) => {
  // 1) Filtre sur widget
  if (data?.widget !== 'spot2sbPlayer') return;
  console.log("Nouveau message spot2sbPlayer reçu:", data);

  // 2) Si noSong = true => on masque la div .player et on s'arrête
  if (data.noSong === true) {
    document.querySelector('.player').style.display = 'none';
    return;
  } else {
    document.querySelector('.player').style.display = 'block';
  }

  // 3) Gérer état lecture/pause
  const stateValue = data.state || "paused";
  if (stateValue === 'paused') {
    pauseProgressBar();
  } else {
    resumeProgressBar();
  }

  // 4) Nouvelle info de piste
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
 * - Gère la barre de progression (part de 100% -> 0%)
 * - Gère la colorimétrie (barColor param ou ColorThief)
 * - Active le défilement du titre si nécessaire
 ************************************************************/
function loadNewTrack(songName, artistName, albumArtUrl, durationSec, progressSec) {
  // Sélections DOM
  const bgBlur        = document.getElementById("bg-blur");
  const coverArt      = document.getElementById("cover-art");
  const trackNameSpan = document.getElementById("track-name");
  const artistNameEl  = document.getElementById("artist-name");
  const timeBarFill   = document.getElementById("time-bar-fill");
  const timeRemaining = document.getElementById("time-remaining");

  // Mise à jour de base (fond flou, pochette, textes)
  bgBlur.style.backgroundImage   = `url('${albumArtUrl}')`;
  coverArt.style.backgroundImage = `url('${albumArtUrl}')`;

  // Titre
  trackNameSpan.textContent = songName;
  setupTitleScrolling(); // on va voir si on doit animer ou non

  // Artiste
  artistNameEl.textContent = artistName;

  // Stocker la durée, et le temps déjà écoulé
  trackDuration = durationSec;
  timeSpent     = Math.min(progressSec, durationSec);

  // Mise à jour initiale de la barre + timer
  updateBarAndTimer();

  // Stop l'ancien interval s'il existait
  if (currentInterval) {
    clearInterval(currentInterval);
    currentInterval = null;
  }

  // Couleur de la barre
  if (customBarColor) {
    timeBarFill.style.backgroundColor = '#' + customBarColor;
  } else {
    const colorThief = new ColorThief();
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = albumArtUrl;

    img.onload = function() {
      let [r, g, b] = colorThief.getColor(img);

      [r, g, b] = makeVibrant(r, g, b, 0.5, 0.8);

      const barColorArr    = adjustColor(r, g, b, 0.8);
      const titleColorArr  = adjustColor(r, g, b, 1.4);
      const artistColorArr = adjustColor(r, g, b, 1.2);
      const timerColorArr  = adjustColor(r, g, b, 1.2);

      timeBarFill.style.backgroundColor = rgbString(barColorArr);
      trackNameSpan.style.color        = rgbString(titleColorArr);
      artistNameEl.style.color         = rgbString(artistColorArr);
      timeRemaining.style.color        = rgbString(timerColorArr);
    };
  }

  // Lancement de l'interval pour décrémenter la barre (100% -> 0%)
  isPaused = false;
  currentInterval = setInterval(() => {
    if (!isPaused) {
      if (timeSpent < trackDuration) {
        timeSpent++;
        updateBarAndTimer();
      } else {
        // fin de piste
        clearInterval(currentInterval);
        currentInterval = null;
      }
    }
  }, 1000);
}

/************************************************************
 * setupTitleScrolling
 * -> Active ou désactive l'animation marquee si le texte est
 *    plus large que le conteneur.
 ************************************************************/
function setupTitleScrolling() {
  const trackNameContainer = document.querySelector('.track-name');
  const trackNameSpan      = document.getElementById('track-name');

  // On désactive d'abord l'animation
  trackNameSpan.style.animation = 'none';
  trackNameSpan.style.paddingLeft = '0';

  // Petit trick : on force le reflow
  void trackNameSpan.offsetWidth;

  // Mesurer
  const containerWidth = trackNameContainer.offsetWidth;
  const textWidth      = trackNameSpan.scrollWidth;

  if (textWidth > containerWidth) {
    // Si le texte est trop grand, on lance le marquee
    // On peut ajuster la durée en fonction du ratio text/container
    trackNameSpan.style.paddingLeft = containerWidth + 'px';
    trackNameSpan.style.animation = 'marquee 10s linear infinite';
  }
}

/************************************************************
 * syncProgress
 * -> La piste est la même, mais la position a changé
 *    On recadre timeSpent si l'écart est trop grand
 ************************************************************/
function syncProgress(progressSec) {
  const diff = Math.abs(progressSec - timeSpent);
  if (diff > 2) {
    timeSpent = Math.min(progressSec, trackDuration);
    updateBarAndTimer();
  }
}

/************************************************************
 * updateBarAndTimer
 * -> Barre de 100% -> 0% (elle se vide).
 ************************************************************/
function updateBarAndTimer() {
  const timeBarFill   = document.getElementById("time-bar-fill");
  const timeRemaining = document.getElementById("time-remaining");

  // timeSpent = 0 => barre = 100%
  // timeSpent = trackDuration => barre = 0%
  const pct = 100 - (timeSpent / trackDuration * 100);
  timeBarFill.style.width = pct + "%";

  // Timer: on affiche "le temps restant"
  const timeLeft = trackDuration - timeSpent;
  timeRemaining.textContent = formatTime(timeLeft);
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
 * -> Convertit [r, g, b] en "rgb(r, g, b)"
 ************************************************************/
function rgbString([r, g, b]) {
  return `rgb(${r}, ${g}, ${b})`;
}

/************************************************************
 * makeVibrant(r, g, b, minSat, maxLight)
 * -> Convertit en HSL, force S >= minSat, L <= maxLight,
 *    puis reconvertit en RGB
 ************************************************************/
function makeVibrant(r, g, b, minSat, maxLight) {
  let [h, s, l] = rgbToHsl(r, g, b);

  if (s < minSat) s = minSat;
  if (l > maxLight) l = maxLight;

  return hslToRgb(h, s, l);
}

/************************************************************
 * rgbToHsl(r, g, b)
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
 * hslToRgb(h, s, l)
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
