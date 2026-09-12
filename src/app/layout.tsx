import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeScript } from "@/components/theme/theme-script";
import "./globals.css";

// Self-hosted (not next/font/google) — see src/fonts/OFL-*.txt for each
// family's license. Variable-font files (Fraunces, IBM Plex Sans) use
// their full weight/optical-size axis range; IBM Plex Mono ships as
// static weights since that's how it's distributed.
const fraunces = localFont({
  src: "../fonts/Fraunces-Variable.ttf",
  variable: "--font-fraunces",
  display: "swap",
});

const plexSans = localFont({
  src: "../fonts/IBMPlexSans-Variable.ttf",
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = localFont({
  src: [
    { path: "../fonts/IBMPlexMono-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/IBMPlexMono-Medium.ttf", weight: "500", style: "normal" },
    { path: "../fonts/IBMPlexMono-SemiBold.ttf", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VAM — Vocal Acuity Mentor",
  description:
    "An AI voice mentor that trains your presentation and communication skills, remembers your progress, and tracks your growth over time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <head>
        <ThemeScript />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
