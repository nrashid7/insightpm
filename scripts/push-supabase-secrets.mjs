#!/usr/bin/env node
/**
 * Push edge-function secrets from local .env to the linked Supabase project.
 *
 * Usage:
 *   set SUPABASE_ACCESS_TOKEN=sbp_...
 *   node scripts/push-supabase-secrets.mjs
 *
 * Only keys present in .env are uploaded. Values are never printed.
 */
import { loadEnvFile } from "node:process";
import { spawnSync } from "node:child_process";

try {
  loadEnvFile(".env");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const PROJECT_REF = process.env.VITE_SUPABASE_PROJECT_ID || "zoxsygxolbzyhwezgnpg";

const SECRET_KEYS = [
  "OPENROUTER_API_KEY",
  "FIRECRAWL_API_KEY",
  "INTERNAL_FUNCTION_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_STARTER",
  "STRIPE_PRICE_GROWTH",
  "STRIPE_PRICE_ENTERPRISE",
  "SITE_URL",
  "YOUTUBE_API_KEY",
  "SCRAPECREATORS_API_KEY",
];

if (!process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
  console.error("Missing SUPABASE_ACCESS_TOKEN. Create one at https://supabase.com/dashboard/account/tokens");
  process.exit(1);
}

const pairs = SECRET_KEYS.filter((key) => process.env[key]?.trim()).map(
  (key) => `${key}=${process.env[key].trim()}`,
);

if (pairs.length === 0) {
  console.error("No pushable secrets found in .env.");
  console.error("Add any of:", SECRET_KEYS.join(", "));
  process.exit(1);
}

console.log(`Pushing ${pairs.length} secret(s) to ${PROJECT_REF}:`);
for (const key of SECRET_KEYS) {
  if (process.env[key]?.trim()) console.log(`  - ${key}`);
}

const result = spawnSync(
  "npx",
  ["supabase", "secrets", "set", ...pairs, "--project-ref", PROJECT_REF],
  {
    encoding: "utf8",
    shell: true,
    env: process.env,
  },
);

const redact = (text) => {
  let out = text ?? "";
  for (const pair of pairs) {
    const value = pair.slice(pair.indexOf("=") + 1);
    out = out.split(value).join("<redacted>");
  }
  return out.trim();
};

if (result.stdout) console.log(redact(result.stdout));
if (result.stderr) console.error(redact(result.stderr));
process.exit(result.status ?? 1);
