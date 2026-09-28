"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary for errors in the root layout itself (outside
 * [locale]/layout.tsx, so no i18n/theme providers are available here).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "0 1.5rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
          Something went wrong
        </h1>
        <p style={{ maxWidth: 360, color: "#6b7280", fontSize: "0.875rem" }}>
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "0.5rem",
            borderRadius: "0.5rem",
            background: "#1565ff",
            color: "#ffffff",
            fontWeight: 600,
            padding: "0.5rem 1rem",
            border: "none",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </body>
    </html>
  );
}
