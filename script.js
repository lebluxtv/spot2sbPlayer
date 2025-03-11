/************************************************************
 * script.js
 * Gère la connexion WebSocket, la logique de pause/lecture,
 * la barre de progression (100% -> 0%), la colorimétrie,
 * le titre défilant conditionnel, et les animations "slide in".
 *
 * Ajout :
 *  - ?album=disc => pochette ronde + rotation vinyle
 *  - ?opacity=50 => opacité 0.5 sur le .bg-blur
 *  - Player caché par défaut : on l'affiche seulement quand
 *    un payload arrive ET qu'il n'est pas noSong=true
 *  - Paramètre ?hostApp=wpf => si détecté, on affiche un
 *    message “Ouvert dans WPF” (ou autre) et on ne montre
 *    pas le player.
 ************************************************************/

/** Interval pour la progression **/
let currentInterval = null;

/** Variables pour la durée, la progression écoulée et l'état pause **/
let timeSpent = 0;
let trackDuration = 180;
let isPaused = false;

/** Récupération des paramètres d'URL **/
const urlParams  = new URLSearchParams(window.location.search);
const customWidth = urlParams.get('width');
const customColor = urlParams.get('color');   // ex. "ff0000"
const albumParam  = urlParams.get('album');   // "disc"
const opacityParam= urlParams.get('opacity'); // ex. "50" => 0.5
const hostApp     = urlParams.get('hostApp'); // ex. "wpf"

/************************************************************
 * Vérification du hostApp
 * => Si hostApp="wpf", on affiche un message WPF et on
 *    ne montrera pas le player du tout.
 ************************************************************/
if (hostApp === "wpf") {
  // On vide le body et on met un message
  document.body.innerHTML = "";
  const infoDiv = document.createElement('div');
  infoDiv.textContent = "Please launch Spotify to preview the player.";
  infoDiv.style.color = "#ff0";
  infoDiv.style.fontSize = "1.2rem";
  infoDiv.style.padding = "20px";
  document.body.appendChild(infoDiv);

  // On peut s'arrêter là, plus rien à faire
  // => Pas de player, pas de WS, etc.
  // Si c'est la logique voulue, décommentez la ligne suivante :
  // return;
}

/************************************************************
 * Préparation de l'UI : Player masqué par défaut
 ************************************************************/
document.querySelector('.player').style.display = 'none';

/************************************************************
 * Ajustements via paramètres
 ************************************************************/
if (customWidth) {
  document.querySelector('.player').style.width = customWidth + 'px';
}
if (opacityParam) {
  const numericVal = parseFloat(opacityParam) / 100;
  if (!isNaN(numericVal) && numericVal >= 0 && numericVal <= 1) {
    document.querySelector('.bg-blur').style.opacity = numericVal;
  }
}

/************************************************************
 * Connexion WebSocket (Streamer.bot)
 ************************************************************/
const client = new StreamerbotClient({
  host: '127.0.0.1',
  port: 8080,
  endpoint: '/',
  password: 'streamer.bot'
});

let lastSongName = "";

/************************************************************
 * client.on('General.Custom', ...)
 ************************************************************/
client.on('General.Custom', ({ event, data }) => {
  if (data?.widget !== 'spot2sbPlayer') return;
  console.log("Nouveau message spot2sbPlayer reçu:", data);

  // noSong => on masque
  if (data.noSong === true) {
    document.querySelector('.player').style.display = 'none';
    return;
  }

  // Sinon, on l'affiche (au cas où elle était masquée)
  document.querySelector('.player').style.display = 'block';

  // Lecture/pause
  const stateValue = data.state || "paused";
  if (stateValue === 'paused') {
    pauseProgressBar();
  } else {
    resumeProgressBar();
  }

  // Mise à jour piste
  if (data.songName) {
    const songName    = data.songName;
    const artistName  = data.artistName;
    const albumArtUrl = data.albumArtUrl || "";
    const durationSec = data.duration   || 180;
    const progressSec = data.progress   || 0;

    if (songName !== lastSongName) {
      lastSongName = songName;
      loadNewTrack(songName, artistName, albumArtUrl, durationSec, progressSec);
    } else {
      syncProgress(progressSec);
    }
  }
});

/************************************************************
 * loadNewTrack
 ************************************************************/
function loadNewTrack(songName, artistName, albumArtUrl, durationSec, progressSec) {
  const bgBlur         = document.getElementById("bg-blur");
  const coverArt       = document.getElementById("cover-art");
  const trackNameSpan  = document.getElementById("track-name");
  const artistNameEl   = document.getElementById("artist-name");
  const timeBarFill    = document.getElementById("time-bar-fill");
  const timeBarBg      = document.getElementById("time-bar-bg");
  const timeRemaining  = document.getElementById("time-remaining");

  // Fond + pochette
  bgBlur.style.backgroundImage   = `url('${albumArtUrl}')`;
  coverArt.style.backgroundImage = `url('${albumArtUrl}')`;

  // disc-mode ?
  if (albumParam === 'disc') {
    coverArt.classList.add('disc-mode');
  } else {
    coverArt.classList.remove('disc-mode');
  }

  // Titre & artiste
  trackNameSpan.textContent = songName;
  artistNameEl.textContent  = artistName;

  // Durée
  trackDuration = durationSec;
  timeSpent     = Math.min(progressSec, durationSec);
  updateBarAndTimer();

  // Interval
  if (currentInterval) {
    clearInterval(currentInterval);
    currentInterval = null;
  }
  isPaused = false;
  currentInterval = setInterval(() => {
    if (!isPaused) {
      if (timeSpent < trackDuration) {
        timeSpent++;
        updateBarAndTimer();
      } else {
        clearInterval(currentInterval);
        currentInterval = null;
      }
    }
  }, 1000);

  // Couleur
  if (customColor) {
    const colorHex = '#' + customColor;
    timeBarFill.style.backgroundColor = colorHex;
    trackNameSpan.style.color        = colorHex;
    artistNameEl.style.color         = colorHex;
    timeRemaining.style.color        = colorHex;
  } else {
    const colorThief = new ColorThief();
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = albumArtUrl;

    img.onload = function() {
      let [r, g, b] = colorThief.getColor(img);
      [r, g, b] = makeVibrant(r, g, b, 0.5, 0.8);
      [r, g, b] = ensureMinimumLightness(r, g, b, 0.3);

      const barColorArr  = adjustColor(r, g, b, 0.8);
      const textColorArr = adjustColor(r, g, b, 1.2);

      timeBarFill.style.backgroundColor = rgbString(barColorArr);
      trackNameSpan.style.color        = rgbString(textColorArr);
      artistNameEl.style.color         = rgbString(textColorArr);
      timeRemaining.style.color        = rgbString(textColorArr);
    };
  }

  // Titre défilant
  requestAnimationFrame(() => {
    setupScrollingTitle();
  });

  // Animations "slide in"
  animateElement(coverArt,     'slide-in-left');
  animateElement(artistNameEl, 'slide-in-top');
  animateElement(trackNameSpan,'slide-in-top');
  animateElement(timeBarBg,    'slide-in-right');
  animateElement(timeRemaining,'slide-in-right');
}

/************************************************************
 * syncProgress
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
 ************************************************************/
function updateBarAndTimer() {
  const timeBarFill   = document.getElementById("time-bar-fill");
  const timeRemaining = document.getElementById("time-remaining");

  const pct = 100 - (timeSpent / trackDuration * 100);
  timeBarFill.style.width = pct + "%";

  const timeLeft = trackDuration - timeSpent;
  timeRemaining.textContent = formatTime(timeLeft);
}

/************************************************************
 * setupScrollingTitle
 ************************************************************/
function setupScrollingTitle() {
  const container = document.querySelector('.track-name');
  const span      = document.getElementById('track-name');

  span.style.animation = 'none';
  span.style.paddingLeft = '0';

  requestAnimationFrame(() => {
    const containerWidth = container.offsetWidth;
    const textWidth      = span.scrollWidth;

    if (textWidth > containerWidth) {
      span.style.paddingLeft = containerWidth + 'px';
      span.style.animation = 'marquee 10s linear infinite';
    } else {
      span.style.animation = 'none';
      span.style.paddingLeft = '0';
    }
  });
}

/************************************************************
 * animateElement
 ************************************************************/
function animateElement(element, animationClass) {
  element.classList.remove(animationClass);
  void element.offsetWidth; // reflow
  element.classList.add(animationClass);
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
 ************************************************************/
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0"+s : s}`;
}

/************************************************************
 * ensureMinimumLightness
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
    h = 0;
    s = 0;
  } else {
    const diff = max - min;
    s = (l > 0.5)
      ? diff / (2 - max - min)
      : diff / (max + min);
    switch (max) {
      case r: h = (g - b) / diff + (g < b ? 6 : 0); break;
      case g: h = (b - r) / diff + 2; break;
      case b: h = (r - g) / diff + 4; break;
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
