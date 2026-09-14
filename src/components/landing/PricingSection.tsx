import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { createCheckoutSession } from "@/lib/api/billing";
import { useToast } from "@/hooks/use-toast";
import type { PlanId } from "@/lib/plans";
import { BILLING_ENABLED } from "@/lib/product-config";

const plans: { id: PlanId; name: string; price: string; desc: string; features: string[]; highlight: boolean; enterpriseContact?: boolean }[] = [
  {
    id: "starter",
    name: "Starter",
    price: "$29",
    desc: "For indie makers & small teams",
    features: ["1 product analysis / month", "Reddit + App Store", "Basic sentiment", "Saved history"],
    highlight: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: "$99",
    desc: "For growing product teams",
    features: ["5 analyses / month", "All data sources", "AI recommendations", "Monitoring & alerts", "Industry signals"],
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$499",
    desc: "For organizations at scale",
    features: ["Unlimited analyses", "All sources + signals", "Priority support", "Custom integrations", "Contact us for API access"],
    highlight: false,
    enterpriseContact: true,
  },
];

const PricingSection = () => {
  const { user } = useAuth();
  const { plan: currentPlan, isActive } = useSubscription();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  const handleSubscribe = async (planId: PlanId) => {
    if (!user) {
      window.location.href = `/auth?plan=${planId}`;
      return;
    }
    setLoadingPlan(planId);
    try {
      const url = await createCheckoutSession(planId);
      window.location.href = url;
    } catch (e) {
      toast({
        title: "Checkout failed",
        description: e instanceof Error ? e.message : "Could not start checkout",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  if (!BILLING_ENABLED) return <section id="pricing" className="py-24 container mx-auto px-6 text-center">
    <h2 className="text-3xl font-bold mb-4">Try InsightPM beta</h2>
    <p className="text-muted-foreground mb-6">Five completed analyses per month and up to five monitored products. No payment required during beta.</p>
    <Link to={user ? '/analyze' : '/auth'}><Button variant="hero" size="lg">Start analyzing</Button></Link>
  </section>;

  return (
    <section id="pricing" className="py-32 relative overflow-hidden">
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-chart-5/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-primary/4 rounded-full blur-[120px] pointer-events-none" />
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Simple, transparent <span className="text-gradient-primary">pricing</span>
          </h2>
          <p className="text-muted-foreground text-lg">Subscribe to start analyzing products.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={`rounded-xl p-8 border transition-all ${
                plan.highlight
                  ? "border-primary/40 bg-primary/5 shadow-glow"
                  : "border-border bg-card/50"
              }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.desc}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {isActive && currentPlan === plan.id ? (
                <Button variant="outline" className="w-full" disabled>
                  Current plan
                </Button>
              ) : plan.enterpriseContact ? (
                <div className="space-y-2">
                  <Button
                    variant={plan.highlight ? "hero" : "hero-outline"}
                    className="w-full"
                    disabled={loadingPlan === plan.id}
                    onClick={() => handleSubscribe(plan.id)}
                  >
                    {loadingPlan === plan.id ? "Loading..." : "Subscribe"}
                  </Button>
                  <a
                    href="mailto:sales@insightpm.app?subject=Enterprise%20API%20access"
                    className="block text-center text-xs text-primary hover:underline"
                  >
                    Or contact sales for API access
                  </a>
                </div>
              ) : (
                <Button
                  variant={plan.highlight ? "hero" : "hero-outline"}
                  className="w-full"
                  disabled={loadingPlan === plan.id}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {loadingPlan === plan.id ? "Loading..." : user ? "Subscribe" : "Sign up & subscribe"}
                </Button>
              )}
            </motion.div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-8">
          By subscribing you agree to our{" "}
          <Link to="/terms" className="text-primary hover:underline">Terms</Link>
          {" "}and{" "}
          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
