"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/NotificationBell";

export default function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b bg-white">
      {/* Logo */}
      <h2 className="text-2xl font-extrabold text-blue-700">
        SpeakEasy
      </h2>

      {/* Right side */}
      <div className="flex items-center gap-4">

        {session?.user && (
          <>
            {/* 👥 Friends */}
            <button onClick={() => router.push("dashboard/friends")}>
              <Users className="w-6 h-6 cursor-pointer" />
            </button>

            {/* 🔔 Notifications */}
            <NotificationBell />
          </>
        )}

        {session?.user ? (
          <Link
            href="/find-partner?autoStart=1"
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-green-500 text-white hover:bg-green-400"
            )}
          >
            Connect
          </Link>
        ) : (
          <>
            <Link
              href="/sign-in"
              className={cn(buttonVariants({ size: "lg" }))}
            >
              Sign In
            </Link>

            <Link
              href="/sign-up"
              className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}