import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pacergo.app"),
  title: {
    default: "Pacergo — Find your workout companion",
    template: "%s · Pacergo",
  },
  description:
    "Find an in-person workout companion in Taiwan — from certified trainers to training buddies. Match on activity and pace, book a session, and train together.",
  keywords: [
    "workout companion",
    "personal trainer Taiwan",
    "find a gym partner",
    "fitness buddy",
    "in-person training",
  ],
  openGraph: {
    title: "Pacergo — Find your workout companion",
    description:
      "From certified trainers to training buddies — meet real people near you and train in person.",
    type: "website",
    locale: "en_US",
    siteName: "Pacergo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pacergo — Find your workout companion",
    description:
      "From certified trainers to training buddies — meet real people near you and train in person.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
