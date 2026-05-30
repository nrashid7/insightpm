"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Phone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden">
      <div className="absolute inset-0 bg-mesh" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/20 blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-cyan-400/10 blur-[100px]" />

      <div className="relative mx-auto max-w-7xl px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Badge variant="secondary" className="mb-6 px-4 py-1.5">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            AI-Powered Phone Agents for SMBs
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]"
        >
          Hire Your First
          <br />
          <span className="gradient-text">AI Employee</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground"
        >
          BusinessVoice AI answers every call, books appointments, qualifies leads, and dispatches your team — so you never miss revenue again.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button variant="gradient" size="lg" asChild>
            <Link href="/signup">
              Start Free Trial
              <ArrowRight className="ml-1" />
            </Link>
          </Button>
          <Button variant="glass" size="lg" asChild>
            <a href="#demo">
              <Phone className="mr-1" />
              Try a Demo Call
            </a>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 mx-auto max-w-4xl"
        >
          <div className="glass-card rounded-2xl p-8 glow">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
              </div>
              <Badge variant="success">Live Call</Badge>
            </div>
            <div className="space-y-4 text-left">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold">D</div>
                <div className="glass rounded-xl px-4 py-2 text-sm">
                  Hi! Thanks for calling Sunrise Salon. This is Zia — how can I help you today?
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <div className="glass rounded-xl px-4 py-2 text-sm bg-white/5">
                  I&apos;d like to book a haircut for Saturday.
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold">Z</div>
                <div className="glass rounded-xl px-4 py-2 text-sm">
                  Perfect! I have 10 AM, 1:30 PM, or 3 PM available. Which works best?
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
