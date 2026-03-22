"use client";

import { useCallback, useState } from "react";

import type { ToastItem } from "@/components/ui/toast";

type ToastInput = {
  title: string;
  variant?: "success" | "error" | "info";
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((input: ToastInput) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, ...input }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  return {
    toast,
    toasts,
    dismiss,
  };
}
