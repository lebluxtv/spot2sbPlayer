/************************************************************
 * script.js
 * Gère la connexion WebSocket, la logique de pause/lecture,
 * la barre de progression (100% -> 0%), la colorimétrie,
 * le titre défilant conditionnel, et les animations "slide in".
 *
 * Ajout : 
 *  - Si ?album=disc => pochette ronde et rotation "vinyle".
 *  - Si ?opacity=50 => background blur a 0.5 d’opacité (par ex).
 ************************************************************/

/** Interval pour la progression **/
let currentInterval = null;

/** Variables pour la durée, la progression écoulée et l'état pause **/
let timeSpent = 0;         // secondes déjà écoulées
let trackDuration = 180;   // durée totale (par défaut)
let isPaused = false;

/**
 * Récupération des paramètres d'URL
 * ex: ?width=700&barColor=ff0000&album=disc&opacity=50
 */
const urlParams = new URLSearchParams(window.location.search);
const customWidth    = urlParams.get('width');
const customBarColor = urlParams.get('barColor');
const albumParam     = urlParams.get('album');   // "disc" => rotation circulaire
const opacityParam   = urlParams.get('opacity'); // e.g. "50" => 0.5

/** Ajuste la largeur si demandée **/
if (customWidth) {
  document.querySelector('.player').style.width = customWidth + 'px';
}

/** Ajuste l'opacité si demandée **/
if (opacityParam) {
  // Convert e.g. "50" -> 0.50
  const numericVal = parseFloat(opacityParam) / 100;
  // If it’s a valid number between 0 and 1, override the .bg-blur’s default opacity
  if (!isNaN(numericVal) && numericVal >= 0 && numericVal <= 1) {
    document.querySelector('.bg-blur').style.opacity = numericVal;
  }
}

/** Création du client WebSocket (via streamerbot-client) **/
const client = new StreamerbotClient({
  host: '127.0.0.1',  // à adapter à votre config
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
    // stateValue === "playing"
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
 * - Gère la barre de progression (100% -> 0%)
 * - Gère la colorimétrie (barColor param ou ColorThief)
 * - Active/désactive le défilement du titre si besoin
 * - Ajoute des animations "slide in" pour la nouvelle piste
 ************************************************************/
function loadNewTrack(songName, artistName, albumArtUrl, durationSec, progressSec) {
  // Sélections DOM
  const bgBlur         = document.getElementById("bg-blur");
  const coverArt       = document.getElementById("cover-art");
  const trackNameSpan  = document.getElementById("track-name");
  const artistNameEl   = document.getElementById("artist-name");
  const timeBarFill    = document.getElementById("time-bar-fill");
  const timeBarBg      = document.getElementById("time-bar-bg");
  const timeRemaining  = document.getElementById("time-remaining");

  // Mise à jour du fond flou + pochette
  bgBlur.style.backgroundImage   = `url('${albumArtUrl}')`;
  coverArt.style.backgroundImage = `url('${albumArtUrl}')`;

  // Si l’utilisateur a mis ?album=disc => classe .disc-mode
  if (albumParam === 'disc') {
    coverArt.classList.add('disc-mode');
  } else {
    coverArt.classList.remove('disc-mode');
  }

  // Titre et artiste
  trackNameSpan.textContent = songName;
  artistNameEl.textContent  = artistName;

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
    // On a un paramètre barColor => on l'applique directement
    timeBarFill.style.backgroundColor = '#' + customBarColor;
  } else {
    // Sinon, on utilise ColorThief pour déterminer une couleur
    const colorThief = new ColorThief();
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = albumArtUrl;

    img.onload = function() {
      let [r, g, b] = colorThief.getColor(img);

      // Rendez la couleur plus "vibrante"
      [r, g, b] = makeVibrant(r, g, b, 0.5, 0.8);

      // On s’assure que la luminosité >= 0.3
      [r, g, b] = ensureMinimumLightness(r, g, b, 0.3);

      // Variations
      const barColorArr    = adjustColor(r, g, b, 0.8); // pour la barre
      const titleColorArr  = adjustColor(r, g, b, 1.4); // pour le titre
      const artistColorArr = adjustColor(r, g, b, 1.2); // pour l’artiste
      const timerColorArr  = adjustColor(r, g, b, 1.2); // pour le timer

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

  // Gérer le défilement du titre (si trop long)
  requestAnimationFrame(() => {
    setupScrollingTitle();
  });

  // Animations "slide in" pour la nouvelle piste
  animateElement(coverArt,     'slide-in-left');  // pochette
  animateElement(artistNameEl, 'slide-in-top');   // artiste
  animateElement(trackNameSpan,'slide-in-top');   // titre
  animateElement(timeBarBg,    'slide-in-right'); // barre
  animateElement(timeRemaining,'slide-in-right'); // timer
}

/************************************************************
 * syncProgress
 * -> La piste est la même, mais la position a changé
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
 * -> Barre de 100% -> 0% (elle se vide) + timer "mm:ss"
 ************************************************************/
function updateBarAndTimer() {
  const timeBarFill   = document.getElementById("time-bar-fill");
  const timeRemaining = document.getElementById("time-remaining");

  // timeSpent=0 => barre=100%, timeSpent=trackDuration => barre=0%
  const pct = 100 - (timeSpent / trackDuration * 100);
  timeBarFill.style.width = pct + "%";

  // Timer => "mm:ss" du temps restant
  const timeLeft = trackDuration - timeSpent;
  timeRemaining.textContent = formatTime(timeLeft);
}

/************************************************************
 * setupScrollingTitle
 * -> Active/désactive l'animation "marquee" si le texte dépasse
 ************************************************************/
function setupScrollingTitle() {
  const container = document.querySelector('.track-name');
  const span      = document.getElementById('track-name');

  // On retire toute animation par défaut
  span.style.animation = 'none';
  span.style.paddingLeft = '0';

  requestAnimationFrame(() => {
    const containerWidth = container.offsetWidth;
    const textWidth      = span.scrollWidth;

    if (textWidth > containerWidth) {
      // Activer le défilement
      span.style.paddingLeft = containerWidth + 'px';
      span.style.animation = 'marquee 10s linear infinite';
    } else {
      // Désactiver
      span.style.animation = 'none';
      span.style.paddingLeft = '0';
    }
  });
}

/************************************************************
 * animateElement
 * -> Ajoute une classe (slide-in-left, etc.) puis la retire
 ************************************************************/
function animateElement(element, animationClass) {
  // Retire d'abord la classe
  element.classList.remove(animationClass);

  // Force le reflow
  void element.offsetWidth;

  // Ajoute la classe
  element.classList.add(animationClass);

  // Retire la classe à la fin de l'animation
  element.addEventListener('animationend', () => {
    element.classList.remove(animationClass);
  }, { once: true });
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
 * ensureMinimumLightness
 * -> Convertit en HSL, force L >= minL, reconvertit en RGB
 ************************************************************/
function ensureMinimumLightness(r, g, b, minL) {
  let [h, s, l] = rgbToHsl(r, g, b);
  if (l < minL) {
    l = minL;
  }
  return hslToRgb(h, s, l);
}

/************************************************************
 * adjustColor
 * -> factor>1 => éclaircit, factor<1 => assombrit
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
 * makeVibrant
 * -> Convertit (r,g,b) -> HSL, force S >= minSat, L <= maxLight
 ************************************************************/
function makeVibrant(r, g, b, minSat, maxLight) {
  let [h, s, l] = rgbToHsl(r, g, b);

  if (s < minSat) s = minSat;
  if (l > maxLight) l = maxLight;

  return hslToRgb(h, s, l);
}

/************************************************************
 * rgbToHsl
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

  const q = (l < 0.5)
    ? (l * (1 + s))
    : (l + s - l*s);
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
