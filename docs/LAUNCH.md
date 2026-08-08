# InsightPM production launch checklist

## 0. Pre-flight (local)

```bash
# Run CI-equivalent smoke test
npm run smoke

# Verify env vars are set (Vercel + Supabase secrets)
npm run verify:launch
```

## 1. Stripe

1. Create products/prices in Stripe Dashboard for Starter, Growth, and Enterprise (monthly recurring).
2. Create a webhook endpoint pointing to:
   `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
3. Enable events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Set secrets:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_STARTER=price_...
supabase secrets set STRIPE_PRICE_GROWTH=price_...
supabase secrets set STRIPE_PRICE_ENTERPRISE=price_...
supabase secrets set SITE_URL=https://insightpm.app
```

## 2. Supabase

```bash
npm run deploy:db
npm run deploy:functions
```

Set all Edge Function secrets from `.env.example` (Lovable, Firecrawl, `INTERNAL_FUNCTION_SECRET`, etc.).

**Launch hardening migration** (`20260530100001_launch_hardening.sql`) applies:
- Service-role-only UPDATE policies on `feedback_items` and `monitored_products`
- DB trigger enforcing monitor plan limits on insert

**Monitoring cron** (SQL Editor):

```sql
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://<project-ref>.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = '<service-role-key>';
```

**Auth**

- Site URL: `https://insightpm.app`
- Redirect URLs: `https://insightpm.app/auth`, `https://insightpm.app/analyze`
- Enable Google and GitHub OAuth providers

## 3. Vercel

- Import repository and set production environment variables (`VITE_SUPABASE_*`)
- Connect domain `insightpm.app`
- Optional: `VITE_GA_MEASUREMENT_ID`, `VITE_SENTRY_DSN`

## 4. Smoke test (Stripe test mode)

1. Sign up at `/auth`
2. Subscribe from `/#pricing` (test card `4242 4242 4242 4242`)
3. Run analysis at `/analyze`
4. Confirm row in History
5. Share analysis — verify public link opens at `/share/:id` without login
6. Add monitor (Growth plan)
7. Open billing portal from navbar or `/settings`
8. Confirm delete confirmations on History and Monitor

## 5. Go live

- Switch Stripe to live keys and live price IDs
- Update webhook to production signing secret
- Promote Vercel deployment
- Optional: enable GitHub Actions deploy workflow (requires `SUPABASE_ACCESS_TOKEN` and project ref secrets)

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run smoke` | typecheck + test + build |
| `npm run verify:launch` | Check required env vars |
| `npm run deploy:db` | Push Supabase migrations |
| `npm run deploy:functions` | Deploy all 8 edge functions |
