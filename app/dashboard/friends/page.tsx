"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type FriendItem = {
  id: string;
  name: string;
  status: string;
  lastInteraction: string | null;
};

function formatRelative(input: string | null) {
  if (!input) return "No activity yet";
  const date = new Date(input);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function FriendsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in?callbackUrl=/dashboard/friends");
      return;
    }

    if (status !== "authenticated") return;

    const load = async () => {
      const response = await fetch("/api/friends", { cache: "no-store" });
      if (!response.ok) {
        setFriends([]);
        setLoading(false);
        return;
      }

      const result = (await response.json()) as { friends: FriendItem[] };
      setFriends(result.friends);
      setLoading(false);
    };

    void load();
  }, [router, status]);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border border-white/10 bg-white/5 backdrop-blur-xl animate-pulse">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="h-12 w-12 rounded-full bg-white/10" />
                <div className="space-y-2">
                  <div className="h-4 w-40 rounded bg-white/10" />
                  <div className="h-3 w-24 rounded bg-white/10" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (friends.length === 0) {
      return (
        <Card className="border border-white/10 bg-white/5 backdrop-blur-xl text-center">
          <CardContent className="py-12 space-y-4">
            <p className="text-white/60">
              You don’t have friends yet.
            </p>

            <Button
              className="cursor-pointer bg-blue-600 hover:bg-blue-500"
              onClick={() => router.push("/dashboard")}
            >
              Find Peer
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {friends.map((friend) => (
          <Card
            key={friend.id}
            className="border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-cyan-400"
          >
            <CardContent className="flex items-center justify-between gap-4 py-5">

              <div className="flex items-center gap-4">

                {/* Avatar */}
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-lg">
                    {friend.name.charAt(0).toUpperCase()}
                  </div>

                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-[#040b1f]" />
                </div>

                {/* Info */}
                <div>
                  <p className="font-semibold text-white">{friend.name}</p>
                  <p className="text-xs text-white/50">
                    {friend.status}
                  </p>
                  <p className="text-xs text-white/40">
                    {formatRelative(friend.lastInteraction)}
                  </p>
                </div>

              </div>

              <Link href={`/dashboard/chat/${friend.id}`}>
                <Button className="cursor-pointer bg-gradient-to-r from-blue-500 to-cyan-400 hover:opacity-90">
                  Chat →
                </Button>
              </Link>

            </CardContent>
          </Card>
        ))}
      </div>
    );
  }, [friends, loading, router]);

  return (
    <div className="relative min-h-screen bg-[#040b1f] text-white px-6 py-16 overflow-hidden">

      {/* GRID */}
      <div className="pointer-events-none absolute inset-0 opacity-40
  bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),
  linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)]
  bg-[size:60px_60px]" />

      {/* TOP PURPLE GLOW */}
      <div className="pointer-events-none absolute left-1/2 top-20 h-[520px] w-[520px] 
  -translate-x-1/2 rounded-full bg-purple-600/30 blur-[150px]" />

      {/* RIGHT CYAN GLOW */}
      <div className="pointer-events-none absolute right-0 bottom-0 h-[420px] w-[420px] 
  translate-x-1/4 translate-y-1/4 rounded-full bg-cyan-500/20 blur-[120px]" />

      {/* OVERLAY DEPTH */}
      <div className="pointer-events-none absolute inset-0 
  bg-gradient-to-b from-transparent via-[#040b1f]/60 to-[#040b1f]" />
      {/* GRID */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* GLOW */}
      <div className="absolute left-1/2 top-32 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-600/30 blur-[140px]" />

      <main className="relative mx-auto w-full max-w-6xl space-y-8">

        {/* HEADER */}
        <Card className="border border-white/10 bg-white/5 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-3xl text-white">Friends</CardTitle>
            <CardDescription className="text-white/60">
              People you connected with after calls.
            </CardDescription>
          </CardHeader>
        </Card>

        {content}

      </main>

    </div>
  );
}