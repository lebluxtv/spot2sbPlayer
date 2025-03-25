/************************************************************
 * script.js
 * Gère la connexion WebSocket, la logique de pause/lecture,
 * la barre de progression, la colorimétrie, etc.
 ************************************************************/

// Variables globales
let currentInterval = null;
let timeSpent = 0;
let trackDuration = 180;
let isPaused = false;

// Pour gérer les timeouts de l'animation popup
let popupTimeouts = [];

/** Fonction pour annuler l’animation popup en cours et réinitialiser l’opacité **/
function cancelPopupAnimation() {
  popupTimeouts.forEach(timeout => clearTimeout(timeout));
  popupTimeouts = [];
  const bgBlur = document.getElementById('bg-blur');
  const trackNameEl = document.getElementById('track-name');
  const artistNameEl = document.getElementById('artist-name');
  const timeRow = document.querySelector('.time-row');
  const requesterNameEl = document.getElementById('requester-name');
  const requesterPfpEl = document.getElementById('requester-pfp');
  const coverArt = document.getElementById('cover-art');
  if(bgBlur) { bgBlur.style.transition = ''; bgBlur.style.opacity = '1'; }
  if(trackNameEl) { trackNameEl.style.transition = ''; trackNameEl.style.opacity = '1'; }
  if(artistNameEl) { artistNameEl.style.transition = ''; artistNameEl.style.opacity = '1'; }
  if(timeRow) { timeRow.style.transition = ''; timeRow.style.opacity = '1'; }
  if(requesterNameEl) { requesterNameEl.style.transition = ''; requesterNameEl.style.opacity = '1'; }
  if(requesterPfpEl) { requesterPfpEl.style.transition = ''; requesterPfpEl.style.opacity = '1'; }
  if(coverArt) { coverArt.style.transition = ''; coverArt.style.opacity = '1'; }
}

/** Récupération des paramètres d'URL **/
const urlParams          = new URLSearchParams(window.location.search);
const customWidth        = urlParams.get('width');
const customColor        = urlParams.get('color');
const albumParam         = urlParams.get('album');
const opacityParam       = urlParams.get('opacity');
const hostApp            = urlParams.get('hostApp');
const popupDurationParam = urlParams.get('popupDuration');

/** Sélection d’éléments DOM **/
const infoDiv   = document.getElementById('infoDiv');
const playerDiv = document.getElementById('player');

// Mode WPF ?
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

// Préparation UI
if (playerDiv) {
  // Au départ, on le cache
  playerDiv.style.display = 'none';

  // Largeur personnalisée si 'width' est fourni
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
  // password: 'streamer.bot'
});

let lastSongName = "";

/************************************************************
 * Réception de l'événement "General.Custom"
 ************************************************************/
client.on('General.Custom', ({ event, data }) => {
  // On ne traite que les payloads ayant widget = 'spot2sbPlayer'
  if (data?.widget !== 'spot2sbPlayer') return;

  console.log("Nouveau message spot2sbPlayer reçu:", data);

  // Si noSong = true => on masque le player et on arrête
  if (data.noSong === true) {
    if (playerDiv) {
      playerDiv.style.display = 'none';
    }
    return;
  }

  // Mode WPF : on enlève le message de "non connecté"
  if (isWpfMode && infoDiv) {
    infoDiv.textContent = "";
    sessionStorage.setItem("spotifyConnected", "true");
  }

  // Afficher le player (si masqué)
  if (playerDiv) {
    playerDiv.style.display = 'block';
  }

  // Lecture / Pause
  const stateValue = data.state || "paused";
  if (stateValue === 'paused') {
    pauseProgressBar();
  } else {
    resumeProgressBar();
  }

  // Récupération du nom du requester (s'il existe)
  const requesterName = data.requesterName || "";
  // Récupération de la PFP du requester (si existe)
  const requesterPfpUrl = data.requesterPfpUrl || "";

  // Mise à jour de la piste
  if (data.songName) {
    const songName    = data.songName;
    const artistName  = data.artistName;
    const albumArtUrl = data.albumArtUrl || "";
    const durationSec = data.duration   || 180;
    const progressSec = data.progress   || 0;

    // On appelle loadNewTrack en lui passant requesterName et requesterPfpUrl
    if (songName !== lastSongName) {
      lastSongName = songName;
      // Avant de charger la nouvelle piste, annuler l'animation popup en cours
      cancelPopupAnimation();
      loadNewTrack(songName, artistName, albumArtUrl, durationSec, progressSec, requesterName, requesterPfpUrl);

      // Lancer l'animation popup si popupDuration est défini
      if (popupDurationParam) {
        handlePopupDisplay();
      }
    } else {
      // Même musique => on synchronise la progression
      syncProgress(progressSec);
    }
  }
});

/************************************************************
 * swapToRequesterPfp / swapBackToAlbumArt
 * Utilisées pour remplacer temporairement la cover par la PFP
 ************************************************************/
function swapToRequesterPfp(coverArtEl, pfpUrl, isDiscMode) {
  // On fait une petite animation fade
  coverArtEl.style.transition = 'transform 0.6s, opacity 0.6s';
  coverArtEl.style.opacity = '0';
  setTimeout(() => {
    // Quand l'opacity est à 0, on change l'image
    coverArtEl.style.backgroundImage = `url('${pfpUrl}')`;
    // Si on est en mode disc, on ajoute la classe 'disc-mode'
    if (isDiscMode) {
      coverArtEl.classList.add('disc-mode');
    } else {
      coverArtEl.classList.remove('disc-mode');
    }
    coverArtEl.style.opacity = '1';
  }, 600);
}

function swapBackToAlbumArt(coverArtEl, albumArtUrl, isDiscMode) {
  coverArtEl.style.transition = 'transform 0.6s, opacity 0.6s';
  coverArtEl.style.opacity = '0';
  setTimeout(() => {
    // On remet l'album
    coverArtEl.style.backgroundImage = `url('${albumArtUrl}')`;
    if (isDiscMode) {
      coverArtEl.classList.add('disc-mode');
    } else {
      coverArtEl.classList.remove('disc-mode');
    }
    coverArtEl.style.opacity = '1';
  }, 600);
}

/************************************************************
 * loadNewTrack
 ************************************************************/
function loadNewTrack(songName, artistName, albumArtUrl, durationSec, progressSec, requesterName, requesterPfpUrl) {
  const bgBlur          = document.getElementById("bg-blur");
  const coverArt        = document.getElementById("cover-art");
  const trackNameSpan   = document.getElementById("track-name");
  const artistNameEl    = document.getElementById("artist-name");
  const timeBarFill     = document.getElementById("time-bar-fill");
  const timeBarBg       = document.getElementById("time-bar-bg");
  const timeRemaining   = document.getElementById("time-remaining");
  const requesterNameEl = document.getElementById("requester-name"); // div pour afficher le pseudo
  const requesterPfpEl  = document.getElementById("requester-pfp");  // div pour afficher la PFP

  // Arrière-plan flou
  if (bgBlur) {
    bgBlur.style.backgroundImage = `url('${albumArtUrl}')`;
    bgBlur.style.opacity = '1';
  }

  // Pochette
  if (coverArt) {
    coverArt.style.display = 'block';
    coverArt.style.backgroundImage = `url('${albumArtUrl}')`;
    // Pour le slide in, on ne transitionne que la translation (pas l'opacité)
    coverArt.style.transition = `transform 600ms ease-out`;
    coverArt.style.transform = 'translateX(-100%)';
    // Forcer le reflow
    void coverArt.offsetWidth;
    coverArt.style.transform = 'translateX(0)';
    coverArt.style.opacity = '1';
    if (albumParam === 'disc') {
      coverArt.classList.add('disc-mode');
      // Après le slide in, réinitialiser le transform inline pour permettre la rotation
      setTimeout(() => {
        coverArt.style.transform = '';
      }, 650);
    } else {
      coverArt.classList.remove('disc-mode');
    }
  }

  // Titre & artiste
  if (trackNameSpan) {
    trackNameSpan.textContent = songName;
    trackNameSpan.style.opacity = '1';
  }
  if (artistNameEl) {
    artistNameEl.textContent  = artistName;
    artistNameEl.style.opacity = '1';
  }

  // Affichage du requester (si non vide)
  if (requesterNameEl) {
    if (requesterName) {
      requesterNameEl.textContent = "Requested by " + requesterName;
      requesterNameEl.style.display = "block";
      requesterNameEl.style.opacity = '1';
    } else {
      requesterNameEl.textContent = "";
      requesterNameEl.style.display = "none";
    }
  }

  // Affichage de la PFP (si URL non vide)
  if (requesterPfpEl) {
    if (requesterPfpUrl) {
      requesterPfpEl.style.backgroundImage = `url('${requesterPfpUrl}')`;
      requesterPfpEl.style.display = "block";
      requesterPfpEl.style.opacity = '1';
    } else {
      requesterPfpEl.style.backgroundImage = "";
      requesterPfpEl.style.display = "none";
    }
  }

  // Durée & progression
  trackDuration = durationSec;
  timeSpent     = Math.min(progressSec, durationSec);

  // Retrait temporaire de la transition pour ajuster la barre
  if (timeBarFill) {
    timeBarFill.style.transition = 'none';
  }
  // Mise à jour immédiate
  updateBarAndTimer();
  // Forcer un reflow
  if (timeBarFill) {
    void timeBarFill.offsetWidth;
    // Réactiver la transition
    timeBarFill.style.transition = 'width 0.5s linear';
  }

  // Intervalle de progression
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

  // Couleur (barre + textes)
  if (customColor) {
    const colorHex = '#' + customColor;
    if (timeBarFill)   timeBarFill.style.backgroundColor = colorHex;
    if (trackNameSpan) trackNameSpan.style.color         = colorHex;
    if (artistNameEl)  artistNameEl.style.color          = colorHex;
    if (timeRemaining) timeRemaining.style.color          = colorHex;
  } else {
    // Utilisation de ColorThief pour extraire une couleur dominante
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

  requestAnimationFrame(() => {
    setupScrollingTitle();
  });

  // Animations d'arrivée
  animateElement(coverArt,     'slide-in-left');
  animateElement(timeBarBg,    'slide-in-right');
  animateElement(timeBarFill,  'slide-in-right');
  animateElement(timeRemaining,'slide-in-right');
  animateElement(artistNameEl, 'slide-in-top');
  animateElement(trackNameSpan,'slide-in-top');

  // --- Séquence pour la PFP ---
  if (requesterPfpUrl) {
    // 1) après 3s, on swap vers la PFP
    setTimeout(() => {
      swapToRequesterPfp(coverArt, requesterPfpUrl, (albumParam === 'disc'));

      // 2) 2s plus tard, on revient à l'album art
      setTimeout(() => {
        swapBackToAlbumArt(coverArt, albumArtUrl, (albumParam === 'disc'));
      }, 2000);

    }, 3000);
  }
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

/************************************************************
 * handlePopupDisplay
 * Séquence d'animation fade-out dans l'ordre :
 * 1. Fade out du background, titre, artiste et barre de progression
 * 2. Fade out du "Requested by" et de la mini PFP (si présents)
 * 3. Fade out de la pochette (album art)
 ************************************************************/
function handlePopupDisplay() {
  // Annuler toute animation popup en cours
  cancelPopupAnimation();

  const popupDurationSec = parseFloat(popupDurationParam);
  if (!popupDurationSec || isNaN(popupDurationSec) || popupDurationSec <= 0) return;

  const totalDuration = popupDurationSec * 1000;
  const phase1Duration = totalDuration * 0.6; // fade out background, title, artist, progress bar
  const phase2Duration = totalDuration * 0.4; // fade out requester info (si présent)
  const phase3Duration = totalDuration * 0.4; // fade out album art

  const player = document.getElementById('player');
  const bgBlur = document.getElementById('bg-blur');
  const trackNameEl = document.getElementById('track-name');
  const artistNameEl = document.getElementById('artist-name');
  const timeRow = document.querySelector('.time-row');
  const requesterNameEl = document.getElementById('requester-name');
  const requesterPfpEl = document.getElementById('requester-pfp');
  const coverArt = document.getElementById('cover-art');

  // S'assurer que tous les éléments sont en full opacité
  if (bgBlur) bgBlur.style.opacity = '1';
  if (trackNameEl) trackNameEl.style.opacity = '1';
  if (artistNameEl) artistNameEl.style.opacity = '1';
  if (timeRow) timeRow.style.opacity = '1';
  if (requesterNameEl) requesterNameEl.style.opacity = '1';
  if (requesterPfpEl) requesterPfpEl.style.opacity = '1';
  if (coverArt) coverArt.style.opacity = '1';

  // L'album art a déjà effectué son slide in en full opacité via loadNewTrack

  // Phase 1 : Fade out du background, titre, artiste et barre de progression
  if (bgBlur) {
    bgBlur.style.transition = `opacity ${phase1Duration}ms ease-out`;
    bgBlur.style.opacity = '0';
  }
  if (trackNameEl) {
    trackNameEl.style.transition = `opacity ${phase1Duration}ms ease-out`;
    trackNameEl.style.opacity = '0';
  }
  if (artistNameEl) {
    artistNameEl.style.transition = `opacity ${phase1Duration}ms ease-out`;
    artistNameEl.style.opacity = '0';
  }
  if (timeRow) {
    timeRow.style.transition = `opacity ${phase1Duration}ms ease-out`;
    timeRow.style.opacity = '0';
  }

  // Phase 2 : Après phase 1, fade out de la mention "Requested by" et de la mini PFP (si présents)
  const t1 = setTimeout(() => {
    if (requesterNameEl && requesterNameEl.textContent.trim() !== "") {
      requesterNameEl.style.transition = `opacity ${phase2Duration}ms ease-out`;
      requesterNameEl.style.opacity = '0';
    }
    if (requesterPfpEl && requesterPfpEl.style.display !== "none") {
      requesterPfpEl.style.transition = `opacity ${phase2Duration}ms ease-out`;
      requesterPfpEl.style.opacity = '0';
    }
  }, phase1Duration);
  popupTimeouts.push(t1);

  // Phase 3 : Après phase 1 et 2, fade out de l'album art
  const t2 = setTimeout(() => {
    if (coverArt) {
      coverArt.style.transition = `opacity ${phase3Duration}ms ease-out`;
      coverArt.style.opacity = '0';
    }
  }, phase1Duration + phase2Duration);
  popupTimeouts.push(t2);

  // Final : Après la durée totale, masquer le player
  const t3 = setTimeout(() => {
    if (player) {
      player.style.display = 'none';
    }
  }, totalDuration);
  popupTimeouts.push(t3);
}
