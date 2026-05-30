"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    price: 99,
    description: "Perfect for solo businesses getting started with AI.",
    minutes: 200,
    features: [
      "1 AI Employee",
      "200 minutes/month",
      "Knowledge base (5 docs)",
      "Google Calendar sync",
      "Call transcripts",
      "Email support",
    ],
    cta: "Start Free Trial",
    plan: "starter",
    popular: false,
  },
  {
    name: "Pro",
    price: 249,
    description: "For growing businesses that need more capacity.",
    minutes: 600,
    features: [
      "3 AI Employees",
      "600 minutes/month",
      "Unlimited knowledge docs",
      "All calendar integrations",
      "CRM sync (HubSpot, GHL)",
      "Lead scoring & analytics",
      "Priority support",
    ],
    cta: "Start Free Trial",
    plan: "pro",
    popular: true,
  },
  {
    name: "Enterprise",
    price: null,
    description: "Custom solutions for high-volume operations.",
    minutes: null,
    features: [
      "Unlimited AI Employees",
      "Custom minute packages",
      "Dedicated account manager",
      "Custom voice cloning",
      "SLA & uptime guarantee",
      "White-label options",
      "API access",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold">
            Simple, <span className="gradient-text">Transparent Pricing</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            14-day free trial on all plans. No credit card required.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card
                className={cn(
                  "h-full relative",
                  plan.popular && "gradient-border glow"
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="default">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                  <div className="mt-4">
                    {plan.price !== null ? (
                      <>
                        <span className="text-4xl font-bold">${plan.price}</span>
                        <span className="text-muted-foreground">/month</span>
                      </>
                    ) : (
                      <span className="text-4xl font-bold">Custom</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={plan.popular ? "gradient" : "outline"}
                    className="w-full"
                    asChild
                  >
                    <Link
                      href={
                        plan.price !== null
                          ? `/api/stripe/checkout?plan=${"plan" in plan ? plan.plan : "starter"}`
                          : "#"
                      }
                    >
                      {plan.cta}
                    </Link>
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
