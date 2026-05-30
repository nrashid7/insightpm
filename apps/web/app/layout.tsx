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
  title: "BusinessVoice AI - Hire Your First AI Employee",
  description:
    "AI-powered phone agents that answer every call, book appointments, qualify leads, and dispatch your team — 24/7. Hire your first AI employee in minutes.",
  keywords: [
    "AI phone agent",
    "virtual receptionist",
    "AI employee",
    "call answering service",
    "appointment booking AI",
  ],
  openGraph: {
    title: "BusinessVoice AI - Hire Your First AI Employee",
    description:
      "Never miss a call again. AI employees that answer, book, and qualify — 24/7.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Suspense fallback={null}>
          <PostHogProvider>{children}</PostHogProvider>
        </Suspense>
      </body>
    </html>
  );
}
