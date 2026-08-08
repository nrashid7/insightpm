# InsightPM

AI-powered product intelligence that aggregates user feedback from 9+ sources, classifies it with AI, and surfaces actionable insights.

## Architecture

```
Frontend (Vite + React + TypeScript)
  └─ Supabase Client SDK
       ├─ Auth (email, Google, GitHub)
       ├─ Postgres (analyses, feedback_items, monitored_products, monitoring_alerts)
       └─ Edge Functions
            ├─ analyze-product   — orchestrates collection, classification, and AI analysis
            ├─ collect-feedback        — scrapes HN, GitHub, SO, App Store, Reddit, Trustpilot, YouTube, Google Play, web
            ├─ collect-market-signals  — industry signals: Polymarket, engagement-scored Reddit/HN/YouTube/GitHub, TikTok/X
            ├─ classify-feedback       — AI-powered sentiment/cluster classification of feedback items
            └─ run-monitoring          — scheduled (pg_cron) re-analysis with change detection and alerts
```

**Frontend**: Vite 5, React 18, TypeScript, Tailwind CSS, shadcn/ui (Radix), Framer Motion, Recharts  
**Backend**: Supabase (Postgres + Row-Level Security, Auth, Deno Edge Functions)  
**AI**: Lovable AI Gateway (Gemini) for analysis and classification  
**Scraping**: Firecrawl API for Reddit, Trustpilot, Google Play, and general web

## Local Development

### Prerequisites

- Node.js 20+
- npm
- A [Supabase](https://supabase.com) project

### Setup

```bash
# Install dependencies
npm install

# Copy environment template and fill in values
cp .env.example .env

# Start development server
npm run dev
```

The app runs at `http://localhost:8080`.

### Environment Variables

See [`.env.example`](.env.example) for the full list. At minimum you need:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Yes | Supabase project ID |
| `VITE_GA_MEASUREMENT_ID` | No | Google Analytics 4 measurement ID |
| `VITE_SENTRY_DSN` | No | Sentry DSN for error tracking |

Edge Function secrets (set via `supabase secrets set`):

| Secret | Required | Description |
|--------|----------|-------------|
| `SUPABASE_URL` | Yes | Same as `VITE_SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | Yes | Same as `VITE_SUPABASE_PUBLISHABLE_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (keep secret) |
| `LOVABLE_API_KEY` | Yes | Lovable AI Gateway key |
| `FIRECRAWL_API_KEY` | Yes | Firecrawl API key for web scraping |
| `INTERNAL_FUNCTION_SECRET` | Yes | Shared secret for internal function-to-function calls |
| `YOUTUBE_API_KEY` | No | YouTube Data API v3 key |
| `SCRAPECREATORS_API_KEY` | No | ScrapeCreators key for TikTok/Instagram/Threads/X in Industry Signals |
| `OPENROUTER_API_KEY` | No | OpenRouter key for Perplexity Sonar web search |
| `BRAVE_API_KEY` | No | Brave Search key (2,000 free queries/month) |

### Database Setup

Apply migrations in order:

```bash
supabase db push
```

Or for a fresh setup, run `migration/schema.sql` against your database.

For the monitoring cron job, set database-level config:

```sql
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://<project-ref>.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = '<your-service-role-key>';
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm run smoke` | typecheck + test + build (pre-launch) |
| `npm run verify:launch` | Validate required env vars |
| `npm run deploy:db` | Push Supabase migrations |
| `npm run deploy:functions` | Deploy all edge functions |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

## Deployment

The app is a static SPA deployed to Vercel. A [`vercel.json`](vercel.json) is included with SPA routing rewrites, security headers, and asset caching.

Edge Functions are deployed via the Supabase CLI:

```bash
supabase functions deploy analyze-product collect-feedback collect-market-signals classify-feedback run-monitoring stripe-checkout stripe-portal stripe-webhook
```

**Paid launch:** See [docs/LAUNCH.md](docs/LAUNCH.md) for Stripe setup, secrets, Auth URLs, and smoke tests.

## Project Structure

```
src/
  components/
    dashboard/     — analysis result visualization components
    landing/       — marketing page components
    ui/            — shadcn/ui primitives
  hooks/           — useAuth, useToast, useMobile
  lib/
    api/           — analyzeProduct() API client
    types/         — TypeScript interfaces
    analytics.ts   — Google Analytics integration
    error-reporting.ts — Sentry error tracking
  pages/           — route components (Index, Analyze, Dashboard, Auth, History, Monitor)
  test/            — Vitest test files
supabase/
  functions/       — Deno Edge Functions
    _shared/       — CORS, rate limiting, validation, retry, auth, logging utilities
  migrations/      — Postgres migrations
```
