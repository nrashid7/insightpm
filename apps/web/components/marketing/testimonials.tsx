"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Owner, Luxe Hair Studio",
    avatar: "SC",
    quote: "Zia books 15+ appointments a week we would have missed. Our no-show rate dropped 40% with automatic confirmations.",
    rating: 5,
  },
  {
    name: "Mike Torres",
    role: "CEO, CoolAir HVAC",
    avatar: "MT",
    quote: "Sparky handles after-hours emergency calls perfectly. We went from missing 30% of calls to answering every single one.",
    rating: 5,
  },
  {
    name: "Jennifer Walsh",
    role: "Director, Walsh Legal Group",
    avatar: "JW",
    quote: "Dexter sounds so natural that clients don't realize they're talking to AI until we tell them. Game changer for our front desk.",
    rating: 5,
  },
  {
    name: "David Park",
    role: "Founder, GrowthStack Agency",
    avatar: "DP",
    quote: "Bella qualifies leads better than our junior SDRs. Hot leads get transferred instantly with full context.",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/5 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Demo testimonials — illustrative examples
          </p>
          <h2 className="text-4xl md:text-5xl font-bold">
            Loved by <span className="gradient-text">Business Owners</span>
          </h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="h-full">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-foreground/90 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-6 flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{t.avatar}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
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
