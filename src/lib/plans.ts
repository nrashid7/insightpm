export type PlanId = "starter" | "growth" | "enterprise";

export interface PlanLimits {
  analysesPerMonth: number;
  allowedFeedbackSources: string[] | "*";
  allowMarketSignals: boolean;
  maxMonitoredProducts: number;
  label: string;
  price: string;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  starter: {
    label: "Starter",
    price: "$29",
    analysesPerMonth: 1,
    allowedFeedbackSources: ["reddit", "appstore"],
    allowMarketSignals: false,
    maxMonitoredProducts: 0,
  },
  growth: {
    label: "Growth",
    price: "$99",
    analysesPerMonth: 5,
    allowedFeedbackSources: "*",
    allowMarketSignals: true,
    maxMonitoredProducts: 5,
  },
  enterprise: {
    label: "Enterprise",
    price: "$499",
    analysesPerMonth: 9999,
    allowedFeedbackSources: "*",
    allowMarketSignals: true,
    maxMonitoredProducts: 999,
  },
};

export const ACTIVE_STATUSES = ["active", "trialing"];

export function isActiveSubscription(status: string | null | undefined): boolean {
  return !!status && ACTIVE_STATUSES.includes(status);
}

export function sourceAllowedForPlan(plan: PlanId, sourceId: string): boolean {
  const limits = PLAN_LIMITS[plan];
  if (limits.allowedFeedbackSources === "*") return true;
  if (sourceId === "custom") return true;
  return limits.allowedFeedbackSources.includes(sourceId);
}
