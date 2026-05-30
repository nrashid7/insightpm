# BusinessVoice AI — Environment Variables

Copy `.env.example` to `apps/web/.env.local` for local development.

## Supabase

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe for client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only, never expose) |

Set the same `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as Supabase Edge Function secrets.

## Voice (Retell + ElevenLabs)

| Variable | Description |
|----------|-------------|
| `RETELL_API_KEY` | Retell AI API key |
| `RETELL_WEBHOOK_SECRET` | Optional override for verifying Retell webhook signatures; defaults to `RETELL_API_KEY` |
| `ELEVENLABS_API_KEY` | ElevenLabs API key for premium voices |

## SMS (Twilio)

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Platform SMS sender number |

## AI Models

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | OpenRouter API key for call analysis |
| `OPENAI_API_KEY` | OpenAI key for embeddings (text-embedding-3-small) |
| `VOYAGE_API_KEY` | Optional Voyage AI embedding fallback |
| `EMBEDDING_PROVIDER` | `openai` (default) or `voyage` |

## Stripe

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_PRICE_STARTER` | Price ID for Starter plan ($99/mo) |
| `STRIPE_PRICE_PRO` | Price ID for Pro plan ($249/mo) |
| `STRIPE_PRICE_SETUP` | Price ID for setup fee ($199) |

## Analytics

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog host (default: https://us.i.posthog.com) |
| `POSTHOG_API_KEY` | Server-side PostHog key for Edge Functions |

## Automation (n8n)

| Variable | Description |
|----------|-------------|
| `N8N_WEBHOOK_BASE_URL` | Base URL for n8n webhooks |
| `N8N_WEBHOOK_SECRET` | Shared secret for signed dispatch payloads |

## OAuth Integrations

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (Auth + Calendar) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `CALENDLY_CLIENT_ID` | Calendly OAuth client ID |
| `CALENDLY_CLIENT_SECRET` | Calendly OAuth client secret |

## App

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | App URL (http://localhost:3000 for dev) |
