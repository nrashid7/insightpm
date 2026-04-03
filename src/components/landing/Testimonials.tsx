import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    quote: "InsightPM replaced three tools we were paying for. The competitor analysis alone is worth it.",
    name: "Sarah Chen",
    role: "Head of Product, Flowbase",
    initials: "SC",
  },
  {
    quote: "We found a critical UX issue from Reddit feedback that our support team missed for months.",
    name: "Marcus Rivera",
    role: "PM Lead, StackLayer",
    initials: "MR",
  },
  {
    quote: "The AI clustering is shockingly accurate. It surfaced patterns we didn't know existed.",
    name: "Aisha Patel",
    role: "CPO, Nimbus",
    initials: "AP",
  },
];

const logos = [
  "Flowbase", "StackLayer", "Nimbus", "Acme Corp", "TechForge", "DataPulse",
  "Flowbase", "StackLayer", "Nimbus", "Acme Corp", "TechForge", "DataPulse",
];

const Testimonials = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Marquee logos */}
      <div className="mb-16 relative">
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
        <div className="flex animate-marquee whitespace-nowrap">
          {logos.map((logo, i) => (
            <span
              key={i}
              className="mx-8 text-sm font-semibold text-muted-foreground/40 uppercase tracking-widest select-none"
            >
              {logo}
            </span>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Loved by <span className="text-gradient-primary">product teams</span>
          </h2>
          <p className="text-muted-foreground">See what teams are saying about InsightPM.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              className="p-6 rounded-2xl border border-border bg-card/50 hover:border-primary/20 transition-all"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-3.5 h-3.5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed mb-6">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{t.initials}</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
