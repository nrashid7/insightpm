#!/usr/bin/env node
/**
 * Create Stripe TEST products/prices + webhook, write IDs to .env, push secrets.
 * Never prints secret values.
 *
 * Usage: npm run stripe:setup
 * Requires: STRIPE_SECRET_KEY=sk_test_... in .env
 */
import { loadEnvFile } from "node:process";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

try {
  loadEnvFile(".env");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const key = process.env.STRIPE_SECRET_KEY?.trim();
const projectRef = process.env.VITE_SUPABASE_PROJECT_ID?.trim() || "zoxsygxolbzyhwezgnpg";

if (!key?.startsWith("sk_test_")) {
  console.error("STRIPE_SECRET_KEY must be a sk_test_... key in .env");
  process.exit(1);
}

async function stripe(path, init = {}) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(init.headers || {}),
    },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`${path} ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
  }
  return body;
}

function form(data) {
  return new URLSearchParams(data).toString();
}

function upsert(text, k, v) {
  const line = `${k}=${v}`;
  const re = new RegExp(`^${k}=.*$`, "m");
  return re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`;
}

const plans = [
  { env: "STRIPE_PRICE_STARTER", name: "InsightPM Starter", amount: "2900" },
  { env: "STRIPE_PRICE_GROWTH", name: "InsightPM Growth", amount: "9900" },
  { env: "STRIPE_PRICE_ENTERPRISE", name: "InsightPM Enterprise", amount: "49900" },
];

const created = {};
for (const plan of plans) {
  if (process.env[plan.env]?.startsWith("price_")) {
    created[plan.env] = process.env[plan.env];
    console.log(`Reusing ${plan.env}`);
    continue;
  }
  const product = await stripe("/products", { method: "POST", body: form({ name: plan.name }) });
  const price = await stripe("/prices", {
    method: "POST",
    body: form({
      product: product.id,
      unit_amount: plan.amount,
      currency: "usd",
      "recurring[interval]": "month",
    }),
  });
  created[plan.env] = price.id;
  console.log(`Created ${plan.env}`);
}

const webhookUrl = `https://${projectRef}.supabase.co/functions/v1/stripe-webhook`;
let webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!webhookSecret?.startsWith("whsec_")) {
  const body = new URLSearchParams();
  body.set("url", webhookUrl);
  for (const event of [
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ]) {
    body.append("enabled_events[]", event);
  }
  const wh = await stripe("/webhook_endpoints", { method: "POST", body: body.toString() });
  webhookSecret = wh.secret;
  console.log("Created webhook endpoint");
} else {
  console.log("Reusing STRIPE_WEBHOOK_SECRET");
}

let envText = "";
try {
  envText = readFileSync(".env", "utf8");
} catch {
  envText = "";
}
for (const [k, v] of Object.entries(created)) envText = upsert(envText, k, v);
envText = upsert(envText, "STRIPE_WEBHOOK_SECRET", webhookSecret);
envText = upsert(envText, "SITE_URL", "https://sigyn-kohl.vercel.app");
writeFileSync(".env", envText, { mode: 0o600 });
console.log("Wrote price IDs and webhook secret to .env");

if (!process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
  console.error("Missing SUPABASE_ACCESS_TOKEN — prices written to .env; run secrets:sync after setting the token.");
  process.exit(0);
}

const pairs = [
  ...Object.entries(created).map(([k, v]) => `${k}=${v}`),
  `STRIPE_SECRET_KEY=${key}`,
  `STRIPE_WEBHOOK_SECRET=${webhookSecret}`,
  "SITE_URL=https://sigyn-kohl.vercel.app",
];

const push = spawnSync(
  "npx",
  ["supabase", "secrets", "set", ...pairs, "--project-ref", projectRef],
  { encoding: "utf8", shell: true, env: process.env },
);

const redact = (text) => {
  let out = text ?? "";
  out = out.split(key).join("<redacted>");
  out = out.split(webhookSecret).join("<redacted>");
  return out.trim();
};

if (push.stdout) console.log(redact(push.stdout));
if (push.stderr) console.error(redact(push.stderr));
process.exit(push.status ?? 1);
