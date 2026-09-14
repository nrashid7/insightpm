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
