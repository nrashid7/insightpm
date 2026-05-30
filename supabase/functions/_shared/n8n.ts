import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface N8nWorkflowDefinition {
  name: string;
  slug: string;
  config: Record<string, unknown>;
  envKey: string;
  path: string;
}

export const N8N_WORKFLOW_DEFINITIONS: N8nWorkflowDefinition[] = [
  {
    name: "Call Completed Router",
    slug: "call-completed",
    config: { type: "router", dispatch_target: true },
    envKey: "N8N_WEBHOOK_CALL_COMPLETED",
    path: "call-completed",
  },
  {
    name: "SMS Follow-Up",
    slug: "sms-follow-up",
    config: { type: "sms" },
    envKey: "N8N_WEBHOOK_SMS",
    path: "sms-follow-up",
  },
  {
    name: "HubSpot Sync",
    slug: "hubspot-sync",
    config: { type: "crm", provider: "hubspot" },
    envKey: "N8N_WEBHOOK_HUBSPOT",
    path: "hubspot-sync",
  },
  {
    name: "GoHighLevel Sync",
    slug: "ghl-sync",
    config: { type: "crm", provider: "gohighlevel" },
    envKey: "N8N_WEBHOOK_GHL",
    path: "ghl-sync",
  },
  {
    name: "Google Sheets Log",
    slug: "sheets-log",
    config: { type: "crm", provider: "google_sheets" },
    envKey: "N8N_WEBHOOK_SHEETS",
    path: "sheets-log",
  },
];

export function resolveWebhookUrl(def: N8nWorkflowDefinition): string | null {
  const direct = Deno.env.get(def.envKey);
  if (direct) return direct;

  const base = Deno.env.get("N8N_WEBHOOK_BASE_URL");
  if (base) {
    return `${base.replace(/\/$/, "")}/${def.path}`;
  }

  return null;
}

export function getDispatchWebhookUrl(): string | null {
  const router = N8N_WORKFLOW_DEFINITIONS.find((d) => d.config.dispatch_target);
  if (!router) return null;
  return resolveWebhookUrl(router);
}

export interface WorkflowRow {
  id: string;
  webhook_url: string | null;
  config: Record<string, unknown> | null;
  name: string;
}

/** Pick workflows to receive Supabase dispatch events (router only by default). */
export function selectDispatchTargets(
  workflows: WorkflowRow[],
  workflowId?: string,
): WorkflowRow[] {
  if (workflowId) {
    return workflows.filter((w) => w.id === workflowId);
  }

  const routers = workflows.filter(
    (w) => (w.config as Record<string, unknown>)?.type === "router" ||
      (w.config as Record<string, unknown>)?.dispatch_target === true,
  );

  if (routers.length > 0) return routers;

  const namedRouter = workflows.filter((w) =>
    w.name.toLowerCase().includes("router") ||
    w.name.toLowerCase().includes("call completed")
  );

  return namedRouter.length > 0 ? namedRouter : workflows.slice(0, 1);
}

export async function syncN8nWorkflowsToDb(
  supabase: SupabaseClient,
): Promise<Array<{ name: string; webhook_url: string | null; synced: boolean }>> {
  const results: Array<{ name: string; webhook_url: string | null; synced: boolean }> = [];

  for (const def of N8N_WORKFLOW_DEFINITIONS) {
    const webhookUrl = resolveWebhookUrl(def);

    const { data: existing } = await supabase
      .from("workflows")
      .select("id")
      .eq("name", def.name)
      .is("business_id", null)
      .maybeSingle();

    const row = {
      name: def.name,
      business_id: null,
      webhook_url: webhookUrl,
      n8n_workflow_id: def.slug,
      is_active: Boolean(webhookUrl),
      config: def.config,
    };

    if (existing?.id) {
      await supabase.from("workflows").update(row).eq("id", existing.id);
    } else {
      await supabase.from("workflows").insert(row);
    }

    results.push({ name: def.name, webhook_url: webhookUrl, synced: Boolean(webhookUrl) });
  }

  return results;
}

export async function postToN8nWebhook(
  webhookUrl: string,
  payload: unknown,
  secret?: string,
): Promise<Response> {
  const payloadString = JSON.stringify(payload);
  let signature = "";

  if (secret) {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signed = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(payloadString),
    );
    signature = Array.from(new Uint8Array(signed))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  return fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(signature ? { "X-N8N-Signature": `sha256=${signature}` } : {}),
    },
    body: payloadString,
  });
}
