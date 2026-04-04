import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import BentoFeatures from "@/components/landing/BentoFeatures";
import Testimonials from "@/components/landing/Testimonials";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import PricingSection from "@/components/landing/PricingSection";
import CTABanner from "@/components/landing/CTABanner";
import Footer from "@/components/landing/Footer";

const SectionDivider = () => (
  <div className="flex justify-center">
    <div className="w-2/3 max-w-xl h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
  </div>
);

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative">
      {/* Global noise texture */}
      <div className="fixed inset-0 bg-noise pointer-events-none z-0" />
      {/* Global dot grid */}
      <div className="fixed inset-0 bg-dot-grid pointer-events-none z-0" />

      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <SectionDivider />
        <BentoFeatures />
        <SectionDivider />
        <Testimonials />
        <SectionDivider />
        <HowItWorksSection />
        <SectionDivider />
        <PricingSection />
        <CTABanner />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
