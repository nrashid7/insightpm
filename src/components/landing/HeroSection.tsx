import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background glow */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[300px] bg-chart-2/5 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">AI-Powered Product Intelligence</span>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] mb-6">
            Know what to{" "}
            <span className="text-gradient-primary">build next</span>
            <br />
            before anyone else
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            InsightPM aggregates feedback from Reddit, App Store, reviews & more — then uses AI to surface the insights that matter.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link to="/analyze">
              <Button variant="hero" size="lg" className="text-base px-8 h-12">
                Start Analyzing
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Button variant="hero-outline" size="lg" className="text-base px-8 h-12">
              Watch Demo
            </Button>
          </div>

          {/* Stats */}
          <motion.div
            className="mt-20 grid grid-cols-3 gap-8 max-w-lg mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {[
              { value: "10K+", label: "Products Analyzed" },
              { value: "1M+", label: "Feedback Processed" },
              { value: "98%", label: "Accuracy Rate" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
