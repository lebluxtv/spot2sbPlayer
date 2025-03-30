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

// Connexion WebSocket (Streamer.bot)
// Déclaration et initialisation de 'client' avant toute utilisation
const client = new StreamerbotClient({
  host: '127.0.0.1',
  port: 8080,
  endpoint: '/',
  // password: 'streamer.bot'
});

// Sélection d’éléments DOM
const infoDiv = document.getElementById('infoDiv');
const playerDiv = document.getElementById('player');

// Ajout d'un écouteur pour intercepter les erreurs de connexion
client.on('error', (error) => {
  if (error && error.message && error.message.indexOf("WebSocket closed") !== -1) {
    infoDiv.textContent = "Check your streamer.bot Websocket Server, it must be enabled !";
    infoDiv.style.color = "#8B0000"; // texte en rouge foncé
    infoDiv.style.fontSize = "1.2rem";
    infoDiv.style.padding = "20px";
  }
});

// Mode WPF (obligatoire dans cet environnement)
const isWpfMode = (hostApp === "wpf");
if (isWpfMode) {
  const spotifyConnected = sessionStorage.getItem("spotifyConnected");
  if (!spotifyConnected && infoDiv) {
    // Message par défaut pour WPF
    infoDiv.textContent = "Please launch Spotify and play song to preview the player .";
    infoDiv.style.color = "#ff0";
    infoDiv.style.fontSize = "1.2rem";
    infoDiv.style.padding = "20px";
  }
}

// Vérification différée : après 3 secondes, si la connexion WebSocket n'est pas ouverte, afficher le message d'erreur
setTimeout(() => {
  if (!client.socket || client.socket.readyState !== WebSocket.OPEN) {
    infoDiv.textContent = "Check your streamer.bot Websocket Server, it must be enabled !";
    infoDiv.style.color = "#8B0000";
    infoDiv.style.fontSize = "1.2rem";
    infoDiv.style.padding = "20px";
  }
}, 3000);

// Préparation UI
if (playerDiv) {
  // Au départ, on le cache
  playerDiv.style.display = 'none';
  if (customWidth) {
    playerDiv.style.width = customWidth + 'px';
  }
}
if (opacityParam) {
  const numericVal = parseFloat(opacityParam) / 100;
  console.log("opacityParam:", opacityParam, "calculated numericVal:", numericVal);
  if (!isNaN(numericVal) && numericVal >= 0 && numericVal <= 1) {
    const bgBlur = document.getElementById('bg-blur');
    if (bgBlur) {
      bgBlur.style.opacity = numericVal;
      console.log("Applied opacity:", bgBlur.style.opacity);
    }
  }
}

let lastSongName = "";

/************************************************************
 * Réception de l'événement "General.Custom"
 ************************************************************/
client.on('General.Custom', ({ event, data }) => {
  if (data?.widget !== 'spot2sbPlayer') return;
  console.log("Nouveau message spot2sbPlayer reçu:", data);
  if (data.noSong === true) {
    if (playerDiv) {
      playerDiv.style.display = 'none';
    }
    return;
  }
  if (isWpfMode && infoDiv) {
    infoDiv.textContent = "";
    sessionStorage.setItem("spotifyConnected", "true");
  }
  if (playerDiv) {
    playerDiv.style.display = 'block';
  }
  const stateValue = data.state || "paused";
  if (stateValue === 'paused') {
    pauseProgressBar();
  } else {
    resumeProgressBar();
  }
  const requesterName = data.requesterName || "";
  const requesterPfpUrl = data.requesterPfpUrl || "";
  if (data.songName) {
    const songName    = data.songName;
    const artistName  = data.artistName;
    const albumArtUrl = data.albumArtUrl || "";
    const durationSec = data.duration   || 180;
    const progressSec = data.progress   || 0;
    if (songName !== lastSongName) {
      lastSongName = songName;
      cancelPopupAnimation();
      loadNewTrack(songName, artistName, albumArtUrl, durationSec, progressSec, requesterName, requesterPfpUrl);
      if (popupDurationParam) {
        handlePopupDisplay();
      }
    } else {
      syncProgress(progressSec);
    }
  }
});

/************************************************************
 * swapToRequesterPfp / swapBackToAlbumArt
 ************************************************************/
function swapToRequesterPfp(coverArtEl, pfpUrl, isDiscMode) {
  coverArtEl.style.transition = 'transform 0.6s, opacity 0.6s';
  coverArtEl.style.opacity = '0';
  setTimeout(() => {
    coverArtEl.style.backgroundImage = `url('${pfpUrl}')`;
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
  const requesterNameEl = document.getElementById("requester-name");
  const requesterPfpEl  = document.getElementById("requester-pfp");
  if (bgBlur) {
    bgBlur.style.backgroundImage = `url('${albumArtUrl}')`;
    let opacityToUse = opacityParam ? parseFloat(opacityParam) / 100 : 1;
    bgBlur.style.opacity = opacityToUse.toString();
  }
  if (coverArt) {
    coverArt.style.display = 'block';
    coverArt.style.backgroundImage = `url('${albumArtUrl}')`;
    coverArt.style.transition = `transform 600ms ease-out`;
    coverArt.style.transform = 'translateX(-100%)';
    void coverArt.offsetWidth;
    coverArt.style.transform = 'translateX(0)';
    coverArt.style.opacity = '1';
    if (albumParam === 'disc') {
      coverArt.classList.add('disc-mode');
      setTimeout(() => {
        coverArt.style.transform = '';
      }, 650);
    } else {
      coverArt.classList.remove('disc-mode');
    }
  }
  if (trackNameSpan) {
    trackNameSpan.textContent = songName;
    trackNameSpan.style.opacity = '1';
  }
  if (artistNameEl) {
    artistNameEl.textContent  = artistName;
    artistNameEl.style.opacity = '1';
  }
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
  trackDuration = durationSec;
  timeSpent     = Math.min(progressSec, durationSec);
  if (timeBarFill) {
    timeBarFill.style.transition = 'none';
  }
  updateBarAndTimer();
  if (timeBarFill) {
    void timeBarFill.offsetWidth;
    timeBarFill.style.transition = 'width 0.5s linear';
  }
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
    const timeRemainingEl = document.getElementById("time-remaining");
    if (timeRemainingEl) timeRemainingEl.style.color      = colorHex;
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
      if (timeBarFill)   timeBarFill.style.backgroundColor = rgbString(barColorArr);
      if (trackNameSpan) trackNameSpan.style.color         = rgbString(textColorArr);
      if (artistNameEl)  artistNameEl.style.color          = rgbString(textColorArr);
      const timeRemainingEl = document.getElementById("time-remaining");
      if (timeRemainingEl) timeRemainingEl.style.color     = rgbString(textColorArr);
    };
  }
  requestAnimationFrame(() => {
    setupScrollingTitle();
  });
  animateElement(coverArt,     'slide-in-left');
  animateElement(timeBarBg,    'slide-in-right');
  animateElement(timeBarFill,  'slide-in-right');
  animateElement(timeRemaining,'slide-in-right');
  animateElement(artistNameEl, 'slide-in-top');
  animateElement(trackNameSpan,'slide-in-top');
  if (requesterPfpUrl) {
    setTimeout(() => {
      swapToRequesterPfp(coverArt, requesterPfpUrl, (albumParam === 'disc'));
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
 ************************************************************/
function handlePopupDisplay() {
  cancelPopupAnimation();
  const popupDurationSec = parseFloat(popupDurationParam);
  if (!popupDurationSec || isNaN(popupDurationSec) || popupDurationSec <= 0) return;
  const totalDuration = popupDurationSec * 1000;
  const phase1Duration = totalDuration * 0.5;
  const phase2Duration = totalDuration * 0.3;
  const phase3Duration = totalDuration * 0.1;
  const player = document.getElementById('player');
  const bgBlur = document.getElementById('bg-blur');
  const trackNameEl = document.getElementById('track-name');
  const artistNameEl = document.getElementById('artist-name');
  const timeRow = document.querySelector('.time-row');
  const requesterNameEl = document.getElementById('requester-name');
  const requesterPfpEl = document.getElementById('requester-pfp');
  const coverArt = document.getElementById('cover-art');
  if (bgBlur) bgBlur.style.opacity = '1';
  if (trackNameEl) trackNameEl.style.opacity = '1';
  if (artistNameEl) artistNameEl.style.opacity = '1';
  if (timeRow) timeRow.style.opacity = '1';
  if (requesterNameEl) requesterNameEl.style.opacity = '1';
  if (requesterPfpEl) requesterPfpEl.style.opacity = '1';
  if (coverArt) coverArt.style.opacity = '1';
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
  const t2 = setTimeout(() => {
    if (coverArt) {
      coverArt.style.transition = `opacity ${phase3Duration}ms ease-out`;
      coverArt.style.opacity = '0';
    }
  }, phase1Duration + phase2Duration);
  popupTimeouts.push(t2);
  const t3 = setTimeout(() => {
    if (player) {
      player.style.display = 'none';
    }
  }, totalDuration);
  popupTimeouts.push(t3);
}

/************************************************************
 * Centrage natif de la page dès le chargement
 ************************************************************/
window.addEventListener('DOMContentLoaded', () => {
  // Laisser le CSS gérer la hauteur via 100vh.
  // Ne redéfinissez pas la hauteur ici.
  document.documentElement.style.margin = '0';
  document.documentElement.style.padding = '0';
  //document.documentElement.style.height = '100vh'; // Laissez le CSS faire le travail

  document.body.style.margin = '0';
  document.body.style.padding = '0';
  //document.body.style.height = '100vh'; // Laissez le CSS faire le travail

  // Centrage horizontal + vertical est déjà géré par le CSS.
});
