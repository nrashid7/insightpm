"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Menu, X, Phone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "#agents", label: "AI Employees" },
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 px-4 py-4"
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between glass-strong rounded-2xl px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400">
            <Phone className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold">
            Business<span className="gradient-text">Voice</span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button variant="gradient" asChild>
            <Link href="/signup">Hire Your AI Employee</Link>
          </Button>
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      <div
        className={cn(
          "md:hidden mx-4 mt-2 glass-strong rounded-xl p-4 space-y-3 transition-all",
          open ? "block" : "hidden"
        )}
      >
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="block text-sm text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            {link.label}
          </a>
        ))}
        <div className="flex flex-col gap-2 pt-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button variant="gradient" asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </div>
    </motion.header>
  );
}
