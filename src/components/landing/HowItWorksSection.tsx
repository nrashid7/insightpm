import { motion } from "framer-motion";

const steps = [
  { num: "01", title: "Enter your product", desc: "Add your product name, website, and competitors." },
  { num: "02", title: "AI gathers feedback", desc: "We scan Reddit, app stores, reviews, and social media." },
  { num: "03", title: "Insights emerge", desc: "AI clusters, ranks, and surfaces actionable intelligence." },
  { num: "04", title: "Build with confidence", desc: "Make roadmap decisions backed by real user signals." },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-32 relative">
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

        <div className="max-w-3xl mx-auto space-y-0">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              className="flex gap-6 items-start relative py-8"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="absolute left-5 top-16 w-px h-full bg-border" />
              )}
              <div className="w-10 h-10 rounded-full border border-primary/30 bg-primary/5 flex items-center justify-center shrink-0 relative z-10">
                <span className="text-xs font-mono font-semibold text-primary">{step.num}</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-1">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
