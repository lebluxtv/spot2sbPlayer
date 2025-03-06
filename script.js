// Si un timer existe déjà, on l'arrête
let currentInterval = null;

function loadNewTrack(songName, artistName, albumArtUrl, trackDuration) {
  // Sélections
  const bgBlur       = document.getElementById("bg-blur");
  const coverArt     = document.getElementById("cover-art");
  const trackNameEl  = document.getElementById("track-name");
  const artistNameEl = document.getElementById("artist-name");
  const timeBarFill  = document.getElementById("time-bar-fill");
  const timeRemainingEl = document.getElementById("time-remaining");

  // Mettre à jour le fond
  bgBlur.style.backgroundImage = `url('${albumArtUrl}')`;
  // Mettre à jour la pochette
  coverArt.style.backgroundImage = `url('${albumArtUrl}')`;

  // Titre / artiste
  trackNameEl.textContent = songName;
  artistNameEl.textContent = artistName;

  // Barre pleine au départ
  timeBarFill.style.width = "100%";

  // Timer dégressif
  let timeLeft = trackDuration;
  timeRemainingEl.textContent = formatTime(timeLeft);

  // Clear ancien interval
  if (currentInterval) {
    clearInterval(currentInterval);
    currentInterval = null;
  }

  // Nouveau interval
  currentInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      timeLeft = 0;
      clearInterval(currentInterval);
      currentInterval = null;
    }

    // Mise à jour timer texte
    timeRemainingEl.textContent = formatTime(timeLeft);

    // Mise à jour barre (de 100% vers 0%)
    const percent = (timeLeft / trackDuration) * 100;
    timeBarFill.style.width = percent + "%";

  }, 1000);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0"+s : s}`;
}
