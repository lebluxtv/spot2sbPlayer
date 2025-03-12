/************************************************************
 * script.js
 * Gère la connexion WebSocket, la logique de pause/lecture,
 * la barre de progression, la colorimétrie, etc.
 *
 * Ajouts :
 *  - ?album=disc => pochette ronde + rotation vinyle
 *  - ?opacity=50 => opacité 0.5 sur le .bg-blur
 *  - Le player est masqué par défaut et s'affiche uniquement
 *    lorsqu'un payload arrive ET qu'il n'est pas noSong=true
 *  - Paramètre ?hostApp=wpf => affiche un message dans infoDiv
 *    tant qu'aucun payload n'est reçu. Dès qu'un payload valide est
 *    reçu, le message est effacé et un flag est enregistré dans le sessionStorage.
 ************************************************************/

/** Variables globales pour la progression **/
let currentInterval = null;
let timeSpent       = 0;
let trackDuration   = 180;
let isPaused        = false;

/** Récupération des paramètres d'URL **/
const urlParams    = new URLSearchParams(window.location.search);
const customWidth  = urlParams.get('width');
const customColor  = urlParams.get('color');
const albumParam   = urlParams.get('album');
const opacityParam = urlParams.get('opacity');
const hostApp      = urlParams.get('hostApp'); // "wpf" ?
const popupDurationParam = urlParams.get('popupDuration');
/** Sélections d’éléments DOM **/
const infoDiv    = document.getElementById('infoDiv');
const playerDiv  = document.getElementById('player');

/** Déterminer si on est en mode WPF **/
const isWpfMode = (hostApp === "wpf");

/************************************************************
 * 1) Gestion du mode WPF
 ************************************************************/
if (isWpfMode) {
  // Vérifier via sessionStorage si Spotify a déjà été connecté dans cette session
  const spotifyConnected = sessionStorage.getItem("spotifyConnected");
  if (!spotifyConnected && infoDiv) {
    infoDiv.textContent = "Please launch Spotify and play song to preview the player .";
    infoDiv.style.color = "#ff0";
    infoDiv.style.fontSize = "1.2rem";
    infoDiv.style.padding = "20px";
  }
  // Le player reste caché tant qu'on n'a pas de payload
}

/************************************************************
 * 2) Préparation de l'UI
 *    - Player masqué par défaut
 *    - Ajustements via paramètres (width, opacity)
 ************************************************************/
if (playerDiv) {
  playerDiv.style.display = 'none'; // masqué au départ
  if (customWidth) {
    playerDiv.style.width = customWidth + 'px';
  }
}
if (opacityParam) {
  const numericVal = parseFloat(opacityParam) / 100;
  if (!isNaN(numericVal) && numericVal >= 0 && numericVal <= 1) {
    const bgBlur = document.querySelector('.bg-blur');
    if (bgBlur) {
      bgBlur.style.opacity = numericVal;
    }
  }
}

/************************************************************
 * 3) Connexion WebSocket (Streamer.bot)
 ************************************************************/
const client = new StreamerbotClient({
  host: '127.0.0.1',
  port: 8080,
  endpoint: '/',
  //password: 'streamer.bot'
});

let lastSongName = "";

/************************************************************
 * 4) Écoute de "General.Custom"
 ************************************************************/
client.on('General.Custom', ({ event, data }) => {
  if (data?.widget !== 'spot2sbPlayer') return;

  console.log("Nouveau message spot2sbPlayer reçu:", data);

  // 4a) Si noSong est true, on masque le player
  if (data.noSong === true) {
    if (playerDiv) {
      playerDiv.style.display = 'none';
    }
    return;
  }

  // 4b) Dès qu'une musique est reçue, on efface le message et on enregistre dans sessionStorage
  if (isWpfMode && infoDiv) {
    infoDiv.textContent = ""; // Effacer le message
    sessionStorage.setItem("spotifyConnected", "true");
  }
  if (playerDiv) {
    playerDiv.style.display = 'block';
  }

  // 4c) Gérer lecture/pause
  const stateValue = data.state || "paused";
  if (stateValue === 'paused') {
    pauseProgressBar();
  } else {
    resumeProgressBar();
  }

  // 4d) Mise à jour de la piste
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
  // Sélections des éléments
  const bgBlur        = document.getElementById("bg-blur");
  const coverArt      = document.getElementById("cover-art");
  const trackNameSpan = document.getElementById("track-name");
  const artistNameEl  = document.getElementById("artist-name");
  const timeBarFill   = document.getElementById("time-bar-fill");
  const timeBarBg     = document.getElementById("time-bar-bg");
  const timeRemaining = document.getElementById("time-remaining");

  // Mise à jour de l'arrière-plan et de la pochette
  if (bgBlur) {
    bgBlur.style.backgroundImage = `url('${albumArtUrl}')`;
  }
  if (coverArt) {
    coverArt.style.backgroundImage = `url('${albumArtUrl}')`;
    if (albumParam === 'disc') {
      coverArt.classList.add('disc-mode');
    } else {
      coverArt.classList.remove('disc-mode');
    }
  }

  // Mise à jour du titre et de l'artiste
  if (trackNameSpan) trackNameSpan.textContent = songName;
  if (artistNameEl)  artistNameEl.textContent  = artistName;

  // Mise à jour de la durée et de la barre de progression
  trackDuration = durationSec;
  timeSpent     = Math.min(progressSec, durationSec);
  updateBarAndTimer();

  // Réinitialisation de l'intervalle si nécessaire
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

  // Gestion de la colorimétrie
  if (customColor) {
    const colorHex = '#' + customColor;
    if (timeBarFill)   timeBarFill.style.backgroundColor = colorHex;
    if (trackNameSpan) trackNameSpan.style.color         = colorHex;
    if (artistNameEl)  artistNameEl.style.color          = colorHex;
    if (timeRemaining) timeRemaining.style.color          = colorHex;
  } else {
    // Utilisation de ColorThief pour récupérer la couleur dominante
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

      if (timeBarFill)   timeBarFill.style.backgroundColor = rgbString(barColorArr);
      if (trackNameSpan) trackNameSpan.style.color         = rgbString(textColorArr);
      if (artistNameEl)  artistNameEl.style.color          = rgbString(textColorArr);
      if (timeRemaining) timeRemaining.style.color          = rgbString(textColorArr);
    };
  }

  // Mise en place du titre défilant
  requestAnimationFrame(() => {
    setupScrollingTitle();
  });

  // Animations d'apparition ("slide in")
  animateElement(coverArt,     'slide-in-left');
  animateElement(artistNameEl, 'slide-in-top');
  animateElement(trackNameSpan,'slide-in-top');
  animateElement(timeBarBg,    'slide-in-right');
  animateElement(timeBarFill,  'slide-in-right'); // Optionnel
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

  if (!timeBarFill || !timeRemaining) return;

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
  if (!container || !span) return;

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
  if (!element) return;
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
 * rgbToHsl / hslToRgb
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
// Fonction pour gérer l'affichage temporaire avec animation
function handlePopupDisplay() {
  const popupDuration = parseInt(popupDurationParam);
  if (!popupDurationParam || isNaN(popupDurationParam) || popupDurationParam <= 0) return;

  const player = document.getElementById('player');
  const coverArt = document.getElementById('cover-art');
  const playerContent = document.querySelector('.player-content');

  // Réinitialisation des styles initiaux
  player.style.display = 'flex';
  coverArt.style.opacity = 0;
  playerContent.style.opacity = 0;

  // Début animation album art (slide-in-left)
  coverArt.classList.add('slide-in-left');

  // Quand l'album art arrive, fade in du reste
  setTimeout(() => {
    playerContent.style.transition = 'opacity 1s ease-in';
    playerContent.style.opacity = '1';
  }, 1500); // Temps correspondant à l'animation slide-in-left

  // Timer pour le maintien à l'écran puis l'animation de sortie
  const totalDisplayDuration = popupDuration * 1000;
  const holdDuration = totalDuration(totalAnimation = 1500 + 1000) < total ? totalDuration - 3000 : 3000;

  setTimeout(() => {
    // Animation sortie (inverse)
    playerContent.style.transition = 'opacity 1s ease-out';
    playerContent.style.opacity = '0';

    setTimeout(() => {
      coverArt.classList.remove('slide-in-left');
      coverArt.classList.add('slide-out-left');
      
      setTimeout(() => {
        player.style.display = 'none';
        coverArt.classList.remove('slide-out-left');
      }, 1500);
    }, 1000);
  }, (popupDurationParam * 1000) - 2500); // Fin de la durée d'affichage moins animations
}
