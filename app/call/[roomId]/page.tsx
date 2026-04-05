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

  const [callSessionId, setCallSessionId] = useState<string>("");

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]); // 🔥 NEW

  const [connectionState, setConnectionState] = useState("connecting");
  const [peer, setPeer] = useState<PeerUser | null>(null);
  const [roomReadyData, setRoomReadyData] = useState<any>(null);

  const reconnectAttemptsRef = useRef(0);

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

  // ☎️ PEER CONNECTION
  function createPeerConnection() {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.ontrack = (event) => {
      console.log("🎧 Receiving audio");
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
      console.log("🧠 Connection State:", state);

      if (state === "connected") {
        setConnectionState("connected");
        reconnectAttemptsRef.current = 0; // 🔥 reset
      }

      if (state === "disconnected") {
        setConnectionState("disconnected");

        setTimeout(() => {
          if (pc.connectionState === "disconnected") {
            console.log("⚠️ Still disconnected...");
          }
        }, 4000);
      }

      if (state === "failed") {
        console.log("❌ Connection failed → trying ICE restart");

        setConnectionState("reconnecting");

        if (reconnectAttemptsRef.current >= 3) {
          console.log("❌ Max ICE restart attempts reached");
          return;
        }

        if (pc.signalingState !== "stable") {
          console.log("⚠️ Skipping ICE restart — signaling not stable");
          return;
        }

        reconnectAttemptsRef.current++;

        pc.createOffer({ iceRestart: true })
          .then(async (offer) => {
            await pc.setLocalDescription(offer);

            console.log("🔄 Sending ICE restart offer");

            socketRef.current?.emit("offer", {
              roomId,
              offer,
            });
          })
          .catch((err) => {
            console.error("❌ ICE restart failed:", err);
          });
      }

      if (state === "closed") {
        setConnectionState("closed");
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }

  // 🔌 SOCKET
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

    socket.on("server:room-data", (data) => {
      setPeer(data.peer);
      setCallSessionId(data.callSessionId);
      setRoomReadyData(data);
    });

    // 📩 OFFER
    socket.on("offer", async (offer) => {
      let pc = peerConnectionRef.current;

      if (!pc) {
        console.log("🆕 Creating new peer connection");
        pc = createPeerConnection();

        localStreamRef.current?.getTracks().forEach((track) => {
          pc!.addTrack(track, localStreamRef.current!);
        });
      } else {
        console.log("♻️ Reusing peer connection (ICE restart)");
      }

      await pc.setRemoteDescription(offer);

      // 🔥 APPLY QUEUED ICE
      while (pendingCandidatesRef.current.length > 0) {
        const candidate = pendingCandidatesRef.current.shift();
        try {
          await pc.addIceCandidate(candidate!);
        } catch (err) {
          console.error("❌ Error adding queued ICE:", err);
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current?.emit("answer", { roomId, answer });
    });

    // 📩 ANSWER
    socket.on("answer", async (answer) => {
      await peerConnectionRef.current?.setRemoteDescription(answer);
    });

    // 🌐 ICE
    socket.on("ice-candidate", async (candidate) => {
      const pc = peerConnectionRef.current;

      if (!pc) return;

      if (!pc.remoteDescription) {
        console.log("⏳ Queuing ICE candidate");
        pendingCandidatesRef.current.push(candidate);
        return;
      }

      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.error("❌ Error adding ICE:", err);
      }
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

  // 🚀 START CALL
  useEffect(() => {
    if (!localStreamRef.current || !roomReadyData) return;

    const data = roomReadyData;
    if (!session?.user?.id) return
    if (session?.user?.id < data.peer.id) {
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

  // UI
  if (!peer) {
    return <div className="text-white text-center p-10">Connecting...</div>;
  }

  return (
    <div className="min-h-screen bg-[#040b1f] text-white flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-2xl">{peer.name}</h1>
        <p>
          {connectionState === "connected" && "🟢 Connected"}
          {connectionState === "connecting" && "⏳ Connecting..."}
          {connectionState === "disconnected" && "⚠️ Poor network"}
          {connectionState === "reconnecting" && "🔄 Reconnecting..."}
        </p>

        <button onClick={() => socketRef.current?.emit("end-call", { roomId })}>
          End Call
        </button>

        <audio ref={remoteAudioRef} autoPlay playsInline />
      </div>
    </div>
  );
}