"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { X } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  variant: "error" | "success";
}

interface ToastContextValue {
  toast: (message: string, variant?: "error" | "success") => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de <Toaster />");
  return ctx;
}

export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, variant: "error" | "success" = "error") => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext value={{ toast }}>
      {children}
      <div className="fixed bottom-20 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto w-full max-w-sm rounded-lg border px-4 py-3 shadow-lg flex items-start gap-3 animate-in slide-in-from-bottom-4 fade-in duration-300 ${
              t.variant === "error"
                ? "bg-destructive/10 border-destructive/30 text-destructive"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
            }`}
          >
            <span className="flex-1 text-sm font-medium">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-md p-0.5 opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
