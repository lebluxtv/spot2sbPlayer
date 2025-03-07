/************************************************************
 * script.js
 * Gère la connexion WebSocket, la logique de pause/lecture,
 * la barre de progression, ET la colorimétrie via ColorThief
 * + variations (barre plus sombre, titre/artiste plus clair).
 ************************************************************/

let currentInterval = null;
let timeLeft = 0;
let isPaused = false;
let trackDuration = 180;

// 1) Récupération des paramètres d'URL
const urlParams = new URLSearchParams(window.location.search);
const customWidth = urlParams.get('width');
const customBarColor = urlParams.get('barColor');

// 2) Appliquer la largeur personnalisée
if (customWidth) {
  document.querySelector('.player').style.width = customWidth + 'px';
}

// WebSocket
const client = new StreamerbotClient({
  host: '127.0.0.1',
  port: 8080,
  endpoint: '/',
  password: 'streamer.bot'
});

client.on('General.Custom', ({ event, data }) => {
  if (data?.widget !== 'spot2sbPlayer') return;
  console.log("Nouveau message spot2sbPlayer reçu:", data);

  if (data.state === 'paused') {
    pauseProgressBar();
    return;
  } else if (data.state === 'playing') {
    resumeProgressBar();
    return;
  }

  if (data.songName) {
    const { songName, artistName, albumArtUrl, duration } = data;
    trackDuration = duration || 180;
    loadNewTrack(songName, artistName, albumArtUrl, trackDuration);
  }
});

/************************************************************
 * loadNewTrack
 * - Met à jour la pochette, le fond flou
 * - Barre + texte => variations de couleur via adjustColor()
 ************************************************************/
function loadNewTrack(songName, artistName, albumArtUrl, durationSec) {
  const bgBlur        = document.getElementById("bg-blur");
  const coverArt      = document.getElementById("cover-art");
  const trackNameEl   = document.getElementById("track-name");
  const artistNameEl  = document.getElementById("artist-name");
  const timeBarFill   = document.getElementById("time-bar-fill");
  const timeRemaining = document.getElementById("time-remaining");

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

  // Si param "barColor", on l'utilise directement
  if (customBarColor) {
    timeBarFill.style.backgroundColor = '#' + customBarColor;
  } else {
    // Sinon, on utilise ColorThief
    const colorThief = new ColorThief();
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = albumArtUrl;

    img.onload = function() {
      const [r, g, b] = colorThief.getColor(img);

      // Barre: plus sombre
      const barColor = adjustColor(r, g, b, 0.8);
      // Titre: beaucoup plus clair
      const titleColor = adjustColor(r, g, b, 16.4);
      // Artiste & timer: un peu plus clair
      const artistColor = adjustColor(r, g, b, 15.2);
      const timerColor  = adjustColor(r, g, b, 15.2);

      timeBarFill.style.backgroundColor = rgbString(barColor);
      trackNameEl.style.color   = rgbString(titleColor);
      artistNameEl.style.color  = rgbString(artistColor);
      timeRemaining.style.color = rgbString(timerColor);
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
 * formatTime
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
