# InsightPM - Architecture & Documentation

> **Note:** For the current schema and billing fields, use [`supabase/migrations/`](../supabase/migrations/) as the source of truth. This document describes the high-level architecture; `migration/schema.sql` may lag behind migrations.

## Overview
InsightPM is a product feedback intelligence platform that scrapes, classifies, and analyzes user feedback from 9+ sources using AI. Paid plans (Stripe) gate analyses, source access, market signals, and monitoring limits.

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, TypeScript 5, Tailwind CSS v3 |
| UI Components | shadcn/ui, Radix UI primitives |
| Animations | Framer Motion |
| Charts | Recharts |
| Routing | React Router v6 |
| State/Data | TanStack React Query |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| AI | OpenRouter (Gemini models) |
| Scraping | Firecrawl API |

## Project Structure
```
src/
├── components/
│   ├── dashboard/       # Dashboard widgets (charts, stats, clusters)
│   ├── landing/         # Landing page sections
│   └── ui/              # shadcn/ui components
├── hooks/               # Custom hooks (useAuth, useMobile, useToast)
├── integrations/
│   └── supabase/        # Auto-generated client & types
├── lib/
│   ├── api/             # API layer (analyze.ts)
│   ├── types/           # TypeScript interfaces (analysis.ts)
│   └── utils.ts         # Utility functions
├── pages/               # Route pages
│   ├── Index.tsx         # Landing page
│   ├── Analyze.tsx       # Analysis input form
│   ├── Dashboard.tsx     # Results dashboard
│   ├── History.tsx       # Past analyses
│   ├── Monitor.tsx       # Product monitoring setup
│   ├── Share.tsx         # Public read-only shared analyses
│   ├── Settings.tsx      # Account & billing
│   ├── Auth.tsx          # Login/signup
│   └── NotFound.tsx
└── main.tsx

supabase/
├── config.toml
└── functions/
    ├── analyze-product/   # Main pipeline orchestrator
    ├── collect-feedback/  # Multi-source scraper
    ├── classify-feedback/ # AI sentiment & clustering
    ├── collect-market-signals/ # Industry signals layer
    ├── run-monitoring/    # Scheduled re-analysis
    ├── stripe-checkout/   # Stripe Checkout
    ├── stripe-portal/     # Billing portal
    └── stripe-webhook/    # Subscription sync
```

## Database Schema (6 Tables)

### profiles
- Auto-created on user signup via trigger
- Stores email, full_name, avatar_url

### analyses
- Core table storing AI analysis results as JSONB
- Linked to user_id, supports public sharing via is_public flag

### analysis_sources
- Tracks per-source ingestion status (pending/done/error)
- Records items_count and duration_ms for debugging

### feedback_items
- Normalized feedback corpus from all 9 sources
- Fields: source, text, rating, sentiment, cluster, url, metadata
- Linked to analysis_id

### monitored_products
- Configuration for scheduled product tracking
- Stores frequency (daily/weekly), sources, active status

### monitoring_alerts
- AI-detected anomalies (sentiment shifts, volume spikes)
- Linked to monitored_products via product_id

## Data Flow

```
User Input (product name, sources)
    ↓
analyze-product (Edge Function)
    ↓
collect-feedback (parallel scraping)
    ├── Reddit (Firecrawl)
    ├── GitHub Issues (Search API)
    ├── StackOverflow (StackExchange API)
    ├── Hacker News (Algolia API)
    ├── App Store (iTunes RSS)
    ├── Google Play (Firecrawl)
    ├── YouTube (Google Data API v3)
    ├── Trustpilot (Firecrawl)
    ├── Web (Firecrawl Search)
    └── Custom (user-pasted text)
    ↓
classify-feedback (AI batch processing)
    ↓
AI Analysis (Gemini) → AnalysisResult JSON
    ↓
Store in analyses table + render Dashboard
```

## Key TypeScript Types

### AnalysisResult (stored in analyses.results)
```typescript
interface AnalysisResult {
  productName: string;
  totalFeedback: number;
  avgSentiment: number;           // 0-100
  topComplaintsCount: number;
  topFeatureRequestCount: number;
  complaints: { name: string; mentions: number }[];
  sentiment: { name: string; value: number; color: string }[];
  trendData: { month: string; requests: number }[];
  featureRequests: { name: string; mentions: number; trend: "up"|"down"|"stable" }[];
  competitors: { name: string; weakness: string; sentiment: number }[];
  aiRecommendation: string;
  sourcesCount: number;
  opportunityScore?: { name: string; score: number; mentions: number }[];
  sourceBreakdown?: { source: string; count: number }[];
  feedbackSamples?: { text: string; source: string; title?: string; url?: string; rating?: number; sentiment?: string }[];
  clusters?: { name: string; count: number; avgSentiment: string; samples: string[] }[];
  analysisId?: string;
}
```

## Environment Variables
| Variable | Purpose |
|----------|---------|
| VITE_SUPABASE_URL | Supabase project URL |
| VITE_SUPABASE_PUBLISHABLE_KEY | Supabase anon key |
| VITE_SUPABASE_PROJECT_ID | Project reference ID |

## Edge Function Secrets
| Secret | Purpose |
|--------|---------|
| SUPABASE_SERVICE_ROLE_KEY | Server-side DB access |
| OPENROUTER_API_KEY | OpenRouter AI access |
| FIRECRAWL_API_KEY | Web scraping |
| SUPABASE_URL | Internal Supabase URL |
| SUPABASE_ANON_KEY | Anon key for edge functions |

## Authentication
- Email/password signup with email verification
- Google OAuth supported
- Profile auto-created via database trigger on signup
- All data tables use RLS policies scoped to auth.uid()

## Design System
- **Theme**: Dark mode (navy background at HSL 222 47% 6%)
- **Primary**: Cyan (HSL 187 85% 53%)
- **Accent**: Amber (HSL 38 92% 55%)
- **Fonts**: Inter (UI), JetBrains Mono (data/code)
- **Effects**: Noise texture overlay, ambient glow blobs, dot grid pattern, gradient section dividers

## Cursor Migration Notes
1. Copy the entire `src/` and `supabase/` directories
2. Run `schema.sql` against your Supabase project to recreate tables
3. Set all environment variables listed above
4. Deploy edge functions with `supabase functions deploy`
5. Configure auth providers in Supabase dashboard
6. Install dependencies: `npm install`
