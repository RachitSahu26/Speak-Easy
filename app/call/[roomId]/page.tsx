"use client"


import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3005";

export default function CallPage() {
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const callSessionIdRef = useRef<string | null>(null);
  const { data: session } = useSession();

  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();

  const partnerSocketId = searchParams.get("partner");
  const myId = searchParams.get("me");
  const partnerUserId = searchParams.get("partnerUserId");
  const partnerName = searchParams.get("partnerName");
  const roomId = params.roomId as string;

  // 🔥 MAIN CALL LOGIC
  useEffect(() => {
    if (!partnerSocketId || !myId) return;

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    const startCall = async () => {
      const peer = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      peerRef.current = peer;

      // 🎤 Get Mic
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      stream.getTracks().forEach((track) => {
        peer.addTrack(track, stream);
      });

      // 🔊 Hear Other User
      peer.ontrack = (event) => {
        const audio = document.createElement("audio");
        audio.srcObject = event.streams[0];
        audio.autoplay = true;
      };

      // 🌐 ICE Candidates
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("client:ice-candidate", {
            candidate: event.candidate,
            to: partnerSocketId,
          });
        }
      };

      // 📩 Receive OFFER
      socket.on("server:offer", async ({ offer, from }) => {
        await peer.setRemoteDescription(offer);

        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        socket.emit("client:answer", {
          answer,
          to: from,
        });
      });

      // 📩 Receive ANSWER
      socket.on("server:answer", async ({ answer }) => {
        await peer.setRemoteDescription(answer);
      });

      // 📩 Receive ICE
      socket.on("server:ice-candidate", async ({ candidate }) => {
        await peer.addIceCandidate(candidate);
      });

      // 🛑 VERY IMPORTANT: Listen for call end
      socket.on("call-ended", async () => {
        peerRef.current?.close();

        const callSessionId = callSessionIdRef.current;

        if (callSessionId) {
          await fetch("/api/call-sessions", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              callSessionId,
            }),
          });
        }

        router.push(
          `/post-call?callSessionId=${callSessionId}&partnerId=${partnerUserId}&partnerName=${encodeURIComponent(
            partnerName ?? "Partner"
          )}`
        );
      });

      // 📞 Start Call (only one side)
      if (myId < partnerSocketId) {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);

        socket.emit("client:offer", {
          offer,
          to: partnerSocketId,
        });
      }
    };

    startCall();

    return () => {
      peerRef.current?.close();
      socket.disconnect();
    };
  }, [partnerSocketId, myId]);

  // 📦 CREATE CALL SESSION
  useEffect(() => {
    if (!partnerUserId || !roomId || !session?.user?.id) return;

    const createCallSession = async () => {
      const response = await fetch("/api/call-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId,
          partnerUserId,
        }),
      });

      const result = (await response.json()) as {
        callSessionId?: string;
      };

      if (response.ok && result.callSessionId) {
        callSessionIdRef.current = result.callSessionId;
      }
    };

    void createCallSession();
  }, [partnerUserId, roomId, session?.user?.id]);

  // 🔚 END CALL (FIXED)
  const onEndCall = async () => {
    const socket = socketRef.current;

    // 🛑 Notify partner FIRST
    if (partnerSocketId) {
      socket?.emit("end-call", {
        to: partnerSocketId,
      });
    }

    // Close peer
    peerRef.current?.close();

    const callSessionId = callSessionIdRef.current;

    // Save call session
    if (callSessionId) {
      await fetch("/api/call-sessions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callSessionId,
        }),
      });
    }

    // Redirect self
    if (partnerUserId && callSessionId) {
      router.push(
        `/post-call?callSessionId=${callSessionId}&partnerId=${partnerUserId}&partnerName=${encodeURIComponent(
          partnerName ?? "Partner"
        )}`
      );
    } else {
      router.push("/find-partner");
    }

    // Disconnect AFTER everything
    setTimeout(() => {
      socket?.disconnect();
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-xl font-semibold">Call in progress...</h1>

      <Button variant="destructive" onClick={onEndCall}>
        End Call
      </Button>
    </div>
  );
}
