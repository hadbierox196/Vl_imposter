const socket = io();

// DOM elements
const homepage = document.getElementById('homepage');
const lobby = document.getElementById('lobby');
const gameScreen = document.getElementById('gameScreen');
const votingScreen = document.getElementById('votingScreen');
const eliminationScreen = document.getElementById('eliminationScreen');
const nameInput = document.getElementById('nameInput');
const enterButton = document.getElementById('enterButton');
const playerCount = document.getElementById('playerCount');
const playerList = document.getElementById('playerList');
const startButton = document.getElementById('startButton');
const wordDisplay = document.getElementById('wordDisplay');
const timer = document.getElementById('timer');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatButton = document.getElementById('sendChatButton');
const voteList = document.getElementById('voteList');
const voteButton = document.getElementById('voteButton');
const eliminatedPlayer = document.getElementById('eliminatedPlayer');
const imposterReveal = document.getElementById('imposterReveal');
const votingTimerDisplay = document.getElementById('votingTimer'); // Voting timer display

// Global state variables
let playerName = '';
let isImposter = false;
let currentPlayers = [];
let selectedPlayerForVote = null;
let votingTimeLeft; // Voting timer variable
let votingTimerInterval; // Timer interval reference
let eliminationResultDisplayed = false; // Prevents re-rendering of elimination result

// Handle entering the game
enterButton.addEventListener('click', () => {
    playerName = nameInput.value.trim();
    if (playerName) {
        socket.emit('joinGame', playerName);
        homepage.classList.add('hidden');
        lobby.classList.remove('hidden');
    }
});

// Listen for player updates
socket.on('updateLobby', (players) => {
    currentPlayers = players;
    playerCount.innerText = `Players: ${players.length}`;
    playerList.innerHTML = players.map(player => `<li>${player}</li>`).join('');
    if (players.length >= 4) {
        startButton.classList.remove('hidden');
    }
});

// Handle starting the game
startButton.addEventListener('click', () => {
    socket.emit('startGame');
});

// Listen for game start
socket.on('startGame', ({ word, imposter }) => {
    lobby.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    wordDisplay.innerText = `Your word: ${word}`; // Display word for both imposters and regular players

    // Start the game timer
    let timeLeft = 120;
    const timerInterval = setInterval(() => {
        timeLeft--;
        timer.innerText = `Time: ${timeLeft}s`;
        if (timeLeft === 0) {
            clearInterval(timerInterval);
            socket.emit('timeUp');
        }
    }, 1000);
});

// Handle chat
sendChatButton.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (message) {
        socket.emit('sendMessage', { playerName, message });
        chatInput.value = '';
    }
});

socket.on('receiveMessage', ({ playerName, message }) => {
    const msgElement = document.createElement('p');
    msgElement.innerHTML = `<span>${playerName}</span>: ${message}`;
    chatMessages.appendChild(msgElement);
});

// Voting system
socket.on('startVoting', (players) => {
    gameScreen.classList.add('hidden');
    votingScreen.classList.remove('hidden');
    voteList.innerHTML = players.map(player => `<li data-name="${player}">${player}</li>`).join('');

    // Start the voting timer
    votingTimeLeft = 20; // Reset the timer
    votingTimerDisplay.innerText = `Voting Time: ${votingTimeLeft}s`; // Initialize timer display
    clearInterval(votingTimerInterval); // Clear any existing intervals

    votingTimerInterval = setInterval(() => {
        votingTimeLeft--;
        votingTimerDisplay.innerText = `Voting Time: ${votingTimeLeft}s`;
        if (votingTimeLeft <= 0) {
            clearInterval(votingTimerInterval);
            voteButton.classList.add('hidden');
            socket.emit('submitVote', selectedPlayerForVote); // Automatically submit vote
        }
    }, 1000);
});

// Handle vote selection
voteList.addEventListener('click', (event) => {
    if (event.target.tagName === 'LI') {
        selectedPlayerForVote = event.target.getAttribute('data-name');
        // Highlight the selected player
        voteList.querySelectorAll('li').forEach(li => li.classList.remove('selected'));
        event.target.classList.add('selected');
        voteButton.classList.remove('hidden');
    }
});

// Handle voting
voteButton.addEventListener('click', () => {
    if (selectedPlayerForVote) {
        socket.emit('submitVote', selectedPlayerForVote);
        voteButton.classList.add('hidden');
    }
});

// Handle elimination result and prevent re-rendering
socket.on('eliminationResult', ({ eliminated, imposter }) => {
    if (!eliminationResultDisplayed) { // Only show once
        eliminationResultDisplayed = true; // Lock after first display
        votingScreen.classList.add('hidden');
        eliminationScreen.classList.remove('hidden');
        eliminatedPlayer.innerText = `Eliminated Player: ${eliminated}`;
        imposterReveal.innerText = `Imposter: ${imposter}`;
    }
});
