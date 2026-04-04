"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ✅ Add type
type Notification = {
  id: string;
  isRead: boolean;
  type: string;
  senderName?: string;
  referenceId?: string;
  comment?: string;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);

  // ✅ FIX: add type here
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const router = useRouter();

  // 📥 fetch notifications
  useEffect(() => {
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        setNotifications(data.notifications);
      });
  }, []);

  // 🔴 unread count
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // 👆 click notification
  const handleClick = async (n: Notification) => {
    await fetch(`/api/notifications/${n.id}`, {
      method: "PATCH",
    });

    // update UI instantly
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === n.id ? { ...item, isRead: true } : item
      )
    );

    // go to feedback page
    if (n.referenceId) {
      router.push(`/feedback/${n.referenceId}`);
    }
  };

  return (
    <div className="relative">
      {/* 🔔 Bell */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1 hover:bg-gray-100 rounded-full"
      >
        <Bell className="w-6 h-6" />

        {/* 🔴 badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* 📥 dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white shadow-lg rounded-xl p-2 z-50">
          <h4 className="font-semibold px-2 py-1">Notifications</h4>

          {notifications.length === 0 && (
            <p className="text-sm text-gray-500 px-2">
              No notifications
            </p>
          )}

          <div className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`px-2 py-2 rounded-lg cursor-pointer hover:bg-gray-100 ${
                  !n.isRead ? "bg-gray-50 font-semibold" : ""
                }`}
              >
                ⭐ {n.senderName || "Someone"} gave you feedback

                {n.comment && (
                  <p className="text-xs text-gray-500">
                    {n.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}