"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

type PeerUser = {
  id: string;
  name: string;
};

export default function CallPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;

  const [callSessionId, setCallSessionId] = useState<string>("");
  const [connectionState, setConnectionState] = useState("connecting");
  const [peer, setPeer] = useState<PeerUser | null>(null);
  const [roomReadyData, setRoomReadyData] = useState<any>(null);
  const [translatedText, setTranslatedText] = useState("");

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const reconnectAttemptsRef = useRef(0);

  console.log("🔥 SOCKET URL:", SOCKET_URL);

  // 🎤 MIC
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

  // 🔌 SOCKET
  useEffect(() => {
    if (!session?.user?.id) return;

    const socket = io(SOCKET_URL!);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🔥 Socket Connected:", socket.id);

      socket.emit("client:identify", {
        userId: session.user.id,
        name: session.user.name,
      });

      // ✅ START SPEECH HERE (IMPORTANT FIX)
      startSpeechRecognition(socket);
    });

    socket.on("server:identified", () => {
      socket.emit("client:join-room", { roomId });

      socket.emit("client:get-room", {
        roomId,
        userId: session.user.id,
      });
    });

    socket.on("server:room-data", (data) => {
      setPeer(data.peer);
      setCallSessionId(data.callSessionId);
      setRoomReadyData(data);
    });

    socket.on("translated-text", ({ text }) => {
      console.log("🌍 Received:", text);
      setTranslatedText(text);
    });

    socket.on("offer", async (offer) => {
      let pc = peerConnectionRef.current;

      if (!pc) {
        pc = createPeerConnection();

        localStreamRef.current?.getTracks().forEach((track) => {
          pc!.addTrack(track, localStreamRef.current!);
        });
      }

      await pc.setRemoteDescription(offer);

      while (pendingCandidatesRef.current.length > 0) {
        const candidate = pendingCandidatesRef.current.shift();
        await pc.addIceCandidate(candidate!);
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer", { roomId, answer });
    });

    socket.on("answer", async (answer) => {
      await peerConnectionRef.current?.setRemoteDescription(answer);
    });

    socket.on("ice-candidate", async (candidate) => {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      if (!pc.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }

      await pc.addIceCandidate(candidate);
    });

    socket.on("call-ended", () => {
      console.log("📴 Call ended");

      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      peerConnectionRef.current?.close();

      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }

      router.push(
        `/post-call?callSessionId=${callSessionId}&partnerId=${peer?.id}&partnerName=${encodeURIComponent(peer?.name || "")}`
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, session?.user?.id]);

  // 🎤 SPEECH FUNCTION (NEW CLEAN IMPLEMENTATION)
  function startSpeechRecognition(socket: Socket) {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.log("❌ SpeechRecognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text =
        event.results[event.results.length - 1][0].transcript;

      console.log("🎤 You said:", text);

      socket.emit("send-text", {
        text,
        roomId,
      });

      console.log("📤 Sent to server:", text);
    };

    recognition.start();
  }

  // ☎️ PEER CONNECTION
  function createPeerConnection() {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("ice-candidate", {
          roomId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;

      if (state === "connected") {
        setConnectionState("connected");
        reconnectAttemptsRef.current = 0;
      }

      if (state === "failed") {
        setConnectionState("reconnecting");

        if (reconnectAttemptsRef.current >= 3) return;

        reconnectAttemptsRef.current++;

        pc.createOffer({ iceRestart: true }).then(async (offer) => {
          await pc.setLocalDescription(offer);

          socketRef.current?.emit("offer", {
            roomId,
            offer,
          });
        });
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }

  // 🚀 START CALL
  useEffect(() => {
    if (!localStreamRef.current || !roomReadyData) return;
    if (!session?.user?.id) return;

    if (session.user.id < roomReadyData.peer.id) {
      const pc = createPeerConnection();

      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      pc.createOffer().then(async (offer) => {
        await pc.setLocalDescription(offer);
        socketRef.current?.emit("offer", { roomId, offer });
      });
    }
  }, [roomReadyData]);

  console.log("STATE:", translatedText);

  if (!peer) {
    return <div className="text-white text-center p-10">Connecting...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#020617] text-white flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-semibold">{peer.name}</h1>

        <p className="text-gray-300">
          {connectionState === "connected" && "🟢 Connected"}
          {connectionState === "connecting" && "⏳ Connecting..."}
          {connectionState === "disconnected" && "⚠️ Poor network"}
          {connectionState === "reconnecting" && "🔄 Reconnecting..."}
        </p>

        {translatedText && (
          <p className="text-xl text-green-400 font-semibold mt-4">
            🌍 {translatedText}
          </p>
        )}

        <button
          onClick={() =>
            socketRef.current?.emit("end-call", { roomId })
          }
          className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-full shadow-lg"
        >
          End Call
        </button>

        <audio ref={remoteAudioRef} autoPlay playsInline />
      </div>
    </div>
  );
}