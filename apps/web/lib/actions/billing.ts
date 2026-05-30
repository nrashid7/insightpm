"use server";

import { createClient } from "@/lib/supabase/server";
import { getBusiness } from "./business";

export async function getSubscription() {
  const business = await getBusiness();
  if (!business) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("business_id", business.id)
    .single();

  return data;
}

export async function getUsageStats() {
  const subscription = await getSubscription();
  if (!subscription) {
    return { used: 0, included: 500, percent: 0 };
  }

  const percent = Math.round(
    (subscription.used_minutes / subscription.included_minutes) * 100
  );

  return {
    used: subscription.used_minutes,
    included: subscription.included_minutes,
    percent: Math.min(percent, 100),
  };
}
