import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bot, BarChart3, Rocket } from "lucide-react";

const steps = [
  {
    num: "01",
    title: "Enter your product",
    desc: "Add your product name, website, and competitors. That's all we need to start.",
    icon: Search,
    visual: (
      <div className="space-y-3">
        <div className="h-8 rounded-lg bg-muted/40 border border-border/50 w-3/4" />
        <div className="h-8 rounded-lg bg-muted/40 border border-border/50 w-full" />
        <div className="h-8 rounded-lg bg-primary/10 border border-primary/20 w-2/3" />
        <div className="h-9 rounded-lg bg-primary/20 border border-primary/30 w-32 mt-4" />
      </div>
    ),
  },
  {
    num: "02",
    title: "AI gathers feedback",
    desc: "We scan Reddit, app stores, reviews, and social media to collect real user signals.",
    icon: Bot,
    visual: (
      <div className="space-y-2">
        {["Reddit", "App Store", "Trustpilot", "Twitter", "G2"].map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div className="w-20 text-xs text-muted-foreground">{s}</div>
            <div className="flex-1 h-3 rounded-full bg-muted/30 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary/40"
                initial={{ width: 0 }}
                animate={{ width: `${60 + i * 8}%` }}
                transition={{ delay: i * 0.15, duration: 0.8 }}
              />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: "03",
    title: "Insights emerge",
    desc: "AI clusters, ranks, and surfaces actionable intelligence from thousands of data points.",
    icon: BarChart3,
    visual: (
      <div className="flex items-end gap-2 h-28">
        {[40, 65, 50, 80, 55, 90, 70, 85].map((h, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-t-md bg-primary/30"
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
          />
        ))}
      </div>
    ),
  },
  {
    num: "04",
    title: "Build with confidence",
    desc: "Make roadmap decisions backed by real user signals, not guesswork.",
    icon: Rocket,
    visual: (
      <div className="space-y-3">
        {[
          { label: "Dark mode support", score: 94 },
          { label: "Export to PDF", score: 87 },
          { label: "Mobile app", score: 76 },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <div className="w-32 text-xs text-foreground/80">{item.label}</div>
            <div className="flex-1 h-5 rounded-full bg-muted/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/50 to-primary/80"
                style={{ width: `${item.score}%` }}
              />
            </div>
            <span className="text-xs font-mono text-primary">{item.score}</span>
          </div>
        ))}
      </div>
    ),
  },
];

const HowItWorksSection = () => {
  const [active, setActive] = useState(0);

  return (
    <section id="how-it-works" className="py-32 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-chart-2/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Four steps to <span className="text-gradient-primary">clarity</span>
          </h2>
        </motion.div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-start">
          {/* Tabs */}
          <div className="space-y-2">
            {steps.map((step, i) => (
              <button
                key={step.num}
                onClick={() => setActive(i)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
                  active === i
                    ? "border-primary/30 bg-primary/5"
                    : "border-transparent hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    active === i ? "bg-primary/20" : "bg-muted/50"
                  }`}>
                    <step.icon className={`w-5 h-5 transition-colors ${
                      active === i ? "text-primary" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Step {step.num}</span>
                    <h3 className={`text-base font-semibold transition-colors ${
                      active === i ? "text-foreground" : "text-muted-foreground"
                    }`}>{step.title}</h3>
                  </div>
                </div>
                {active === i && (
                  <motion.p
                    className="text-sm text-muted-foreground mt-3 pl-14"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                  >
                    {step.desc}
                  </motion.p>
                )}
              </button>
            ))}
          </div>

          {/* Visual preview */}
          <div className="relative">
            <div className="sticky top-24 rounded-2xl border border-border bg-card/60 p-8 min-h-[280px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {steps[active].visual}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
