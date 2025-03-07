/************************************************************
 * script.js
 * Gère la connexion WebSocket, la logique de pause/lecture,
 * la barre de progression, ET la colorimétrie via ColorThief
 * avec variations (barre plus sombre, titre/artiste/timer plus clairs).
 ************************************************************/

let currentInterval = null;
let timeLeft = 0;          // Nombre de secondes restantes
let isPaused = false;      // Indique si on est en pause
let trackDuration = 180;   // Valeur par défaut

// 1) Récupération des paramètres dans l'URL
const urlParams = new URLSearchParams(window.location.search);
const customWidth = urlParams.get('width');     // ex. ?width=800
const customBarColor = urlParams.get('barColor'); // ex. &barColor=ff0000

// 2) Appliquer la largeur personnalisée (si présente)
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
 */
client.on('General.Custom', ({ event, data }) => {
  if (data?.widget !== 'spot2sbPlayer') return;

  console.log("Nouveau message spot2sbPlayer reçu:", data);

  // 1) Si on reçoit un message "state" (lecture/pause)
  if (data.state === 'paused') {
    console.log("Player: paused");
    pauseProgressBar(); 
    return;
  }
  else if (data.state === 'playing') {
    console.log("Player: playing");
    resumeProgressBar();
    return;
  }

  // 2) Sinon, c'est un message complet "nouvelle piste"
  if (data.songName) {
    const songName    = data.songName;
    const artistName  = data.artistName;
    const albumArtUrl = data.albumArtUrl || "";
    trackDuration     = data.duration || 180; 
    loadNewTrack(songName, artistName, albumArtUrl, trackDuration);
  }
});

/************************************************************
 * Fonction loadNewTrack
 * - Met à jour la pochette, le fond flou
 * - Gère la barre de progression
 * - Si barColor n'est pas défini, on calcule une couleur via ColorThief
 *   puis on applique des variations (barre plus sombre, textes plus clairs).
 ************************************************************/
function loadNewTrack(songName, artistName, albumArtUrl, durationSec) {
  const bgBlur        = document.getElementById("bg-blur");
  const coverArt      = document.getElementById("cover-art");
  const trackNameEl   = document.getElementById("track-name");
  const artistNameEl  = document.getElementById("artist-name");
  const timeBarFill   = document.getElementById("time-bar-fill");
  const timeRemaining = document.getElementById("time-remaining");

  // Arrière-plan flou
  bgBlur.style.backgroundImage = `url('${albumArtUrl}')`;
  // Pochette
  coverArt.style.backgroundImage = `url('${albumArtUrl}')`;
  // Titres
  trackNameEl.textContent = songName;
  artistNameEl.textContent = artistName;

  // Barre pleine
  timeBarFill.style.width = "100%";

  // On redéfinit le temps restant
  timeLeft = durationSec;
  timeRemaining.textContent = formatTime(timeLeft);

  // On arrête l'ancien interval
  if (currentInterval) {
    clearInterval(currentInterval);
    currentInterval = null;
  }

  // Si on a un paramètre "barColor" => on l'utilise directement
  if (customBarColor) {
    timeBarFill.style.backgroundColor = '#' + customBarColor;
  } else {
    // Sinon, on tente de récupérer la couleur dominante via ColorThief
    // (l'image doit autoriser le cross-origin)
    const colorThief = new ColorThief();
    const img = new Image();
    img.crossOrigin = "anonymous"; 
    img.src = albumArtUrl;

    img.onload = function() {
      // Extraire la couleur dominante => [r, g, b]
      const color = colorThief.getColor(img);
      const [r, g, b] = color;

      // On crée des variations
      // Bar: plus sombre (factor < 1)
      const barColor       = adjustColor(r, g, b, 0.8);
      // Titre: beaucoup plus clair (factor > 1)
      const titleColor     = adjustColor(r, g, b, 1.4);
      // Artiste & timer: un peu plus clair
      const artistColor    = adjustColor(r, g, b, 1.2);
      const timerColor     = adjustColor(r, g, b, 1.2);

      // Applique la couleur
      timeBarFill.style.backgroundColor = rgbString(barColor);

      trackNameEl.style.color   = rgbString(titleColor);
      artistNameEl.style.color  = rgbString(artistColor);
      timeRemaining.style.color = rgbString(timerColor);
    };
  }

  // On relance la progression si on n'est pas en pause
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
 * Gérer la pause
 ************************************************************/
function pauseProgressBar() {
  isPaused = true;
}

/************************************************************
 * Gérer la reprise
 ************************************************************/
function resumeProgressBar() {
  isPaused = false;
}

/************************************************************
 * formatTime
 * Convertit un nombre de secondes en "mm:ss"
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

  // Clamp à [0..255]
  return [
    Math.min(255, Math.max(0, nr)),
    Math.min(255, Math.max(0, ng)),
    Math.min(255, Math.max(0, nb))
  ];
}

/************************************************************
 * rgbString([r, g, b])
 * Renvoie "rgb(r, g, b)"
 ************************************************************/
function rgbString([r, g, b]) {
  return `rgb(${r}, ${g}, ${b})`;
}
