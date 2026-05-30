"use client";

import { motion } from "framer-motion";
import { ArrowRight, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaFooter() {
  return (
    <section className="dark-band px-4 py-24">
      <div className="mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-white text-slate-950">
            <PhoneCall className="h-7 w-7" />
          </div>
          <h2 className="text-4xl font-black tracking-tight md:text-6xl">
            Your phones are ringing right now.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Every unanswered call is a customer choosing whether to wait, leave a voicemail, or call the next business. Sigyn gives them a better path.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <a href="#demo">
                Book a Demo
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" size="lg" className="border-white/20 bg-white/10 text-white hover:bg-white hover:text-slate-950" asChild>
              <a href="#agents">Meet the Agents</a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
