/************************************************************
 * script.js
 * Gère la connexion WebSocket, la logique de pause/lecture,
 * la barre de progression, ET la colorimétrie via ColorThief.
 ************************************************************/

let currentInterval = null;
let timeLeft = 0;          // Nombre de secondes restantes
let isPaused = false;      // Indique si on est en pause
let trackDuration = 180;   // Valeur par défaut

// 1) Récupération des paramètres dans l'URL
const urlParams = new URLSearchParams(window.location.search);
const customWidth = urlParams.get('width');     // ex. ?width=800
const customBarColor = urlParams.get('barColor'); // ex. &barColor=ff0000

// 2) Appliquer la largeur personnalisée (si présente)
if (customWidth) {
  const playerElement = document.querySelector('.player');
  playerElement.style.width = customWidth + 'px';
}

// Création du client WebSocket
const client = new StreamerbotClient({
  host: '127.0.0.1',
  port: 8080,
  endpoint: '/',
  password: 'streamer.bot'
});

/**
 *
