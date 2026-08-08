-- InsightPM Database Schema (fresh-install snapshot)
-- Existing environments should use: supabase db push (see supabase/migrations/)

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

-- ============================================
-- TABLE: profiles
-- ============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan TEXT CHECK (plan IN ('starter', 'growth', 'enterprise')),
    subscription_status TEXT,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_profiles_stripe_customer ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- ============================================
-- TABLE: analyses
-- ============================================
CREATE TABLE public.analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_name TEXT NOT NULL,
    website TEXT,
    competitors TEXT,
    results JSONB NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses" ON public.analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analyses" ON public.analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own analyses" ON public.analyses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own analyses" ON public.analyses FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view public analyses" ON public.analyses FOR SELECT TO anon, authenticated USING (is_public = true);

-- ============================================
-- TABLE: analysis_sources
-- ============================================
CREATE TABLE public.analysis_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES public.analyses(id),
    source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    items_count INTEGER DEFAULT 0,
    error_message TEXT,
    duration_ms INTEGER
);
ALTER TABLE public.analysis_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analysis sources" ON public.analysis_sources FOR SELECT TO authenticated
  USING (analysis_id IN (SELECT id FROM public.analyses WHERE user_id = auth.uid()));
CREATE POLICY "Anyone can view public analysis sources" ON public.analysis_sources FOR SELECT TO anon, authenticated
  USING (analysis_id IN (SELECT id FROM public.analyses WHERE is_public = true));
CREATE POLICY "Service role can insert analysis sources" ON public.analysis_sources
  FOR INSERT TO service_role WITH CHECK (true);

-- ============================================
-- TABLE: feedback_items
-- ============================================
CREATE TABLE public.feedback_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID REFERENCES public.analyses(id),
    product_name TEXT NOT NULL,
    source TEXT NOT NULL,
    title TEXT,
    text TEXT NOT NULL,
    rating SMALLINT,
    sentiment TEXT,
    cluster TEXT,
    url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    source_timestamp TIMESTAMPTZ,
    quality_score SMALLINT,
    classified_at TIMESTAMPTZ
);
ALTER TABLE public.feedback_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback" ON public.feedback_items FOR SELECT TO authenticated
  USING (analysis_id IN (SELECT id FROM public.analyses WHERE user_id = auth.uid()));
CREATE POLICY "Anyone can view public feedback" ON public.feedback_items FOR SELECT TO anon, authenticated
  USING (analysis_id IN (SELECT id FROM public.analyses WHERE is_public = true));
CREATE POLICY "Service role can insert feedback" ON public.feedback_items
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update feedback" ON public.feedback_items
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- TABLE: monitored_products
-- ============================================
CREATE TABLE public.monitored_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_name TEXT NOT NULL,
    website TEXT,
    competitors TEXT,
    frequency TEXT NOT NULL DEFAULT 'daily',
    sources JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.monitored_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own monitored products" ON public.monitored_products
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own monitored products" ON public.monitored_products
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own monitored products" ON public.monitored_products
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own monitored products" ON public.monitored_products
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role can select monitored products" ON public.monitored_products
  FOR SELECT TO service_role USING (true);
CREATE POLICY "Service role can update monitored products" ON public.monitored_products
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- TABLE: monitoring_alerts
-- ============================================
CREATE TABLE public.monitoring_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_id UUID NOT NULL REFERENCES public.monitored_products(id),
    alert_type TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts" ON public.monitoring_alerts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own alerts" ON public.monitoring_alerts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role can insert alerts" ON public.monitoring_alerts
  FOR INSERT TO service_role WITH CHECK (true);

-- ============================================
-- TABLE: rate_limit_buckets
-- ============================================
CREATE TABLE public.rate_limit_buckets (
    bucket_key TEXT PRIMARY KEY,
    request_count INTEGER NOT NULL DEFAULT 0,
    reset_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages rate limits" ON public.rate_limit_buckets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Enforce subscription monitor limits in the database.
CREATE OR REPLACE FUNCTION private.check_monitor_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_plan text;
  sub_status text;
  max_monitors int;
  current_count int;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(NEW.user_id::text, 0)
  );

  SELECT plan, subscription_status
    INTO user_plan, sub_status
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF sub_status IS NULL
    OR sub_status NOT IN ('active', 'trialing')
    OR user_plan IS NULL
  THEN
    RAISE EXCEPTION 'An active subscription is required to use monitoring.';
  END IF;

  max_monitors := CASE user_plan
    WHEN 'starter' THEN 0
    WHEN 'growth' THEN 5
    WHEN 'enterprise' THEN 999
    ELSE 0
  END;

  IF max_monitors = 0 THEN
    RAISE EXCEPTION 'Monitoring requires a Growth or Enterprise plan.';
  END IF;

  SELECT COUNT(*)::int
    INTO current_count
  FROM public.monitored_products
  WHERE user_id = NEW.user_id;

  IF current_count >= max_monitors THEN
    RAISE EXCEPTION
      'Monitor limit reached (% products on % plan).',
      max_monitors,
      user_plan;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.check_monitor_limit() FROM PUBLIC;

CREATE TRIGGER enforce_monitor_limit
  BEFORE INSERT ON public.monitored_products
  FOR EACH ROW
  EXECUTE FUNCTION private.check_monitor_limit();
