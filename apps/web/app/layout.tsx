import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sigyn - AI Voice Agents for Small Businesses",
  description:
    "Sigyn provides ready-built AI voice agents that answer calls, book appointments, qualify leads, and support small businesses 24/7.",
  keywords: [
    "AI phone agent",
    "virtual receptionist",
    "AI voice agent",
    "call answering service",
    "appointment booking AI",
  ],
  openGraph: {
    title: "Sigyn - AI Voice Agents for Small Businesses",
    description:
      "Book more customers and miss fewer calls with ready-built AI voice agents for small businesses.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Suspense fallback={null}>
          <PostHogProvider>{children}</PostHogProvider>
        </Suspense>
      </body>
    </html>
  );
}
