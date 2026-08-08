-- Subscription billing fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS plan TEXT CHECK (plan IN ('starter', 'growth', 'enterprise')),
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Durable rate limit buckets (Edge Functions)
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- Only service role may read/write rate limits
CREATE POLICY "Service role manages rate limits"
  ON public.rate_limit_buckets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow users to read own subscription fields (already on profiles RLS)
-- Service role updates profiles via webhook (bypasses RLS)
