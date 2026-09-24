import type { Metadata } from "next";
import "./globals.css";

// <html> and <body> live in app/[locale]/layout.tsx so `lang` reflects the
// locale segment at static-build time.
export const metadata: Metadata = {
  metadataBase: new URL("https://pacergo.app"),
  title: {
    default: "Pacergo",
    template: "%s · Pacergo",
  },
};

console.log("[pacergo] web root layout loaded");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
