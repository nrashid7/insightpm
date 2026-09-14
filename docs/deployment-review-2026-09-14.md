# Deployment review — 2026-09-14

Production: https://insightpm-pi.vercel.app

## Repaired

- Corrected the local Vercel link from `sigyn` to `insightpm` (`prj_PzFUyS2ar0jynKM91zSMZrDJVIRL`). GitHub integration already targets `nrashid7/insightpm`, branch `main`.
- Replaced the production and preview Supabase frontend environment values with the verified local configuration for `zoxsygxolbzyhwezgnpg`. The previous production page crashed with `supabaseUrl is required`.
- Added build-time rejection of missing Supabase URL/public key, preventing a successful deployment of that broken configuration.
- Aligned CI with Vercel's Node 24 runtime and updated the dependency lockfile to resolve the production `postcss-selector-parser` advisory.
- Recovered the already-deployed `20260808140505_restrict_signup_trigger_execution` migration and aligned the fresh-install schema with its permissions.

## Verified

- Production homepage and `/auth` render in a browser after redeployment.
- Supabase is active and healthy; all seven public application tables have RLS enabled.
- All eight Edge Functions are active; all 20 deployed source files match the local source after normalizing line endings.
- Both monitoring/cleanup cron jobs are enabled (job execution outcomes were not tested).
- Browser-facing functions accept the production origin and reject unauthenticated callers. Internal functions reject invalid credentials with 401.
- Supabase Auth settings respond with HTTP 200 and email signup enabled.

## Remaining configuration and maintenance

- Stripe webhook requests report `Webhook secret not configured`. Local Stripe keys/prices are also absent, so paid checkout and subscription fulfillment are not verified or ready to claim as working. Configure the intended Stripe account, prices, and webhook signing secret in Supabase before accepting subscriptions.
- Google and GitHub providers are disabled in Supabase, although the login form displays their buttons. Configure provider credentials and redirect URLs before using those login methods. Full email signup/login and recovery were not exercised with a real account.
- The local Supabase management token returns HTTP 403, so Auth redirect configuration could not be inspected through that token. The connected Supabase tools remain functional.
- Historical local migration filenames differ from the hosted migration ledger. Do not blindly run `supabase db push`: reconcile the migration baseline first. Existing schema changes were verified rather than replayed against production.
- Supabase advisors report GraphQL schema discoverability warnings. These do not by themselves establish row exposure; RLS is enabled on every application table.
- Upgraded Vitest and its coverage package to 5.0.0 to resolve the remaining development-tool advisories. Full npm audit now reports zero vulnerabilities.
