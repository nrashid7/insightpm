"use client";

import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    name: "Maya R.",
    role: "Salon owner",
    avatar: "MR",
    quote: "The value is simple: fewer missed calls, fewer interruptions, and a booking flow that keeps moving even when the front desk is busy.",
  },
  {
    name: "Chris L.",
    role: "Home services operator",
    avatar: "CL",
    quote: "After-hours calls used to turn into voicemail. With a tuned dispatcher flow, callers can explain the issue and our team gets the context.",
  },
  {
    name: "Dana P.",
    role: "Local clinic manager",
    avatar: "DP",
    quote: "We needed scheduling help, not a generic chatbot. The agent role made the conversation feel much closer to our actual front office.",
  },
  {
    name: "Owen S.",
    role: "Agency founder",
    avatar: "OS",
    quote: "Lead calls come in cleaner because the right questions get asked before anyone on our team spends time following up.",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="section-shell px-4">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Illustrative customer scenarios
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
            Proof points for busy operators.
          </h2>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
            >
              <Card className="h-full shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <Quote className="h-6 w-6 text-primary" />
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, starIndex) => (
                        <Star key={starIndex} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="leading-7 text-slate-700">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="mt-6 flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-secondary text-primary">{testimonial.avatar}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-black text-slate-950">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
