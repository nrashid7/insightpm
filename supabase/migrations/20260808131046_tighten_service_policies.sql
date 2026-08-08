-- Restrict backend-only operations and isolate privileged trigger code.

-- Subscription entitlements are Stripe-controlled and must never be user-writable.
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;

-- The auth.users trigger needs this function, but API roles must not invoke it.
ALTER FUNCTION public.handle_new_user() SET search_path = '';
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

DROP POLICY IF EXISTS "Service can insert analysis sources" ON public.analysis_sources;
CREATE POLICY "Service role can insert analysis sources"
  ON public.analysis_sources
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service can insert feedback" ON public.feedback_items;
CREATE POLICY "Service role can insert feedback"
  ON public.feedback_items
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service can insert alerts" ON public.monitoring_alerts;
CREATE POLICY "Service role can insert alerts"
  ON public.monitoring_alerts
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service can select monitored products" ON public.monitored_products;
CREATE POLICY "Service role can select monitored products"
  ON public.monitored_products
  FOR SELECT
  TO service_role
  USING (true);

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

DROP TRIGGER IF EXISTS enforce_monitor_limit ON public.monitored_products;
DROP FUNCTION IF EXISTS public.check_monitor_limit();

CREATE OR REPLACE FUNCTION private.check_monitor_limit()
RETURNS TRIGGER
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
  -- Serialize inserts for one user so concurrent requests cannot exceed the cap.
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
