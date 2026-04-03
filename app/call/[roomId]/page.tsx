"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://10.208.251.240:3006";

type PeerUser = {
  id: string;
  name: string;
};

export default function CallPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const [peer, setPeer] = useState<PeerUser | null>(null);

  // 🎤 STEP 1: MIC
  useEffect(() => {
    async function startAudio() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        localStreamRef.current = stream;
        console.log("🎤 Mic ready");
      } catch (err) {
        console.error("❌ Mic error:", err);
      }
    }

    startAudio();
  }, []);

  // ☎️ STEP 2: CREATE PEER CONNECTION
  function createPeerConnection() {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // 🎧 Receive audio
    pc.ontrack = (event) => {
     console.log("🎧 Receiving audio on this device");

      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    // 🌐 Send ICE
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("ice-candidate", {
          roomId,
          candidate: event.candidate,
        });
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }

  // 🔌 SOCKET LOGIC
  useEffect(() => {
    if (!session?.user?.id) return;

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("client:identify", {
        userId: session.user.id,
        name: session.user.name,
      });
    });

    socket.on("server:identified", () => {
      socket.emit("client:join-room", { roomId });

      socket.emit("client:get-room", {
        roomId,
        userId: session.user.id,
      });
    });

    // 📩 OFFER (caller)
   socket.on("server:room-data", async (data) => {
  setPeer(data.peer);

  // 🔥 WAIT until mic is ready
  if (!localStreamRef.current) {
    console.log("⏳ Waiting for mic...");
    return;
  }

  // 🔥 Only one user creates offer
  if (session.user.id < data.peer.id) {
    const pc = createPeerConnection();
console.log("🎤 Adding tracks:", localStreamRef.current?.getTracks());
    localStreamRef.current.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("offer", { roomId, offer });
  }
});

    // 📩 RECEIVE OFFER
    socket.on("offer", async (offer) => {
      const pc = createPeerConnection();

      await pc.setRemoteDescription(offer);
// 🔥 ADD THIS LINE HERE
  console.log("🎤 Adding tracks:", localStreamRef.current?.getTracks());
      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer", { roomId, answer });
    });

    // 📩 RECEIVE ANSWER
    socket.on("answer", async (answer) => {
      await peerConnectionRef.current?.setRemoteDescription(answer);
    });

    // 🌐 RECEIVE ICE
    socket.on("ice-candidate", async (candidate) => {
      await peerConnectionRef.current?.addIceCandidate(candidate);
    });

    socket.on("server:error", () => {
      router.push("/find-partner");
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, session?.user?.id]);

  // 🔴 END CALL
  const handleEndCall = () => {
    socketRef.current?.emit("end-call", { roomId });
  };

  if (!peer) {
    return (
      <div className="text-white text-center p-10">
        Connecting to partner...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040b1f] text-white flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-2xl">{peer.name}</h1>
        <p>🟢 Connected</p>

        <button
          onClick={handleEndCall}
          className="px-4 py-2 bg-red-500 rounded"
        >
          End Call
        </button>

        {/* 🔊 AUDIO */}
        <audio ref={remoteAudioRef} autoPlay />
      </div>
    </div>
  );
}