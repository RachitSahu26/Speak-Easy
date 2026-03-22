"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const response =  await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = (await response.json()) as { message?: string };
    setIsLoading(false);

    if (!response.ok) {
      setError(data.message ?? "Something went wrong");
      return;
    }

    router.push("/sign-in");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Card className="w-full max-w-md border-slate-200 bg-white py-0">
        <CardHeader className="px-6 pt-6">
          <CardTitle className="text-2xl">Create your account</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none ring-blue-400/50 focus:ring-2"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none ring-blue-400/50 focus:ring-2"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none ring-blue-400/50 focus:ring-2"
                placeholder="At least 8 characters"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <Button
              type="submit"
              size="lg"
              className="h-10 w-full bg-blue-600 text-white hover:bg-blue-500"
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Create Account"}
            </Button>
          </form>

          <p className="mt-5 text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-semibold text-blue-600 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
