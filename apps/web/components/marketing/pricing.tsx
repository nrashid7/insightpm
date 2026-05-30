"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Launch",
    price: "Starter",
    description: "For one location that needs phone coverage fast.",
    features: [
      "1 configured AI voice agent",
      "Business-hours and after-hours routing",
      "Knowledge base setup",
      "Calendar or callback workflow",
      "Call summaries and transcripts",
    ],
    popular: false,
  },
  {
    name: "Growth",
    price: "Most popular",
    description: "For busy teams that need booking, follow-up, and lead capture.",
    features: [
      "Up to 3 configured agent roles",
      "SMS confirmations and follow-ups",
      "CRM or lead handoff workflow",
      "Priority tuning after launch",
      "Monthly performance review",
    ],
    popular: true,
  },
  {
    name: "Custom",
    price: "Tailored",
    description: "For multi-location or high-volume businesses.",
    features: [
      "Custom call flows and escalations",
      "Multiple departments or locations",
      "Advanced integrations",
      "Dedicated launch support",
      "Custom reporting requirements",
    ],
    popular: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="section-shell bg-white px-4">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
            Service packages
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
            Start with the coverage you need.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Pricing is finalized after the demo because call volume, integrations, and agent complexity vary by business.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
            >
              <Card
                className={cn(
                  "relative h-full shadow-sm",
                  plan.popular && "border-primary shadow-xl shadow-blue-950/10"
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="default">
                    Recommended
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl font-black text-slate-950">{plan.name}</CardTitle>
                  <p className="text-sm leading-6 text-muted-foreground">{plan.description}</p>
                  <p className="pt-4 text-3xl font-black text-slate-950">{plan.price}</p>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <ul className="grid gap-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button variant={plan.popular ? "default" : "outline"} className="w-full" asChild>
                    <a href="#demo">Book a Demo</a>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
