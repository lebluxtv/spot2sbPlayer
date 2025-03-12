/************************************************************
 * script.js
 * Gère la connexion WebSocket, la logique de pause/lecture,
 * la barre de progression, la colorimétrie, etc.
 *
 * (Les parties non modifiées sont inchangées.)
 ************************************************************/

// Variables globales pour la progression
let currentInterval = null;
let timeSpent = 0;
let trackDuration = 180;
let isPaused = false;

// Récupération des paramètres d'URL
const urlParams = new URLSearchParams(window.location.search);
const customWidth = urlParams.get('width');
const customColor = urlParams.get('color');
const albumParam = urlParams.get('album');
const opacityParam = urlParams.get('opacity');
const hostApp = urlParams.get('hostApp');
const popupDurationParam = urlParams.get('popupDuration');

// Sélections d’éléments DOM
const infoDiv = document.getElementById('infoDiv');
const playerDiv = document.getElementById('player');

// Déterminer si on est en mode WPF
const isWpfMode = (hostApp === "wpf");
if (isWpfMode) {
  const spotifyConnected = sessionStorage.getItem("spotifyConnected");
  if (!spotifyConnected && infoDiv) {
    infoDiv.textContent = "Please launch Spotify and play song to preview the player .";
    infoDiv.style.color = "#ff0";
    infoDiv.style.fontSize = "1.2rem";
    infoDiv.style.padding = "20px";
  }
}

// Préparation de l'UI
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

// Connexion WebSocket (Streamer.bot)
const client = new StreamerbotClient({
  host: '127.0.0.1',
  port: 8080,
  endpoint: '/',
  //password: 'streamer.bot'
});

let lastSongName = ""; // Sert à comparer et détecter une nouvelle musique

client.on('General.Custom', ({ event, data }) => {
  if (data?.widget !== 'spot2sbPlayer') return;

  console.log("Nouveau message spot2sbPlayer reçu:", data);

  // Si noSong est true, masquer le player
  if (data.noSong === true) {
    if (playerDiv) {
      playerDiv.style.display = 'none';
    }
    return;
  }

  // Dès qu'une musique est reçue, effacer le message et enregistrer dans sessionStorage
  if (isWpfMode && infoDiv) {
    infoDiv.textContent = "";
    sessionStorage.setItem("spotifyConnected", "true");
  }
  if (playerDiv) {
    playerDiv.style.display = 'block';
  }

  // Gérer lecture/pause
  const stateValue = data.state || "paused";
  if (stateValue === 'paused') {
    pauseProgressBar();
  } else {
    resumeProgressBar();
  }

  // Mise à jour de la piste
  if (data.songName) {
    const songName    = data.songName;
    const artistName  = data.artistName;
    const albumArtUrl = data.albumArtUrl || "";
    const durationSec = data.duration   || 180;
    const progressSec = data.progress   || 0;

    // Déclencher une animation uniquement en cas de nouvelle musique
    if (songName !== lastSongName) {
      lastSongName = songName;
      loadNewTrack(songName, artistName, albumArtUrl, durationSec, progressSec);
      if (popupDurationParam) {
         handlePopupDisplay();
      }
    } else {
      // Pour la même musique, synchroniser la progression uniquement
      syncProgress(progressSec);
    }
  }
});

/************************************************************
 * loadNewTrack
 ************************************************************/
function loadNewTrack(songName, artistName, albumArtUrl, durationSec, progressSec) {
  const bgBlur = document.getElementById("bg-blur");
  const coverArt = document.getElementById("cover-art");
  const trackNameSpan = document.getElementById("track-name");
  const artistNameEl = document.getElementById("artist-name");
  const timeBarFill = document.getElementById("time-bar-fill");
  const timeBarBg = document.getElementById("time-bar-bg");
  const timeRemaining = document.getElementById("time-remaining");

  // S'assurer que l'album art est visible pour la nouvelle musique
  if (coverArt) {
    coverArt.style.display = 'block';
    coverArt.style.backgroundImage = `url('${albumArtUrl}')`;
    if (albumParam === 'disc') {
      coverArt.classList.add('disc-mode');
    } else {
      coverArt.classList.remove('disc-mode');
    }
  }

  if (trackNameSpan) trackNameSpan.textContent = songName;
  if (artistNameEl)  artistNameEl.textContent  = artistName;

  trackDuration = durationSec;
  timeSpent = Math.min(progressSec, durationSec);
  updateBarAndTimer();

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

  if (customColor) {
    const colorHex = '#' + customColor;
    if (timeBarFill)   timeBarFill.style.backgroundColor = colorHex;
    if (trackNameSpan) trackNameSpan.style.color         = colorHex;
    if (artistNameEl)  artistNameEl.style.color          = colorHex;
    if (timeRemaining) timeRemaining.style.color          = colorHex;
  } else {
    const colorThief = new ColorThief();
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = albumArtUrl;
    img.onload = function() {
      let [r, g, b] = colorThief.getColor(img);
      [r, g, b] = makeVibrant(r, g, b, 0.5, 0.8);
      [r, g, b] = ensureMinimumLightness(r, g, b, 0.3);
      const barColorArr = adjustColor(r, g, b, 0.8);
      const textColorArr = adjustColor(r, g, b, 1.2);
      if (timeBarFill)   timeBarFill.style.backgroundColor = rgbString(barColorArr);
      if (trackNameSpan) trackNameSpan.style.color         = rgbString(textColorArr);
      if (artistNameEl)  artistNameEl.style.color          = rgbString(textColorArr);
      if (timeRemaining) timeRemaining.style.color          = rgbString(textColorArr);
    };
  }

  requestAnimationFrame(() => {
    setupScrollingTitle();
  });

  // L'album art arrive avec un slide in depuis la gauche
  animateElement(coverArt, 'slide-in-left');
  // Les autres éléments sont mis à jour normalement
  animateElement(timeBarBg, 'slide-in-right');
  animateElement(timeBarFill, 'slide-in-right');
  animateElement(timeRemaining, 'slide-in-right');
  animateElement(artistNameEl, 'slide-in-top');
  animateElement(trackNameSpan, 'slide-in-top');
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
  const timeBarFill = document.getElementById("time-bar-fill");
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
  const span = document.getElementById('track-name');
  if (!container || !span) return;
  span.style.animation = 'none';
  span.style.paddingLeft = '0';
  requestAnimationFrame(() => {
    const containerWidth = container.offsetWidth;
    const textWidth = span.scrollWidth;
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
  void element.offsetWidth;
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
  return `${m}:${s < 10 ? "0" + s : s}`;
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

/************************************************************
 * handlePopupDisplay
 * Séquence d'animation pour une nouvelle musique (popupDuration en secondes) :
 * 1. Album art slide in depuis la gauche.
 * 2. Une fois l'album art en place, le fond (.bg-blur) et la zone d'info (info-bar)
 *    sont rétractés (scaleX(0) centré) puis s'étendent (scaleX(1)).
 * 3. Après une période d'affichage, ces éléments se rétractent (scaleX(0)) sans affecter l'album art.
 * 4. Enfin, l'album art slide out vers la droite.
 * L'album art reste masqué après l'animation et ne réapparaît qu'à la réception d'une nouvelle musique.
 ************************************************************/
/*
function handlePopupDisplay() {
  const popupDurationSec = parseFloat(popupDurationParam);
  if (!popupDurationSec || isNaN(popupDurationSec) || popupDurationSec <= 0) return;
  
  const totalDuration = popupDurationSec * 1000;
  
  // Répartir la durée totale en 5 phases :
  // Phase 1 : Album art slide in depuis la gauche : 20%
  // Phase 2 : Expansion (stretch in) du fond et de la zone d'info : 15%
  // Phase 3 : Affichage complet : 30%
  // Phase 4 : Rétraction (stretch out) du fond et de la zone d'info : 15%
  // Phase 5 : Album art slide out vers la droite : 20%
  const albumArtInDuration = totalDuration * 0.20;
  const expansionDuration = totalDuration * 0.15;
  const displayDuration   = totalDuration * 0.30;
  const collapseDuration  = totalDuration * 0.15;
  const albumArtOutDuration = totalDuration * 0.20;
  
  const player = document.getElementById('player');
  const coverArt = document.getElementById('cover-art');
  const bgBlur = document.getElementById('bg-blur');
  const infoBar = document.querySelector('.info-bar');
  
  // Afficher le player et s'assurer que l'album art est visible
  player.style.display = 'flex';
  coverArt.style.display = 'block';
  
  // Phase 1 : Album art slide in depuis la gauche
  coverArt.style.transition = `transform ${albumArtInDuration}ms ease-out, opacity ${albumArtInDuration}ms ease-out`;
  coverArt.style.transform = 'translateX(-100%)';
  coverArt.style.opacity = '0';
  void coverArt.offsetWidth; // Forcer le reflow
  coverArt.style.transform = 'translateX(0)';
  coverArt.style.opacity = '1';
  
  // Phase 2 : Expansion des éléments (bgBlur et infoBar) avec transformOrigin défini à 'left center'
  setTimeout(() => {
    bgBlur.style.transformOrigin = 'left center';
    infoBar.style.transformOrigin = 'left center';
    bgBlur.style.transition = `transform ${expansionDuration}ms ease-out`;
    infoBar.style.transition = `transform ${expansionDuration}ms ease-out`;
    // Commencer en scaleX(0) puis passer à scaleX(1)
    bgBlur.style.transform = 'scaleX(0)';
    infoBar.style.transform = 'scaleX(0)';
    void bgBlur.offsetWidth;
    void infoBar.offsetWidth;
    bgBlur.style.transform = 'scaleX(1)';
    infoBar.style.transform = 'scaleX(1)';
  }, albumArtInDuration);
  
  // Phase 3 : Affichage complet pendant displayDuration (aucune action, simplement attendre)
  const collapseStartTime = albumArtInDuration + expansionDuration + displayDuration;
  
  // Phase 4 : Rétraction des éléments (bgBlur et infoBar) vers 0 en scaleX
  setTimeout(() => {
    bgBlur.style.transition = `transform ${collapseDuration}ms ease-in`;
    infoBar.style.transition = `transform ${collapseDuration}ms ease-in`;
    bgBlur.style.transform = 'scaleX(0)';
    infoBar.style.transform = 'scaleX(0)';
  }, collapseStartTime);
  
  // Phase 5 : Album art slide out vers la droite
  const albumArtSlideOutTime = collapseStartTime + collapseDuration;
  setTimeout(() => {
    coverArt.style.transition = `transform ${albumArtOutDuration}ms ease-in, opacity ${albumArtOutDuration}ms ease-in`;
    coverArt.style.transform = 'translateX(100%)';
    coverArt.style.opacity = '0';
  }, albumArtSlideOutTime);
  
  // Fin de la séquence : masquer le player à la fin
  setTimeout(() => {
    player.style.display = 'none';
  }, totalDuration);
}
*/
function handlePopupDisplay() {
  const popupDurationSec = parseFloat(popupDurationParam);
  if (!popupDurationSec || isNaN(popupDurationSec) || popupDurationSec <= 0) return;
  
  const totalDuration = popupDurationSec * 1000;
  const albumArtInDuration = totalDuration * 0.2;
  const expansionDuration = totalDuration * 0.15;
  const displayDuration = totalDuration * 0.3;
  const collapseDuration = totalDuration * 0.15;
  const albumArtOutDuration = totalDuration * 0.2;
  
  const player = document.getElementById('player');
  const coverArt = document.getElementById('cover-art');
  const bgBlur = document.getElementById('bg-blur');
  const infoBar = document.querySelector('.info-bar');
  
  // Afficher le player et l'album art (positionné sur le côté gauche)
  player.style.display = 'flex';
  coverArt.style.display = 'block';
  
  // Phase 1 : Slide in de l'album art depuis la gauche
  coverArt.style.transition = `transform ${albumArtInDuration}ms ease-out, opacity ${albumArtInDuration}ms ease-out`;
  coverArt.style.transform = 'translateX(-100%)';
  coverArt.style.opacity = '0';
  void coverArt.offsetWidth; // Forcer le reflow
  coverArt.style.transform = 'translateX(0)';
  coverArt.style.opacity = '1';
  
  // Phase 2 : Expansion du fond et de la zone d'info.
  // Le point d'origine de la transformation est calculé à partir du centre de l'album art (dans sa position initiale).
  setTimeout(() => {
    const albumArtRect = coverArt.getBoundingClientRect();
    const playerRect = player.getBoundingClientRect();
    const offsetX = albumArtRect.left - playerRect.left + albumArtRect.width / 2;
    const origin = `${offsetX}px center`;
    bgBlur.style.transformOrigin = origin;
    infoBar.style.transformOrigin = origin+150;
    
    bgBlur.style.transition = `transform ${expansionDuration}ms ease-out`;
    infoBar.style.transition = `transform ${expansionDuration}ms ease-out`;
    // Départ en scaleX(0) puis passage à scaleX(1)
    bgBlur.style.transform = 'scaleX(0)';
    infoBar.style.transform = 'scaleX(0)';
    void bgBlur.offsetWidth;
    void infoBar.offsetWidth;
    bgBlur.style.transform = 'scaleX(1)';
    infoBar.style.transform = 'scaleX(1)';
  }, albumArtInDuration);
  
  // Phase 3 : Affichage complet pendant displayDuration
  const collapseStartTime = albumArtInDuration + expansionDuration + displayDuration;
  
  // Phase 4 : Collapse du fond et de la zone d'info (scaleX de 1 à 0)
  setTimeout(() => {
    bgBlur.style.transition = `transform ${collapseDuration}ms ease-in`;
    infoBar.style.transition = `transform ${collapseDuration}ms ease-in`;
    bgBlur.style.transform = 'scaleX(0)';
    infoBar.style.transform = 'scaleX(0)';
  }, collapseStartTime);
  
  // Phase 5 : Slide out de l'album art vers la droite
  const albumArtSlideOutTime = collapseStartTime + collapseDuration;
  setTimeout(() => {
    coverArt.style.transition = `transform ${albumArtOutDuration}ms ease-in, opacity ${albumArtOutDuration}ms ease-in`;
    coverArt.style.transform = 'translateX(100%)';
    coverArt.style.opacity = '0';
  }, albumArtSlideOutTime);
  
  // Fin de la séquence : masquer le player après la durée totale
  setTimeout(() => {
    player.style.display = 'none';
  }, totalDuration);
}
