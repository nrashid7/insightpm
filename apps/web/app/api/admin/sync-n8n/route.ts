import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { N8N_WEBHOOKS } from "@businessvoice/shared";

const WORKFLOW_ROWS = [
  { name: "Call Completed Router", slug: "call-completed", url: N8N_WEBHOOKS.callCompleted, config: { type: "router", dispatch_target: true } },
  { name: "SMS Follow-Up", slug: "sms-follow-up", url: N8N_WEBHOOKS.smsFollowUp, config: { type: "sms" } },
  { name: "HubSpot Sync", slug: "hubspot-sync", url: N8N_WEBHOOKS.hubspotSync, config: { type: "crm", provider: "hubspot" } },
  { name: "GoHighLevel Sync", slug: "ghl-sync", url: N8N_WEBHOOKS.ghlSync, config: { type: "crm", provider: "gohighlevel" } },
  { name: "Google Sheets Log", slug: "sheets-log", url: N8N_WEBHOOKS.sheetsLog, config: { type: "crm", provider: "google_sheets" } },
];

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin required" }, { status: 403 });
  }

  const results = [];

  for (const wf of WORKFLOW_ROWS) {
    const { data: existing } = await supabase
      .from("workflows")
      .select("id")
      .eq("name", wf.name)
      .is("business_id", null)
      .maybeSingle();

    const row = {
      name: wf.name,
      business_id: null,
      webhook_url: wf.url,
      n8n_workflow_id: wf.slug,
      is_active: true,
      config: wf.config,
    };

    if (existing?.id) {
      const { error } = await supabase.from("workflows").update(row).eq("id", existing.id);
      results.push({ name: wf.name, action: "updated", error: error?.message });
    } else {
      const { error } = await supabase.from("workflows").insert(row);
      results.push({ name: wf.name, action: "inserted", error: error?.message });
    }
  }

  const synced = results.filter((r) => !r.error).length;
  return NextResponse.json({ success: synced === WORKFLOW_ROWS.length, synced, total: WORKFLOW_ROWS.length, results });
}
