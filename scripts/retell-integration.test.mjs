import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const retellShared = readFileSync("supabase/functions/_shared/retell.ts", "utf8");
const webhookShared = readFileSync("supabase/functions/_shared/webhook.ts", "utf8");
const knowledgeActionSource = readFileSync("apps/web/lib/actions/knowledge.ts", "utf8");
const onboardingActionSource = readFileSync("apps/web/lib/actions/onboarding.ts", "utf8");
const n8nActionSource = readFileSync("apps/web/lib/actions/n8n.ts", "utf8");
const voicePreviewRouteSource = readFileSync("apps/web/app/api/voice-preview/route.ts", "utf8");
const templateSource = readFileSync("packages/shared/src/templates/index.ts", "utf8");
const voicesSource = readFileSync("packages/shared/src/templates/voices.ts", "utf8");
const seedSql = readFileSync("supabase/seed.sql", "utf8");

test("Retell phone number creation binds the new agent with weighted inbound/outbound agents", () => {
  assert.match(retellShared, /inbound_agents:\s*\[\s*\{\s*agent_id:\s*agentId,\s*weight:\s*1\s*\}/s);
  assert.match(retellShared, /outbound_agents:\s*\[\s*\{\s*agent_id:\s*agentId,\s*weight:\s*1\s*\}/s);
  assert.doesNotMatch(retellShared, /JSON\.stringify\(\s*\{\s*agent_id:\s*agentId,/s);
});

test("Retell webhooks verify with the Retell API key when no dedicated webhook secret is set", () => {
  assert.match(webhookShared, /Deno\.env\.get\("RETELL_WEBHOOK_SECRET"\)\s*\?\?/);
  assert.match(webhookShared, /Deno\.env\.get\("RETELL_API_KEY"\)/);
});

test("Retell template voice IDs are available in the current Retell workspace", () => {
  const staleVoiceIds = ["11labs-Rachel", "11labs-Adam"];
  for (const staleVoiceId of staleVoiceIds) {
    assert.equal(templateSource.includes(staleVoiceId), false);
    assert.equal(voicesSource.includes(staleVoiceId), false);
    assert.equal(seedSql.includes(staleVoiceId), false);
  }
});

test("backend Edge Function callers require the service role key without falling back to anon", () => {
  const serverCallers = [
    knowledgeActionSource,
    onboardingActionSource,
    n8nActionSource,
    voicePreviewRouteSource,
  ];

  for (const source of serverCallers) {
    assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY\s*\?\?\s*process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY/);
    assert.match(source, /getSupabaseServiceRoleKey\(\)/);
  }
});
