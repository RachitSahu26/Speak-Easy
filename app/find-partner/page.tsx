"use client";

import { Loader2, Search, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ServerMatchedPayload = {
  roomId: string;
  partnerSocketId: string;
  partnerUserId: string | null;
  partnerName: string | null;
};

type ServerStatusPayload = {
  message: string;
};

type ServerOnlineCountPayload = {
  count: number;
};

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3005";

export default function FindPartnerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const autoStartAttemptedRef = useRef(false);

  const [connected, setConnected] = useState(false);
  const [searching, setSearching] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [searchElapsedSeconds, setSearchElapsedSeconds] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Click \"Find Partner\" to start matchmaking.");

  const autoStart = searchParams.get("autoStart") === "1";

  const startSearching = () => {
    if (!socketRef.current || !connected || searching || sessionStatus !== "authenticated") return;

    setSearching(true);
    setSearchElapsedSeconds(0);
    setStatusMessage("Matching... 0 sec");
    socketRef.current.emit("client:find-match");
  };

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setStatusMessage("Connected. Ready to match.");

      if (session?.user?.id) {
        socket.emit("client:identify", {
          userId: session.user.id,
          name: session.user.name,
        });
      }
    });

    socket.on("disconnect", () => {
      setConnected(false);
      setSearching(false);
      setSearchElapsedSeconds(0);
      setStatusMessage("Disconnected from server.");
    });

    socket.on("server:queued", () => {
      setSearching(true);
      setStatusMessage("Matching... 0 sec");
    });

    socket.on("server:online-count", (payload: ServerOnlineCountPayload) => {
      setOnlineCount(payload.count);
    });

    socket.on("server:status", (payload: ServerStatusPayload) => {
      setStatusMessage(payload.message);
    });

    socket.on("server:queue-left", (payload: ServerStatusPayload) => {
      setSearching(false);
      setSearchElapsedSeconds(0);
      setStatusMessage(payload.message);
    });

    socket.on("server:matched", (payload: ServerMatchedPayload) => {
      setSearching(false);
      setSearchElapsedSeconds(0);
      setStatusMessage("Partner found! Joining room...");



      
      router.push(
        `/call/${payload.roomId}?partner=${payload.partnerSocketId}&me=${socketRef.current?.id}&partnerUserId=${payload.partnerUserId ?? ""}&partnerName=${encodeURIComponent(payload.partnerName ?? "")}`
      );
    });

    return () => {
      if (socket.connected) {
        socket.emit("client:leave-queue");
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [router, session?.user?.id]);

  useEffect(() => {
    if (!searching) return;

    const intervalId = window.setInterval(() => {
      setSearchElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [searching]);

  useEffect(() => {
    if (!searching) return;

    setStatusMessage(
      searchElapsedSeconds < 2
        ? `Matching... ${searchElapsedSeconds} sec`
        : `Still searching... ${searchElapsedSeconds} sec`,
    );
  }, [searchElapsedSeconds, searching]);

  useEffect(() => {
    if (!connected || !socketRef.current || !session?.user?.id) return;

    socketRef.current.emit("client:identify", {
      userId: session.user.id,
      name: session.user.name,
    });
  }, [connected, session?.user?.id]);

  useEffect(() => {
    if (!autoStart || !connected || sessionStatus !== "authenticated" || autoStartAttemptedRef.current) {
      return;
    }

    autoStartAttemptedRef.current = true;
    startSearching();
  }, [autoStart, connected, sessionStatus]);

  const onCancelSearch = () => {
    if (!socketRef.current || !connected) return;

    socketRef.current.emit("client:leave-queue");
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Users className="size-5" /> Find Conversation Partner
          </CardTitle>
          <CardDescription>Match with another learner in real-time using Socket.io.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connection: <span className="font-medium text-foreground">{connected ? "Connected" : "Not connected"}</span>
          </p>

          <p className="text-sm text-muted-foreground">
            Members online: <span className="font-medium text-foreground">{onlineCount}</span>
          </p>

          {searching ? (
            <p className="text-sm text-muted-foreground">
              Match timer: <span className="font-medium text-foreground">{searchElapsedSeconds} sec</span>
            </p>
          ) : null}

          <div className="rounded-lg border bg-muted/40 p-4 text-sm">{statusMessage}</div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={startSearching}
              disabled={!connected || searching || sessionStatus !== "authenticated"}
              size="lg"
            >
              {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              {searching ? "Searching..." : "Connect & Find Partner"}
            </Button>

            {searching ? (
              <Button variant="outline" size="lg" onClick={onCancelSearch}>
                Cancel
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
