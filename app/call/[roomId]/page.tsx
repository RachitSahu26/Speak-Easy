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
  const [connectionState, setConnectionState] = useState("connecting");
  const [peer, setPeer] = useState<PeerUser | null>(null);
  const [roomReadyData, setRoomReadyData] = useState<any>(null);
  const reconnectAttemptsRef = useRef(0);
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
      console.log("🎧 Receiving audio");

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


    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log("🧠 Connection State:", state);

      if (state === "connected") {
        setConnectionState("connected");
      }

      if (state === "disconnected") {
        setConnectionState("disconnected");

        // wait before reacting
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

    // 📩 ROOM DATA → CREATE OFFER
    socket.on("server:room-data", async (data) => {
      setPeer(data.peer);
      setCallSessionId(data.callSessionId);
      // 🧠 STEP 1: store data instead of using immediately
      setRoomReadyData(data);

      // 🔥 Only one user creates offer

    });

    // 📩 RECEIVE OFFER
    socket.on("offer", async (offer) => {
      let pc = peerConnectionRef.current;

      // 🧠 If no connection exists → create (first time only)
      if (!pc) {
        console.log("🆕 Creating new peer connection (first time)");
        pc = createPeerConnection();

        console.log("🎤 Adding tracks (receiver)");

        localStreamRef.current?.getTracks().forEach((track) => {
          pc!.addTrack(track, localStreamRef.current!);
        });
      } else {
        console.log("♻️ Reusing existing peer connection (ICE restart)");
      }

      await pc.setRemoteDescription(offer);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current?.emit("answer", { roomId, answer });
    });

    // 📩 RECEIVE ANSWER
    socket.on("answer", async (answer) => {
      await peerConnectionRef.current?.setRemoteDescription(answer);
    });

    // 🌐 RECEIVE ICE
    socket.on("ice-candidate", async (candidate) => {
      await peerConnectionRef.current?.addIceCandidate(candidate);
    });

    // 🔴 CALL ENDED (IMPORTANT)
    socket.on("call-ended", () => {

      console.log("📴 Call ended");

      // stop mic
      localStreamRef.current?.getTracks().forEach((track) => track.stop());

      // close connection
      peerConnectionRef.current?.close();

      // clear audio
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }

      // redirect
      router.push(
        `/post-call?callSessionId=${callSessionId}&partnerId=${peer?.id}&partnerName=${encodeURIComponent(peer?.name || "")}`
      );
    });

    socket.on("server:error", () => {
      router.push("/find-partner");
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, session?.user?.id]);

  // 🔴 END CALL BUTTON



  const handleEndCall = () => {


    socketRef.current?.emit("end-call", { roomId });

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    peerConnectionRef.current?.close();

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    router.push(
      `/post-call?callSessionId=${callSessionId}&partnerId=${peer?.id}&partnerName=${encodeURIComponent(peer?.name || "")}`
    );
  };

  if (reconnectAttemptsRef.current > 3) {
    console.log("❌ Max reconnect attempts reached");
    return;
  }

  useEffect(() => {
    // ❌ wait until both are ready
    if (!localStreamRef.current || !roomReadyData) return;

    console.log("🚀 Both ready → starting call");

    const data = roomReadyData;
    if (!session?.user?.id) return;


    // 🔥 only one user creates offer
    if (session?.user?.id < data.peer.id) {
      const pc = createPeerConnection();

      console.log("🎤 Adding tracks");

      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      pc.createOffer().then(async (offer) => {
        await pc.setLocalDescription(offer);

        socketRef.current?.emit("offer", {
          roomId,
          offer,
        });
      });
    }
  }, [roomReadyData]);


  // ⚠️ PREVENT ACCIDENTAL REFRESH
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Are you sure you want to leave the call?";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

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
        <p>
          {connectionState === "connected" && "🟢 Connected"}
          {connectionState === "connecting" && "⏳ Connecting..."}
          {connectionState === "disconnected" && "⚠️ Poor network"}
          {connectionState === "reconnecting" && "🔄 Reconnecting..."}
          {connectionState === "failed" && "❌ Connection failed"}
        </p>

        <button
          onClick={handleEndCall}
          className="px-4 py-2 bg-red-500 rounded"
        >
          End Call
        </button>

        {/* 🔊 AUDIO */}
        <audio ref={remoteAudioRef} autoPlay playsInline />
      </div>
    </div>
  );
}