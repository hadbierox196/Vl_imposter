const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 3000;

let players = [];
let words = [
    'phone', 'table', 'chair', 'laptop', 'pen', 'book', 'cup', 'bottle', 
    'lamp', 'clock', 'key', 'wallet', 'notebook', 'shoe', 'bag', 'pencil', 
    'scissors', 'paper', 'plate', 'spoon', 'fork', 'knife', 'glass', 
    'remote', 'cushion', 'blanket', 'pillow', 'charger', 'headphones', 
    'brush', 'comb', 'mirror', 'towel', 'soap', 'toothbrush', 'toothpaste', 
    'shampoo', 'mouse', 'keyboard', 'monitor', 'backpack', 'jacket', 
    'hat', 'gloves', 'belt', 'shirt', 'jeans', 'umbrella', 'watch', 
    'camera', 'speaker', 'wallet', 'coin', 'ring', 'necklace', 'earring', 
    'cupboard', 'drawer', 'shelf', 'pan', 'pot', 'stove', 'oven', 
    'microwave', 'fridge', 'freezer', 'sink', 'faucet', 'blender', 
    'toaster', 'printer', 'stapler', 'eraser', 'tape', 'ruler', 
    'highlighter', 'marker', 'clip', 'fan', 'air conditioner', 
    'heater', 'curtain', 'window', 'door', 'frame', 'shoe', 'sock', 
    'tie', 'bench', 'rug', 'bin', 'broom', 'dustpan', 'mop', 
    'ladder', 'bucket', 'vacuum', 'iron', 'tablet', 'tv', 'controller', 
    'lighter', 'batteries', 'pliers'
];
let imposter = null;
let wordForOthers = '';
let votes = {};
let gameStarted = false; // Track whether the game has started

// Serve static files
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('New player connected:', socket.id);

    // Handle player joining
    socket.on('joinGame', (name) => {
        if (gameStarted) {
            socket.emit('joinError', 'Can\'t join game in progress');
            return; // Prevent joining if game is in progress
        }

        players.push({ id: socket.id, name });
        io.emit('updateLobby', players.map(player => player.name));

        // Check if we have 4 players to start the game
        if (players.length === 4) {
            assignWordsAndStartGame();
        }
    });

    // Start game with random imposter selection
    const assignWordsAndStartGame = () => {
        if (players.length < 4) return; // Ensure there are enough players

        const shuffledPlayers = [...players].sort(() => 0.5 - Math.random());

        // Check to ensure there are players in the shuffled list
        if (shuffledPlayers.length >= 4) {
            imposter = shuffledPlayers[3].name; // Assign the 4th player as imposter
        } else {
            console.log("Error: Not enough players to assign an imposter.");
            return;
        }

        // Assign words to other players
        const randomWord = words[Math.floor(Math.random() * words.length)];
        wordForOthers = randomWord;

        // Notify the first three players with the same word
        shuffledPlayers.slice(0, 3).forEach(player => {
            io.to(player.id).emit('startGame', { word: randomWord, imposter: null });
        });

        // Assign a different word to the imposter
        const imposterPlayer = shuffledPlayers[3];
        io.to(imposterPlayer.id).emit('startGame', { word: 'Imposter', imposter: imposterPlayer.name });

        gameStarted = true; // Set gameStarted to true
    };

    // Handle chat
    socket.on('sendMessage', ({ playerName, message }) => {
        io.emit('receiveMessage', { playerName, message });
    });

    // Handle timer ending
    socket.on('timeUp', () => {
        io.emit('startVoting', players.map(player => player.name));

        // Start a 20-second countdown for auto-reveal after voting phase
        setTimeout(() => {
            revealImposterAndEliminatedPlayer();
        }, 20000); // 20 seconds
    });

    // Handle vote submission
    socket.on('submitVote', (votedPlayer) => {
        if (!votes[votedPlayer]) {
            votes[votedPlayer] = 0;
        }
        votes[votedPlayer]++;

        // If all players except the imposter have voted, determine the elimination result
        if (Object.keys(votes).length === players.length - 1) { // Imposter doesn't vote
            revealImposterAndEliminatedPlayer();
        }
    });

    // Reveal the imposter and eliminated player after the voting phase or when the countdown ends
    const revealImposterAndEliminatedPlayer = () => {
        if (Object.keys(votes).length > 0) {
            let eliminated = Object.keys(votes).reduce((a, b) => (votes[a] > votes[b] ? a : b));
            io.emit('eliminationResult', { eliminated, imposter });
            resetGame(); // Reset the game for the next round
        } else {
            // If no votes were cast, automatically select a random player for elimination
            const randomPlayer = players[Math.floor(Math.random() * players.length)].name;
            io.emit('eliminationResult', { eliminated: randomPlayer, imposter });
            resetGame(); 
        }
    };

    // Handle player disconnect
    socket.on('disconnect', () => {
        players = players.filter(player => player.id !== socket.id);
        io.emit('updateLobby', players.map(player => player.name));
        console.log('Player disconnected:', socket.id);
    });
});

// Reset game for the next round
const resetGame = () => {
    votes = {}; // Reset votes
    imposter = null; // Clear imposter
    wordForOthers = ''; // Clear word
    gameStarted = false; // Reset gameStarted for new rounds
    // Optionally reset player state if needed
};

// Set the host to '0.0.0.0' to allow external connections
server.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
