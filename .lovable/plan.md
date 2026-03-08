

# Phase 1-3 Incremental Build Plan

## Phase 1: Sentiment Classification, Clustering, Data Quality Filtering, Cached Re-analysis

### 1A. New Edge Function: `classify-feedback`
Create `supabase/functions/classify-feedback/index.ts` that:
- Accepts `{ analysisId }` 
- Reads all `feedback_items` for that analysis from DB (using service role)
- Filters out low-quality items: text < 30 chars, duplicates (same text), obvious bot/spam patterns
- Marks removed items with `sentiment = 'filtered'` (or deletes them)
- Batches remaining items (chunks of ~30) and sends to Lovable AI (`google/gemini-2.5-flash-lite` — cheapest, good for classification) with tool calling to return structured per-item classification:
  - `sentiment`: positive | negative | neutral | feature_request | bug | pricing | performance
  - `cluster`: a short label like "UX issues", "pricing complaints", "missing offline mode"
- Updates each `feedback_items` row with sentiment + cluster via service role
- Returns summary stats

### 1B. Database Changes
- Add `cluster` column (text, nullable) to `feedback_items` table
- Add `quality_score` column (smallint, nullable) to `feedback_items` — 0=filtered, 1=low, 2=medium, 3=high
- Add `classified_at` column (timestamptz, nullable) to `feedback_items`

### 1C. Update `analyze-product` Pipeline
Modify `analyze-product/index.ts`:
1. After calling `collect-feedback`, call `classify-feedback` with the analysis ID
2. Read classified feedback from DB to build the corpus (excluding filtered items)
3. Include cluster distribution in the AI analysis prompt for better insight generation
4. Add `clusters` to the tool call schema — array of `{ name, count, sentiment_breakdown, sample_texts }`
5. Support **cached re-analysis**: if `?useCache=true` and `feedback_items` exist for this product within last 24h, skip `collect-feedback` and reuse existing items

### 1D. Frontend: Cluster Visualization on Dashboard
- Add `ClusterData` type to `analysis.ts`: `{ name: string; count: number; avgSentiment: string; samples: string[] }`
- Add `clusters` to `AnalysisResult`
- New dashboard section: **Feedback Clusters** — a grid of cards, each showing cluster name, item count, dominant sentiment badge, and 1-2 sample quotes
- Add a "Re-analyze (cached)" button on saved analyses that re-runs AI without re-scraping

### 1E. Config
- Add `[functions.classify-feedback]` and `[functions.collect-feedback]` to `config.toml`

---

## Phase 2: YouTube Comments & Google Play Sources

### 2A. Add YouTube collector to `collect-feedback/index.ts`
- Search YouTube Data API v3: `GET https://www.googleapis.com/youtube/v3/search?q={product}+review&type=video&part=snippet&maxResults=5`
- For top results, fetch comments: `GET https://www.googleapis.com/youtube/v3/commentThreads?videoId={id}&part=snippet&maxResults=20`
- Requires `YOUTUBE_API_KEY` secret — will prompt user to add it
- Normalize to `FeedbackItem[]`

### 2B. Add Google Play collector to `collect-feedback/index.ts`
- Use Firecrawl to scrape Google Play reviews: `site:play.google.com "${productName}" reviews`
- No additional API key needed (uses existing Firecrawl)
- Parse scraped markdown for review text, ratings

### 2C. Frontend Updates
- Add `youtube` and `googleplay` to `ALL_SOURCES` in `Analyze.tsx`
- Add to `SOURCE_LABELS` in `Dashboard.tsx`

---

## Phase 3: Scheduled Monitoring & Alerts

### 3A. Database Changes
- Create `monitored_products` table: `id, user_id, product_name, website, competitors, sources (jsonb), frequency (text: daily/weekly), last_run_at, next_run_at, is_active, created_at`
- Create `monitoring_alerts` table: `id, user_id, product_id (FK), alert_type (text), message (text), data (jsonb), is_read (bool), created_at`
- RLS: users can CRUD their own monitored products and read their own alerts

### 3B. New Edge Function: `run-monitoring`
- Reads all `monitored_products` where `next_run_at <= now() AND is_active = true`
- For each: runs collect-feedback → classify-feedback → analyze-product
- Compares new results with previous analysis (stored in `analyses`)
- If significant changes detected (sentiment shift > 10%, new top complaint, etc.), inserts into `monitoring_alerts`
- Updates `last_run_at` and `next_run_at`

### 3C. Cron Job
- Use `pg_cron` + `pg_net` to call `run-monitoring` every hour
- The function itself checks `next_run_at` to determine which products actually need re-analysis

### 3D. Frontend: Monitoring Page
- New `/monitor` route and page
- List of monitored products with status, last run, next run
- "Add to monitoring" button on Dashboard (after saving an analysis)
- Alerts section showing unread notifications (sentiment changed, new complaint surfaced, etc.)
- Add to Navbar navigation

### 3E. Config
- Add `[functions.run-monitoring]` to `config.toml`

---

## Implementation Order

1. DB migration (Phase 1 + 2 columns)
2. `classify-feedback` edge function
3. Update `analyze-product` with classification step + caching + clusters
4. Update frontend types + Dashboard cluster visualization
5. YouTube + Google Play collectors + frontend source additions
6. DB migration for monitoring tables
7. `run-monitoring` edge function + cron setup
8. Monitoring page + alerts UI

