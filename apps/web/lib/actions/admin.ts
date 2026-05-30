"use server";

import { createClient } from "@/lib/supabase/server";

export async function getAdminStats() {
  const supabase = await createClient();

  const [businesses, agents, callsToday, users] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase.from("agents").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  return {
    totalBusinesses: businesses.count ?? 0,
    activeAgents: agents.count ?? 0,
    callsToday: callsToday.count ?? 0,
    totalUsers: users.count ?? 0,
  };
}

export async function getAdminBusinesses() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("id, name, industry, onboarding_complete, created_at, agents(count)")
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function getAdminRecentCalls() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("calls")
    .select("id, caller_number, status, duration_seconds, created_at, businesses(name)")
    .order("created_at", { ascending: false })
    .limit(10);
  return data ?? [];
}

export async function getAdminTemplates() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("agent_templates")
    .select("*")
    .order("name");
  return data ?? [];
}
