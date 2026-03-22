import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";

import { ProfileForm } from "@/components/dashboard/profile-form";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_32%),linear-gradient(to_bottom,_rgba(248,250,252,0.95),_rgba(241,245,249,0.9))] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
              <ShieldCheck className="size-3.5 text-primary" />
              Secure member dashboard
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Welcome back, {currentUser.name}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Manage your profile details and personalize your dashboard experience.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/dashboard/friends" className="inline-flex">
              <Button variant="outline" size="lg">
                Friends
              </Button>
            </Link>
            <Link href="/" className="inline-flex">
              <Button variant="outline" size="lg">
                <ArrowLeft className="size-4" />
                Back to Home
              </Button>
            </Link>
            <SignOutButton />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <Card className="border-border/60 bg-background/90 py-0 shadow-xl shadow-slate-200/40 backdrop-blur-sm">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="text-2xl">Profile Details</CardTitle>
              <CardDescription>
                Update your information so we can personalize recommendations and better matches.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
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

          <Card className="border-border/60 bg-background/80 py-0 shadow-lg shadow-slate-200/30 backdrop-blur-sm">
            <CardHeader className="px-6 pt-6">
              <CardTitle className="text-lg">Profile Snapshot</CardTitle>
              <CardDescription>
                A quick overview of your account information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-6 pb-6 text-sm text-slate-700">
              <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  <Mail className="size-3.5" />
                  Account email
                </div>
                <p className="font-medium text-foreground">{currentUser.email}</p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Current status
                </p>
                <p className="font-medium text-foreground">
                  {currentUser.status ?? "Complete your profile to add this detail"}
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Interest areas
                </p>
                <p className="font-medium text-foreground">
                  {currentUser.interestAreas ?? "Add topics you enjoy to improve recommendations"}
                </p>
              </div>
            </CardContent>
          </Card>
       
       
        </div>
      </div>
    </div>
  );
}
