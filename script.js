// Exemple de fonction pour charger un nouveau morceau
function loadNewTrack(songName, artistName, albumArtUrl, trackDuration) {
  // Sélections
  const bgBlur     = document.getElementById("bg-blur");
  const coverArt   = document.getElementById("cover-art");
  const trackNameEl= document.getElementById("track-name");
  const artistNameEl= document.getElementById("artist-name");
  const timeBarFill= document.getElementById("time-bar-fill");
  const timeRemainingEl = document.getElementById("time-remaining");

  // Mettre à jour le fond flou
  bgBlur.style.backgroundImage = `url('${albumArtUrl}')`;

  // Pochette
  coverArt.style.backgroundImage = `url('${albumArtUrl}')`;

  // Titres
  trackNameEl.textContent = songName;
  artistNameEl.textContent = artistName;

  // On réinitialise la barre à 100%
  timeBarFill.style.width = "100%";

  // On démarre un timer "countdown"
  let timeRemaining = trackDuration; // en secondes
  timeRemainingEl.textContent = formatTime(timeRemaining);

  // Si un ancien interval existe, on le clear
  if (window.currentInterval) {
    clearInterval(window.currentInterval);
  }

  // Créer un nouvel interval
  window.currentInterval = setInterval(() => {
    timeRemaining--;
    if (timeRemaining <= 0) {
      timeRemaining = 0;
      clearInterval(window.currentInterval);
    }
    // Mettre à jour le timer texte
    timeRemainingEl.textContent = formatTime(timeRemaining);

    // Calcul du pourcentage restant
    const percent = (timeRemaining / trackDuration) * 100;
    timeBarFill.style.width = percent + "%";

  }, 1000);
}

// Formatage mm:ss
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0"+s : s}`;
}

// DEMO: On peut appeler loadNewTrack pour tester
document.addEventListener("DOMContentLoaded", () => {
  // Simule un morceau de 39 secondes
  loadNewTrack("BACKBONE", "Chase & Status", "https://i.imgur.com/saxtwGf.jpeg", 39);
});
