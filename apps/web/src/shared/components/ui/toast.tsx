"use client";

import * as React from "react";
import { Check, TriangleAlert, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export interface ToastItem {
  id: string;
  message: string;
  variant?: "default" | "success" | "destructive";
}

interface ToastContextValue {
  show: (message: string, variant?: ToastItem["variant"]) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

/** Mount once per feature that needs toasts; renders its own fixed viewport. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("common");
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const show = React.useCallback(
    (message: string, variant: ToastItem["variant"] = "default") => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-card-foreground shadow-lg",
              toast.variant === "success" && "border-success/30",
              toast.variant === "destructive" && "border-destructive/30",
            )}
          >
            {toast.variant === "success" && (
              <Check size={16} className="shrink-0 text-success" />
            )}
            {toast.variant === "destructive" && (
              <TriangleAlert size={16} className="shrink-0 text-destructive" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label={t("dismiss")}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Requires a `<ToastProvider>` ancestor. */
export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
