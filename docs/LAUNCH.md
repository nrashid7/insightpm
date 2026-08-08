# InsightPM production launch checklist

Canonical production URL for this launch: **https://sigyn-kohl.vercel.app**  
(Custom domain `insightpm.app` and Stripe **live** keys are deferred.)

## 0. Pre-flight (local)

```bash
npm run smoke
npm run verify:launch
```

## 1. Secrets

Add keys to gitignored `.env`, then:

```bash
npm run secrets:sync
```

Required edge secrets:

| Secret | Notes |
|--------|-------|
| `OPENROUTER_API_KEY` | Analysis + classification |
| `FIRECRAWL_API_KEY` | Feedback scraping |
| `INTERNAL_FUNCTION_SECRET` | Already set on project |
| `SITE_URL` | `https://sigyn-kohl.vercel.app` |
| `STRIPE_SECRET_KEY` | `sk_test_...` only |
| `STRIPE_WEBHOOK_SECRET` | From test webhook |
| `STRIPE_PRICE_STARTER` / `GROWTH` / `ENTERPRISE` | Test price IDs |

Optional: `YOUTUBE_API_KEY`, `SCRAPECREATORS_API_KEY`.

## 2. Stripe (test mode)

```bash
# Creates $29 / $99 / $499 monthly prices + webhook, writes IDs to .env, pushes secrets
npm run stripe:setup
```

Webhook URL:

`https://zoxsygxolbzyhwezgnpg.supabase.co/functions/v1/stripe-webhook`

Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

Smoke card: `4242 4242 4242 4242`

## 3. Supabase

```bash
npm run deploy:db
npm run deploy:functions
```

**Monitoring cron**

Hosted Postgres blocks `ALTER DATABASE … app.settings.*`, so production cron
invokes the edge function with an explicit URL + service-role bearer (set via
SQL Editor / ops). Verify with:

```sql
SELECT jobname, schedule FROM cron.job WHERE jobname = 'run-monitoring-hourly';
```

Cleanup job `cleanup-old-feedback` remains Sunday 03:00.

**Auth** (Dashboard → Authentication → URL Configuration)

- Site URL: `https://sigyn-kohl.vercel.app`
- Redirect URLs:
  - `https://sigyn-kohl.vercel.app/auth`
  - `https://sigyn-kohl.vercel.app/analyze`
  - `http://localhost:8080/auth`
- Providers: Email, Google, GitHub  
  Callback for both OAuth apps: `https://zoxsygxolbzyhwezgnpg.supabase.co/auth/v1/callback`

## 4. Vercel

Project serves `https://sigyn-kohl.vercel.app`.

- Keep: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- Set: `VITE_GA_MEASUREMENT_ID`, `VITE_SENTRY_DSN`
- Remove leftover Sigyn/Retell/BusinessVoice Production secrets (`RETELL_*`, etc.)
- Redeploy after env changes: `npx vercel --prod`

## 5. Smoke test (on sigyn-kohl)

1. Sign up or OAuth at `/auth`
2. Subscribe from `/#pricing` (test card `4242…`)
3. Run analysis at `/analyze`
4. Confirm History row
5. Open `/share/:id` logged out
6. Add monitor (Growth)
7. Open billing portal
8. Confirm GA network traffic + a Sentry test event

## 6. Verify

```bash
npm run smoke
npm run verify:launch
npm run verify:live -- https://sigyn-kohl.vercel.app
```

All live checks must PASS (including Stripe webhook configured).

## 7. Later cutover (out of this launch)

- Connect `insightpm.app` on Vercel
- Switch Stripe to live keys + live webhook secret
- Update Auth Site URL / redirects / `SITE_URL`

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run smoke` | typecheck + test + build |
| `npm run verify:launch` | Check required env vars in `.env` |
| `npm run verify:live` | Probe deployed functions (CORS, 401, webhook) |
| `npm run secrets:sync` | Push `.env` edge secrets to Supabase |
| `npm run stripe:setup` | Create Stripe test prices + webhook |
| `npm run deploy:db` | Push Supabase migrations |
| `npm run deploy:functions` | Deploy all 8 edge functions |
