"use client";

import { motion } from "framer-motion";
import { Briefcase, Building2, Scissors, Stethoscope, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const verticals = [
  {
    icon: Scissors,
    name: "Salons & Spas",
    agent: "Zia",
    description: "Book appointments, explain services, handle reschedules, and reduce front-desk interruptions.",
    stat: "Booking coverage",
  },
  {
    icon: Wrench,
    name: "Home Services",
    agent: "Sparky",
    description: "Triage calls, capture addresses, flag urgent jobs, and route emergency issues quickly.",
    stat: "Dispatch support",
  },
  {
    icon: Building2,
    name: "Local Services",
    agent: "Dexter",
    description: "Answer FAQs, take messages, route calls, and keep every caller feeling acknowledged.",
    stat: "Reception desk",
  },
  {
    icon: Stethoscope,
    name: "Medical & Dental",
    agent: "Sunny",
    description: "Coordinate scheduling requests, confirmations, reminders, and policy questions.",
    stat: "Appointment flow",
  },
  {
    icon: Briefcase,
    name: "Sales & Agencies",
    agent: "Bella",
    description: "Ask qualifying questions, collect details, score inbound calls, and tee up callbacks.",
    stat: "Lead capture",
  },
];

export function Verticals() {
  return (
    <section id="verticals" className="section-shell px-4">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
            Small business ready
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
            Built around the calls you actually get.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Sigyn is not a blank chatbot. Each agent starts with an operating role that matches common small-business call patterns.
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {verticals.map((vertical, index) => (
            <motion.div
              key={vertical.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full shadow-sm">
                <CardContent className="p-5">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-primary">
                    <vertical.icon className="h-5 w-5" />
                  </div>
                  <Badge variant="success">{vertical.stat}</Badge>
                  <h3 className="mt-4 text-lg font-black text-slate-950">{vertical.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-primary">Powered by {vertical.agent}</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{vertical.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
