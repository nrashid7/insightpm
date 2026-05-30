"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "./auth";

export async function syncN8nWorkflows() {
  const profile = await getProfile();
  if (profile?.role !== "admin") {
    return { error: "Admin access required" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY not configured" };
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/sync-n8n-workflows`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return { error: (data as { error?: string }).error ?? "Sync failed" };
  }

  revalidatePath("/admin");
  return data as { success: boolean; synced: number; total: number; workflows: unknown[] };
}

export async function getWorkflowStatus() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workflows")
    .select("id, name, webhook_url, is_active, config, n8n_workflow_id")
    .is("business_id", null)
    .order("name");

  return data ?? [];
}

export async function testN8nDispatch() {
  const profile = await getProfile();
  if (profile?.role !== "admin") {
    return { error: "Admin access required" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const response = await fetch(`${supabaseUrl}/functions/v1/n8n-dispatch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event: "test.ping",
      business_id: "00000000-0000-0000-0000-000000000001",
      metadata: { source: "admin_test", timestamp: new Date().toISOString() },
    }),
  });

  return response.json();
}
