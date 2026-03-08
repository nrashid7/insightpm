

# InsightPM — Remaining Build Plan

## What exists today
- Landing page with hero, features, pricing, how-it-works sections
- Static dashboard with hardcoded mock data (charts, stats, AI recommendation)
- Routing between `/` and `/dashboard`

## What the PRD requires (mapped to what we can build)

The PRD describes a full product intelligence platform. Given the Lovable stack (React + Supabase/Lovable Cloud), here's a practical build plan in phases:

---

## Phase 1: Product Analysis Input Flow

**New page: `/analyze`** — A dedicated analysis form where users enter:
- Product name (required)
- Product website URL (optional)
- Competitors (optional, comma-separated)

On submit, this navigates to the dashboard with the product context, triggering the AI analysis.

**Changes:**
- Create `src/pages/Analyze.tsx` with a clean multi-field form
- Update `HeroSection` CTA to link to `/analyze` instead of `/dashboard`
- Add route in `App.tsx`

---

## Phase 2: AI-Powered Analysis (Lovable Cloud + Lovable AI)

Enable Lovable Cloud and create an edge function that takes product info and generates structured insights using the Lovable AI gateway.

**Edge function: `analyze-product`**
- Accepts: product name, website, competitors
- Uses Lovable AI (gemini-3-flash-preview) with tool calling to return structured JSON:
  - Top complaints (name + mention count)
  - Feature requests (name + mentions + trend)
  - Sentiment breakdown (positive/neutral/negative percentages)
  - Competitor weaknesses
  - AI recommendation text
- Returns structured data to the frontend

**Frontend changes:**
- Create `src/lib/api/analyze.ts` — API client calling the edge function
- Refactor `Dashboard.tsx` to accept real data from the API instead of hardcoded mock data
- Add loading states with skeleton UI while analysis runs
- Add error handling with toast notifications

---

## Phase 3: Web Scraping with Firecrawl

Connect Firecrawl to gather real feedback data before AI analysis.

**Edge function: `scrape-feedback`**
- Uses Firecrawl search API to find feedback for the product across Reddit, review sites, etc.
- Passes scraped content to the AI analysis function for processing

**Queries like:**
- `"{product name}" review complaints`
- `"{product name}" feature request reddit`
- `"{product name}" vs {competitor}`

---

## Phase 4: Authentication & Saved Analyses

Enable Lovable Cloud auth so users can:
- Sign up / log in (email-based)
- Save past analyses to a `analyses` table
- View analysis history

**New pages:**
- `/auth` — Login/signup form
- `/history` — List of past analyses

**Database table: `analyses`**
- id, user_id, product_name, website, competitors, results (jsonb), created_at

---

## Phase 5: Polish & Additional Features

- **Export**: Download analysis as PDF or CSV
- **Share**: Generate shareable links for analyses
- **Real-time trend chart**: Show how sentiment changes over time with multiple analyses
- **Responsive mobile layout** improvements

---

## Implementation Order

I recommend building Phases 1-2 first (input form + AI analysis), as they deliver the core value. Phase 3 (Firecrawl) adds real data. Phase 4 (auth) adds persistence.

---

## Technical Details

- **Lovable Cloud** must be enabled for edge functions and AI gateway
- **Firecrawl connector** must be connected for web scraping
- All AI calls go through edge functions (never client-side)
- Structured output via tool calling (not raw JSON prompts)
- SSE streaming not needed for analysis (single structured response is fine)
- Dashboard refactored to use React Query for data fetching with loading/error states

