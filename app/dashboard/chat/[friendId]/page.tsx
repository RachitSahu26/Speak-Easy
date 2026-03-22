"use client";

import { Loader2, Send } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { Toaster } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/lib/client/use-toast";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3005";

type MessageItem = {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  createdAt: string;
};

type IncomingSocketMessage = {
  fromUserId: string;
  toUserId: string;
  message: string;
  createdAt: string;
};

export default function ChatPage() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const friendId = params.friendId as string;

  const { toast, toasts, dismiss } = useToast();

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [friendName, setFriendName] = useState("Friend");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in?callbackUrl=/dashboard/friends");
      return;
    }

    if (status !== "authenticated") return;

    const loadChat = async () => {
      const response = await fetch(`/api/chat/${friendId}`, { cache: "no-store" });
      const result = await response.json();

      if (!response.ok) {
        toast({
          title: result.message ?? "Unable to open chat",
          variant: "error",
        });
        router.push("/dashboard/friends");
        return;
      }

      setMessages(result.messages as MessageItem[]);
      setFriendName(result.friend.name as string);
      setLoading(false);
    };

    void loadChat();
  }, [friendId, router, status, toast]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("client:chat:join", {
        userId: session.user.id,
      });
    });

    socket.on("server:chat:new", (payload: IncomingSocketMessage) => {
      if (
        payload.fromUserId !== friendId &&
        payload.toUserId !== friendId
      ) {
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          senderId: payload.fromUserId,
          receiverId: payload.toUserId,
          message: payload.message,
          createdAt: payload.createdAt,
        },
      ]);
    });

    socket.on("server:typing", (payload: { fromUserId: string; isTyping: boolean }) => {
      if (payload.fromUserId === friendId) {
        setIsTyping(payload.isTyping);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [friendId, session?.user?.id]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || !session?.user?.id) return;

    setSending(true);
    const response = await fetch(`/api/chat/${friendId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: trimmed,
      }),
    });

    const result = await response.json();
    setSending(false);

    if (!response.ok) {
      toast({
        title: result.message ?? "Failed to send message",
        variant: "error",
      });
      return;
    }

    const message = result.message as MessageItem;
    setMessages((current) => [...current, message]);

    socketRef.current?.emit("client:chat:send", {
      toUserId: friendId,
      fromUserId: session.user.id,
      message: trimmed,
    });

    socketRef.current?.emit("client:typing", {
      toUserId: friendId,
      fromUserId: session.user.id,
      isTyping: false,
    });

    setInput("");
  };

  const messageList = useMemo(
    () =>
      messages.map((message) => {
        const mine = message.senderId === session?.user?.id;
        return (
          <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                mine ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              <p>{message.message}</p>
              <p className="mt-1 text-[11px] opacity-70">
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        );
      }),
    [messages, session?.user?.id],
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-5 animate-spin" />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 py-10">
      <Card className="flex h-[75vh] flex-col">
        <CardHeader className="border-b">
          <CardTitle>Chat with {friendName}</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {messageList}
            {isTyping ? <p className="text-xs text-muted-foreground">{friendName} is typing...</p> : null}
            <div ref={bottomRef} />
          </div>

          <div className="flex items-center gap-2 border-t pt-3">
            <input
              value={input}
              onChange={(event) => {
                const value = event.target.value;
                setInput(value);
                socketRef.current?.emit("client:typing", {
                  toUserId: friendId,
                  fromUserId: session?.user?.id,
                  isTyping: value.trim().length > 0,
                });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              className="h-11 w-full rounded-xl border px-3 text-sm"
              placeholder="Type a message..."
            />
            <Button onClick={() => void sendMessage()} disabled={sending || !input.trim()}>
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Send
            </Button>
          </div>
        </CardContent>
      </Card>

      <Toaster toasts={toasts} onDismiss={dismiss} />
    </main>
  );
}
