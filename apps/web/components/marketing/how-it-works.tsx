"use client";

import { motion } from "framer-motion";
import { UserPlus, Settings, Rocket } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: UserPlus,
    title: "Sign Up & Pick Your Agent",
    description: "Create your account and choose from 5 pre-trained AI employees tailored to your industry.",
  },
  {
    step: "02",
    icon: Settings,
    title: "Customize & Connect",
    description: "Upload your knowledge base, connect your calendar, and set call preferences in our 5-step wizard.",
  },
  {
    step: "03",
    icon: Rocket,
    title: "Go Live in Minutes",
    description: "Get a dedicated phone number and your AI employee starts answering calls immediately.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent" />
      <div className="relative mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold">
            Live in <span className="gradient-text">3 Simple Steps</span>
          </h2>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative"
            >
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-indigo-500/50 to-transparent" />
              )}
              <div className="glass-card rounded-2xl p-8 text-center h-full">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400">
                  <item.icon className="h-8 w-8 text-white" />
                </div>
                <span className="text-sm font-mono text-indigo-400">{item.step}</span>
                <h3 className="mt-2 text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-muted-foreground">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
