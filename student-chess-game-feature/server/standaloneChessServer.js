import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static(join(__dirname, "public")));
app.use(express.json());

// ─── In-memory state ─────────────────────────────────────────────
const lobby = new Map();   // socketId → { name, rating, status }
const rooms = new Map();   // roomId   → { players, board, turn, moves }
const challenges = new Map(); // challengerId → targetId

function generateRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function getLobbyList() {
  return Array.from(lobby.entries()).map(([id, data]) => ({
    socketId: id,
    ...data,
  }));
}

// ─── Socket.io ────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`Connected: ${socket.id}`);

  // ── Join lobby ──────────────────────────────────────────────────
  socket.on("join_lobby", ({ name, rating = 1200 }) => {
    lobby.set(socket.id, { name, rating, status: "waiting" });
    io.emit("lobby_update", getLobbyList());
    console.log(`${name} joined lobby`);
  });

  // ── Send challenge ──────────────────────────────────────────────
  socket.on("send_challenge", ({ targetId }) => {
    const challenger = lobby.get(socket.id);
    const target = lobby.get(targetId);
    if (!challenger || !target || target.status !== "waiting") {
      socket.emit("challenge_error", { message: "Player unavailable." });
      return;
    }
    challenges.set(socket.id, targetId);
    io.to(targetId).emit("challenge_received", {
      challengerId: socket.id,
      challengerName: challenger.name,
      challengerRating: challenger.rating,
    });
    socket.emit("challenge_sent", { targetName: target.name });
  });

  // ── Accept challenge ────────────────────────────────────────────
  socket.on("accept_challenge", ({ challengerId }) => {
    const white = lobby.get(challengerId);
    const black = lobby.get(socket.id);
    if (!white || !black) return;

    const roomId = generateRoomId();

    // Mark both players as in-game
    lobby.set(challengerId, { ...white, status: "playing" });
    lobby.set(socket.id, { ...black, status: "playing" });

    rooms.set(roomId, {
      players: {
        white: { id: challengerId, name: white.name, rating: white.rating },
        black: { id: socket.id, name: black.name, rating: black.rating },
      },
      moves: [],
      turn: "w",
      status: "playing",
    });

    // Put both in the room
    const challengerSocket = io.sockets.sockets.get(challengerId);
    if (challengerSocket) challengerSocket.join(roomId);
    socket.join(roomId);

    io.to(roomId).emit("game_start", {
      roomId,
      white: { id: challengerId, name: white.name },
      black: { id: socket.id, name: black.name },
    });

    io.emit("lobby_update", getLobbyList());
    challenges.delete(challengerId);
    console.log(`Game started in room ${roomId}: ${white.name} vs ${black.name}`);
  });

  // ── Decline challenge ───────────────────────────────────────────
  socket.on("decline_challenge", ({ challengerId }) => {
    io.to(challengerId).emit("challenge_declined", {
      name: lobby.get(socket.id)?.name || "Opponent",
    });
    challenges.delete(challengerId);
  });

  // ── Make a move ─────────────────────────────────────────────────
  socket.on("make_move", ({ roomId, from, to, promotion }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== "playing") return;

    const isWhitePlayer = room.players.white.id === socket.id;
    const isBlackPlayer = room.players.black.id === socket.id;
    const correctTurn =
      (room.turn === "w" && isWhitePlayer) ||
      (room.turn === "b" && isBlackPlayer);

    if (!correctTurn) return;

    room.moves.push({ from, to, promotion, by: socket.id });
    room.turn = room.turn === "w" ? "b" : "w";

    socket.to(roomId).emit("opponent_move", { from, to, promotion });
  });

  // ── Game over (checkmate / stalemate / resign) ──────────────────
  socket.on("game_over", ({ roomId, reason, winner }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.status = "finished";

    io.to(roomId).emit("game_ended", { reason, winner });

    // Return players to lobby
    [room.players.white.id, room.players.black.id].forEach((id) => {
      const p = lobby.get(id);
      if (p) lobby.set(id, { ...p, status: "waiting" });
    });

    rooms.delete(roomId);
    io.emit("lobby_update", getLobbyList());
    console.log(`Room ${roomId} ended: ${reason}`);
  });

  // ── Chat message ────────────────────────────────────────────────
  socket.on("chat_message", ({ roomId, message }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const sender =
      room.players.white.id === socket.id
        ? room.players.white.name
        : room.players.black.name;
    io.to(roomId).emit("chat_message", { sender, message });
  });

  // ── Disconnect ──────────────────────────────────────────────────
  socket.on("disconnect", () => {
    // Notify opponent if mid-game
    rooms.forEach((room, roomId) => {
      const isInRoom =
        room.players.white.id === socket.id ||
        room.players.black.id === socket.id;
      if (isInRoom && room.status === "playing") {
        socket.to(roomId).emit("opponent_disconnected");
        const otherId =
          room.players.white.id === socket.id
            ? room.players.black.id
            : room.players.white.id;
        const other = lobby.get(otherId);
        if (other) lobby.set(otherId, { ...other, status: "waiting" });
        rooms.delete(roomId);
      }
    });
    lobby.delete(socket.id);
    io.emit("lobby_update", getLobbyList());
    console.log(`Disconnected: ${socket.id}`);
  });
});

// ─── REST: leaderboard (extend with DB as needed) ────────────────
const leaderboard = [];

app.post("/api/result", (req, res) => {
  const { name, result, opponent, rating } = req.body;
  leaderboard.push({ name, result, opponent, rating, date: new Date() });
  leaderboard.sort((a, b) => b.rating - a.rating);
  res.json({ success: true });
});

app.get("/api/leaderboard", (req, res) => {
  res.json(leaderboard.slice(0, 20));
});

// ─── Start server ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Chess server running at http://localhost:${PORT}`);
});
