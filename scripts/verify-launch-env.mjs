#!/usr/bin/env node
import { loadEnvFile } from "node:process";

/**
 * Pre-launch checklist validator. Run locally before go-live.
 * Usage: node scripts/verify-launch-env.mjs
 */
try {
  loadEnvFile(".env");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const requiredFrontend = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PROJECT_ID",
];

const requiredEdge = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENROUTER_API_KEY",
  "FIRECRAWL_API_KEY",
  "INTERNAL_FUNCTION_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_STARTER",
  "STRIPE_PRICE_GROWTH",
  "STRIPE_PRICE_ENTERPRISE",
  "SITE_URL",
];

const optionalFrontend = ["VITE_GA_MEASUREMENT_ID", "VITE_SENTRY_DSN"];
const optionalEdge = ["YOUTUBE_API_KEY", "SCRAPECREATORS_API_KEY"];

function check(name, keys) {
  const missing = keys.filter((k) => !process.env[k]?.trim());
  console.log(`\n${name}:`);
  if (missing.length === 0) {
    console.log("  All required variables set.");
    return true;
  }
  console.log("  Missing:", missing.join(", "));
  return false;
}

console.log("InsightPM launch environment check");
console.log("==================================");

const feOk = check("Frontend (Vercel)", requiredFrontend);
check("Frontend optional", optionalFrontend.map((k) => (process.env[k] ? k : null)).filter(Boolean).length ? optionalFrontend : []);

const edgeOk = check("Edge Functions (supabase secrets)", requiredEdge);
console.log("\nEdge optional:", optionalEdge.filter((k) => process.env[k]).join(", ") || "(none set)");

console.log("\nManual steps (cannot verify from env):");
console.log("  - supabase db push (includes launch hardening migration)");
console.log("  - supabase functions deploy (all 8 functions)");
console.log("  - pg_cron DB settings (app.settings.supabase_url, service_role_key)");
console.log("  - Stripe webhook → stripe-webhook edge function");
console.log("  - Supabase Auth URLs + OAuth providers");
console.log("  - Domain insightpm.app on Vercel");

process.exit(feOk && edgeOk ? 0 : 1);
