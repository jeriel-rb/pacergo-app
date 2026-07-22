import type { Metadata } from "next";
import "./globals.css";

// <html> and <body> live in app/[locale]/layout.tsx so `lang` can be set from
// the locale segment at static-build time.
export const metadata: Metadata = {
  metadataBase: new URL("https://pacergo.app"),
  title: "PacerGo",
  icons: {
    icon: "/icon.svg",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
