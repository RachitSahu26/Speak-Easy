import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { ProfileForm } from "@/components/dashboard/profile-form";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/dashboard");
  }

  const [currentUser] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      status: users.status,
      interestAreas: users.interestAreas,
      location: users.location,
      futureGoal: users.futureGoal,
    })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!currentUser) {
    redirect("/sign-in?callbackUrl=/dashboard");
  }

  return (
    <div className="relative min-h-screen bg-[#040b1f] text-white overflow-hidden px-6 py-16">

      {/* GRID BACKGROUND */}
      <div className="pointer-events-none absolute inset-0 opacity-40
  bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),
  linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)]
  bg-[size:60px_60px]" />

      {/* TOP LIGHT GLOW */}
      <div className="pointer-events-none absolute left-1/2 top-20 h-[500px] w-[500px] 
  -translate-x-1/2 rounded-full bg-purple-600/30 blur-[140px]" />

      {/* BOTTOM RIGHT GLOW */}
      <div className="pointer-events-none absolute right-0 bottom-0 h-[400px] w-[400px] 
  translate-x-1/4 translate-y-1/4 rounded-full bg-cyan-500/20 blur-[120px]" />

      {/* SUBTLE GRADIENT OVERLAY */}
      <div className="pointer-events-none absolute inset-0 
  bg-gradient-to-b from-transparent via-[#040b1f]/60 to-[#040b1f]" />



      {/* header */}
      <div className="relative mx-auto max-w-6xl space-y-12">

        {/* HEADER */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">

          <div className="space-y-4">

            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs text-white/60 backdrop-blur-xl">
              <ShieldCheck className="size-4 text-cyan-400" />
              Secure Dashboard
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
                Welcome back, {currentUser.name}
              </h1>

              <p className="max-w-xl text-white/60">
                Manage your profile and prepare for your next global conversation.
              </p>
            </div>

          </div>

          <div className="flex flex-wrap items-center gap-3">

            <Link href="/dashboard/friends">
              <Button className="border border-white/10 bg-white/5 hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-yellow-400/20 transition">
                Friends
              </Button>
            </Link>

            <Link href="/">
              <Button className="border border-white/10 bg-white/5 hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-yellow-400/20 transition">
                <ArrowLeft className="size-4 mr-1" />
                Home
              </Button>
            </Link>

            <SignOutButton />

          </div>

        </div>

        {/* GLOW DIVIDER */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

        {/* GRID */}
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">

          {/* PROFILE CARD */}
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-yellow-400/30">

            <Card className="rounded-2xl border border-white/10 bg-[#0b132b]/80 backdrop-blur-xl">

              <CardHeader>
                <CardTitle className="text-2xl font-semibold bg-gradient-to-r from-indigo-300 to-purple-400 bg-clip-text text-transparent">
                  Profile Details
                </CardTitle>


                <CardDescription className="text-white/60">
                  Update your information to improve matching.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ProfileForm
                  email={currentUser.email}
                  defaultValues={{
                    fullName: currentUser.name,
                    status:
                      currentUser.status === "Student" ||
                        currentUser.status === "Working Professional"
                        ? currentUser.status
                        : "Student",
                    interestAreas: currentUser.interestAreas ?? "",
                    location: currentUser.location ?? "",
                    futureGoal: currentUser.futureGoal ?? "",
                  }}
                />
              </CardContent>

            </Card>

          </div>

          {/* SNAPSHOT CARD */}
          <div className="relative rounded-2xl p-[1px] bg-gradient-to-b from-purple-500/30 to-transparent">

            <Card className="rounded-2xl border border-white/10 bg-[#0b132b]/80 backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-[0_25px_100px_-20px_rgba(124,58,237,0.45)]">

              <CardHeader>
                <CardTitle className="text-2xl font-semibold bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-300 bg-clip-text text-transparent">
                  Profile Snapshot
                </CardTitle>

                <CardDescription className="text-white/60">
                  Quick overview of your account.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5 text-sm">

                <div className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:-translate-y-1 hover:border-purple-400/40">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-white/40">Email</p>
                  <p className="mt-1 font-medium">{currentUser.email}</p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:-translate-y-1 hover:border-purple-400/40">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-white/40">Status</p>
                  <p className="mt-1 font-medium">{currentUser.status ?? "Add your status"}</p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4 transition hover:-translate-y-1 hover:border-purple-400/40">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-white/40">Interests</p>
                  <p className="mt-1 font-medium">{currentUser.interestAreas ?? "Add interest areas"}</p>
                </div>

              </CardContent>

            </Card>

          </div>

        </div>

      </div>
    </div>
  );
}