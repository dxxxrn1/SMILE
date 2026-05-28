# Chess Game

A full-stack chess game built with Node.js, Express, and Socket.io.

## Features
- Play vs Bot (Easy / Medium / Hard difficulty using Minimax + Alpha-Beta pruning)
- Multiplayer lobby — challenge online users in real time
- Full chess rules: castling, en passant, pawn promotion, check, checkmate, stalemate
- Live chat during multiplayer games
- Move history, captured pieces, material score

## Setup

### 1. Install dependencies
```bash
cd chess-game
npm install
```

### 2. Configure environment
Edit `.env` if needed:
```
PORT=3000
```

### 3. Run the server
```bash
# Production
npm start

# Development (auto-restart)
npm run dev
```

### 4. Open in browser
```
http://localhost:3000
```

## Project structure
```
chess-game/
├── server.js          ← Express + Socket.io server
├── public/
│   └── index.html     ← Full frontend (chess engine + UI)
├── package.json
├── .env
└── README.md
```

## Adding to your existing SMILE project

1. Copy `server.js` logic into your existing Express server
2. Copy `public/index.html` into your views or serve it from a route:
   ```js
   app.get('/chess', (req, res) => res.sendFile('chess/index.html', { root: 'public' }));
   ```
3. The Socket.io server attaches to your existing `httpServer` instance

## Multiplayer flow
```
Player A opens lobby  →  socket.emit('join_lobby')
Player A clicks challenge  →  socket.emit('send_challenge', { targetId })
Player B receives  →  socket.on('challenge_received')
Player B accepts  →  socket.emit('accept_challenge')
Server creates room  →  both get socket.on('game_start')
Each move  →  socket.emit('make_move')  →  opponent gets socket.on('opponent_move')
Game ends  →  socket.emit('game_over')  →  both get socket.on('game_ended')
```
