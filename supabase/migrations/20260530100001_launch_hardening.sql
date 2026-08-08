-- Launch hardening: restrict service UPDATE policies and enforce monitor plan limits

-- feedback_items: replace permissive public UPDATE with service_role only
DROP POLICY IF EXISTS "Service can update feedback" ON public.feedback_items;

CREATE POLICY "Service role can update feedback"
  ON public.feedback_items
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- monitored_products: replace permissive UPDATE with service_role only
DROP POLICY IF EXISTS "Service can update monitored products" ON public.monitored_products;

CREATE POLICY "Service role can update monitored products"
  ON public.monitored_products
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Server-side monitor plan limits on insert
CREATE OR REPLACE FUNCTION public.check_monitor_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan text;
  sub_status text;
  max_monitors int;
  current_count int;
BEGIN
  SELECT plan, subscription_status INTO user_plan, sub_status
  FROM public.profiles
  WHERE id = NEW.user_id;

  IF sub_status IS NULL OR sub_status NOT IN ('active', 'trialing') OR user_plan IS NULL THEN
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

  SELECT COUNT(*)::int INTO current_count
  FROM public.monitored_products
  WHERE user_id = NEW.user_id;

  IF current_count >= max_monitors THEN
    RAISE EXCEPTION 'Monitor limit reached (% products on % plan).', max_monitors, user_plan;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_monitor_limit ON public.monitored_products;

CREATE TRIGGER enforce_monitor_limit
  BEFORE INSERT ON public.monitored_products
  FOR EACH ROW
  EXECUTE FUNCTION public.check_monitor_limit();
