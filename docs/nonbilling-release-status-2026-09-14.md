# Nonbilling release verification

This supersedes the failure observations in the initial launch-readiness review where explicitly verified below. It does not certify an unrestricted public launch.

## Verified

- GitHub PR #1 merged. Main commit `5932ed34a1d68a78d11c1442c6da376d1d113f81` passed CI (lint, type check, tests, build).
- Vercel production deployment `dpl_AcRP2d5E29GLzypUz4BK5Qh1hgqC` is READY and its Git source matches that main commit.
- Browser password sign-in, beta account access, pasted-feedback analysis, saved result, and history work on production. Three synthetic items produced three evidence records, one literal complaint and one literal request, without invented ratings.
- Private analysis reads, explicit public sharing, anonymous reads after opt-in, revocation, and fixture deletion passed live REST checks. Paused monitor creation/read/deletion passed.
- Public GitHub collection returned 29 React items. Separate Vue comparison returned 27 supporting items.
- Scheduled worker collected and saved 29 items, cleared its lease, and advanced its schedule. An empty-evidence run persisted a failure, cleared its lease, and scheduled retry. Audit monitors were then paused.
- Scheduler uses a dedicated Vault credential; an authenticated scheduler HTTP request returns 200. Empty analysis returns 422 with source diagnostics.
- Executable PostgreSQL tests cover manual quota, monitor cap, claims, stale leases, completion, failure, cascade deletion, and operational permissions.
- Production npm dependency audit reported zero vulnerabilities.
- Local migration versions were restored from Supabase's recorded statements to match the deployed migration ledger.

## Provider behavior

The current installation uses evidence mode because OpenRouter is not configured. Literal complaint/request extraction and star-rating measurements remain usable; AI interpretation is optional. Firecrawl, YouTube, and TikTok provider credentials are unavailable and their source options are disabled. X and Perplexity have no supported hosted integration and are explicitly unavailable. Free providers may still return partial data, rate limits, or no relevant matches.

The last30days reference informed recent-window collection, provenance, relevance, deduplication and source-health behavior. Its desktop cookie/credential integrations are not executed. Attribution is in THIRD_PARTY_NOTICES.md.

## Remaining release gates

- GitHub Actions has no repository secrets. Automatic Supabase deployment fails at project linking. Configure a valid SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF, then rerun deployment and verify it. Manual MCP deployment has succeeded; this does not prove the automated path.
- Public signup confirmation-email delivery and email recovery delivery are unverified. The audit account was an explicitly authorized administrative fixture; its successful password login does not establish mail delivery. Recovery UI regressions are tested.
- Optional provider credentials cannot be fabricated. Live paid-provider results and AI output require their configuration and follow-up verification.
- The full product objective remains open until the remaining external setup and verification gates are resolved.

Billing is intentionally excluded. Do not describe the beta allowance as a paid subscription.

## Follow-up live source verification

Production analyze-product version 11 collected 52 dated Notion items: GitHub 23, Hacker News 6, App Store 23. Stack Overflow returned no matching recent Notion questions. Separate live local React collection returned 21 Stack Overflow questions, 33 Hacker News items, and 29 GitHub issues. Polymarket responded from production with no matching Notion markets. Reddit returned HTTP 403 both locally and in production; capabilities now disable Reddit pending an authorized integration. Fixed market ranking to preserve each provider's actual points/reactions/upvotes/likes, with a regression test. Monitoring version 7 includes the same updated shared engine.

Supabase dashboard access-token page redirected back to sign-in before token creation. The connected management tools support deployment but do not expose access-token creation. GitHub Actions deployment credentials remain unresolved; manual connected deployments work.
