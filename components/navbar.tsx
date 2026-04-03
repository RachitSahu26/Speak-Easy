"use client";

import { Bell, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { LayoutDashboard } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/NotificationBell";
import DashboardPage from "@/app/dashboard/page";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [count, setCount] = useState(0);





  useEffect(() => {
    const fetchCount = async () => {
      const res = await fetch("/api/notifications/count");
      const data = await res.json();
      setCount(data.count);
    };

    fetchCount();
  }, [pathname]); // ✅ VERY IMPORTANT







  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#040b1f]/80 backdrop-blur-xl">

      {/* subtle glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

      <div className="relative flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">

        {/* LOGO */}
        <Link href="/">
          <h2 className="text-2xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-300 bg-clip-text text-transparent">
            SpeakEasy
          </h2>
        </Link>

        {/* RIGHT */}
        <div className="flex items-center gap-5">

          {session?.user && (
            <div className="flex items-center gap-4">

              {/* Dashboard */}
              <button
                onClick={() => router.push("/dashboard")}
                className="group relative"
              >
                <LayoutDashboard
                  className={`w-6 h-6 transition 
              ${pathname === "/dashboard"
                      ? "text-purple-400"
                      : "text-white/60 group-hover:text-purple-300"
                    }`}
                />
              </button>

              {/* Friends */}
              <button
                onClick={() => router.push("/dashboard/friends")}
                className="group relative"
              >
                <Users
                  className={`w-6 h-6 transition 
              ${pathname.startsWith("/dashboard/friends")
                      ? "text-cyan-400"
                      : "text-white/60 group-hover:text-cyan-300"
                    }`}
                />
              </button>

              {/* Notifications */}
              <div
                className="relative cursor-pointer"
                onClick={() => router.push("/notifications")}
              >
                <Bell className="w-6 h-6" />

                {count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-[1px] rounded-full">
                    {count}
                  </span>
                )}
              </div>

            </div>
          )}

          {session?.user ? (
            <Link
              href="/find-partner?autoStart=1"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-yellow-400 text-white font-medium shadow-[0_10px_40px_-10px_rgba(168,85,247,0.7)] hover:scale-105 transition"
            >
              Connect
            </Link>
          ) : (
            <div className="flex gap-3">

              <Link
                href="/sign-in"
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 
               hover:bg-white/10 transition-all duration-200 
               cursor-pointer hover:scale-105 hover:shadow-lg"
              >
                Sign In
              </Link>

              <Link
                href="/sign-up"
                className="px-4 py-2 rounded-xl border border-white/10 
               bg-gradient-to-r from-purple-500/30 to-yellow-400/30 
               hover:from-purple-500/50 hover:to-yellow-400/50 
               transition-all duration-200 
               cursor-pointer hover:scale-105 hover:shadow-xl"
              >
                Sign Up
              </Link>

            </div>
          )}

        </div>

      </div>

    </nav>
  );
}