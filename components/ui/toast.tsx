"use client";

import { useEffect } from "react";

import { cn } from "@/lib/utils";

export type ToastItem = {
  id: string;
  title: string;
  variant?: "success" | "error" | "info";
};

type ToasterProps = {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
};

export function Toaster({ toasts, onDismiss }: ToasterProps) {
  useEffect(() => {
    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        onDismiss(toast.id);
      }, 2800),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts, onDismiss]);

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur",
            toast.variant === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
            toast.variant === "error" && "border-rose-200 bg-rose-50 text-rose-800",
            (!toast.variant || toast.variant === "info") &&
              "border-slate-200 bg-white text-slate-800",
          )}
        >
          {toast.title}
        </div>
      ))}
    </div>
  );
}
