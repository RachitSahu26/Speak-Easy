// 🌍 Step 0: Load environment variables (like PORT etc.)
import "dotenv/config";

// 🏗 Step 1: Import tools needed to build server
import http from "http";
import { Server, Socket } from "socket.io";
import { randomUUID } from "crypto";

// 🗄 Database connection
import { db } from "./lib/db";
import { callSessions } from "./lib/db/schema";

// 🚪 Decide which port server will run on
const PORT = Number(process.env.PORT) || 3006;


// 👤 What a user looks like
type UserProfile = {
  id: string;
  name: string;
};

// 🏠 What a room stores
type RoomData = {
  callSessionId: string;
  users: Record<string, UserProfile>;
};


// 🏗 Create HTTP server (empty server)
const httpServer = http.createServer();

// 📡 Attach Socket.io to server
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});


// 🧠 MEMORY (Server brain)

// 🚶 People waiting in line
const waitingQueue: string[] = [];

// ⚡ Quick check if user is already in queue
const waitingSet: Set<string> = new Set();

// 🔌 socket.id → userId mapping
const socketUsers: Map<string, string> = new Map();

// 👤 userId → user profile
const userProfiles: Map<string, UserProfile> = new Map();

// 🏠 roomId → room data
const roomData: Map<string, RoomData> = new Map();


// 📢 FUNCTION 1: Tell everyone how many users are online
function broadcastOnlineCount() {
  io.emit("server:online-count", { count: socketUsers.size });
}

/*
🧠 STORY:
Uncle shouts:
"Hey everyone! There are 5 people online!"

📌 WHEN IT RUNS:
- after user connects
- after user disconnects
*/


// 👤 FUNCTION 2: Register user
function registerUser(
  socket: Socket,
  profile: { userId: string; name: string }
) {
  const userId = String(profile.userId);

  // save mapping
  socketUsers.set(socket.id, userId);

  // save user profile
  userProfiles.set(userId, {
    id: userId,
    name: profile.name,
  });

  // update online count
  broadcastOnlineCount();
}

/*
🧠 STORY:
User enters app and says:
"Hi I am Rachit"

Server stores:
- who he is
- his socket id

📌 FLOW:
client → "client:identify"
→ registerUser()
→ broadcastOnlineCount()
*/


// ❌ FUNCTION 3: Remove user from queue
function removeFromQueue(socketId: string) {
  if (!waitingSet.has(socketId)) return;

  const index = waitingQueue.indexOf(socketId);
  if (index !== -1) waitingQueue.splice(index, 1);

  waitingSet.delete(socketId);
}

/*
🧠 STORY:
User leaves waiting line:
"Uncle, I don’t want to talk now"

Server removes him from queue

📌 USED IN:
- leave queue
- disconnect
*/


// 🤝 FUNCTION 4: Match users
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

      // 🗄 Save in DB
      const [session] = await db
        .insert(callSessions)
        .values({
          roomId,
          userAId: u1,
          userBId: u2,
        })
        .returning({ id: callSessions.id });

      const callSessionId = session.id;

      // 🏠 Store room info
      roomData.set(roomId, {
        callSessionId,
        users: {
          [u1]: p2,
          [u2]: p1,
        },
      });

      // 📢 Tell both users: "You are matched!"
      io.to(s1).emit("server:matched", { roomId, callSessionId });
      io.to(s2).emit("server:matched", { roomId, callSessionId });

    } catch (error) {
      console.error("❌ MATCH ERROR:", error);
    }
  }
}

/*
🧠 STORY:
Two users are waiting:

👦 A
👦 B

Uncle says:
"You two go into room 123 and talk"

📌 FLOW:
client → find-match
→ added to queue
→ tryMatchUsers()
→ create room
→ emit "server:matched"
*/


// 🔌 MAIN CONNECTION HANDLER
io.on("connection", (socket: Socket) => {
console.log("🔥 NEW CLIENT CONNECTED:", socket.id);
  // 📢 Tell user current online count
  socket.emit("server:online-count", { count: socketUsers.size });

  /*
  🧠 STORY:
  User enters app
  Server says:
  "Currently 10 people online"
  */


  // 👤 USER IDENTIFICATION
  socket.on("client:identify", (profile) => {
    registerUser(socket, profile);
    socket.emit("server:identified");
  });

  /*
  FLOW:
  user connects
  → identify
  → registerUser()
  */


  // 🔍 FIND MATCH
  socket.on("client:find-match", () => {
    if (waitingSet.has(socket.id)) return;

    waitingQueue.push(socket.id);
    waitingSet.add(socket.id);

    tryMatchUsers();
  });

  /*
  STORY:
  User says:
  "Find me someone"

  → added to queue
  → tryMatchUsers()
  */


  // 🚪 LEAVE QUEUE
  socket.on("client:leave-queue", () => {
    removeFromQueue(socket.id);
  });


  // 📦 GET ROOM INFO
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

  /*
  STORY:
  User enters room and asks:
  "Who am I talking to?"

  Server replies:
  "You are talking to Rahul"
  */


  // 🚪 JOIN ROOM
  socket.on("client:join-room", ({ roomId }) => {
    socket.join(roomId);
  });

  /*
  STORY:
  User enters room physically
  */


  // 🔥 ================= WEBRTC =================

  // 📤 OFFER
  socket.on("offer", ({ roomId, offer }) => {
    socket.to(roomId).emit("offer", offer);
  });

  /*
  STORY:
  User A says:
  "Hey, can we connect?"

  Server forwards to B
  */


  // 📤 ANSWER
  socket.on("answer", ({ roomId, answer }) => {
    socket.to(roomId).emit("answer", answer);
  });

  /*
  STORY:
  User B replies:
  "Yes, let's connect"

  Server forwards to A
  */


  // 🌐 ICE CANDIDATES
  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", candidate);
  });

  /*
  STORY:
  Both users exchange connection details
  */

// 🌍 TRANSLATION

socket.on("send-text", async ({ roomId, text }) => {
  console.log("📩 Server received:", text);

  try {
    const res = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: text,
        source: "hi",
        target: "en",
        format: "text",
      }),
    });

    const rawText = await res.text(); // 🔥 get raw response first
    console.log("RAW API RESPONSE:", rawText);

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.log("❌ Invalid JSON response");
      data = {};
    }

    const translated =
      data?.translatedText ||
      data?.data?.translatedText ||
      data?.translation ||
      text; // 🔥 fallback to original text

    console.log("🌍 Final Translated:", translated);

    io.to(roomId).emit("translated-text", {
      text: translated,
    });

  } catch (err) {
    console.error("❌ Translation error:", err);

    // 🔥 fallback
    io.to(roomId).emit("translated-text", {
      text,
    });
  }
});



  // 🔴 END CALL
  socket.on("end-call", ({ roomId }) => {
    io.to(roomId).emit("call-ended");
  });

  /*
  STORY:
  One user hangs up
  → both get call ended
  */


  // ❌ DISCONNECT
  socket.on("disconnect", () => {
    removeFromQueue(socket.id);
    socketUsers.delete(socket.id);
  });

  /*
  STORY:
  User leaves app suddenly
  → removed from queue
  → removed from system
  */
});


// 🚀 START SERVER




httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

/*
🧠 FINAL STORY FLOW:

1. User connects
2. identify → registerUser
3. find-match → queue
4. tryMatchUsers → create room
5. join-room
6. get-room → know peer
7. offer → answer → ice
8. call starts 🎧
9. end-call OR disconnect
*/