"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

type ServerWelcomePayload = {
  message: string;
  socketId: string;
};

type ServerPongPayload = {
  message: string;
  at: string;
};

type ServerQueuedPayload = {
  position: number;
};

type ServerMatchedPayload = {
  roomId: string;
  partnerSocketId: string;
};

type ServerStatusPayload = {
  message: string;
};

type ServerQueueLeftPayload = {
  message: string;
};

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";

export default function SocketTestPage() {
  const socketRef = useRef<Socket | null>(null);

  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState<string>("-");
  const [welcome, setWelcome] = useState<string>("Waiting for welcome event...");
  const [queueStatus, setQueueStatus] = useState<string>("Not in queue");
  const [matchedRoomId, setMatchedRoomId] = useState<string>("-");
  const [partnerSocketId, setPartnerSocketId] = useState<string>("-");
  const [statusMessage, setStatusMessage] = useState<string>("No status yet.");
  const [lastUpdated, setLastUpdated] = useState<string>("-");

  const statusLabel = useMemo(() => (connected ? "Connected" : "Disconnected"), [connected]);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setSocketId(socket.id ?? "-");
    });

    socket.on("disconnect", () => {
      setConnected(false);
      setQueueStatus("Disconnected");
    });

    socket.on("server:welcome", (payload: ServerWelcomePayload) => {
      setWelcome(payload.message);
      setSocketId(payload.socketId);
      setLastUpdated(new Date().toLocaleTimeString());
    });

    socket.on("server:pong", (payload: ServerPongPayload) => {
      setStatusMessage(`${payload.message} (${payload.at})`);
      setLastUpdated(new Date().toLocaleTimeString());
    });

    socket.on("server:queued", (payload: ServerQueuedPayload) => {
      setQueueStatus(`In queue (position ${payload.position})`);
      setStatusMessage("Waiting for another user to join...");
      setLastUpdated(new Date().toLocaleTimeString());
    });

    socket.on("server:matched", (payload: ServerMatchedPayload) => {
      setQueueStatus("Matched");
      setMatchedRoomId(payload.roomId);
      setPartnerSocketId(payload.partnerSocketId);
      setStatusMessage("Match found successfully!");
      setLastUpdated(new Date().toLocaleTimeString());
    });

    socket.on("server:status", (payload: ServerStatusPayload) => {
      setStatusMessage(payload.message);
      setLastUpdated(new Date().toLocaleTimeString());
    });

    socket.on("server:queue-left", (payload: ServerQueueLeftPayload) => {
      setQueueStatus("Not in queue");
      setStatusMessage(payload.message);
      setLastUpdated(new Date().toLocaleTimeString());
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const sendPing = () => {
    if (!socketRef.current) return;

    socketRef.current.emit("client:ping", {
      message: "Hello from Next.js client",
    });
  };

  const findMatch = () => {
    if (!socketRef.current) return;

    setMatchedRoomId("-");
    setPartnerSocketId("-");
    socketRef.current.emit("client:find-match");
  };

  const leaveQueue = () => {
    if (!socketRef.current) return;

    socketRef.current.emit("client:leave-queue");
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-slate-900">Socket.io Local Test</h1>
      <p className="mt-2 text-slate-600">
        This page connects to <code>{SOCKET_URL}</code> and verifies simple queue-based matchmaking.
      </p>

      <section className="mt-8 space-y-3 rounded-xl border bg-white p-6 shadow-sm">
        <p>
          <span className="font-semibold">Connection status:</span> {statusLabel}
        </p>
        <p>
          <span className="font-semibold">Socket ID:</span> {socketId}
        </p>
        <p>
          <span className="font-semibold">Welcome:</span> {welcome}
        </p>
        <p>
          <span className="font-semibold">Queue:</span> {queueStatus}
        </p>
        <p>
          <span className="font-semibold">Room ID:</span> {matchedRoomId}
        </p>
        <p>
          <span className="font-semibold">Partner ID:</span> {partnerSocketId}
        </p>
        <p>
          <span className="font-semibold">Status:</span> {statusMessage}
        </p>
        <p>
          <span className="font-semibold">Last updated:</span> {lastUpdated}
        </p>

        <div className="mt-2 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={findMatch}
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500"
          >
            Find Match
          </button>

          <button
            type="button"
            onClick={leaveQueue}
            className="rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white hover:bg-slate-600"
          >
            Leave Queue
          </button>

          <button
            type="button"
            onClick={sendPing}
            className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
          >
            Ping Server
          </button>
        </div>
      </section>
    </main>
  );
}
