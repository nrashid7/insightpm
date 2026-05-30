"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaFooter() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-4xl px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl glass-card p-12 md:p-16 text-center glow"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-cyan-400/20" />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-bold">
              Ready to Hire Your
              <br />
              <span className="gradient-text">First AI Employee?</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              Join hundreds of businesses answering every call with AI. Start your 14-day free trial today.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="gradient" size="lg" asChild>
                <Link href="/signup">
                  Get Started Free
                  <ArrowRight className="ml-1" />
                </Link>
              </Button>
              <Button variant="glass" size="lg" asChild>
                <a href="#demo">Try Demo Call</a>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
