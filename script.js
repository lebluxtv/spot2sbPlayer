/************************************************************
 * script.js
 * Code complet : connexion WebSocket + loadNewTrack
 ************************************************************/

/** 
 * 1) Connexion WebSocket 
 *    - On suppose que vous utilisez une classe "StreamerbotClient"
 *      pour établir la connexion à Streamer.bot.
 *    - Ajustez host, port, endpoint, password selon votre config.
 */

// Stocke l'ID du timer pour la barre de progression
let currentInterval = null;

// Création du client WebSocket
const client = new StreamerbotClient({
  host: '127.0.0.1',
  port: 8080,
  endpoint: '/',
  password: 'streamer.bot' // Changez selon votre config Streamer.bot
});

/**
 * 2) Écoute de l'événement "General.Custom"
 *    - Quand le script C# diffuse un JSON via CPH.WebsocketBroadcastJson,
 *      Streamer.bot l'envoie comme un "General.Custom".
 *    - On vérifie "widget = spot2sbPlayer".
 */
client.on('General.Custom', ({ event, data }) => {
  // Filtre : on ne traite que si widget = "spot2sbPlayer"
  if (data?.widget !== 'spot2sbPlayer') return;

  console.log("Nouveau message spot2sbPlayer reçu:", data);

  // Récupération des champs
  const songName      = data?.songName      || "Titre inconnu";
  const artistName    = data?.artistName    || "Artiste inconnu";
  const albumArtUrl   = data?.albumArtUrl   || "";
  // Durée en secondes (le script C# envoie déjà la durée convertie)
  const trackDuration = data?.duration      || 180;

  // Appel de la fonction pour mettre à jour le lecteur
  loadNewTrack(songName, artistName, albumArtUrl, trackDuration);
});

/************************************************************
 * 3) Fonction loadNewTrack 
 *    - Met à jour l'interface (image de fond, pochette, titres)
 *    - Lance un compte à rebours pour la barre de progression
 ************************************************************/
function loadNewTrack(songName, artistName, albumArtUrl, trackDuration) {
  // Sélections
  const bgBlur        = document.getElementById("bg-blur");
  const coverArt      = document.getElementById("cover-art");
  const trackNameEl   = document.getElementById("track-name");
  const artistNameEl  = document.getElementById("artist-name");
  const timeBarFill   = document.getElementById("time-bar-fill");
  const timeRemaining = document.getElementById("time-remaining");

  // Mettre à jour l'arrière-plan flou
  bgBlur.style.backgroundImage = `url('${albumArtUrl}')`;

  // Mettre à jour la pochette
  coverArt.style.backgroundImage = `url('${albumArtUrl}')`;

  // Mettre à jour le titre et l'artiste
  trackNameEl.textContent = songName;
  artistNameEl.textContent = artistName;

  // Barre de progression : pleine au départ (100%)
  timeBarFill.style.width = "100%";

  // Timer dégressif : part de "trackDuration" secondes
  let timeLeft = trackDuration;
  timeRemaining.textContent = formatTime(timeLeft);

  // Si un timer précédent existe, on l'arrête
  if (currentInterval) {
    clearInterval(currentInterval);
    currentInterval = null;
  }

  // On lance un nouvel interval (toutes les secondes)
  currentInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      timeLeft = 0;
      clearInterval(currentInterval);
      currentInterval = null;
    }

    // Mise à jour du timer texte (mm:ss)
    timeRemaining.textContent = formatTime(timeLeft);

    // Barre qui va de 100% à 0% au fil du compte à rebours
    const percent = (timeLeft / trackDuration) * 100;
    timeBarFill.style.width = percent + "%";

  }, 1000);
}

/************************************************************
 * 4) Fonction formatTime
 *    - Convertit un nombre de secondes en "mm:ss"
 ************************************************************/
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? "0"+s : s}`;
}
