import type { Metadata } from "next";
import { Anton, DM_Sans, Space_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { VtDebugPanel } from "@/components/dev/vt-debug-panel";
import { Providers } from "@/components/providers";
import "./globals.css";

// Geometric sans — Bauhaus DNA, tight letterforms
const dmSans = DM_Sans({
  weight: ["400", "500", "700", "900"],
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

// Condensed display — tall, bold, naturally narrow grotesque for poster headlines
const anton = Anton({
  weight: "400",
  variable: "--font-anton",
  subsets: ["latin"],
  display: "swap",
});

// Industrial monospace — punk, raw, developer
const spaceMono = Space_Mono({
  weight: ["400", "700"],
  variable: "--font-space-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "no-mess | Headless CMS for Developers",
  description:
    "A stupid-simple headless CMS for devs and their clients. Zero bloat. Zero config. Just ship.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${anton.variable} ${spaceMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <Toaster />
        {process.env.NODE_ENV === "development" && <VtDebugPanel />}
      </body>
    </html>
  );
}
