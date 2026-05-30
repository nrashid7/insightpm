"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Menu, PhoneCall, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#agents", label: "Agents" },
  { href: "#demo", label: "Live Demo" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Packages" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: -18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed left-0 right-0 top-0 z-50 px-4 py-4"
    >
      <nav className="glass-strong mx-auto flex max-w-7xl items-center justify-between rounded-lg px-4 py-3 md:px-5">
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

        <button
          className="flex h-11 w-11 items-center justify-center rounded-lg md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      <div
        className={cn(
          "glass-strong mx-4 mt-2 rounded-lg p-4 transition-all md:hidden",
          open ? "block" : "hidden"
        )}
      >
        <div className="grid gap-2">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="grid gap-2 pt-3">
          <Button variant="outline" asChild>
            <a href="#demo" onClick={() => setOpen(false)}>Try a Live Call</a>
          </Button>
          <Button asChild>
            <a href="#demo" onClick={() => setOpen(false)}>Book a Demo</a>
          </Button>
        </div>
      </div>
    </motion.header>
  );
}
