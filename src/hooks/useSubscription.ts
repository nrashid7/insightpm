import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
}

export function useSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    plan: null,
    status: null,
    currentPeriodEnd: null,
    analysesUsed: 0,
    isActive: false,
    loading: true,
  });

  const refresh = useCallback(async () => {
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, subscription_status, current_period_end")
      .eq("id", user.id)
      .single();

    const plan = (profile?.plan as PlanId) || null;
    const status = profile?.subscription_status ?? null;
    const active = isActiveSubscription(status) && !!plan;

    let periodStart = new Date();
    periodStart = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
    if (profile?.current_period_end) {
      const end = new Date(profile.current_period_end);
      const start = new Date(end);
      start.setMonth(start.getMonth() - 1);
      periodStart = start;
    }

    const { count } = await supabase
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", periodStart.toISOString());

    setState({
      plan,
      status,
      currentPeriodEnd: profile?.current_period_end ?? null,
      analysesUsed: count ?? 0,
      isActive: active,
      loading: false,
    });
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const limits = state.plan ? PLAN_LIMITS[state.plan] : null;
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
