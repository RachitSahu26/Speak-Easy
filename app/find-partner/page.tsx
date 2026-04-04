"use client";

import { Loader2, Search, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SOCKET_URL =process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3006";

export default function FindPartnerPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const socketRef = useRef<Socket | null>(null);

  const [connected, setConnected] = useState(false);
  const [identified, setIdentified] = useState(false);
  const [searching, setSearching] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (!session?.user?.id) return;

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);

      socket.emit("client:identify", {
        userId: session.user.id,
        name: session.user.name,
      });
    });

    socket.on("server:identified", () => {
      setIdentified(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
      setSearching(false);
      setTimer(0);
      setIdentified(false);
    });

    socket.on("server:online-count", (data) => {
      setOnlineCount(data.count);
    });

    socket.on("server:matched", (data: { roomId: string }) => {
      router.push(`/call/${data.roomId}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [session?.user?.id, router]);

  useEffect(() => {
    if (!searching) return;

    const id = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(id);
  }, [searching]);

  const startSearch = () => {
    if (!socketRef.current || !connected || !identified) return;

    setSearching(true);
    setTimer(0);
    socketRef.current.emit("client:find-match");
  };

  const cancelSearch = () => {
    socketRef.current?.emit("client:leave-queue");
    setSearching(false);
    setTimer(0);
  };

  return (
  <div className="relative min-h-screen bg-[#040b1f] text-white overflow-hidden px-6 py-16">

  {/* GRID BACKGROUND */}
  <div className="pointer-events-none absolute inset-0 opacity-40
    bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),
    linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)]
    bg-[size:60px_60px]" />

  {/* TOP GLOW */}
  <div className="pointer-events-none absolute left-1/2 top-20 h-[500px] w-[500px] 
    -translate-x-1/2 rounded-full bg-purple-600/30 blur-[140px]" />

  {/* BOTTOM GLOW */}
  <div className="pointer-events-none absolute right-0 bottom-0 h-[400px] w-[400px] 
    translate-x-1/4 translate-y-1/4 rounded-full bg-cyan-500/20 blur-[120px]" />

  {/* OVERLAY */}
  <div className="pointer-events-none absolute inset-0 
    bg-gradient-to-b from-transparent via-[#040b1f]/60 to-[#040b1f]" />

  {/* CONTENT */}
  <div className="relative mx-auto max-w-xl space-y-10 text-center min-h-[500px]">

    {/* HEADER */}
    <div className="space-y-3">
      <h1 className="text-3xl font-semibold bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
        Find Your Partner
      </h1>
      <p className="text-white/60">
        Connect with someone new and start a meaningful conversation.
      </p>
    </div>

    {/* CARD */}
    <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-yellow-400/30">

      <div className="rounded-2xl border border-white/10 bg-[#0b132b]/80 backdrop-blur-xl p-8 space-y-6">

        {/* STATUS */}
        <div className="flex justify-between text-sm text-white/70">
          <p>
            Status:{" "}
            <span className={connected ? "text-green-400" : "text-red-400"}>
              {connected ? "Connected" : "Disconnected"}
            </span>
          </p>

          <p>Online: {onlineCount}</p>
        </div>

        {/* SEARCH STATE */}
        {searching && (
          <div className="text-center text-white/60">
            <p className="animate-pulse">
              🔍 Searching for partner...
            </p>
            <p className="text-xs mt-1">
              Time: {timer}s
            </p>
          </div>
        )}

        {/* ACTION BUTTON */}
        <Button
          onClick={startSearch}
          disabled={!connected || !identified || searching}
          className=" rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 py-2 font-medium hover:opacity-90 transition"
        >
          {searching ? (
            <>
              <Loader2 className="animate-spin mr-2 size-4" />
              Searching...
            </>
          ) : (
            <>
              <Search className="mr-2 size-4" />
              Find Partner
            </>
          )}
        </Button>

        {/* CANCEL BUTTON */}
        {searching && (
          <Button
            onClick={cancelSearch}
            className="w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
          >
            Cancel
          </Button>
        )}

      </div>
    </div>

  </div>
</div>
  );
}