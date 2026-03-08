

# Fixes and Optimizations Plan

Based on reviewing the test results and full codebase, here are the issues found and proposed fixes:

## Issues Found

### 1. `classify-feedback` is never actually called
The `analyze-product` function has a placeholder at lines 129-140 that logs "Skipping separate classification" and never calls `classify-feedback`. The classifier edge function exists and works, but the pipeline doesn't use it. This means `feedback_items` never get classified in the DB, and the `useCache` path (which reads from DB) will never find classified items.

### 2. `collect-feedback` doesn't persist items without `analysisId`
The collector only inserts into the DB when `analysisId` is provided (line 475). But `analyze-product` never passes `analysisId` to `collect-feedback`. So feedback items are never saved to the DB, which means:
- `useCache` will never find cached items (nothing was saved)
- `classify-feedback` has nothing to classify (nothing in DB)
- The "Re-analyze (cached)" button is essentially broken

### 3. `pg_cron` migration will fail
The migration only creates extensions but doesn't schedule the actual cron job. The `cron.schedule` call is missing.

### 4. Dashboard 689-line monolith
The Dashboard component is nearly 700 lines. While functional, it could benefit from extraction into sub-components for maintainability.

### 5. Encoding artifacts in AI responses
Test showed occasional garbled characters (e.g., "肢") in AI-generated text, likely from token encoding issues.

---

## Implementation Plan

### Fix 1: Wire up the full pipeline (collect → persist → classify → analyze)
**In `analyze-product/index.ts`:**
- After collecting feedback, create a temporary record to get an `analysisId` (or generate a UUID)
- Pass `analysisId` to `collect-feedback` so items get persisted
- After collection, call `classify-feedback` with that `analysisId`
- Read classified items back from DB to build the enriched corpus
- This makes `useCache` actually work on subsequent runs

### Fix 2: Add the cron schedule to the migration
Create a new migration that runs:
```sql
SELECT cron.schedule(
  'run-monitoring-hourly',
  '0 * * * *',
  $$SELECT net.http_post(
    url := '<supabase_url>/functions/v1/run-monitoring',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body := '{}'::jsonb
  )$$
);
```

### Fix 3: Clean encoding artifacts from AI responses
Add a post-processing sanitizer in `analyze-product` that strips non-ASCII control characters and common encoding artifacts from all string fields before returning.

### Fix 4: classify-feedback batch update optimization
Currently updates items one-by-one in a loop (line 182-191). Batch these into fewer queries using `.in()` filters grouped by sentiment+cluster combo, or use a single upsert pattern.

### Fix 5: Minor UI fixes
- Source bar chart height calculation: `Math.max(140, data.sourceBreakdown.length * 32)` can be too small for 10 sources. Bump to `* 36`.
- The "Re-analyze (cached)" button should show a tooltip explaining what cached means.

---

## Implementation Order
1. Fix the pipeline wiring (collect → persist → classify → analyze) — this is the critical fix
2. Add cron schedule migration
3. Add AI response sanitizer
4. Optimize classify-feedback batch updates
5. Minor UI polish

