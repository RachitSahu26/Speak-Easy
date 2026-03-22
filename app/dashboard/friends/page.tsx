"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">Loading friends...</CardContent>
        </Card>
      );
    }

    if (friends.length === 0) {
      return (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            You don&apos;t have friends yet. Complete a call and send friend requests.
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {friends.map((friend) => (
          <Card key={friend.id}>
            <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
             
                <p className="text-lg font-semibold">{friend.name}</p>
             
                <p className="text-sm text-muted-foreground">Status: {friend.status}</p>
              
                <p className="text-sm text-muted-foreground">
                  Last interaction: {formatRelative(friend.lastInteraction)}
                </p>
            
              </div>

              <Link href={`/dashboard/chat/${friend.id}`}>
                <Button>Open Chat</Button>
              </Link>
            
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }, [friends, loading]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Friends</CardTitle>
          <CardDescription>People you connected with after calls.</CardDescription>
        </CardHeader>  
      </Card>

      {content}
    </main>
  );
}
