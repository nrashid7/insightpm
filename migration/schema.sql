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
    analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
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
    analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE,
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
    product_id UUID NOT NULL REFERENCES public.monitored_products(id) ON DELETE CASCADE,
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

-- Match the deployed signup-trigger permissions.
ALTER FUNCTION private.handle_new_user() SET search_path = '';
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION private.handle_new_user() TO service_role;
-- Completed results alone consume the manual beta allowance. Service-only RPC
-- serializes per owner so simultaneous requests cannot exceed the limit.
CREATE OR REPLACE FUNCTION public.save_completed_analysis(
  p_user_id uuid, p_product_name text, p_website text, p_competitors text,
  p_results jsonb, p_enforce_quota boolean DEFAULT true, p_limit integer DEFAULT 5
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid; v_count integer;
BEGIN
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Analysis owner does not exist';
  END IF;
  IF p_results IS NULL OR jsonb_typeof(p_results) <> 'object' OR p_results = '{}'::jsonb THEN
    RAISE EXCEPTION 'Completed analysis results are required';
  END IF;
  IF p_limit < 1 OR p_limit > 10000 THEN RAISE EXCEPTION 'Invalid analysis limit'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  IF p_enforce_quota THEN
    SELECT count(*) INTO v_count FROM public.analyses
    WHERE user_id = p_user_id
      AND created_at >= date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
      AND results IS NOT NULL AND results <> '{}'::jsonb
      AND COALESCE(results->>'runType', 'manual') <> 'monitoring';
    IF v_count >= p_limit THEN RAISE EXCEPTION 'Monthly analysis limit reached (%)', p_limit; END IF;
  END IF;
  INSERT INTO public.analyses(user_id, product_name, website, competitors, results)
    VALUES(p_user_id, p_product_name, p_website, p_competitors, p_results)
    RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_completed_analysis(uuid,text,text,text,jsonb,boolean,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_completed_analysis(uuid,text,text,text,jsonb,boolean,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(p_key text, p_max integer, p_window_ms integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_count integer; v_reset timestamptz;
BEGIN
  IF p_max < 1 OR p_window_ms < 1 OR length(p_key) > 300 THEN RAISE EXCEPTION 'Invalid rate limit'; END IF;
  INSERT INTO public.rate_limit_buckets AS buckets(bucket_key, request_count, reset_at)
  VALUES(p_key, 1, clock_timestamp() + p_window_ms * interval '1 millisecond')
  ON CONFLICT(bucket_key) DO UPDATE SET
    request_count = CASE WHEN buckets.reset_at <= clock_timestamp() THEN 1 ELSE LEAST(buckets.request_count + 1, p_max + 1) END,
    reset_at = CASE WHEN buckets.reset_at <= clock_timestamp() THEN clock_timestamp() + p_window_ms * interval '1 millisecond' ELSE buckets.reset_at END
  RETURNING request_count, reset_at INTO v_count, v_reset;
  RETURN jsonb_build_object('allowed', v_count <= p_max, 'remaining', GREATEST(0,p_max-v_count),
    'retryAfterMs', CASE WHEN v_count <= p_max THEN 0 ELSE GREATEST(0,ceil(extract(epoch FROM (v_reset-clock_timestamp()))*1000)) END);
END;
$$;
REVOKE ALL ON FUNCTION public.consume_rate_limit(text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text,integer,integer) TO service_role;

ALTER TABLE public.monitored_products
  ADD COLUMN IF NOT EXISTS lease_token uuid,
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS run_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS consecutive_failures integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_analysis_id uuid REFERENCES public.analyses(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION private.check_monitor_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 1));
  IF (SELECT count(*) FROM public.monitored_products WHERE user_id=NEW.user_id) >= 5 THEN
    RAISE EXCEPTION 'Monitor limit reached (5 products during beta).';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_monitoring_products(p_batch_size integer DEFAULT 2)
RETURNS SETOF public.monitored_products LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT id FROM public.monitored_products
    WHERE is_active AND (next_run_at IS NULL OR next_run_at <= now())
      AND (lease_expires_at IS NULL OR lease_expires_at <= now())
    ORDER BY next_run_at NULLS FIRST, created_at
    LIMIT GREATEST(1, LEAST(p_batch_size, 3)) FOR UPDATE SKIP LOCKED
  )
  UPDATE public.monitored_products AS p SET lease_token=gen_random_uuid(),
    lease_expires_at=now()+interval '10 minutes', run_status='running'
  FROM due WHERE p.id=due.id RETURNING p.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_monitoring_product(p_product_id uuid, p_lease_token uuid, p_analysis_id uuid, p_alerts jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_product public.monitored_products; v_alert jsonb;
BEGIN
  SELECT * INTO v_product FROM public.monitored_products WHERE id=p_product_id FOR UPDATE;
  IF NOT FOUND OR v_product.lease_token IS DISTINCT FROM p_lease_token OR p_lease_token IS NULL OR v_product.lease_expires_at <= now() THEN
    RAISE EXCEPTION 'Invalid or expired monitoring lease';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.analyses WHERE id=p_analysis_id AND user_id=v_product.user_id AND product_name=v_product.product_name) THEN
    RAISE EXCEPTION 'Saved analysis does not belong to monitor';
  END IF;
  FOR v_alert IN SELECT value FROM jsonb_array_elements(COALESCE(p_alerts,'[]'::jsonb)) LOOP
    INSERT INTO public.monitoring_alerts(user_id,product_id,alert_type,message,data)
    VALUES(v_product.user_id,p_product_id,v_alert->>'alert_type',v_alert->>'message',COALESCE(v_alert->'data','{}'::jsonb));
  END LOOP;
  UPDATE public.monitored_products SET last_run_at=now(),
    next_run_at=now()+CASE WHEN frequency='weekly' THEN interval '7 days' ELSE interval '1 day' END,
    lease_token=NULL, lease_expires_at=NULL, run_status='succeeded', last_error=NULL,
    consecutive_failures=0, last_analysis_id=p_analysis_id WHERE id=p_product_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_monitoring_product(p_product_id uuid, p_lease_token uuid, p_error text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.monitored_products SET run_status='failed', last_error=left(p_error,1000),
    consecutive_failures=consecutive_failures+1,
    next_run_at=now()+LEAST(24, power(2, LEAST(consecutive_failures,5))) * interval '1 hour',
    lease_token=NULL, lease_expires_at=NULL
  WHERE id=p_product_id AND lease_token=p_lease_token AND p_lease_token IS NOT NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid monitoring lease'; END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_monitoring_products(integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.complete_monitoring_product(uuid,uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.fail_monitoring_product(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_monitoring_products(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_monitoring_product(uuid,uuid,uuid,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_monitoring_product(uuid,uuid,text) TO service_role;
REVOKE UPDATE, INSERT ON public.monitored_products FROM authenticated;
GRANT INSERT(user_id,product_name,website,competitors,frequency,sources,is_active,next_run_at) ON public.monitored_products TO authenticated;
GRANT UPDATE(product_name,website,competitors,frequency,sources,is_active) ON public.monitored_products TO authenticated;
REVOKE UPDATE ON public.monitoring_alerts FROM authenticated;
GRANT UPDATE(is_read) ON public.monitoring_alerts TO authenticated;
