
-- Monitored products table
CREATE TABLE public.monitored_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  website text,
  competitors text,
  sources jsonb DEFAULT '[]'::jsonb,
  frequency text NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  last_run_at timestamptz,
  next_run_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Monitoring alerts table
CREATE TABLE public.monitoring_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.monitored_products(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.monitored_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for monitored_products
CREATE POLICY "Users can view own monitored products"
  ON public.monitored_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monitored products"
  ON public.monitored_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monitored products"
  ON public.monitored_products FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own monitored products"
  ON public.monitored_products FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for monitoring_alerts
CREATE POLICY "Users can view own alerts"
  ON public.monitoring_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON public.monitoring_alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- Service can insert alerts (for the monitoring edge function)
CREATE POLICY "Service can insert alerts"
  ON public.monitoring_alerts FOR INSERT
  WITH CHECK (true);

-- Service can select monitored products for processing
CREATE POLICY "Service can select monitored products"
  ON public.monitored_products FOR SELECT
  USING (true);

CREATE POLICY "Service can update monitored products"
  ON public.monitored_products FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Index for efficient next_run_at queries
CREATE INDEX idx_monitored_products_next_run ON public.monitored_products(next_run_at) WHERE is_active = true;
