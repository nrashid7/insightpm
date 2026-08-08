import { motion } from "framer-motion";
import { Search, BarChart3, Lightbulb, Users, TrendingUp, Shield } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Multi-Source Aggregation",
    description: "Reddit, App Store, Google Play, Trustpilot, Twitter — all in one view.",
    span: "md:col-span-2",
    highlight: true,
  },
  {
    icon: BarChart3,
    title: "Sentiment Analysis",
    description: "AI classifies every piece of feedback by sentiment, category, and urgency.",
    span: "",
    highlight: false,
  },
  {
    icon: Lightbulb,
    title: "Smart Recommendations",
    description: "Get AI-powered suggestions on what features to build next.",
    span: "",
    highlight: false,
  },
  {
    icon: Users,
    title: "Competitor Intel",
    description: "See where competitors are weak and find gaps to exploit.",
    span: "",
    highlight: false,
  },
  {
    icon: TrendingUp,
    title: "Trend Detection",
    description: "Spot emerging complaints and requests before they snowball.",
    span: "",
    highlight: true,
  },
  {
    icon: Shield,
    title: "Noise Filtering",
    description: "AI removes spam, bots, and duplicates — only real signals remain.",
    span: "md:col-span-2",
    highlight: false,
  },
];

const BentoFeatures = () => {
  return (
    <section id="features" className="py-32 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[400px] bg-primary/6 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-chart-2/5 rounded-full blur-[120px] pointer-events-none" />

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

        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className={`group relative p-6 rounded-2xl border border-border bg-card/50 hover:border-primary/30 transition-all duration-500 overflow-hidden ${feature.span}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
              </div>

              <div className="relative z-10">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300 ${
                  feature.highlight 
                    ? "bg-primary/15 group-hover:bg-primary/25" 
                    : "bg-muted group-hover:bg-primary/10"
                }`}>
                  <feature.icon className={`w-5 h-5 transition-colors duration-300 ${
                    feature.highlight ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  }`} />
                </div>

                {feature.highlight && (
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary mb-3 uppercase tracking-wider">
                    Popular
                  </span>
                )}

                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BentoFeatures;
