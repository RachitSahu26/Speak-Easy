"use client";

import { useEffect, useState } from "react";
import { Bell, Clock } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";





type NotificationType = {
  id: string;
  type: "feedback" | "friend_request";
  isRead: boolean;
  createdAt: string;
  senderName: string;
  comment?: string;
  referenceId?: string;

  rating?: number;
  tag?: string[];
};
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0)
  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;

      const data = await res.json();
      setNotifications(data.notifications);
    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notificationIds: [id],
        }),
      });

      setNotifications(prev =>
        prev.map(n =>
          n.id === id ? { ...n, isRead: true } : n
        )
      );
    } catch (err) {
      console.log(err);
    }
  };



  const fetchCount = async () => {
    const res = await fetch("/api/notifications/count");
    const data = await res.json();
    setCount(data.count);
  };


  const handleClick = async (n: NotificationType) => {
    try {
      // ✅ mark as read in DB
      await fetch(`/api/notifications/${n.id}/read`, {
        method: "PATCH",
      });

      // ✅ update UI instantly
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === n.id ? { ...item, isRead: true } : item
        )
      );

      // ✅ ALWAYS refetch (BEST WAY)
      await fetchCount();

      // 👉 optional navigation
      // router.push(`/feedback/${n.referenceId}`);
    } catch (err) {
      console.log("CLICK ERROR:", err);
    }
  };

  const formatTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

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

  {/* OVERLAY */}
  <div className="pointer-events-none absolute inset-0 
    bg-gradient-to-b from-transparent via-[#040b1f]/60 to-[#040b1f]" />

  <main className="relative mx-auto w-full max-w-4xl space-y-8">

    {/* HEADER */}
    <Card className="border border-white/10 bg-white/5 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-3xl text-white">
          Notifications
        </CardTitle>
        <CardDescription className="text-white/60">
          Your recent activity and updates.
        </CardDescription>
      </CardHeader>
    </Card>

    {/* CONTENT */}
    {loading ? (
      <p className="text-white/60">Loading...</p>
    ) : notifications.length === 0 ? (
      <div className="text-center text-white/50">
        No notifications yet
      </div>
    ) : (
      <div className="space-y-4">

        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => handleClick(n)}
            className={`cursor-pointer rounded-xl border p-4 transition-all backdrop-blur-lg
              
              ${n.isRead
                ? "bg-white/5 border-white/10 hover:bg-white/10"
                : "bg-blue-500/10 border-blue-400/30 hover:bg-blue-500/20"}
            `}
          >
            <div className="flex justify-between items-start gap-4">

              {/* LEFT */}
              <div className="space-y-2">

                <p className="font-medium">
                  <span className="font-semibold text-white">
                    {n.senderName}
                  </span>{" "}
                  {n.type === "friend_request"
                    ? "sent you a friend request"
                    : "left you feedback"}
                </p>

                {n.comment && (
                  <p className="text-sm text-white/70">
                    "{n.comment}"
                  </p>
                )}

                {/* ⭐ RATING */}
                {n.rating && (
                  <p className="text-sm text-yellow-400">
                    ⭐ {n.rating} / 5
                  </p>
                )}

                {/* 🏷 TAGS */}
                {n.tag && n.tag.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {n.tag.map((tag: string, i: number) => (
                      <span
                        key={i}
                        className="text-xs bg-white/10 border border-white/10 px-2 py-1 rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-xs text-white/40">
                  {formatTime(n.createdAt)}
                </p>

              </div>

              {/* RIGHT */}
              {!n.isRead && (
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-1 animate-pulse" />
              )}

            </div>
          </div>
        ))}

      </div>
    )}

  </main>
</div>
  );
}