const lobby = new Map();
const rooms = new Map();
const challenges = new Map();
const openChallenges = new Map();
const leaderboard = [];

function generateRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function getLobbyList() {
  const activeChallenges = Array.from(openChallenges.entries()).map(([id, data]) => ({
    hostId: id,
    ...data,
  }));
  return {
    players: Array.from(lobby.entries()).map(([id, data]) => ({
      socketId: id,
      ...data,
    })),
    openChallenges: activeChallenges,
  };
}

export function registerChessSockets(io) {
  io.on("connection", (socket) => {
    socket.on("join_lobby", ({ name, rating = 1200 }) => {
      // Clean up any existing lobby entries with the exact same name to prevent duplicates due to rapid page reloads/navigation
      for (const [id, data] of lobby.entries()) {
        if (id !== socket.id && data.name === name) {
          lobby.delete(id);
          openChallenges.delete(id);
          const oldSocket = io.sockets.sockets.get(id);
          if (oldSocket) {
            oldSocket.disconnect(true);
          }
        }
      }
      lobby.set(socket.id, { name, rating, status: "waiting" });
      io.emit("lobby_update", getLobbyList());
    });

    socket.on("leave_lobby", () => {
      lobby.delete(socket.id);
      openChallenges.delete(socket.id);
      io.emit("lobby_update", getLobbyList());
    });

    socket.on("open_challenge", ({ challengeName }) => {
      const player = lobby.get(socket.id);
      if (!player || player.status !== "waiting") {
        socket.emit("challenge_error", { message: "Join the lobby before opening a challenge." });
        return;
      }

      openChallenges.set(socket.id, {
        challengerName: player.name,
        challengeName: challengeName || `Match with ${player.name}`,
        rating: player.rating || 1200
      });
      socket.emit("challenge_sent", { targetName: "an available student" });
      io.emit("lobby_update", getLobbyList());
    });

    socket.on("cancel_challenge", () => {
      openChallenges.delete(socket.id);
      io.emit("lobby_update", getLobbyList());
    });

    socket.on("accept_open_challenge", ({ hostId }) => {
      const host = lobby.get(hostId);
      const challenger = lobby.get(socket.id);

      if (!host || host.status !== "waiting" || !openChallenges.has(hostId)) {
        socket.emit("challenge_error", { message: "This challenge is no longer available." });
        return;
      }

      openChallenges.delete(hostId);

      const roomId = generateRoomId();
      lobby.set(hostId, { ...host, status: "playing" });
      lobby.set(socket.id, { ...challenger, status: "playing" });

      rooms.set(roomId, {
        players: {
          white: { id: hostId, name: host.name, rating: host.rating },
          black: { id: socket.id, name: challenger.name, rating: challenger.rating },
        },
        moves: [],
        turn: "w",
        status: "playing",
      });

      const hostSocket = io.sockets.sockets.get(hostId);
      if (hostSocket) {
        hostSocket.join(roomId);
      }
      socket.join(roomId);

      io.to(roomId).emit("game_start", {
        roomId,
        white: { id: hostId, name: host.name },
        black: { id: socket.id, name: challenger.name },
      });

      io.emit("lobby_update", getLobbyList());
    });

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

    socket.on("accept_challenge", ({ challengerId }) => {
      const white = lobby.get(challengerId);
      const black = lobby.get(socket.id);

      if (!white || !black) {
        return;
      }

      const roomId = generateRoomId();
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

      const challengerSocket = io.sockets.sockets.get(challengerId);
      if (challengerSocket) {
        challengerSocket.join(roomId);
      }
      socket.join(roomId);

      io.to(roomId).emit("game_start", {
        roomId,
        white: { id: challengerId, name: white.name },
        black: { id: socket.id, name: black.name },
      });

      challenges.delete(challengerId);
      io.emit("lobby_update", getLobbyList());
    });

    socket.on("decline_challenge", ({ challengerId }) => {
      io.to(challengerId).emit("challenge_declined", {
        name: lobby.get(socket.id)?.name || "Opponent",
      });
      challenges.delete(challengerId);
    });

    socket.on("make_move", ({ roomId, from, to, promotion }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== "playing") {
        return;
      }

      const isWhitePlayer = room.players.white.id === socket.id;
      const isBlackPlayer = room.players.black.id === socket.id;
      const correctTurn =
        (room.turn === "w" && isWhitePlayer) ||
        (room.turn === "b" && isBlackPlayer);

      if (!correctTurn) {
        return;
      }

      room.moves.push({ from, to, promotion, by: socket.id });
      room.turn = room.turn === "w" ? "b" : "w";
      socket.to(roomId).emit("opponent_move", { from, to, promotion });
    });

    socket.on("game_over", ({ roomId, reason, winner }) => {
      const room = rooms.get(roomId);
      if (!room) {
        return;
      }

      room.status = "finished";
      io.to(roomId).emit("game_ended", { reason, winner });

      [room.players.white.id, room.players.black.id].forEach((id) => {
        const player = lobby.get(id);
        if (player) {
          lobby.set(id, { ...player, status: "waiting" });
        }
      });

      rooms.delete(roomId);
      io.emit("lobby_update", getLobbyList());
    });

    socket.on("chat_message", ({ roomId, message }) => {
      const room = rooms.get(roomId);
      if (!room || typeof message !== "string" || message.trim().length === 0) {
        return;
      }

      const sender =
        room.players.white.id === socket.id
          ? room.players.white.name
          : room.players.black.name;

      io.to(roomId).emit("chat_message", {
        sender,
        senderId: socket.id,
        message: message.trim().slice(0, 120),
      });
    });

    socket.on("disconnect", () => {
      openChallenges.delete(socket.id);

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
          if (other) {
            lobby.set(otherId, { ...other, status: "waiting" });
          }
          rooms.delete(roomId);
        }
      });

      lobby.delete(socket.id);
      io.emit("lobby_update", getLobbyList());
    });
  });
}

export function registerChessApiRoutes(router) {
  router.post("/api/student-chess/result", (req, res) => {
    const { name, result, opponent, rating } = req.body;
    leaderboard.push({ name, result, opponent, rating, date: new Date() });
    leaderboard.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    res.json({ success: true });
  });

  router.get("/api/student-chess/leaderboard", (req, res) => {
    res.json(leaderboard.slice(0, 20));
  });
}
