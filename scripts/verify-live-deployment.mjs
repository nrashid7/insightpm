#!/usr/bin/env node
import { loadEnvFile } from "node:process";

/**
 * Post-deploy verifier for the live Supabase edge functions.
 *
 * Unlike verify-launch-env.mjs (which only inspects local variables), this
 * calls the deployed functions so it catches secrets that were never set in
 * the Supabase project and functions still running a stale build.
 *
 * Usage: node scripts/verify-live-deployment.mjs [browserOrigin]
 */
try {
  loadEnvFile(".env");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const baseUrl = (process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
const browserOrigin = process.argv[2] ?? process.env.SITE_URL ?? "https://insightpm.app";

if (!baseUrl || !anonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY.");
  process.exit(1);
}

/** Functions the browser calls directly, so their CORS origin must echo back. */
const BROWSER_FACING = ["analyze-product", "stripe-checkout", "stripe-portal"];

/** Functions called server-to-server behind the internal shared secret. */
const INTERNAL_SECRET_FUNCTIONS = ["collect-feedback", "classify-feedback", "collect-market-signals"];

const failures = [];

function report(ok, label, detail) {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(label);
}

async function readBody(response) {
  const text = await response.text();
  return text.slice(0, 200).replace(/\s+/g, " ").trim();
}

async function checkCorsOrigin(slug) {
  const response = await fetch(`${baseUrl}/functions/v1/${slug}`, {
    method: "OPTIONS",
    headers: {
      Origin: browserOrigin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization,content-type",
    },
  });
  const allowed = response.headers.get("access-control-allow-origin");
  report(
    allowed === browserOrigin,
    `${slug} allows origin ${browserOrigin}`,
    allowed === browserOrigin ? undefined : `got ${allowed ?? "(none)"}; function may be running a stale build`,
  );
}

async function checkRejectsWithStatus(slug, headers, expectedStatus, label) {
  const response = await fetch(`${baseUrl}/functions/v1/${slug}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey, ...headers },
    body: JSON.stringify({ topic: "verify-live-deployment" }),
  });
  report(
    response.status === expectedStatus,
    label,
    response.status === expectedStatus ? undefined : `expected ${expectedStatus}, got ${response.status}: ${await readBody(response)}`,
  );
}

console.log("InsightPM live deployment check");
console.log("===============================");
console.log(`Project: ${baseUrl}`);
console.log(`Browser origin: ${browserOrigin}`);

console.log("\nCORS for browser-facing functions:");
for (const slug of BROWSER_FACING) {
  await checkCorsOrigin(slug);
}

console.log("\nRejected credentials answer 401 (not 500):");
for (const slug of INTERNAL_SECRET_FUNCTIONS) {
  await checkRejectsWithStatus(
    slug,
    { Authorization: `Bearer ${anonKey}`, "x-internal-secret": "deliberately-invalid" },
    401,
    `${slug} rejects a bad internal secret with 401`,
  );
}
await checkRejectsWithStatus(
  "run-monitoring",
  { Authorization: `Bearer ${anonKey}` },
  401,
  "run-monitoring rejects a non-service-role caller with 401",
);

console.log("\nStripe webhook secret:");
{
  const response = await fetch(`${baseUrl}/functions/v1/stripe-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const body = await readBody(response);
  // With the secret set the function gets as far as rejecting the absent
  // signature; without it, it short-circuits on the missing configuration.
  report(
    !(response.status === 500 && /not configured/i.test(body)),
    "STRIPE_WEBHOOK_SECRET is set in the Supabase project",
    response.status === 500 ? body : undefined,
  );
}

console.log("\nUnauthenticated access is refused:");
for (const slug of BROWSER_FACING) {
  const response = await fetch(`${baseUrl}/functions/v1/${slug}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey },
    body: "{}",
  });
  report([401, 403].includes(response.status), `${slug} refuses anonymous callers`, `status ${response.status}`);
}

if (failures.length > 0) {
  console.log(`\n${failures.length} check(s) failed:`);
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}

console.log("\nAll live deployment checks passed.");
