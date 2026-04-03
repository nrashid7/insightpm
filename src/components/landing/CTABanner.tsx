import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const CTABanner = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <motion.div
          className="relative rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-12 md:p-16 text-center overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {/* Background orbs */}
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-accent/10 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Ready to build what users{" "}
              <span className="text-gradient-primary">actually want</span>?
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
              Start your first analysis in under 2 minutes. No credit card required.
            </p>
            <Link to="/analyze">
              <Button variant="hero" size="lg" className="text-base px-10 h-13">
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTABanner;
