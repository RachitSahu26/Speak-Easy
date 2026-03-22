/* eslint-disable @typescript-eslint/no-require-imports */
const http = require("http");
const { Server } = require("socket.io");

const PORT = Number(process.env.SOCKET_PORT || 3005);

const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      ok: true,
      message: "Socket server is running",
      port: PORT,
    }),
  );
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const waitingQueue = [];
const waitingSet = new Set();
const activeMatches = new Map();
const userSockets = new Map();
const socketUsers = new Map();
const userProfiles = new Map();

function broadcastOnlineCount() {
  io.emit("server:online-count", {
    count: userSockets.size,
  });

}

function registerUserSocket(socket, userId, name) {
  if (!userId) return;

  const normalizedUserId = String(userId);
  const currentUserId = socketUsers.get(socket.id);

  if (currentUserId === normalizedUserId) {
    return;
  }

  if (currentUserId) {
    unregisterUserSocket(socket.id);
  }

  let sockets = userSockets.get(normalizedUserId);
  if (!sockets) {
    sockets = new Set();
    userSockets.set(normalizedUserId, sockets);
  }

  sockets.add(socket.id);
  socketUsers.set(socket.id, normalizedUserId);
  userProfiles.set(normalizedUserId, {
    id: normalizedUserId,
    name: name || `User-${normalizedUserId.slice(0, 6)}`,
  });
  broadcastOnlineCount();
}

function unregisterUserSocket(socketId) {
  const userId = socketUsers.get(socketId);
  if (!userId) return;

  const sockets = userSockets.get(userId);
  if (sockets) {
    sockets.delete(socketId);

    if (sockets.size === 0) {
      userSockets.delete(userId);
    }
  }

  socketUsers.delete(socketId);
  broadcastOnlineCount();
}

function removeFromQueue(socketId) {
  if (!waitingSet.has(socketId)) return;

  const index = waitingQueue.indexOf(socketId);
  if (index !== -1) {
    waitingQueue.splice(index, 1);
  }

  waitingSet.delete(socketId);
}

function tryMatchUsers() {
  while (waitingQueue.length >= 2) {
    const firstSocketId = waitingQueue.shift();
    const secondSocketId = waitingQueue.shift();

    waitingSet.delete(firstSocketId);
    waitingSet.delete(secondSocketId);

    const firstSocket = io.sockets.sockets.get(firstSocketId);
    const secondSocket = io.sockets.sockets.get(secondSocketId);

    if (!firstSocket || !secondSocket) {
      if (firstSocket) {
        waitingQueue.unshift(firstSocketId);
        waitingSet.add(firstSocketId);
      }

      if (secondSocket) {
        waitingQueue.unshift(secondSocketId);
        waitingSet.add(secondSocketId);
      }

      continue;
    }

    const roomId = `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    firstSocket.join(roomId);
    secondSocket.join(roomId);

    activeMatches.set(firstSocketId, secondSocketId);
    activeMatches.set(secondSocketId, firstSocketId);

    const firstUserId = socketUsers.get(firstSocketId) ?? null;
    const secondUserId = socketUsers.get(secondSocketId) ?? null;
    const firstProfile = firstUserId ? userProfiles.get(firstUserId) : null;
    const secondProfile = secondUserId ? userProfiles.get(secondUserId) : null;

    io.to(firstSocketId).emit("server:matched", {
      roomId,
      partnerSocketId: secondSocketId,
      partnerUserId: secondUserId,
      partnerName: secondProfile?.name ?? null,
    });

    io.to(secondSocketId).emit("server:matched", {
      roomId,
      partnerSocketId: firstSocketId,
      partnerUserId: firstUserId,
      partnerName: firstProfile?.name ?? null,
    });

    console.log(`[match] ${firstSocketId} <-> ${secondSocketId} in ${roomId}`);
  }
}

io.on("connection", (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  broadcastOnlineCount();

  socket.emit("server:welcome", {
    message: "Connected to Socket.io server",
    socketId: socket.id,
  });

  socket.emit("server:online-count", {
    count: userSockets.size,
  });

  socket.on("client:identify", (payload) => {
    registerUserSocket(socket, payload?.userId, payload?.name);
  });

  socket.on("client:chat:join", ({ userId }) => {
    if (!userId) return;
    socket.join(`user:${userId}`);
  });

  socket.on("client:chat:send", (payload) => {
    const toUserId = payload?.toUserId;
    const fromUserId = payload?.fromUserId;
    const message = payload?.message;

    if (!toUserId || !fromUserId || !message) {
      return;
    }

    io.to(`user:${toUserId}`).emit("server:chat:new", {
      fromUserId,
      toUserId,
      message,
      createdAt: new Date().toISOString(),
    });
  });

  socket.on("client:typing", (payload) => {
    const toUserId = payload?.toUserId;
    const fromUserId = payload?.fromUserId;
    const isTyping = Boolean(payload?.isTyping);

    if (!toUserId || !fromUserId) {
      return;
    }

    io.to(`user:${toUserId}`).emit("server:typing", {
      fromUserId,
      isTyping,
    });
  });

  socket.on("client:ping", (payload) => {
    io.to(socket.id).emit("server:pong", {
      message: `Pong from server. Received: ${payload?.message || "(no message)"}`,
      at: new Date().toISOString(),
    });
  });

  socket.on("client:find-match", () => {
    // first it checks “are you already talking to someone?” (if yes, it tells you and stops),
    if (activeMatches.has(socket.id)) {
      io.to(socket.id).emit("server:status", {
        message: "You are already matched.",
      });
      return;
    }

    if (waitingSet.has(socket.id)) {
      io.to(socket.id).emit("server:queued", {
        position: waitingQueue.indexOf(socket.id) + 1,
      });
      return;
    }

    waitingQueue.push(socket.id);
    waitingSet.add(socket.id);

    io.to(socket.id).emit("server:queued", {
      position: waitingQueue.length,
    });

    io.to(socket.id).emit("server:status", {
      message: "Matching started. Looking for a partner...",
    });

    tryMatchUsers();
  });

  socket.on("client:leave-queue", () => {
    removeFromQueue(socket.id);
    io.to(socket.id).emit("server:queue-left", {
      message: "You left the queue.",
    });
  });


  // 🔚 END CALL HANDLING (VERY IMPORTANT)
  socket.on("end-call", ({ to }) => {
    if (!to) return;

    // Notify the other user
    io.to(to).emit("call-ended");

    // Also notify self (optional but safe)
    socket.emit("call-ended");

    // Clean up match
    const partnerSocketId = activeMatches.get(socket.id);

    if (partnerSocketId) {
      activeMatches.delete(socket.id);
      activeMatches.delete(partnerSocketId);
    }

    console.log(`[call-ended] ${socket.id} ended call with ${to}`);
  });


  socket.on("disconnect", (reason) => {
    removeFromQueue(socket.id);
    unregisterUserSocket(socket.id);

    const partnerSocketId = activeMatches.get(socket.id);
    if (partnerSocketId) {
      activeMatches.delete(socket.id);
      activeMatches.delete(partnerSocketId);

      const partnerSocket = io.sockets.sockets.get(partnerSocketId);
      if (partnerSocket) {
        io.to(partnerSocketId).emit("server:status", {
          message: "Your partner disconnected.",
        });
      }
    }

    console.log(`[socket] disconnected: ${socket.id} (${reason})`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[socket] server listening on http://localhost:${PORT}`);
});
