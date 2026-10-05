"use client";

import * as React from "react";
import hotToast, { Toaster } from "react-hot-toast";

export type ToastVariant = "default" | "success" | "destructive";

interface ToastApi {
  show: (message: string, variant?: ToastVariant) => void;
}

const DURATION_MS = 4000;

/** Toasts always appear top-center, in every flow — never pass another position. */
const POSITION = "top-center" as const;

/** Callers pass already-localized text (`t("toast.…")`); the toast never
 *  translates or rewrites the message itself. */
const api: ToastApi = {
  show(message, variant = "default") {
    const options = { position: POSITION, duration: DURATION_MS };
    if (variant === "success") hotToast.success(message, options);
    else if (variant === "destructive") hotToast.error(message, options);
    else hotToast(message, options);
  },
};

/** Stable, provider-independent handle. Safe to call from any client component. */
export function useToast(): ToastApi {
  return api;
}

/** Mount once (the locale layout does). Renders the single shared top-center
 *  `<Toaster>` with react-hot-toast's default look; only the background and
 *  text color come from the theme tokens (`:root` / `.dark` in globals.css) so
 *  it follows the user's light/dark choice. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position={POSITION}
        toastOptions={{
          duration: DURATION_MS,
          style: { background: "var(--card)", color: "var(--card-foreground)" },
        }}
      />
    </>
  );
}
