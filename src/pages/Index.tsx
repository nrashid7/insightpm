import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import BentoFeatures from "@/components/landing/BentoFeatures";
import Testimonials from "@/components/landing/Testimonials";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import PricingSection from "@/components/landing/PricingSection";
import CTABanner from "@/components/landing/CTABanner";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <BentoFeatures />
      <Testimonials />
      <HowItWorksSection />
      <PricingSection />
      <CTABanner />
      <Footer />
    </div>
  );
};

export default Index;
