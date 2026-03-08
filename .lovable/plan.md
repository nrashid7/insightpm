

# Remaining Work: Fixes, Gaps, and Optimizations

## Current State Summary

The core product is functional: 9 source collectors, classify-feedback, analyze-product with caching, run-monitoring with alert detection, Dashboard with clusters/charts/actions, Monitor page, History, Auth, CSV export, alert badge in Navbar.

## Issues and Gaps

### 1. pg_cron job never scheduled (CRITICAL)
The migration (`173843`) only enables `pg_cron` and `pg_net` extensions but never calls `cron.schedule(...)`. The `run-monitoring` function will never fire automatically.

**Fix:** Run a SQL insert (not migration, per cron docs) to schedule the hourly job calling `run-monitoring` via `net.http_post`.

### 2. Unauthenticated users: pipeline doesn't persist (MEDIUM)
When no user is logged in, `analyze-product` skips creating the placeholder analysis and passes `analysisId: undefined` to `collect-feedback`, so nothing gets persisted or classified. This is acceptable for anonymous usage but means the "Re-analyze (cached)" flow only works for logged-in users who saved. No code change needed -- just documenting.

### 3. History page shows placeholder analyses (LOW)
`analyze-product` inserts a placeholder `{ results: {} }` for logged-in users. If the analysis fails mid-way, these empty rows appear in History. The placeholder is never updated with real results after AI completes.

**Fix:** After the AI analysis completes in `analyze-product`, update the placeholder analysis row with the real results. This also means the Dashboard's `handleSave` creates a duplicate -- should instead skip save if a real analysis row already exists for this run.

### 4. Dashboard is a 689-line monolith (LOW)
Extracting sub-components would improve maintainability.

**Fix:** Extract `DashboardHeader`, `StatCards`, `SourceChart`, `ClusterGrid`, `OpportunityScores`, `FeedbackSamples` into `src/components/dashboard/`.

### 5. No error handling for edge function timeouts
The analysis pipeline calls 3 edge functions sequentially (collect → classify → analyze AI). If any takes too long, the user sees a generic error. No progress feedback.

**Fix:** Add a progress state to the Dashboard that updates as each stage completes. Use streaming or polling -- but simplest is to show stage labels ("Collecting feedback...", "Classifying...", "Generating insights...") based on elapsed time.

### 6. Monitor page: no link to view latest analysis
After monitoring runs, users can't click through to see the actual analysis results for a monitored product.

**Fix:** Add a "View Latest" button on each monitored product card that links to the most recent analysis in History.

### 7. Duplicate monitoring entries
The "Add to Monitor" button on Dashboard doesn't check if the product is already monitored. Users can add the same product multiple times.

**Fix:** Check `monitored_products` for existing `product_name` before inserting.

---

## Implementation Plan

### Step 1: Schedule pg_cron job
Use the Supabase SQL tool (not migration) to run:
```sql
SELECT cron.schedule(
  'run-monitoring-hourly',
  '0 * * * *',
  $$SELECT net.http_post(
    url := 'https://syudsfetmvozjltqchqo.supabase.co/functions/v1/run-monitoring',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'::jsonb,
    body := '{}'::jsonb
  )$$
);
```

### Step 2: Update analyze-product to persist final results
After the AI analysis returns, update the placeholder `analyses` row with real results:
```typescript
// After analysisData is ready, update the placeholder
if (userId && analysisId) {
  await supabase.from("analyses").update({ results: analysisData }).eq("id", analysisId);
}
```
Return the `analysisId` in the response so the frontend knows the analysis is already saved.

### Step 3: Update Dashboard to skip double-save
- If the response includes an `analysisId`, set `isSaved = true` and `currentAnalysisId` immediately
- Hide the "Save" button since it's already persisted
- This eliminates duplicate analysis rows

### Step 4: Add duplicate monitoring check
In `handleAddToMonitoring`, query `monitored_products` first:
```typescript
const { data: existing } = await supabase.from("monitored_products")
  .select("id").eq("product_name", data.productName).eq("user_id", user.id).single();
if (existing) { toast("Already monitoring"); return; }
```

### Step 5: Add "View Latest" on Monitor page
For each monitored product, query the latest `analyses` row and render a link button.

### Step 6: Add analysis progress stages to Dashboard
Replace the generic loading skeleton with stage-aware progress:
- Stage 1: "Collecting feedback from X sources..." (0-15s)
- Stage 2: "Classifying feedback..." (15-25s)  
- Stage 3: "Generating AI insights..." (25s+)
Use a timer-based approach (no backend changes needed).

### Step 7: Extract Dashboard sub-components
Split `Dashboard.tsx` into:
- `src/components/dashboard/StatCards.tsx`
- `src/components/dashboard/SourceChart.tsx`
- `src/components/dashboard/ClusterGrid.tsx`
- `src/components/dashboard/OpportunityScores.tsx`
- `src/components/dashboard/FeedbackSamples.tsx`
- `src/components/dashboard/FeatureRequests.tsx`

Dashboard.tsx becomes ~150 lines of composition.

---

## Implementation Order
1. pg_cron schedule (SQL insert)
2. analyze-product: update placeholder with real results + return analysisId
3. Dashboard: skip double-save + duplicate monitoring check
4. Monitor: "View Latest" button
5. Dashboard: progress stages during loading
6. Dashboard: extract sub-components

