import { agentTemplates } from "@businessvoice/shared";
import { Hero } from "@/components/marketing/hero";
import { AgentShowcase } from "@/components/marketing/agent-showcase";
import { DemoCall } from "@/components/marketing/demo-call";
import { Features } from "@/components/marketing/features";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Verticals } from "@/components/marketing/verticals";
import { Testimonials } from "@/components/marketing/testimonials";
import { Pricing } from "@/components/marketing/pricing";
import { CtaFooter } from "@/components/marketing/cta-footer";

export default function HomePage() {
  return (
    <>
      <Hero />
      <AgentShowcase templates={agentTemplates} />
      <DemoCall />
      <Features />
      <HowItWorks />
      <Verticals />
      <Testimonials />
      <Pricing />
      <CtaFooter />
    </>
  );
}
