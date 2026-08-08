import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import BentoFeatures from "@/components/landing/BentoFeatures";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import Testimonials from "@/components/landing/Testimonials";
import PricingSection from "@/components/landing/PricingSection";
import CTABanner from "@/components/landing/CTABanner";
import Footer from "@/components/landing/Footer";

const Index = () => (
  <div className="min-h-screen overflow-x-hidden bg-background">
    <Navbar />
    <main>
      <HeroSection />
      <BentoFeatures />
      <HowItWorksSection />
      <Testimonials />
      <PricingSection />
      <CTABanner />
    </main>
    <Footer />
  </div>
);

export default Index;
