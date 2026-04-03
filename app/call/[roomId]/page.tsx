"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3006";

type PeerUser = {
  id: string;
  name: string;
};

export default function CallPage() {
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;

  const [peer, setPeer] = useState<PeerUser | null>(null);
  const peerRef = useRef<PeerUser | null>(null);

  const [callSessionId, setCallSessionId] = useState("");
  const callSessionRef = useRef<string>("");

  const socketRef = useRef<Socket | null>(null);

  // ✅ Keep refs updated (IMPORTANT)
  useEffect(() => {
    peerRef.current = peer;
  }, [peer]);

  useEffect(() => {
    callSessionRef.current = callSessionId;
  }, [callSessionId]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    // 🔌 Connect
    socket.on("connect", () => {
      socket.emit("client:identify", {
        userId: session.user.id,
        name: session.user.name,
      });
    });

    // ✅ After identify
    socket.on("server:identified", () => {
      socket.emit("client:join-room", { roomId });

      socket.emit("client:get-room", {
        roomId,
        userId: session.user.id,
      });
    });

    // ✅ Receive peer + callSessionId
    socket.on("server:room-data", (data) => {
      setPeer(data.peer);
      setCallSessionId(data.callSessionId);

      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setSeconds((prev) => prev + 1);
        }, 1000);
      }
    });

    // ❌ Error fallback
    socket.on("server:error", () => {
      router.push("/find-partner");
    });

    // 🔴 Call ended → redirect safely
    socket.on("call-ended", () => {
      const peerData = peerRef.current;
      const sessionId = callSessionRef.current;

      if (!peerData || !sessionId) {
        console.log("❌ Missing data, fallback");
        router.push("/find-partner");
        return;
      }

      console.log("🚀 REDIRECTING:", {
        sessionId,
        peerId: peerData.id,
        name: peerData.name,
      });

      router.push(
        `/post-call?callSessionId=${sessionId}&partnerId=${peerData.id}&partnerName=${encodeURIComponent(peerData.name)}`
      );
    });

    // ✅ Cleanup
    return () => {
      socket.disconnect();

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [roomId, session?.user?.id]);

  // 🔴 End Call
  const handleEndCall = () => {
    if (!socketRef.current) return;

    socketRef.current.emit("end-call", { roomId });
  };

  // 🔵 Next (skip)
  const handleNext = () => {
    socketRef.current?.emit("end-call", { roomId });
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;

    return `${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  };

  if (!peer) {
    return (
      <div className="text-white text-center p-10">
        Connecting to partner...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040b1f] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-8 text-center space-y-6">

          {/* Avatar */}
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-2xl font-bold">
              {peer.name?.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Name */}
          <h1 className="text-2xl font-semibold">{peer.name}</h1>

          {/* Status */}
          <p className="text-green-400 text-sm animate-pulse">
            🟢 Connected
          </p>

          <p className="text-white/60 text-sm">
            ⏱ {formatTime(seconds)}
          </p>

          {/* Actions */}
          <div className="flex justify-center gap-4 pt-4">
            <button
              onClick={handleEndCall}
              className="px-5 py-2 rounded-lg bg-red-500 hover:bg-red-600"
            >
              End Call
            </button>

            <button
              onClick={handleNext}
              className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600"
            >
              Next
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}