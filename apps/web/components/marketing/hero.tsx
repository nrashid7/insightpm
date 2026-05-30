"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, CalendarCheck, CheckCircle2, PhoneCall } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const verticals = [
  "Restaurants",
  "Home Services",
  "Salons & Spas",
  "Medical Offices",
  "Professional Services",
];

const proofPoints = [
  "Answers after hours",
  "Books appointments",
  "Qualifies leads",
  "Sends SMS follow-ups",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-32 md:pb-20 md:pt-36">
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.92fr_1.08fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="relative z-10 min-w-0"
        >
          <Badge variant="secondary" className="mb-5 px-3 py-1.5">
            <PhoneCall className="mr-1.5 h-3.5 w-3.5 text-primary" />
            AI voice agents built for small businesses
          </Badge>

          <h1 className="max-w-[calc(100vw-2rem)] text-[2rem] font-black leading-[1.06] tracking-tight text-slate-950 min-[420px]:text-4xl sm:max-w-3xl sm:text-5xl md:text-7xl">
            <span className="block sm:inline">Your business</span>{" "}
            <span className="block sm:inline">never misses</span>{" "}
            <span className="block sm:inline">the phone again.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
            Sigyn provides ready-built voice agents that answer calls, book appointments, qualify leads, and follow up by SMS while your team keeps working.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <a href="#demo">
                Book a Demo
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="#demo">
                <CalendarCheck className="h-4 w-4" />
                Try a Live Call
              </a>
            </Button>
          </div>

          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
            {proofPoints.map((point) => (
              <span key={point} className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {point}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.1 }}
          className="relative min-w-0"
        >
          <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-blue-200/55 via-white to-amber-100/80 blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-white bg-white shadow-2xl shadow-blue-950/12">
            <Image
              src="/sigyn-agent-team.png"
              alt="Five friendly Sigyn AI voice agents ready to answer calls"
              width={1792}
              height={1024}
              priority
              className="aspect-[1.08/1] h-auto w-full object-cover object-[48%_center] sm:aspect-[1.55/1]"
            />
            <div className="absolute left-4 top-4 rounded-lg bg-white/90 px-3 py-2 text-sm font-semibold shadow-lg backdrop-blur">
              Live call handled
            </div>
            <div className="absolute bottom-4 right-4 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white shadow-lg">
              24/7 coverage
            </div>
          </div>
        </motion.div>
      </div>

      <div className="mx-auto mt-10 max-w-7xl overflow-hidden border-y border-border bg-white/60 px-4 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
          <span className="font-semibold text-slate-800">Built for:</span>
          {verticals.map((vertical) => (
            <span key={vertical} className="rounded-full border border-border bg-white px-3 py-1 font-medium text-slate-700">
              {vertical}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
