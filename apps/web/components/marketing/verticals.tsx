"use client";

import { motion } from "framer-motion";
import { Scissors, Wrench, Building2, Stethoscope, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const verticals = [
  {
    icon: Scissors,
    name: "Salons & Spas",
    agent: "Zia",
    description: "Book appointments, answer service questions, and keep your chairs full.",
    stats: "40% more bookings",
  },
  {
    icon: Wrench,
    name: "Home Services",
    agent: "Sparky",
    description: "Triage HVAC, plumbing, and electrical calls. Dispatch emergencies instantly.",
    stats: "3x faster dispatch",
  },
  {
    icon: Building2,
    name: "General SMB",
    agent: "Dexter",
    description: "Professional reception for any business. Route calls, take messages, answer FAQs.",
    stats: "100% answer rate",
  },
  {
    icon: Stethoscope,
    name: "Medical & Dental",
    agent: "Sunny",
    description: "Schedule patient appointments with calendar sync and SMS reminders.",
    stats: "60% fewer no-shows",
  },
  {
    icon: Briefcase,
    name: "Sales & Agencies",
    agent: "Bella",
    description: "Qualify inbound leads, score prospects, and sync to your CRM automatically.",
    stats: "2x qualified leads",
  },
];

export function Verticals() {
  return (
    <section id="verticals" className="py-24">
      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold">
            Built for <span className="gradient-text">Your Industry</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Industry-specific AI employees trained on real business scenarios.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {verticals.map((v, i) => (
            <motion.div
              key={v.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <Card className="h-full group hover:glow transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 group-hover:bg-indigo-500/20 transition-colors">
                      <v.icon className="h-6 w-6 text-indigo-400" />
                    </div>
                    <Badge variant="success">{v.stats}</Badge>
                  </div>
                  <h3 className="text-lg font-semibold">{v.name}</h3>
                  <Badge variant="outline" className="mt-2">Powered by {v.agent}</Badge>
                  <p className="mt-3 text-sm text-muted-foreground">{v.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
