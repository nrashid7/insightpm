

# Data Ingestion & AI Intelligence Layer — Implementation Plan

## Platform Constraints

The PRD references Python, Redis, BullMQ, Pinecone, and Next.js — none of which are available in Lovable. This plan adapts the architecture to what we can build: **Supabase Edge Functions (Deno)**, **PostgreSQL**, and **Lovable AI Gateway**. The result delivers the same user-facing value.

**What we keep from the PRD:** Multi-source ingestion, normalized feedback storage, AI-powered clustering/sentiment, opportunity scoring, modular source architecture.

**What we replace:**
- Pinecone → PostgreSQL (feedback stored as structured rows; semantic search done by AI at query time)
- Python PRAW → Firecrawl scraping for Reddit, Trustpilot, G2
- OpenAI embeddings → Skipped in favor of direct AI analysis on raw text (more practical at this scale)
- Redis/BullMQ → Single orchestrator edge function that calls source collectors sequentially
- Next.js → Existing React/Vite app

---

## Database Schema

### New table: `feedback_items`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| product_name | text | Indexed |
| source | text | reddit, github, hackernews, stackoverflow, appstore, trustpilot, firecrawl |
| title | text | nullable |
| text | text | The feedback content |
| rating | smallint | nullable, 1-5 |
| sentiment | text | nullable: positive, negative, neutral, feature_request, bug |
| url | text | nullable |
| metadata | jsonb | Source-specific data (upvotes, subreddit, labels, etc.) |
| collected_at | timestamptz | When we scraped it |
| source_timestamp | timestamptz | nullable, original post date |
| analysis_id | uuid FK → analyses.id | nullable, links to the analysis run |

RLS: authenticated users can read feedback linked to their analyses. Public analyses' feedback is also readable.

### New table: `analysis_sources`

Tracks which sources were queried and their status per analysis run.

| Column | Type |
|--------|------|
| id | uuid PK |
| analysis_id | uuid FK → analyses.id |
| source | text |
| status | text | success, failed, skipped |
| items_count | integer |
| error_message | text nullable |
| duration_ms | integer |

---

## Edge Function Architecture

```text
Client (Dashboard)
  │
  ▼
[collect-feedback]  ← NEW orchestrator
  │
  ├─► sourceCollectors.reddit()      (Firecrawl search)
  ├─► sourceCollectors.hackernews()   (HN Algolia API - free, no key)
  ├─► sourceCollectors.github()       (GitHub Search API - free, no key)
  ├─► sourceCollectors.stackoverflow() (StackExchange API - free, no key)
  ├─► sourceCollectors.appstore()     (iTunes RSS API - free, no key)
  ├─► sourceCollectors.trustpilot()   (Firecrawl scrape)
  ├─► sourceCollectors.firecrawl()    (General web search - existing)
  │
  ▼
Inserts normalized rows into feedback_items table
  │
  ▼
[analyze-product]  ← UPDATED
  │
  Reads feedback_items for this product
  Sends to Lovable AI for structured analysis
  │
  ▼
Returns AnalysisResult (same shape as today)
```

### Source Collectors (all inside `collect-feedback/index.ts`)

Each collector is a function that returns `FeedbackItem[]`:

1. **Hacker News** — Algolia API (`hn.algolia.com/api/v1/search`), free, no auth
2. **GitHub Issues** — `api.github.com/search/issues`, free up to 10 req/min unauthenticated
3. **StackOverflow** — `api.stackexchange.com/2.3/search`, free, no auth
4. **App Store** — iTunes RSS feed (`itunes.apple.com/rss/customerreviews`), free
5. **Reddit** — Via Firecrawl search (already connected)
6. **Trustpilot** — Via Firecrawl scrape of trustpilot.com pages
7. **General Web** — Existing Firecrawl search queries

### Updated `analyze-product`

Instead of scraping inline, it:
1. Calls `collect-feedback` first (or reads existing feedback if recently collected)
2. Reads all `feedback_items` for the product
3. Sends the text corpus to Lovable AI with enhanced prompts for sentiment, clustering, and opportunity scoring
4. Returns the same `AnalysisResult` shape (backward compatible) plus new fields

### New fields in `AnalysisResult`

```typescript
// Added to existing type
sourceBreakdown: { source: string; count: number }[];
opportunityScore: { name: string; score: number; mentions: number }[];
feedbackSamples: { text: string; source: string; sentiment: string; url?: string }[];
```

---

## Frontend Updates

### Dashboard enhancements
- **Source breakdown card** — small bar chart showing how many items came from each source
- **Opportunity score table** — ranked list with score badges (High/Medium/Low)
- **Feedback samples section** — collapsible list showing real quotes with source badges
- **Loading progress** — show which sources are being scanned ("Scanning Reddit...", "Checking GitHub Issues...")

### Analyze page
- Add checkboxes for which sources to include (all checked by default)
- Optional App Store app ID field for direct app review lookup

---

## Implementation Steps

### Step 1: Database migration
- Create `feedback_items` table with indexes on `(product_name, source)` and `(analysis_id)`
- Create `analysis_sources` table
- Add RLS policies

### Step 2: `collect-feedback` edge function
- Implement all 7 source collectors as modular functions
- Each returns normalized `FeedbackItem[]`
- Orchestrator calls them in parallel with `Promise.allSettled`
- Inserts results into `feedback_items` and `analysis_sources`
- Accepts `{ productName, website?, sources?, analysisId? }`

### Step 3: Update `analyze-product` edge function
- Read feedback from `feedback_items` instead of inline Firecrawl scraping
- Enhanced AI prompt that includes real feedback text
- Add `sourceBreakdown`, `opportunityScore`, and `feedbackSamples` to output
- Keep backward compatibility with existing `AnalysisResult` shape

### Step 4: Update frontend types and Dashboard
- Extend `AnalysisResult` type with new fields
- Add source breakdown visualization
- Add opportunity score ranking
- Add feedback samples section with source badges
- Add progressive loading states

### Step 5: Update Analyze page
- Add source selection checkboxes
- Wire the two-step flow: collect → analyze

### Step 6: Wire `config.toml`
- Add `[functions.collect-feedback]` with `verify_jwt = false`

---

## What This Delivers

After implementation, when a user enters "Notion":
1. System scrapes Reddit, Hacker News, GitHub, StackOverflow, App Store, Trustpilot, and general web — **in parallel**
2. All feedback is normalized and stored in the database
3. AI analyzes the full corpus and generates: top complaints, feature requests, sentiment trends, competitor weaknesses, and **opportunity scores**
4. Dashboard shows real quotes from real sources with attribution
5. Re-analyzing the same product is faster (cached feedback)

