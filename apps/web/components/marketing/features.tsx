"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Calendar,
  Clock,
  MessageSquare,
  Phone,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Phone,
    title: "Answers 24/7",
    description: "Handles calls after hours, on weekends, during lunch rushes, and when staff are already with customers.",
  },
  {
    icon: Calendar,
    title: "Books real appointments",
    description: "Connect calendars and booking rules so callers can schedule without waiting for a callback.",
  },
  {
    icon: Sparkles,
    title: "Trained on your business",
    description: "Use services, FAQs, pricing notes, service areas, and policies to keep answers grounded.",
  },
  {
    icon: MessageSquare,
    title: "Sends SMS follow-ups",
    description: "Confirm appointments, capture missed details, and keep leads moving after each call.",
  },
  {
    icon: ShieldCheck,
    title: "Escalates the right calls",
    description: "Urgent, angry, or high-value callers can be transferred with context instead of dropped.",
  },
  {
    icon: BarChart3,
    title: "Shows what happened",
    description: "Call summaries, transcripts, outcomes, and lead status help owners see the work being done.",
  },
  {
    icon: Zap,
    title: "Launches quickly",
    description: "Start with a proven agent role, then tune the script and workflows for your business.",
  },
  {
    icon: Clock,
    title: "Covers busy windows",
    description: "Sigyn can handle overflow while your team is serving customers in person.",
  },
];

export function Features() {
  return (
    <section id="features" className="section-shell bg-white px-4">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 grid gap-5 md:grid-cols-[0.8fr_1.2fr]"
        >
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
              Coverage
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
              One agent covers a lot of ground.
            </h2>
          </div>
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground md:pt-10">
            Sigyn is built around the calls small businesses actually miss: appointment requests, service questions, emergency triage, lead qualification, and follow-up tasks.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.04 }}
            >
              <Card className="h-full shadow-sm transition-shadow hover:shadow-lg">
                <CardContent className="p-5">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-primary">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-black text-slate-950">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
