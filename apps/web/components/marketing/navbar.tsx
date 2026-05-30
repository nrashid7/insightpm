"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PhoneCall, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const navLinks = [
  { href: "#agents", label: "Agents" },
  { href: "#demo", label: "Live Demo" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Packages" },
];

export function Navbar() {
  return (
    <motion.header
      initial={{ y: -18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed left-0 top-0 z-50 w-screen px-4 py-4"
    >
      <nav className="glass-strong mx-auto flex w-full max-w-[calc(100vw-2rem)] items-center justify-between rounded-lg px-3 py-3 md:max-w-7xl md:px-5">
        <Link href="/" className="flex min-h-11 items-center gap-3" aria-label="Sigyn home">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
            <PhoneCall className="h-5 w-5" />
          </span>
          <span className="text-lg font-black tracking-tight">
            Sigyn
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="outline" asChild>
            <a href="#demo">
              <Sparkles className="h-4 w-4" />
              Try a Live Call
            </a>
          </Button>
          <Button asChild>
            <a href="#demo">Book a Demo</a>
          </Button>
        </div>

        <Button size="sm" className="ml-auto md:hidden" asChild>
          <a href="#demo">Demo</a>
        </Button>
      </nav>
    </motion.header>
  );
}
