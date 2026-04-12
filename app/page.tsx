"use client";

import { Globe2, MessageCircleMore, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Users, Mic, MessageCircle, Globe } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";


const featureItems = [
  {
    title: "Instant Matching",
    icon: Users,
  },
  {
    title: "Voice & Chat",
    icon: Mic,
  },
  {
    title: "Feedback",
    icon: MessageCircle,
  },
  {
    title: "Make Global Friends",
    icon: Globe,
  },
]

const bubbleItems = [
  { initials: "EM", className: "left-[10%] top-[18%]" },
  { initials: "RA", className: "left-[24%] top-[58%]" },
  { initials: "AK", className: "right-[22%] top-[30%]" },
  { initials: "NO", className: "right-[10%] top-[60%]" },
];

export default function Home() {
  const { data: session, status } = useSession();
  const images = ["/demo1.png", "/demo2.png", "/demo3.png", "/demo4.png", "/demo5.png"];
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);


  const handleGetStarted = () => {
    if (session) {
      router.push("/find-partner"); // logged in
    } else {
      router.push("/auth"); // not logged in (change if your route is different)
    }
  };
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040b1f] text-white overflow-hidden">

      {/* GRID BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* GLOW */}
      <div className="fixed left-1/2 top-40 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-blue-600/30 blur-[160px]" />

      <main className="relative mx-auto max-w-7xl px-6 py-24 space-y-28">

        {/* ================= HERO ================= */}
        <section className="text-center space-y-6">

          <h1 className="text-5xl font-bold leading-tight md:text-7xl">
            Improve Your English
            <br />
            <span className="bg-gradient-to-r from-sky-300 to-cyan-400 bg-clip-text text-transparent">
              By Talking to the World
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-blue-100">
            SpeakEasy connects you instantly with global peers to practice real conversations.
          </p>

          <button      onClick={handleGetStarted}   className="rounded-xl cursor-pointer bg-blue-600 px-10 py-4 text-lg font-semibold shadow-xl hover:bg-blue-500">
            Start Talking
          </button>

        </section>

        {/* ================= PRODUCT PREVIEW ================= */}
        <section className="relative mx-auto mt-20 max-w-6xl">

          {/* glow background */}
          <div className="absolute left-1/2 top-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[120px]" />

          {/* main glass panel */}
          <div className="relative rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-[0_60px_120px_-20px_rgba(0,0,0,0.8)]">

            {/* screen */}
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800">

              {/* top fake navbar */}
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>

              {/* fake content */}
              <div className="relative h-full w-full">

                {/* Image */}
                <img
                  src={images[currentIndex]}
                  alt="demo"
                  className="h-full w-full object-contain transition-all duration-500"
                />

                {/* Left Button */}
                <button
                  onClick={() =>
                    setCurrentIndex((prev) =>
                      prev === 0 ? images.length - 1 : prev - 1
                    )
                  }
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 px-3 cursor-pointer py-2 rounded-full text-white"
                >
                  ◀
                </button>

                {/* Right Button */}
                <button
                  onClick={() =>
                    setCurrentIndex((prev) => (prev + 1) % images.length)
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 px-3  cursor-pointer py-2 rounded-full text-white"
                >
                  ▶
                </button>

                {/* Dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 w-2 rounded-full ${index === currentIndex ? "bg-white" : "bg-white/40"
                        }`}
                    />
                  ))}
                </div>

              </div>

            </div>

            {/* floating cards */}
            <div className="absolute -left-8 top-10 hidden w-40 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl lg:block">
              <p className="text-xs text-white/70">Connected</p>
              <p className="mt-1 text-lg font-bold">+124 Users</p>
            </div>

            <div className="absolute -right-8 bottom-10 hidden w-40 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl lg:block">
              <p className="text-xs text-white/70">Active Calls</p>
              <p className="mt-1 text-lg font-bold">32</p>
            </div>

          </div>

        </section>

        {/* ================= TRUST LOGOS ================= */}
        <section className="text-center space-y-6">

          <p className="text-blue-200">Trusted by learners worldwide</p>

          <div className="flex flex-wrap justify-center gap-10 text-white/40 text-lg font-semibold">
            <span>Google</span>
            <span>Duolingo</span>
            <span>Coursera</span>
            <span>Udemy</span>
            <span>edX</span>
          </div>

        </section>

        {/* ================= FEATURES ================= */}
        <section className="space-y-10">

          <h2 className="text-center text-3xl font-bold">
            Powerful Features
          </h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

            {featureItems.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition hover:-translate-y-2 hover:border-blue-400"
                >
                  {/* ICON */}
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20">
                    <Icon className="h-6 w-6 text-blue-400" />
                  </div>

                  <h3 className="font-semibold">{feature.title}</h3>

                  <p className="mt-2 text-sm text-white/60">
                    Practice English naturally with real people.
                  </p>
                </div>
              );
            })}
          </div>

        </section>

        {/* ================= CTA ================= */}
        <section className="text-center space-y-6">

          <h2 className="text-4xl font-bold">
            Ready to Speak Confidently?
          </h2>
          <button
            onClick={handleGetStarted}
            className="rounded-xl bg-gradient-to-r cursor-pointer from-blue-500 to-cyan-400 px-10 py-4 font-semibold shadow-xl hover:scale-105 transition"
          >
            Get Started Now
          </button>

        </section>

      </main>

    </div>
  );
}