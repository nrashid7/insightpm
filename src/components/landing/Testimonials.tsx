import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const useCases = [
  {
    title: "Prioritize the roadmap",
    description:
      "Aggregate Reddit threads, App Store reviews, and support feedback into ranked feature requests and pain points.",
  },
  {
    title: "Spot competitor gaps",
    description:
      "Compare sentiment and complaints across your product and competitors to find differentiation opportunities.",
  },
  {
    title: "Monitor what changes",
    description:
      "Schedule daily or weekly re-runs and get alerts when sentiment shifts or new themes emerge.",
  },
];

const sourceHighlights = [
  "Reddit", "App Store", "Google Play", "GitHub", "Hacker News",
  "Stack Overflow", "Trustpilot", "YouTube", "Web",
];

const Testimonials = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute top-1/2 -right-32 w-[500px] h-[400px] bg-accent/6 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[300px] h-[300px] bg-primary/4 rounded-full blur-[120px] pointer-events-none" />

      <div className="mb-16 relative">
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />
        <div className="flex animate-marquee whitespace-nowrap">
          {[...sourceHighlights, ...sourceHighlights].map((source, i) => (
            <span
              key={i}
              className="mx-8 text-sm font-semibold text-muted-foreground/40 uppercase tracking-widest select-none"
            >
              {source}
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
            Built for <span className="text-gradient-primary">product teams</span>
          </h2>
          <p className="text-muted-foreground">Common workflows InsightPM supports out of the box.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {useCases.map((item, i) => (
            <motion.div
              key={item.title}
              className="p-6 rounded-2xl border border-border bg-card/50 hover:border-primary/20 transition-all"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
            >
              <div className="flex gap-1 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
