# InsightPM product launch-readiness review

Date: 2026-09-14. Revision assessed: `cae3b09`.
Production: https://insightpm-pi.vercel.app
Scope: core product, connectors, analysis, saved results/sharing, monitoring, authentication and operational readiness. Stripe billing is excluded.

## Decision

**Not ready for an external launch, even without billing.** The website loads, but live authenticated analysis fails. Additional reproducible UI, connector-quality, privacy and monitoring defects would remain after adding the missing AI key.

This is a readiness assessment, not an implementation release. No application code, connector secrets, global authentication settings or billing settings were changed during the review.

## Evidence collected

### Live production checks

| Check | Result |
|---|---|
| Test-account password login | HTTP 200, valid session |
| Default analysis request, active Growth test profile, product Notion | HTTP 500: `Cannot read properties of undefined (reading 'length')` |
| Analysis with explicit custom source and three synthetic feedback lines | HTTP 500: `OPENROUTER_API_KEY is not configured` |
| Save and read own synthetic analysis | Passed, HTTP 201/200 |
| Anonymous read of private analysis | Passed: zero rows |
| Enable sharing, anonymous read, revoke sharing | All passed; visibility changed as expected |
| Create and read paused monitor | Passed, HTTP 201/200 |
| Anonymous read of that monitor | Passed: zero rows |
| Delete synthetic analysis and monitor | Passed; both tables confirmed empty afterward |
| Hourly scheduler | 168 SQL invocations marked succeeded in seven days |
| Actual worker responses from last six hourly calls | All HTTP 401: `Unauthorized: service role required` |
| Current application tables | RLS enabled on all seven tables |

The test account was explicitly authorized by the user. Public signup rejected the reserved example.com address. An isolated, confirmed email/password test fixture was then created administratively with a reserved address, and its profile was assigned Growth trial access solely for testing. Password login was verified afterward. **This does not verify ordinary signup, email delivery, confirmation or password recovery.** No existing user was modified. There were zero profiles, analyses and monitors before this test.

The dedicated test account remains available. Its credentials/session are in the ignored local `.vercel/launch-audit-account.json`; never commit or publish that file. Synthetic analysis and monitor records were removed. No monitoring run was triggered by the paused fixture. The profile's period-end value is test metadata, not proof of automatic access expiration.

### Local runtime and code checks

- All 18 test files / 88 tests pass on Vitest 5.0.0 in a fresh run.
- Actual Dashboard and subscription hook rendered with an asynchronously loaded active profile: zero analysis calls; UI remained at a subscription-required error.
- Actual source validation/plan functions reproduce omitted-source crashes on all plans.
- Actual collector with simulated GitHub HTTP 429 returns HTTP 200 and `skipped`, without retrying the failed requests.
- Actual Polymarket parser with the documented JSON-string price format converts 62% into 0%.
- Four actual public collector functions were executed locally against upstream APIs using Notion, with request timeouts. These are **local upstream tests**, not proof of deployed Supabase egress or paid-connector credentials.

## Launch blockers in priority order

### 1. Make one authenticated analysis complete

Production lacks `OPENROUTER_API_KEY`; the signed-in explicit-source request fails before collection. Configure the intended AI account and verify both configured analysis/classification models with bounded real requests. Firecrawl, YouTube and ScrapeCreators production credentials remain unverified; their absence locally does not prove absence remotely.

Two independent application bugs also block normal use:

- `src/pages/Dashboard.tsx:47`: a mount-only effect evaluates the initial false `useSubscription.isActive` value and never retries when the asynchronous profile becomes active. Wait for subscription loading and guard against duplicate starts.
- `src/pages/Analyze.tsx:119`, `src/pages/Dashboard.tsx:59`, `supabase/functions/_shared/subscription.ts:73`: the default all-source request omits `sources`, but the backend assumes an array. Normalize defaults before plan filtering. The production HTTP 500 confirms this defect.

Acceptance: an authorized test account submits the ordinary default form and reaches a persisted, nonempty result; explicit-source and pasted-feedback flows also complete. Do not bypass these flows only by calling the API directly.

### 2. Isolate customer data in privileged queries

- `supabase/functions/analyze-product/index.ts:159`: the service-role cache query filters by product name/time, not owner or selected sources. More than 20 matching cached records can send another customer's private pasted feedback into the requester’s result and AI prompt.
- `supabase/functions/run-monitoring/index.ts:54`: previous-analysis selection filters only by product name. Alerts can compare against another customer's private baseline and expose derived complaints/metrics.
- `src/pages/Analyze.tsx:124`: pasted feedback is transported in URL query parameters, making private text appear in browser history and copied links.

These are static data-flow defects, not observed disclosures: the live database had no customer analyses. RLS does not protect queries made with the service role. Scope cache/baseline queries by owner and appropriate source/product identity; move pasted text out of URLs. Verify with two synthetic users and private canary text.

### 3. Stop presenting invented evidence as measured feedback

`supabase/functions/analyze-product/index.ts:360` asks the model to generate realistic analysis from knowledge when evidence is insufficient. It still requests counts, quotes, source counts and six months of trends. `collect-feedback/index.ts:520` removes timestamps and evidence IDs/URLs from the corpus; no monthly aggregation supports the displayed timeline.

Return an explicit insufficient-data result instead. Calculate counts/trends from actual records, attach evidence references to claims, and label partial coverage. Runtime validation must reject malformed output. Do not launch a dashboard that turns connector outages into convincing invented metrics.

### 4. Repair connector identity, deduplication and failure reporting

| Connector | Runtime/implementation status | Before launch |
|---|---|---|
| Hacker News | Local: 12 HTTP 200 requests, 110 items; unrelated stories included | Resolve product relevance and distinguish competitor content |
| GitHub feedback | Local: 3 HTTP 200 requests, 30 raw items / 11 unique URLs; unrelated projects and PRs included | Match repositories/products; authenticate; handle search quotas |
| Stack Overflow | Local: HTTP 200, 15 items; includes generic programming questions unrelated to Notion | Entity/relevance filtering; respect quota/backoff |
| App Store | Local: 150 reviews across three apps, only three distinct URLs | Use review IDs for deduplication and an explicit target app |
| Reddit feedback | Firecrawl search/scraped pages implemented; deployed credential path unverified | Validate review extraction and show errors/coverage |
| Trustpilot | Firecrawl search/scraped pages, not structured individual reviews | Validate per-review evidence and product matching |
| General web | Firecrawl search excerpts/markdown | Separate documents/snippets from individual user feedback |
| Google Play | Firecrawl page search; no structured review pagination/parser | Implement credible individual-review extraction or defer |
| YouTube | Search/comments and market statistics implemented; credential-dependent | Verify key/quota/disabled-comment handling with real data |
| Reddit market signals | Public JSON search, no OAuth | Verify access from deployed egress; expose blocked requests |
| Polymarket | Parser demonstrably wrong; discovery/link contract also mismatched | Fix JSON-string prices, search contract and event URL |
| TikTok | Code uses POST `/v2/tiktok/search`; provider documents GET `/v1/tiktok/search/keyword` | Implement/test current contract or hide/defer |
| X | Code assumes a provider keyword-search endpoint the provider does not offer | Choose a supported approach or hide/defer |
| Custom feedback | Newline ingestion implemented; deployed analysis blocked by AI key | Validate item boundaries, privacy and full pipeline |

Concrete App Store defect: `collect-feedback/index.ts:177` uses the app-wide RSS review URL. URL deduplication at line 474 collapses 50 reviews per app into one. The Notion probe's 150 raw reviews therefore become three records, while source breakdown still reports 150. One of those three apps is a third-party Notion task app.

Connector HTTP failures are routinely swallowed. Missing keys, 401/429s and genuine zero results converge on `skipped`; retries only run on thrown errors. Preserve distinct not-configured/failed/empty/success states through the UI. Source statuses are currently discarded at `analyze-product/index.ts:558`.

The combined corpus is truncated in connector completion order, so a fast source can crowd out later sources while every source is counted. Allocate evidence deliberately and disclose omitted records.

### 5. Restore real monitoring execution

The scheduler is firing, but every inspected hourly worker response is 401. SQL job success means the request was queued, not that monitoring worked. Repair its credential against the current worker requirements without logging the secret, then confirm a complete synthetic monitoring cycle.

Further fixes:

- `src/pages/Monitor.tsx:82` redirects when user is initially null without waiting for auth loading.
- `run-monitoring/index.ts:158` onward ignores alert/analysis/schedule write errors and can still return HTTP 200.
- Due work has no bounded batch, claim/lease or duplicate protection and runs sequentially.

Acceptance: one controlled due monitor produces a saved analysis, expected alert and advanced schedule; a failing run is observable and retryable; overlapping workers do not duplicate work. Dashboard notifications alone must not imply email notifications are implemented.

### 6. Make failures, persistence and recovery trustworthy

- Failed analyses after placeholder insertion consume quota and leave empty records (`analyze-product/index.ts:224`; `subscription.ts:34`). Track lifecycle status and count successful/reserved usage deliberately.
- Inserts/updates in analysis, collection and classification ignore returned database errors. A result can be labeled saved even when persistence failed.
- Cached reanalysis does not persist a new result, while Dashboard can keep a stale saved/share ID (`Dashboard.tsx:222`).
- `src/lib/api/analyze.ts:28` reads a nonexistent SDK `error.status` instead of the response in `error.context`, losing useful server error messages.
- `src/pages/Auth.tsx:51,73`: password recovery sets a guard that is never cleared after a successful reset; reset form also requires an irrelevant blank email field.
- Google/GitHub providers are disabled while their buttons are visible. Configure and test them or remove them from the initial launch.

### 7. Make deployment/database setup reproducible

- Historical local migration names differ from the hosted ledger; the migration folder lacks initial table creation. Reconcile a baseline before automated `db push`.
- `migration/schema.sql:247` refers to `public.handle_new_user`, although this fresh-install script creates `private.handle_new_user`. This was introduced by the preceding deployment repair and must be corrected before a fresh setup.
- The fresh schema uses restrictive child foreign keys, while hosted metadata confirms cascading deletes. This is **snapshot drift**, not a confirmed live deletion failure; live synthetic deletes passed.
- Supabase deploy workflow runs separately from CI and uses CLI `latest`; make deploys dependent on validation and a reproducible tool version.

## Recommended implementation order

1. Establish a nonbilling test-access path; repair Dashboard initialization/default sources and supply/verify the AI configuration.
2. Fix tenant isolation and private-feedback transport before adding real customer data.
3. Narrow launch connectors to those with verified product identity and evidence; fix App Store IDs, relevance filtering and error states. Defer unsupported sources.
4. Remove fabricated fallback metrics; validate/provenance-link results and reliably persist successful runs.
5. Repair monitoring credentials, lifecycle/error handling and session initialization.
6. Exercise ordinary email onboarding/recovery; configure or hide OAuth; reconcile database setup and deployment checks.

## Release acceptance checks

- Real browser sign-in → ordinary analysis form → completed result → history → reload.
- At least one structured review source and one discussion source return relevant, independently inspectable evidence.
- Selected sources/website/custom input remain intact; cached and fresh runs are isolated by customer.
- Missing credentials, 429, timeout, no data and database failure produce honest actionable states.
- Counts, quotes and charts can be traced to actual collected records; no invented timeline.
- Private results stay private; public sharing/revocation and deletion work with real child records.
- Reanalysis updates the saved/share target correctly.
- A controlled scheduled monitor completes, alerts, advances its schedule and does not duplicate work.
- Ordinary signup, verification, recovery and supported OAuth flows work on the production domain.
- Tests cover these failures, rather than relying exclusively on immediately loaded mocked hooks.

## Relevant API references

- Polymarket data formats: https://docs.polymarket.com/market-data/overview
- Polymarket search: https://docs.polymarket.com/api-reference/search/search-markets-events-and-profiles
- ScrapeCreators TikTok search: https://scrapecreators.com/tiktok/endpoints/search-by-keyword
- ScrapeCreators X capability: https://scrapecreators.com/blog/best-twitter-scrapers
- Firecrawl v1 search: https://docs.firecrawl.dev/api-reference/v1-endpoint/search
- GitHub rate limits: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api

## Limits of this review

No successful real AI analysis, paid-connector request, email-delivery flow or monitoring cycle was verified. Provider-level availability cannot be inferred from installed code or passing unit tests. The two production analysis failures prevent claiming end-to-end product readiness. This report distinguishes live failures, local reproductions and static risks accordingly.
