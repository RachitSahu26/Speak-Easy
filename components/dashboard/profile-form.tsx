"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BriefcaseBusiness,
  Loader2,
  MapPin,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import { useForm } from "react-hook-form";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ProfileInput } from "@/lib/validations/profile";
import { profileSchema, profileStatusValues } from "@/lib/validations/profile";
import { cn } from "@/lib/utils";

type ProfileFormProps = {
  defaultValues: ProfileInput;
  email: string;
};

type SaveState = {
  type: "success" | "error";
  message: string;
} | null;

const fieldClassName =
  "flex h-11 w-full rounded-xl border border-border bg-background/80 px-4 py-2 text-sm text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 hover:border-primary/40";

const textareaClassName =
  "flex min-h-32 w-full rounded-xl border border-border bg-background/80 px-4 py-3 text-sm text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 hover:border-primary/40";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-destructive">{message}</p>;
}

export function ProfileForm({ defaultValues, email }: ProfileFormProps) {
  const [saveState, setSaveState] = useState<SaveState>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  const onSubmit = async (values: ProfileInput) => {
    setSaveState(null);

    const response = await fetch("/api/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const result = (await response.json()) as { message?: string };

    if (!response.ok) {
      setSaveState({
        type: "error",
        message: result.message ?? "Unable to save your profile right now.",
      });
      return;
    }

    setSaveState({
      type: "success",
      message: result.message ?? "Profile updated successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-muted/40 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar size="lg" className="size-14 bg-primary/10 text-primary">
            <AvatarFallback className="bg-primary/10 font-semibold text-primary">
              {getInitials(defaultValues.fullName || email)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">User Profile Setup</h2>
            <p className="text-sm text-muted-foreground">
              Complete your profile to get better matches.
            </p>
            <p className="text-xs text-muted-foreground">Signed in as {email}</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" />
          Personalized dashboard
        </div>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-1">
            <label className="text-sm font-medium text-foreground">Full Name</label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                {...register("fullName")}
                placeholder="Enter your full name"
                className={cn(fieldClassName, "pl-11", errors.fullName && "border-destructive")}
              />
            </div>
            <FieldError message={errors.fullName?.message} />
          </div>

          <div className="space-y-2 md:col-span-1">
            <label className="text-sm font-medium text-foreground">Status</label>
            <div className="relative">
              <BriefcaseBusiness className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
              <select
                {...register("status")}
                className={cn(fieldClassName, "pl-11", errors.status && "border-destructive")}
              >
                {profileStatusValues.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <FieldError message={errors.status?.message} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-foreground">Interest Areas</label>
            <div className="relative">
              <Sparkles className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                {...register("interestAreas")}
                placeholder="AI, Web Development, Startups"
                className={cn(fieldClassName, "pl-11", errors.interestAreas && "border-destructive")}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Separate multiple interests with commas.
            </p>
            <FieldError message={errors.interestAreas?.message} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-foreground">Location</label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                {...register("location")}
                placeholder="e.g. Bengaluru, India"
                className={cn(fieldClassName, "pl-11", errors.location && "border-destructive")}
              />
            </div>
            <FieldError message={errors.location?.message} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-foreground">Future Goal</label>
            <div className="relative">
              <Target className="pointer-events-none absolute top-4 left-4 size-4 text-muted-foreground" />
              <textarea
                {...register("futureGoal")}
                placeholder="Tell us what you want to achieve in the next phase of your journey"
                className={cn(textareaClassName, "pl-11", errors.futureGoal && "border-destructive")}
              />
            </div>
            <FieldError message={errors.futureGoal?.message} />
          </div>
        </div>

        {saveState ? (
          <div
            className={cn(
              "rounded-xl border px-4 py-3 text-sm",
              saveState.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-destructive/20 bg-destructive/10 text-destructive",
            )}
          >
            {saveState.message}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Keep your details updated so we can improve your experience.
          </p>

          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Profile"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
