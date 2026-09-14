# InsightPM nonbilling completion

Authority: user approved completing the product and fixing the readiness report, excluding billing, and adapting useful last30days-skill behavior. Continue autonomously; do not add design approval gates.

## Product contract

- Signed-in beta users can analyze and monitor without Stripe. Billing remains opt-in behind BILLING_ENABLED/VITE_BILLING_ENABLED=true. Beta limits: 5 successful analyses/month, 5 monitored products.
- Research defaults to a 30-day window. Preserve original timestamps, evidence IDs, URLs, source statuses, deduplicated counts and source-specific engagement. Unknown dates are disclosed, not invented.
- An unavailable provider is unavailable, not empty/success. Unsupported sources are disabled with a reason. No desktop browser-cookie extraction in the hosted product.
- No invented metrics, quotations, competitors or trends. With no AI credentials, deterministic extractive analysis of real evidence remains usable and is labeled as such. Optional model synthesis must use cited evidence and never supply measured totals.
- Private data stays out of URLs; every privileged read is scoped by user. Persist only completed analyses and retain a correct saved/share ID.
- No customer credentials in repository or logs. All code changes need regression tests and full integration verification before production promotion.

## Parallel work boundaries

1. Frontend: owns src/ except parent-owned src/lib/types/analysis.ts; tests under src/test/pages, hooks, components, and api/analyze tests. Fix async initialization, nonbilling access, input transport, source capability UI, recovery, honest evidence rendering, saved/share transitions. Coordinate model with parent.
2. Collectors: owns collect-feedback, collect-market-signals and new shared collector/research helper files. Must expose shared callable collector functions so core can run them without internal HTTP secrets. Fix relevance, review IDs, dates, explicit errors, source capability status, bounded concurrency/requests. Adapt last30days as appropriate with attribution.
3. Monitoring/database: owns run-monitoring, new shared monitoring helpers, schema snapshot, new migrations and deployment workflow. Scope baselines, claim work, record failures, correct snapshots and beta monitor limits. Parent applies remote changes and provisions scheduler secret.
4. Parent: owns analyze-product, shared analysis/evidence/auth/validation/subscription/AI code, classification integration, types, runtime capability endpoint, service deployment and live tests.

## Shared interfaces

Collector core exported from `_shared/feedback-collector.ts`:
`collectFeedback(input: { productName: string; website?: string; competitors?: string; sources?: string[]; customFeedback?: string; days?: number }): Promise<{ items: FeedbackItem[]; sourceBreakdown: SourceStatus[]; corpus: string; totalItems: number; feedbackSamples: FeedbackItem[] }>`.
`FeedbackItem`: product_name, source, text, optional id/title/url/rating/source_timestamp/metadata. Stable id preferred; no user identifiers in external calls.
`SourceStatus`: source, count, status (`success|empty|failed|not_configured|unsupported`), optional error, duration_ms.
Market core exported from `_shared/market-collector.ts`: `collectMarketSignals({topic,sources?,days?})`; retains existing result shape with explicit statuses.

Analysis result retains existing required fields. Adds optional `analysisMode: 'evidence'|'ai'`, `evidence: [{id,source,text,title?,url?,timestamp?}]`, `warnings: string[]`, `researchWindow: {days,from,to}`, source status/error fields. Every complaint/feature can carry evidenceIds. Trend charts use actual dated records only. Empty evidence yields HTTP 422 with sourceBreakdown and a useful reason.

Capabilities endpoint `product-capabilities` (authenticated or public read-only; no secret values): `{billingEnabled,analysisMode,feedbackSources:[{id,available,reason?}],marketSources:[{id,available,reason?}],auth:{google,github}}`. Frontend defaults can work before fetch but unavailable sources must not be offered as configured.

Monitoring auth: accept a dedicated `MONITORING_SECRET` through x-monitoring-secret using constant-time verification; retain service-role auth for admin. Parent provisions a new random secret using MCP, stores only in Supabase Vault for cron. Worker forwards internal auth using its existing service-role/internal secret until replaced with a shared callable analysis engine. Parent coordinates any necessary signature changes.

## Verification sequence

- Regression tests first: default sources, asynchronously loaded access, private navigation payload, cache scoping, collector status/date/ID behavior, evidence totals, failed writes, monitor claims/retries, recovery.
- Source-quality probe: real public product, URLs and entity checks, date coverage, exact unique review count.
- Complete signed-in live analysis without AI key using actual evidence; save/history/share/revoke/delete; second synthetic user cannot read/cache first user's private input.
- Missing/invalid external provider gives explicit status; fake product produces insufficient-evidence, no invented result.
- Controlled monitor executes and advances once, failure recorded; cron HTTP result succeeds using current secret.
- Fresh schema and migration ledger reconciled, typecheck/lint/tests/build/audit, independent final review, GitHub and production revision match.

## Progress

- [x] Root-cause report and live reproductions completed.
- [x] Upstream reference cloned to ignored .vercel/last30days-reference for review; MIT license verified.
- [ ] Frontend completion.
- [ ] Collector completion.
- [ ] Core evidence/analysis completion.
- [ ] Monitoring/database completion.
- [ ] Live verification, independent review, deployment.
