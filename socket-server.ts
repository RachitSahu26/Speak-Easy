import "dotenv/config";

import http from "http";
import { Server, Socket } from "socket.io";
import { randomUUID } from "crypto";

import { db } from "./lib/db";
import { callSessions } from "./lib/db/schema";

const PORT = Number(process.env.SOCKET_PORT || 3006);

// ================= TYPES =================

type UserProfile = {
  id: string;
  name: string;
};

type RoomData = {
  callSessionId: string;
  users: Record<string, UserProfile>;
};

// ================= SERVER =================

const httpServer = http.createServer();

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ================= STATE =================

const waitingQueue: string[] = [];
const waitingSet: Set<string> = new Set();
const socketUsers: Map<string, string> = new Map(); // socketId -> userId
const userProfiles: Map<string, UserProfile> = new Map(); // userId -> profile
const roomData: Map<string, RoomData> = new Map();

// ================= HELPERS =================

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

// ================= MATCHING =================

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
      // ✅ 1. Generate roomId FIRST
      const roomId = `room-${randomUUID()}`;
      console.log("✅ ROOM ID:", roomId);

      // ✅ 2. Insert into DB (IMPORTANT FIX)
      const [session] = await db
        .insert(callSessions)
        .values({
          roomId: roomId, // ✅ MUST MATCH schema
          userAId: u1,
          userBId: u2,
        })
        .returning({
          id: callSessions.id,
        });

      const callSessionId = session.id;

      // ✅ 3. Store room data
      roomData.set(roomId, {
        callSessionId,
        users: {
          [u1]: p2,
          [u2]: p1,
        },
      });

      // ✅ 4. Notify both users
      io.to(s1).emit("server:matched", { roomId, callSessionId });
      io.to(s2).emit("server:matched", { roomId, callSessionId });
    } catch (error) {
      console.error("❌ MATCH ERROR:", error);
    }
  }
}

// ================= SOCKET =================

io.on("connection", (socket: Socket) => {
  socket.emit("server:online-count", { count: socketUsers.size });

  // Identify user
  socket.on(
    "client:identify",
    (profile: { userId: string; name: string }) => {
      registerUser(socket, profile);
      socket.emit("server:identified");
    }
  );

  // Find match
  socket.on("client:find-match", () => {
    if (waitingSet.has(socket.id)) return;

    waitingQueue.push(socket.id);
    waitingSet.add(socket.id);

    tryMatchUsers();
  });

  // Leave queue
  socket.on("client:leave-queue", () => {
    removeFromQueue(socket.id);
  });

  // Get room info
  socket.on(
    "client:get-room",
    ({ roomId, userId }: { roomId: string; userId: string }) => {
      const room = roomData.get(roomId);

      if (!room) {
        socket.emit("server:error", { message: "Room not found" });
        return;
      }

      const peer = room.users[userId];

      if (!peer) {
        socket.emit("server:error", { message: "Peer not found" });
        return;
      }

      socket.emit("server:room-data", {
        peer,
        callSessionId: room.callSessionId, // ✅ IMPORTANT
      });
    }
  );

  // Join socket room
  socket.on("client:join-room", ({ roomId }: { roomId: string }) => {
    socket.join(roomId);
    console.log("✅ Joined room:", roomId);
  });

  // End call
  socket.on("end-call", ({ roomId }: { roomId: string }) => {
    console.log("🔥 END CALL:", roomId);

    io.to(roomId).emit("call-ended", { roomId });
  });

  // Disconnect
  socket.on("disconnect", () => {
    removeFromQueue(socket.id);
    socketUsers.delete(socket.id);
  });
});

// ================= START SERVER =================

httpServer.listen(PORT, () => {
  console.log(`🚀 Socket Server running on http://localhost:${PORT}`);
});