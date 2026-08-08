# InsightPM Production-Ready Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make InsightPM safely usable by real users on `https://sigyn-kohl.vercel.app` with OpenRouter AI, Stripe test billing, Google/GitHub OAuth, GA4+Sentry, and a green live verification gate.

**Architecture:** Sequential go-live. Commit the already-written OpenRouter edge-function path, sync secrets from gitignored `.env`, create Stripe test prices/webhook via API, configure Auth + cron + Vercel env, then prove production with `smoke` / `verify:live` / manual checklist.

**Tech Stack:** Vite/React SPA on Vercel, Supabase (Postgres RLS, Auth, Edge Functions), OpenRouter (Gemini), Firecrawl, Stripe test mode, GA4, Sentry browser SDK.

**Spec:** [`docs/superpowers/specs/2026-08-08-production-ready-design.md`](../specs/2026-08-08-production-ready-design.md)

## Global Constraints

- Canonical production URL is exactly `https://sigyn-kohl.vercel.app` (custom domain deferred).
- Stripe must use **test** keys only (`sk_test_...`, `whsec_...` from test webhook).
- AI provider is OpenRouter only — no `LOVABLE_API_KEY` or `ai.gateway.lovable.dev`.
- Never print secret values in terminal output, commits, or chat.
- Keep `https://insightpm.app` and `https://www.insightpm.app` in CORS allowlist for later cutover.
- Prices: Starter $29 / Growth $99 / Enterprise $499 monthly recurring (USD).
- Auth providers: Email + Google + GitHub.
- Observability: both `VITE_GA_MEASUREMENT_ID` and `VITE_SENTRY_DSN` on Vercel Production.
- Supabase project ref: `zoxsygxolbzyhwezgnpg`.

---

## File map

| Path | Responsibility |
|------|----------------|
| `supabase/functions/_shared/ai.ts` | OpenRouter client (exists, uncommitted) |
| `supabase/functions/analyze-product/index.ts` | Analysis via OpenRouter |
| `supabase/functions/classify-feedback/index.ts` | Classification via OpenRouter |
| `src/test/lib/ai-provider.test.ts` | Unit tests for AI helper |
| `scripts/push-supabase-secrets.mjs` | Push `.env` secrets to Supabase |
| `scripts/setup-stripe-test.mjs` | Create Stripe test products/prices + webhook (new) |
| `scripts/verify-live-deployment.mjs` | Live CORS/auth/webhook probes |
| `docs/LAUNCH.md` | Go-live runbook (rewrite for current URL) |
| `.env.example` | Document required keys (no values) |
| `supabase/functions/_shared/cors.ts` | Origin allowlist (already includes sigyn-kohl) |

---

### Task 1: Ship OpenRouter migration to git and CI

**Files:**
- Modify: `supabase/functions/_shared/ai.ts` (already created)
- Modify: `supabase/functions/analyze-product/index.ts`
- Modify: `supabase/functions/classify-feedback/index.ts`
- Modify: `package.json`, `package-lock.json` (lovable-tagger removed)
- Modify: `.env.example`, `scripts/verify-launch-env.mjs`, `scripts/push-supabase-secrets.mjs`
- Modify: `README.md`, `docs/LAUNCH.md` (partial), `migration/*.md`, `src/pages/Privacy.tsx`
- Create: `src/test/lib/ai-provider.test.ts`
- Do not commit: `supabase/.temp/`, `.env`

**Interfaces:**
- Consumes: none
- Produces: `requireOpenRouterApiKey()`, `openRouterChatCompletion(body, apiKey?)`, `ANALYZE_MODEL`, `CLASSIFY_MODEL` in `_shared/ai.ts`

- [ ] **Step 1: Confirm AI unit tests pass**

Run: `npx vitest run src/test/lib/ai-provider.test.ts`
Expected: PASS (5 tests). If file missing, stop — recreate from spec before continuing.

- [ ] **Step 2: Grep for Lovable leftovers**

Run: `rg -i "lovable|LOVABLE|ai\.gateway\.lovable" --glob '!package-lock.json' --glob '!node_modules'`
Expected: no matches under `src/`, `supabase/`, `scripts/`, `docs/`, `.env.example`, `README.md`.

- [ ] **Step 3: Run full smoke**

Run: `npm run smoke`
Expected: typecheck + tests + build exit 0.

- [ ] **Step 4: Commit OpenRouter + scripts**

```bash
git add supabase/functions/_shared/ai.ts supabase/functions/analyze-product/index.ts supabase/functions/classify-feedback/index.ts src/test/lib/ai-provider.test.ts scripts/push-supabase-secrets.mjs scripts/verify-launch-env.mjs package.json package-lock.json .env.example README.md migration/ARCHITECTURE.md migration/EDGE_FUNCTIONS.md src/pages/Privacy.tsx docs/LAUNCH.md
git commit -m "Replace Lovable AI Gateway with OpenRouter"
```

Do not include `supabase/.temp/`.

- [ ] **Step 5: Push and redeploy AI functions**

```bash
git push origin main
# with SUPABASE_ACCESS_TOKEN for project owner:
npx supabase functions deploy analyze-product --project-ref zoxsygxolbzyhwezgnpg
npx supabase functions deploy classify-feedback --project-ref zoxsygxolbzyhwezgnpg --no-verify-jwt
```

Expected: Deployed Functions message for both.

---

### Task 2: Rewrite launch runbook for sigyn-kohl

**Files:**
- Modify: `docs/LAUNCH.md`

**Interfaces:**
- Consumes: design decisions (URL, Stripe test, OAuth, GA/Sentry)
- Produces: operator checklist used in Task 8

- [ ] **Step 1: Rewrite `docs/LAUNCH.md`** so every production URL is `https://sigyn-kohl.vercel.app`, Stripe section says **test mode**, secrets list uses `OPENROUTER_API_KEY` (not Lovable), Auth redirects use sigyn-kohl, Vercel section says set GA+Sentry and remove Sigyn leftovers, and “Go live” section notes domain + live Stripe as **later** cutover.

Replace the SITE_URL example:

```bash
supabase secrets set SITE_URL=https://sigyn-kohl.vercel.app
```

Auth block must read:

```
Site URL: https://sigyn-kohl.vercel.app
Redirect URLs:
  https://sigyn-kohl.vercel.app/auth
  https://sigyn-kohl.vercel.app/analyze
  http://localhost:8080/auth
Providers: Email, Google, GitHub
```

- [ ] **Step 2: Commit**

```bash
git add docs/LAUNCH.md
git commit -m "Update launch runbook for sigyn-kohl production URL"
```

---

### Task 3: Operator secrets into `.env` + sync to Supabase

**Files:**
- Modify: `.env` (local only, gitignored)
- Use: `scripts/push-supabase-secrets.mjs`

**Interfaces:**
- Consumes: `npm run secrets:sync` which reads `OPENROUTER_API_KEY`, `FIRECRAWL_API_KEY`, Stripe keys, etc.
- Produces: same names as Supabase edge secrets

- [ ] **Step 1: Ensure `.env` contains these keys** (values from operator — do not invent):

```
OPENROUTER_API_KEY=
FIRECRAWL_API_KEY=
STRIPE_SECRET_KEY=sk_test_...
SITE_URL=https://sigyn-kohl.vercel.app
SUPABASE_ACCESS_TOKEN=
VITE_SUPABASE_PROJECT_ID=zoxsygxolbzyhwezgnpg
```

If any required key is missing, stop and ask the operator. Do not proceed to Stripe product creation without `STRIPE_SECRET_KEY`.

- [ ] **Step 2: Sync non-Stripe-price secrets first**

Run: `npm run secrets:sync`
Expected: script lists key names only, exits 0, Supabase reports secrets set.

- [ ] **Step 3: Confirm secret names on project**

Run: `npx supabase secrets list --project-ref zoxsygxolbzyhwezgnpg`
Expected names include: `OPENROUTER_API_KEY`, `FIRECRAWL_API_KEY`, `INTERNAL_FUNCTION_SECRET`, `SITE_URL` (values are digests — never log raw).

---

### Task 4: Stripe test products, prices, and webhook

**Files:**
- Create: `scripts/setup-stripe-test.mjs`
- Modify: `.env` (write back price IDs + webhook secret after creation)
- Modify: `package.json` (add `"stripe:setup": "node scripts/setup-stripe-test.mjs"`)

**Interfaces:**
- Consumes: `process.env.STRIPE_SECRET_KEY` (`sk_test_...`)
- Produces: env keys `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_ENTERPRISE`, `STRIPE_WEBHOOK_SECRET`

- [ ] **Step 1: Write `scripts/setup-stripe-test.mjs`**

```javascript
#!/usr/bin/env node
import { loadEnvFile } from "node:process";
import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

try { loadEnvFile(".env"); } catch (e) { if (e?.code !== "ENOENT") throw e; }

const key = process.env.STRIPE_SECRET_KEY?.trim();
const projectRef = process.env.VITE_SUPABASE_PROJECT_ID || "zoxsygxolbzyhwezgnpg";
if (!key?.startsWith("sk_test_")) {
  console.error("STRIPE_SECRET_KEY must be a sk_test_... key");
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
  if (!res.ok) throw new Error(`${path} ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

function form(data) {
  return new URLSearchParams(data).toString();
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
  const events = [
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ];
  const body = new URLSearchParams();
  body.set("url", webhookUrl);
  for (const e of events) body.append("enabled_events[]", e);
  const wh = await stripe("/webhook_endpoints", { method: "POST", body: body.toString() });
  webhookSecret = wh.secret;
  console.log("Created webhook endpoint");
} else {
  console.log("Reusing STRIPE_WEBHOOK_SECRET");
}

// Upsert keys into .env without printing secrets
let envText = "";
try { envText = readFileSync(".env", "utf8"); } catch { envText = ""; }
function upsert(text, k, v) {
  const line = `${k}=${v}`;
  const re = new RegExp(`^${k}=.*$`, "m");
  return re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`;
}
for (const [k, v] of Object.entries(created)) envText = upsert(envText, k, v);
envText = upsert(envText, "STRIPE_WEBHOOK_SECRET", webhookSecret);
writeFileSync(".env", envText, { mode: 0o600 });
console.log("Wrote price IDs and webhook secret to .env");

const pairs = [
  ...Object.entries(created).map(([k, v]) => `${k}=${v}`),
  `STRIPE_SECRET_KEY=${key}`,
  `STRIPE_WEBHOOK_SECRET=${webhookSecret}`,
];
const push = spawnSync("npx", ["supabase", "secrets", "set", ...pairs, "--project-ref", projectRef], {
  encoding: "utf8",
  shell: true,
  env: process.env,
});
const redact = (s) => (s || "").replaceAll(key, "<redacted>").replaceAll(webhookSecret, "<redacted>");
if (push.stdout) console.log(redact(push.stdout));
if (push.stderr) console.error(redact(push.stderr));
process.exit(push.status ?? 1);
```

- [ ] **Step 2: Add npm script**

In `package.json` scripts:

```json
"stripe:setup": "node scripts/setup-stripe-test.mjs"
```

- [ ] **Step 3: Run setup**

Run: `npm run stripe:setup`
Expected: Creates or reuses three `price_...` IDs, creates webhook, pushes secrets, exits 0. No raw secrets in stdout.

- [ ] **Step 4: Verify webhook probe**

Run: `node scripts/verify-live-deployment.mjs https://sigyn-kohl.vercel.app`
Expected: `STRIPE_WEBHOOK_SECRET is set in the Supabase project` → PASS (other failures OK if OAuth/GA not done yet).

- [ ] **Step 5: Commit script only**

```bash
git add scripts/setup-stripe-test.mjs package.json
git commit -m "Add Stripe test product and webhook setup script"
```

---

### Task 5: Monitoring cron database settings

**Files:**
- None in repo (SQL against remote DB)
- Optional note in `docs/LAUNCH.md` already covers this

**Interfaces:**
- Consumes: service role key from Supabase dashboard / `.env` if you store `SUPABASE_SERVICE_ROLE_KEY` locally for this step only
- Produces: `app.settings.supabase_url`, `app.settings.service_role_key` on database `postgres`

- [ ] **Step 1: Apply settings via Supabase SQL** (MCP `execute_sql` or SQL editor)

```sql
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://zoxsygxolbzyhwezgnpg.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = '<SERVICE_ROLE_KEY>';
```

Replace `<SERVICE_ROLE_KEY>` from the project API settings. Do not commit the key.

- [ ] **Step 2: Verify settings exist**

```sql
SELECT
  current_setting('app.settings.supabase_url', true) IS NOT NULL AS has_url,
  length(current_setting('app.settings.service_role_key', true)) > 0 AS has_key;
```

Expected: `has_url = true`, `has_key = true`.

---

### Task 6: Supabase Auth URLs + Google/GitHub OAuth

**Files:**
- None required in app code if Auth page already supports OAuth buttons (verify `src/pages/Auth.tsx`)

**Interfaces:**
- Consumes: Google OAuth client ID/secret, GitHub OAuth client ID/secret from operator
- Produces: working redirects to `/auth` and `/analyze`

- [ ] **Step 1: Confirm Auth UI has Google/GitHub buttons**

Open `src/pages/Auth.tsx` and ensure `signInWithOAuth({ provider: 'google' | 'github' })` exists. If missing, add both buttons calling:

```typescript
await supabase.auth.signInWithOAuth({
  provider, // 'google' | 'github'
  options: { redirectTo: `${window.location.origin}/auth` },
});
```

- [ ] **Step 2: Configure Supabase Auth URL config** (Dashboard → Authentication → URL Configuration)

- Site URL: `https://sigyn-kohl.vercel.app`
- Additional Redirect URLs:
  - `https://sigyn-kohl.vercel.app/auth`
  - `https://sigyn-kohl.vercel.app/analyze`
  - `http://localhost:8080/auth`

- [ ] **Step 3: Enable Google provider**

Google Cloud Console → OAuth client (Web) → Authorized redirect URI:

`https://zoxsygxolbzyhwezgnpg.supabase.co/auth/v1/callback`

Paste Client ID/Secret into Supabase → Authentication → Providers → Google.

- [ ] **Step 4: Enable GitHub provider**

GitHub → OAuth App → Authorization callback URL:

`https://zoxsygxolbzyhwezgnpg.supabase.co/auth/v1/callback`

Paste Client ID/Secret into Supabase → Authentication → Providers → GitHub.

- [ ] **Step 5: Manual smoke**

In a private browser window: open `https://sigyn-kohl.vercel.app/auth`, complete Google login, then GitHub login (or two accounts). Expected: land authenticated without error query params.

- [ ] **Step 6: Commit Auth UI changes only if Step 1 required code**

```bash
git add src/pages/Auth.tsx
git commit -m "Ensure Google and GitHub OAuth entry points on Auth page"
```

Skip commit if no file changes.

---

### Task 7: Vercel production env + observability

**Files:**
- None in repo (Vercel project `sigyn`)
- Frontend already reads `VITE_GA_MEASUREMENT_ID` / `VITE_SENTRY_DSN` via `src/lib/analytics.ts` and `src/lib/error-reporting.ts`

**Interfaces:**
- Consumes: GA4 measurement ID (`G-...`), Sentry DSN
- Produces: production build with analytics + error reporting active

- [ ] **Step 1: List current Production env**

Run: `npx vercel env ls`
Identify leftover Sigyn/Retell/BusinessVoice keys (`RETELL_*`, `DEMO_HASH_SECRET`, `INTEGRATION_ENCRYPTION_KEY`, `OAUTH_STATE_SECRET`, old `NEXT_PUBLIC_*` if unused by Vite).

- [ ] **Step 2: Remove leftover Production secrets that do not belong to InsightPM**

For each leftover name:

```bash
npx vercel env rm <NAME> production -y
```

Do **not** remove `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.

- [ ] **Step 3: Add GA and Sentry**

```bash
# interactive or via vercel env add
npx vercel env add VITE_GA_MEASUREMENT_ID production
npx vercel env add VITE_SENTRY_DSN production
```

Also add the same two to `.env` locally for `verify:launch` if desired.

- [ ] **Step 4: Redeploy production**

```bash
npx vercel --prod
```

Expected: deployment URL resolves to 200 on `https://sigyn-kohl.vercel.app`.

- [ ] **Step 5: Confirm observability**

- Browser network: gtag request with measurement ID present after page load.
- Trigger `reportError(new Error("insightpm-launch-probe"))` from DevTools once, or rely on an intentional throw; confirm event in Sentry project.

---

### Task 8: Final verification gate + PAT rotation reminder

**Files:**
- None (verification only)

- [ ] **Step 1: Local smoke**

Run: `npm run smoke`
Expected: exit 0.

- [ ] **Step 2: Launch env check**

Run: `npm run verify:launch`
Expected: Frontend required vars OK; Edge required vars present in local `.env` (script reads local file — all keys from Task 3–4).

- [ ] **Step 3: Live deployment check**

Run: `npm run verify:live -- https://sigyn-kohl.vercel.app`
Expected: **all** checks PASS, including Stripe webhook secret.

- [ ] **Step 4: Manual product smoke** (from runbook)

1. Sign up / OAuth at `/auth`
2. Subscribe via test card `4242 4242 4242 4242`
3. Run analysis at `/analyze` (requires OpenRouter + Firecrawl)
4. Confirm History row
5. Open `/share/:id` logged out
6. Open billing portal
7. Confirm GA + Sentry still receiving

- [ ] **Step 5: Rotate Supabase personal access token** used in chat (`sbp_...`) at https://supabase.com/dashboard/account/tokens — create a new one for future CLI use; revoke the old.

- [ ] **Step 6: Mark design status**

Update first line status in `docs/superpowers/specs/2026-08-08-production-ready-design.md` from `Draft for user review` to `Implemented` and commit:

```bash
git add docs/superpowers/specs/2026-08-08-production-ready-design.md
git commit -m "Mark production-ready design implemented"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Commit OpenRouter; redeploy | Task 1 |
| Edge secrets including OpenRouter/Firecrawl/Stripe | Tasks 3–4 |
| Stripe test products $29/$99/$499 + webhook | Task 4 |
| Auth Site URL + Google/GitHub | Task 6 |
| Cron DB settings | Task 5 |
| Vercel env + GA/Sentry; remove leftovers | Task 7 |
| CORS/SITE_URL for sigyn-kohl | Task 1 (SITE_URL), CORS already allowlists |
| Launch runbook update | Task 2 |
| verify smoke/live green | Task 8 |
| Rotate PAT | Task 8 |
| Out of scope: custom domain, live Stripe | Explicitly omitted |

## Placeholder / consistency self-review

- No TBD/TODO left in steps.
- Price env names match `stripe-checkout` (`STRIPE_PRICE_STARTER|GROWTH|ENTERPRISE`).
- Webhook URL uses project ref `zoxsygxolbzyhwezgnpg`.
- Canonical URL consistent: `https://sigyn-kohl.vercel.app`.
