"use client";

import { Globe2, MessageCircleMore, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const featureItems = [
  { title: "Instant Matching", icon: Search },
  { title: "Global Community", icon: Globe2 },
  { title: "Live Conversations", icon: MessageCircleMore },
];

const bubbleItems = [
  { initials: "EM", className: "left-[10%] top-[18%]" },
  { initials: "RA", className: "left-[24%] top-[58%]" },
  { initials: "AK", className: "right-[22%] top-[30%]" },
  { initials: "NO", className: "right-[10%] top-[60%]" },
];

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-8 lg:px-12">
        
        {/* HERO SECTION */}
        <section className="overflow-hidden rounded-[2rem] border border-white/20 bg-gradient-to-b from-blue-900 via-blue-700 to-sky-500 shadow-[0_24px_80px_-40px_rgba(2,6,23,0.8)]">
          
          <div className="relative px-4 pb-10 pt-10 sm:px-10 sm:pt-14">
            
            {/* HEADING */}
            <div className="mx-auto max-w-5xl text-center text-white">
              <h1 className="text-balance text-4xl font-extrabold leading-tight sm:text-6xl">
                Improve Your English
                <br />
                by Talking to the
                <span className="ml-3 bg-gradient-to-r from-sky-100 to-cyan-300 bg-clip-text text-transparent">
                  World
                </span>
              </h1>

              <p className="mx-auto mt-5 max-w-3xl text-pretty text-lg text-blue-100 sm:text-3xl/9">
                Find the best peer to practice English with, anytime, anywhere.
              </p>

              <p className="mt-4 text-lg text-blue-50 sm:text-4xl/9">
                Just click “Connect” to start a conversation!
              </p>
            </div>

            {/* VISUAL CARDS */}
            <div className="relative mt-10">
              <div className="absolute left-[-2rem] top-12 hidden h-72 w-72 rounded-full bg-white/25 blur-3xl lg:block" />
              <div className="absolute right-[-2rem] top-12 hidden h-72 w-72 rounded-full bg-white/25 blur-3xl lg:block" />

              <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr_1fr] lg:items-end">
                
                {/* LEFT CARD */}
                <Card className="mx-auto w-full max-w-xs rounded-3xl border-none bg-white/15 p-0 ring-1 ring-white/30 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-orange-100 to-blue-100" />
                    <p className="mt-3 text-center text-sm font-semibold text-white/90">
                      Conversation Partner
                    </p>
                  </CardContent>
                </Card>

                {/* CENTER */}
                <div className="relative mx-auto w-full max-w-3xl">
                  <div className="mx-auto flex aspect-[16/10] w-full items-center justify-center rounded-[2rem] border border-white/30 bg-gradient-to-b from-emerald-200/90 via-cyan-100/90 to-blue-200/90 shadow-2xl">
                    <div className="flex items-center gap-3 rounded-full border border-white/70 bg-white/80 px-5 py-2 text-sm font-semibold text-blue-700 shadow-md">
                      <Sparkles className="size-4" />
                      Global English Practice
                    </div>
                  </div>

                  {bubbleItems.map((item) => (
                    <Avatar
                      key={item.initials}
                      className={`absolute size-16 border-4 border-white bg-white shadow-xl sm:size-20 ${item.className}`}
                    >
                      <AvatarFallback className="bg-gradient-to-br from-sky-500 to-blue-700 text-sm font-bold text-white sm:text-base">
                        {item.initials}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>

                {/* RIGHT CARD */}
                <Card className="mx-auto w-full max-w-xs rounded-3xl border-none bg-white/15 p-0 ring-1 ring-white/30 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100" />
                    <p className="mt-3 text-center text-sm font-semibold text-white/90">
                      Conversation Partner
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* CTA BUTTON */}
              <div className="mt-8 flex justify-center">
                {session?.user ? (
                  <Link
                    href="/find-partner?autoStart=1"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "h-14 rounded-2xl bg-green-500 px-10 text-xl font-bold text-white hover:bg-green-400"
                    )}
                  >
                    Connect & Start Talking
                  </Link>
                ) : (
                  <div className="flex gap-4">
                    <Link href="/sign-in" className={cn(buttonVariants({ size: "lg" }))}>
                      Sign In
                    </Link>
                    <Link href="/sign-up" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="mx-auto mt-10 max-w-5xl rounded-3xl bg-white p-4 shadow-lg sm:p-8">
          <div className="grid gap-6 md:grid-cols-3 md:gap-4">
            {featureItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex flex-col items-center justify-center gap-4 py-3 text-center md:not-last:border-r"
                >
                  <div className="flex size-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-md">
                    <Icon className="size-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-blue-700">
                    {item.title}
                  </h3>
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
