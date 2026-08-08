export type PlanId = "starter" | "growth" | "enterprise";

export interface PlanLimits {
  analysesPerMonth: number;
  allowedFeedbackSources: string[] | "*";
  allowMarketSignals: boolean;
  maxMonitoredProducts: number;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  starter: {
    analysesPerMonth: 1,
    allowedFeedbackSources: ["reddit", "appstore"],
    allowMarketSignals: false,
    maxMonitoredProducts: 0,
  },
  growth: {
    analysesPerMonth: 5,
    allowedFeedbackSources: "*",
    allowMarketSignals: true,
    maxMonitoredProducts: 5,
  },
  enterprise: {
    analysesPerMonth: 9999,
    allowedFeedbackSources: "*",
    allowMarketSignals: true,
    maxMonitoredProducts: 999,
  },
};

export const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export function isActiveSubscription(status: string | null | undefined): boolean {
  return !!status && ACTIVE_STATUSES.has(status);
}

export function filterSourcesForPlan(plan: PlanId, sources: string[]): string[] {
  const limits = PLAN_LIMITS[plan];
  if (limits.allowedFeedbackSources === "*") return sources;
  const allowed = new Set(limits.allowedFeedbackSources);
  return sources.filter((s) => s === "custom" || allowed.has(s));
}

export function planFromStripePrice(priceId: string): PlanId | null {
  const starter = Deno.env.get("STRIPE_PRICE_STARTER");
  const growth = Deno.env.get("STRIPE_PRICE_GROWTH");
  const enterprise = Deno.env.get("STRIPE_PRICE_ENTERPRISE");
  if (priceId === starter) return "starter";
  if (priceId === growth) return "growth";
  if (priceId === enterprise) return "enterprise";
  return null;
}
