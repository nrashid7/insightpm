import { motion } from "framer-motion";
import { Search, BarChart3, Lightbulb, Users, TrendingUp, Shield } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Multi-Source Aggregation",
    description: "Reddit, App Store, Google Play, Trustpilot, Twitter — all in one view.",
  },
  {
    icon: BarChart3,
    title: "Sentiment Analysis",
    description: "AI classifies every piece of feedback by sentiment, category, and urgency.",
  },
  {
    icon: Lightbulb,
    title: "Smart Recommendations",
    description: "Get AI-powered suggestions on what features to build next.",
  },
  {
    icon: Users,
    title: "Competitor Intel",
    description: "See where competitors are weak and find gaps to exploit.",
  },
  {
    icon: TrendingUp,
    title: "Trend Detection",
    description: "Spot emerging complaints and requests before they snowball.",
  },
  {
    icon: Shield,
    title: "Noise Filtering",
    description: "AI removes spam, bots, and duplicates — only real signals remain.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-32 relative">
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Everything you need to{" "}
            <span className="text-gradient-primary">understand users</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Replace gut feelings with data-driven product decisions.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="group p-6 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/20 transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
