import { supabase } from "@/integrations/supabase/client";
import type { PlanId } from "@/lib/plans";

export async function createCheckoutSession(plan: PlanId): Promise<string> {
  const { data, error } = await supabase.functions.invoke("stripe-checkout", {
    body: { plan },
  });

  if (error) throw new Error(error.message || "Failed to start checkout");
  if (!data?.url) throw new Error(data?.error || "No checkout URL returned");
  return data.url as string;
}

export async function openBillingPortal(): Promise<string> {
  const { data, error } = await supabase.functions.invoke("stripe-portal", {
    body: {},
  });

  if (error) throw new Error(error.message || "Failed to open billing portal");
  if (!data?.url) throw new Error(data?.error || "No portal URL returned");
  return data.url as string;
}
