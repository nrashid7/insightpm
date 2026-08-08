import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type PlanId,
  PLAN_LIMITS,
  isActiveSubscription,
  filterSourcesForPlan,
} from "./plans.ts";

export interface UserSubscription {
  userId: string;
  plan: PlanId;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  analysesUsedThisPeriod: number;
}

export async function getUserSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<UserSubscription | null> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan, subscription_status, current_period_end")
    .eq("id", userId)
    .single();

  if (error || !profile?.plan || !isActiveSubscription(profile.subscription_status)) {
    return null;
  }

  const plan = profile.plan as PlanId;
  const periodStart = getPeriodStart(profile.current_period_end);

  const { count } = await supabase
    .from("analyses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", periodStart);

  return {
    userId,
    plan,
    subscriptionStatus: profile.subscription_status!,
    currentPeriodEnd: profile.current_period_end,
    analysesUsedThisPeriod: count ?? 0,
  };
}

function getPeriodStart(currentPeriodEnd: string | null): string {
  if (currentPeriodEnd) {
    const end = new Date(currentPeriodEnd);
    const start = new Date(end);
    start.setMonth(start.getMonth() - 1);
    return start.toISOString();
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export function assertCanAnalyze(
  sub: UserSubscription,
  sources: string[],
  includeMarketSignals: boolean
): { sources: string[]; includeMarketSignals: boolean } {
  const limits = PLAN_LIMITS[sub.plan];

  if (sub.analysesUsedThisPeriod >= limits.analysesPerMonth) {
    throw new Error(
      `Monthly analysis limit reached (${limits.analysesPerMonth}). Upgrade your plan or wait until the next billing period.`
    );
  }

  const filteredSources = filterSourcesForPlan(sub.plan, sources);
  if (filteredSources.length === 0) {
    throw new Error(
      `Your ${sub.plan} plan only includes: ${limits.allowedFeedbackSources === "*" ? "all sources" : (limits.allowedFeedbackSources as string[]).join(", ")}.`
    );
  }

  const marketSignals = includeMarketSignals && limits.allowMarketSignals;
  if (includeMarketSignals && !limits.allowMarketSignals) {
    throw new Error("Industry Signals require a Growth or Enterprise plan.");
  }

  return { sources: filteredSources, includeMarketSignals: marketSignals };
}

export async function assertCanAddMonitor(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const sub = await getUserSubscription(supabase, userId);
  if (!sub) {
    throw new Error("An active subscription is required to use monitoring.");
  }

  const max = PLAN_LIMITS[sub.plan].maxMonitoredProducts;
  if (max === 0) {
    throw new Error("Monitoring requires a Growth or Enterprise plan.");
  }

  const { count } = await supabase
    .from("monitored_products")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((count ?? 0) >= max) {
    throw new Error(`Monitor limit reached (${max} products on ${sub.plan} plan).`);
  }
}
