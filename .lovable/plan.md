

# Remaining Items — Implementation Plan

## What's Already Built
- 9 source collectors (HN, GitHub, SO, App Store, Reddit, Trustpilot, Web, YouTube, Google Play)
- `feedback_items`, `analysis_sources`, `monitored_products`, `monitoring_alerts` tables with RLS
- `classify-feedback`, `collect-feedback`, `analyze-product`, `run-monitoring` edge functions
- Dashboard with clusters, opportunity scores, feedback samples, source breakdown
- Monitor page with add/pause/delete products and alerts feed
- Analyze page with source selection checkboxes
- History page, Auth, CSV export

## What Remains from the PRD

### 1. "Add to Monitoring" button on Dashboard
After saving an analysis, show a button that creates a `monitored_products` entry pre-filled with the product name, website, and competitors — so users don't have to re-enter details on `/monitor`.

### 2. pg_cron setup for automated monitoring
The `run-monitoring` edge function exists but there's no cron job triggering it. Add a migration that enables `pg_cron` + `pg_net` and schedules an hourly call to the function.

### 3. Support Ticket Integrations (Zendesk / Intercom)
The PRD requests OAuth-based Zendesk and Intercom integrations. These require external OAuth apps and user account linking, which is complex. Instead, implement a simpler approach:
- Add a "Custom Data" source where users can paste support ticket text or upload a CSV of feedback
- Store these as `feedback_items` with source `custom`
- This delivers the same value (internal feedback in the pipeline) without OAuth complexity

### 4. Re-analyze with cache button on Dashboard
The backend supports `useCache: true` but the Dashboard has no UI to trigger it. Add a "Re-analyze (faster)" button on saved analyses that calls `analyzeProduct` with `useCache: true`.

### 5. Source breakdown bar chart
The Dashboard shows source badges but not the bar chart mentioned in the plan. Add a small horizontal bar chart showing item counts per source.

### 6. Alert badge in Navbar
Show unread alert count as a badge on the Monitor nav link so users know when new alerts arrive.

---

## Implementation Steps

**Step 1: Dashboard — Add to Monitoring + Re-analyze button**
- After save, show "Add to Monitoring" button that inserts into `monitored_products`
- Add "Re-analyze (cached)" button on saved analyses that re-runs with `useCache: true`

**Step 2: Source breakdown bar chart**
- Replace source badges section with a small horizontal `BarChart` from recharts showing count per source from `data.sourceBreakdown`

**Step 3: Navbar alert badge**
- Query `monitoring_alerts` where `is_read = false` and show count badge on the Monitor link

**Step 4: Custom feedback source**
- Add a "Custom / Paste" source option on the Analyze page
- Show a textarea or CSV upload when selected
- Send custom items to `collect-feedback` as pre-built feedback items
- Update `collect-feedback` to accept and store `customItems` array

**Step 5: pg_cron migration**
- SQL migration enabling `pg_cron` and `pg_net` extensions
- Schedule `SELECT net.http_post(...)` to call `run-monitoring` hourly

---

## Technical Details

- Custom feedback: Add `customItems?: { text: string; title?: string; rating?: number }[]` to the `collect-feedback` request body. Store with `source: 'custom'`.
- pg_cron: `SELECT cron.schedule('run-monitoring', '0 * * * *', $$ SELECT net.http_post(...) $$)`
- Alert badge: Use a lightweight `useEffect` + Supabase query in `Navbar.tsx`, polling every 60s or using realtime subscription on `monitoring_alerts`.

