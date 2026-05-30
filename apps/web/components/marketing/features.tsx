"use client";

import { motion } from "framer-motion";
import {
  Phone,
  Calendar,
  Brain,
  BarChart3,
  Shield,
  Zap,
  MessageSquare,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Phone,
    title: "24/7 Call Answering",
    description: "Never miss a call again. Your AI employee picks up instantly, day or night.",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "Syncs with Google Calendar, Calendly, and Cal.com to book in real-time.",
  },
  {
    icon: Brain,
    title: "Knowledge Base Powered",
    description: "Upload docs and FAQs. Your agent answers with your business knowledge.",
  },
  {
    icon: BarChart3,
    title: "Lead Scoring & CRM Sync",
    description: "Qualify leads automatically and push hot prospects to HubSpot or GoHighLevel.",
  },
  {
    icon: Shield,
    title: "Smart Escalation",
    description: "Transfers urgent calls to your team with full context and transcript.",
  },
  {
    icon: Zap,
    title: "5-Minute Setup",
    description: "Pick a template, upload knowledge, connect calendar — go live instantly.",
  },
  {
    icon: MessageSquare,
    title: "SMS Follow-ups",
    description: "Automatic confirmations and follow-up texts after every call.",
  },
  {
    icon: Clock,
    title: "Call Analytics",
    description: "Track answer rates, booking conversion, sentiment, and ROI in one dashboard.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold">
            Everything You Need to
            <br />
            <span className="gradient-text">Never Miss a Call</span>
          </h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="h-full hover:bg-white/5 transition-colors">
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-400/20">
                    <feature.icon className="h-6 w-6 text-indigo-400" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
