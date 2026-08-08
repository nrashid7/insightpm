import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import AnimatedCounter from "@/components/ui/animated-counter";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/8 rounded-full blur-[140px] animate-pulse-slow" />
        <div className="absolute bottom-1/3 left-1/4 w-[500px] h-[350px] bg-chart-2/6 rounded-full blur-[120px] animate-float" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-accent/5 rounded-full blur-[100px] animate-float-delayed" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
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
            <a href="#how-it-works">
              <Button variant="hero-outline" size="lg" className="text-base px-8 h-12">
                See How It Works
              </Button>
            </a>
          </div>

          {/* Dashboard Preview */}
          <motion.div
            className="mt-16 mx-auto max-w-3xl"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <div className="relative rounded-xl border border-border bg-card/80 backdrop-blur-sm p-4 shadow-card">
              {/* Fake dashboard toolbar */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-accent/60" />
                <div className="w-3 h-3 rounded-full bg-chart-4/60" />
                <div className="flex-1 mx-4 h-6 rounded bg-muted/50" />
              </div>
              {/* Fake content rows */}
              <div className="grid grid-cols-4 gap-3 mb-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-muted/30 border border-border/50" />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 h-32 rounded-lg bg-muted/20 border border-border/50" />
                <div className="h-32 rounded-lg bg-muted/20 border border-border/50" />
              </div>
              {/* Glow overlay */}
              <div className="absolute -inset-px rounded-xl bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
            </div>
          </motion.div>

          {/* Animated Stats */}
          <motion.div
            className="mt-12 grid grid-cols-3 gap-8 max-w-lg mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <AnimatedCounter value="9+" label="Feedback Sources" />
            <AnimatedCounter value="AI" label="Sentiment & Clustering" />
            <AnimatedCounter value="24/7" label="Monitoring Alerts" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
