// -------------- //
// WebSocket Client Setup
// -------------- //

const client = new StreamerbotClient({
    host: '127.0.0.1',
    port: 8080,
    endpoint: '/',
    password: 'streamer.bot'  // Remplacez par votre mot de passe
});

// -------------- //
// Écoute des événements Custom
// -------------- //
client.on('General.Custom', ({ event, data }) => {
    // data contient le JSON envoyé côté C#
    // Ex. data = {
    //   widget: "spot2sbPlayer",
    //   songName: "Exchange",
    //   artistName: "Massive Attack",
    //   albumArtUrl: "https://...",
    //   duration: 280
    // }

    // On vérifie qu'on traite le bon widget
    if (data?.widget !== "spot2sbPlayer") return;

    console.log("Nouveau message spot2sbPlayer reçu :", data);

    // Récupération des champs
    const songName    = data?.songName    || "Titre inconnu";
    const artistName  = data?.artistName  || "Artiste inconnu";
    const albumArtUrl = data?.albumArtUrl || "";
    const trackDuration = data?.duration  || 180; // Par défaut 3 minutes

    // Mettre à jour le lecteur spot2sb
    // Par exemple, on réutilise la fonction loadNewTrack vue précédemment
    // Il suffit de la modifier pour accepter des paramètres
    loadNewTrack(songName, artistName, albumArtUrl, trackDuration);
});

// -------------- //
// Exemple d'implémentation de loadNewTrack
// -------------- //
function loadNewTrack(songName, artistName, albumArtUrl, trackDuration) {
    // Sélection des éléments
    const playerBg    = document.getElementById("player-bg");
    const albumArt    = document.getElementById("album-art");
    const trackNameEl = document.getElementById("track-name");
    const artistNameEl= document.getElementById("artist-name");
    const timeBar     = document.getElementById("time-bar");
    const timer       = document.getElementById("timer");

    // Réinitialiser le temps
    let currentTime = 0;
    timer.textContent = "0:00";
    timeBar.style.width = "0%";

    // Mettre à jour l’image de fond
    playerBg.style.backgroundImage = `url('${albumArtUrl}')`;
    playerBg.style.opacity = "0";
    setTimeout(() => { playerBg.style.opacity = "1"; }, 50);

    // Mettre à jour l’album art
    albumArt.style.backgroundImage = `url('${albumArtUrl}')`;
    albumArt.style.opacity = "0";
    albumArt.style.transform = "translateX(-30px)";
    albumArt.offsetHeight; // Force le reflow pour relancer l'animation
    albumArt.style.animation = "slideInLeft 0.6s forwards";

    // Mettre à jour titre et artiste
    trackNameEl.textContent = songName;
    trackNameEl.style.opacity = "0";
    trackNameEl.style.transform = "translateX(30px)";
    trackNameEl.offsetHeight;
    trackNameEl.style.animation = "slideInRight 0.6s forwards";
    trackNameEl.style.animationDelay = "0.2s";

    artistNameEl.textContent = artistName;
    artistNameEl.style.opacity = "0";
    artistNameEl.style.transform = "translateX(30px)";
    artistNameEl.offsetHeight;
    artistNameEl.style.animation = "slideInRight 0.6s forwards";
    artistNameEl.style.animationDelay = "0.4s";

    // Démarrer la progression de la barre
    let intervalId = setInterval(() => {
        currentTime++;
        if (currentTime >= trackDuration) {
            clearInterval(intervalId);
            return;
        }
        timer.textContent = formatTime(currentTime);
        timeBar.style.width = ((currentTime / trackDuration) * 100) + "%";
    }, 1000);
}

// Formatage du timer
function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" + s : s}`;
}
