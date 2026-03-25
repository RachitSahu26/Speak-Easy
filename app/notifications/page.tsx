"use client";

import { useEffect, useState } from "react";
import { Bell, Clock } from "lucide-react";

type Notification = {
  id: string;
  type: "friend_request" | "feedback";
  isRead: boolean;
  createdAt: string;
  senderName: string;
  comment?: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="mx-auto max-w-xl px-4 py-8">

      <h1 className="text-2xl font-bold mb-6">Notifications</h1>

      {loading ? (
        <p>Loading...</p>
      ) : notifications.length === 0 ? (
        <div className="text-center text-gray-500">
          <Bell className="mx-auto mb-2" />
          No notifications yet
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`p-4 rounded-lg border ${
                n.isRead
                  ? "bg-white border-gray-200"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              <div className="flex justify-between items-start">

                <div>
                  <p className="font-medium">
                    {n.senderName}{" "}
                    {n.type === "friend_request"
                      ? "sent you a friend request"
                      : "left you feedback"}
                  </p>

                  {n.comment && (
                    <p className="text-sm text-gray-600 mt-1">
                      "{n.comment}"
                    </p>
                  )}

                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Clock size={12} />
                    {formatTime(n.createdAt)}
                  </p>
                </div>

                {!n.isRead && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="text-xs text-blue-600"
                  >
                    Mark read
                  </button>
                )}

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}