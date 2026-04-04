import "dotenv/config";

import http from "http";
import { Server, Socket } from "socket.io";
import { randomUUID } from "crypto";

import { db } from "./lib/db";
import { callSessions } from "./lib/db/schema";

const PORT = Number(process.env.PORT) || 3006;

type UserProfile = {
  id: string;
  name: string;
};

type RoomData = {
  callSessionId: string;
  users: Record<string, UserProfile>;
};

const httpServer = http.createServer();

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const waitingQueue: string[] = [];
const waitingSet: Set<string> = new Set();
const socketUsers: Map<string, string> = new Map();
const userProfiles: Map<string, UserProfile> = new Map();
const roomData: Map<string, RoomData> = new Map();

function broadcastOnlineCount() {
  io.emit("server:online-count", { count: socketUsers.size });
}

function registerUser(
  socket: Socket,
  profile: { userId: string; name: string }
) {
  const userId = String(profile.userId);

  socketUsers.set(socket.id, userId);

  userProfiles.set(userId, {
    id: userId,
    name: profile.name,
  });

  broadcastOnlineCount();
}

function removeFromQueue(socketId: string) {
  if (!waitingSet.has(socketId)) return;

  const index = waitingQueue.indexOf(socketId);
  if (index !== -1) waitingQueue.splice(index, 1);

  waitingSet.delete(socketId);
}

async function tryMatchUsers() {
  while (waitingQueue.length >= 2) {
    const s1 = waitingQueue.shift()!;
    const s2 = waitingQueue.shift()!;

    waitingSet.delete(s1);
    waitingSet.delete(s2);

    const u1 = socketUsers.get(s1);
    const u2 = socketUsers.get(s2);

    if (!u1 || !u2) continue;

    const p1 = userProfiles.get(u1);
    const p2 = userProfiles.get(u2);

    if (!p1 || !p2) continue;

    try {
      const roomId = `room-${randomUUID()}`;

      const [session] = await db
        .insert(callSessions)
        .values({
          roomId,
          userAId: u1,
          userBId: u2,
        })
        .returning({ id: callSessions.id });

      const callSessionId = session.id;

      roomData.set(roomId, {
        callSessionId,
        users: {
          [u1]: p2,
          [u2]: p1,
        },
      });

      io.to(s1).emit("server:matched", { roomId, callSessionId });
      io.to(s2).emit("server:matched", { roomId, callSessionId });
    } catch (error) {
      console.error("❌ MATCH ERROR:", error);
    }
  }
}

io.on("connection", (socket: Socket) => {
  socket.emit("server:online-count", { count: socketUsers.size });

  socket.on("client:identify", (profile) => {
    registerUser(socket, profile);
    socket.emit("server:identified");
  });

  socket.on("client:find-match", () => {
    if (waitingSet.has(socket.id)) return;

    waitingQueue.push(socket.id);
    waitingSet.add(socket.id);

    tryMatchUsers();
  });

  socket.on("client:leave-queue", () => {
    removeFromQueue(socket.id);
  });

  socket.on("client:get-room", ({ roomId, userId }) => {
    const room = roomData.get(roomId);

    if (!room) {
      socket.emit("server:error");
      return;
    }

    const peer = room.users[userId];

    if (!peer) {
      socket.emit("server:error");
      return;
    }

    socket.emit("server:room-data", {
      peer,
      callSessionId: room.callSessionId,
    });
  });

  socket.on("client:join-room", ({ roomId }) => {
    socket.join(roomId);
  });

  // 🔥 ================= WEBRTC =================

  socket.on("offer", ({ roomId, offer }) => {
    socket.to(roomId).emit("offer", offer);
  });
   
  socket.on("answer", ({ roomId, answer }) => {
    socket.to(roomId).emit("answer", answer);
  });

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", candidate);
  });

  // 🔴 End call
  socket.on("end-call", ({ roomId }) => {
    io.to(roomId).emit("call-ended");
  });

  socket.on("disconnect", () => {
    removeFromQueue(socket.id);
    socketUsers.delete(socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});