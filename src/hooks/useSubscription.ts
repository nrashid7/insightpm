import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BILLING_ENABLED, BETA_LIMITS } from "@/lib/product-config";
import {
  type PlanId,
  PLAN_LIMITS,
  isActiveSubscription,
} from "@/lib/plans";

export interface SubscriptionState {
  plan: PlanId | null;
  status: string | null;
  currentPeriodEnd: string | null;
  analysesUsed: number;
  isActive: boolean;
  loading: boolean;
  error?: string | null;
}

export function useSubscription() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    plan: null,
    status: null,
    currentPeriodEnd: null,
    analysesUsed: 0,
    isActive: false,
    loading: true,
  });

  const refresh = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setState({
        plan: null,
        status: null,
        currentPeriodEnd: null,
        analysesUsed: 0,
        isActive: false,
        loading: false,
      });
      return;
    }

    setState((s) => ({ ...s, loading: true }));

    try {
    const { data: profile, error: profileError } = BILLING_ENABLED ? await supabase
      .from("profiles")
      .select("plan, subscription_status, current_period_end")
      .eq("id", user.id)
      .single() : { data: null, error: null };
    if (profileError) throw profileError;

    const plan = BILLING_ENABLED ? (profile?.plan as PlanId) || null : "growth";
    const status = BILLING_ENABLED ? profile?.subscription_status ?? null : "beta";
    const active = !BILLING_ENABLED || (isActiveSubscription(status) && !!plan);

    let periodStart = new Date();
    periodStart = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), 1));
    if (profile?.current_period_end) {
      const end = new Date(profile.current_period_end);
      const start = new Date(end);
      start.setMonth(start.getMonth() - 1);
      periodStart = start;
    }

    const { count, error: countError } = await supabase
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("results", "{}")
      .or("results->>runType.is.null,results->>runType.neq.monitoring")
      .gte("created_at", periodStart.toISOString());
    if (countError) throw countError;

    setState({
      plan,
      status,
      currentPeriodEnd: profile?.current_period_end ?? null,
      analysesUsed: count ?? 0,
      isActive: active,
      loading: false,
      error: null,
    });
    } catch (error) {
      setState((s) => ({ ...s, loading: false, isActive: false, error: error instanceof Error ? error.message : "Could not load account access. Please retry." }));
    }
  }, [user, authLoading]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const limits = state.plan ? BILLING_ENABLED ? PLAN_LIMITS[state.plan] : BETA_LIMITS : null;
  const analysesRemaining = limits
    ? Math.max(0, limits.analysesPerMonth - state.analysesUsed)
    : 0;

  return {
    ...state,
    limits,
    analysesRemaining,
    refresh,
  };
}
