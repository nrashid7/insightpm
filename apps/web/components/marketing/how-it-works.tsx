"use client";

import { motion } from "framer-motion";
import { ClipboardList, Headphones, Rocket } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: ClipboardList,
    title: "Tell us about your business",
    description: "We map your services, hours, call types, escalation rules, calendar needs, and the customers you serve.",
  },
  {
    step: "02",
    icon: Headphones,
    title: "We build and train your agent",
    description: "Sigyn starts from a proven voice-agent role, then adapts the script, knowledge, workflows, and handoffs to your operation.",
  },
  {
    step: "03",
    icon: Rocket,
    title: "Go live and get back to work",
    description: "Your agent answers missed calls, books qualified customers, sends follow-ups, and hands off the calls that need your team.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section-shell px-4">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
            How it works
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
            Three steps to phones handled 24/7.
          </h2>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative rounded-lg border border-border bg-white p-7 shadow-sm"
            >
              <span className="absolute right-6 top-5 text-5xl font-black text-slate-100">
                {item.step}
              </span>
              <div className="relative">
                <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-950 text-white">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-black text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
