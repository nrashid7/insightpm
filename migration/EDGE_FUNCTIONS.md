# Edge Functions Configuration

> **Source of truth:** [`supabase/config.toml`](../supabase/config.toml) and function code under `supabase/functions/`. JWT settings below reflect production config.

## Auth model summary

| Function | verify_jwt | Caller |
|----------|------------|--------|
| analyze-product | true | Authenticated users (subscription enforced in handler) |
| stripe-checkout | true | Authenticated users |
| stripe-portal | true | Authenticated users |
| stripe-webhook | false | Stripe (signature verified) |
| collect-feedback | false | Internal (`x-internal-secret`) |
| classify-feedback | false | Internal (`x-internal-secret`) |
| collect-market-signals | false | Internal (`x-internal-secret`) |
| run-monitoring | false | Service role Bearer (pg_cron) |

## analyze-product
- **Purpose**: Main orchestrator pipeline
- **Flow**: collect-feedback → classify-feedback → collect-market-signals (optional) → AI analysis → persist
- **Input**: { productName, website?, competitors?, sources?, useCache?, customFeedback?, includeMarketSignals?, marketSignalSources? }
- **Output**: AnalysisResult JSON

## collect-feedback
- **Purpose**: Multi-source parallel scraper
- **Sources**: reddit, github, stackoverflow, hackernews, appstore, googleplay, youtube, trustpilot, web, custom

## classify-feedback
- **Purpose**: AI batch processor for sentiment & clustering
- **Model**: Gemini via Lovable AI Gateway

## collect-market-signals
- **Purpose**: Industry signals (Polymarket, Reddit/HN/GitHub/YouTube; TikTok/X via ScrapeCreators)
- **Plan-gated**: Growth and Enterprise only

## run-monitoring
- **Purpose**: Scheduled re-analysis for monitored products
- **Trigger**: Hourly via pg_cron
- **Generates**: monitoring_alerts for anomalies

## Stripe functions
- **stripe-checkout**: Creates Checkout session for Starter/Growth/Enterprise
- **stripe-portal**: Billing portal session
- **stripe-webhook**: Syncs `profiles.plan` and subscription status from Stripe events
