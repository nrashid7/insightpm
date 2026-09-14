-- feedback_items table
CREATE TABLE public.feedback_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name text NOT NULL,
  source text NOT NULL,
  title text,
  text text NOT NULL,
  rating smallint,
  sentiment text,
  url text,
  metadata jsonb DEFAULT '{}',
  collected_at timestamptz NOT NULL DEFAULT now(),
  source_timestamp timestamptz,
  analysis_id uuid REFERENCES public.analyses(id) ON DELETE CASCADE
);

CREATE INDEX idx_feedback_items_product ON public.feedback_items(product_name);
CREATE INDEX idx_feedback_items_analysis ON public.feedback_items(analysis_id);

ALTER TABLE public.feedback_items ENABLE ROW LEVEL SECURITY;

-- Users can read feedback linked to their analyses
CREATE POLICY "Users can view own feedback"
ON public.feedback_items FOR SELECT TO authenticated
USING (
  analysis_id IN (SELECT id FROM public.analyses WHERE user_id = auth.uid())
);

-- Users can view feedback for public analyses
CREATE POLICY "Anyone can view public feedback"
ON public.feedback_items FOR SELECT TO anon, authenticated
USING (
  analysis_id IN (SELECT id FROM public.analyses WHERE is_public = true)
);

-- Service role inserts (edge functions use service role)
CREATE POLICY "Service can insert feedback"
ON public.feedback_items FOR INSERT TO authenticated
WITH CHECK (true);

-- analysis_sources table
CREATE TABLE public.analysis_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  source text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  items_count integer DEFAULT 0,
  error_message text,
  duration_ms integer
);

ALTER TABLE public.analysis_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analysis sources"
ON public.analysis_sources FOR SELECT TO authenticated
USING (
  analysis_id IN (SELECT id FROM public.analyses WHERE user_id = auth.uid())
);

CREATE POLICY "Anyone can view public analysis sources"
ON public.analysis_sources FOR SELECT TO anon, authenticated
USING (
  analysis_id IN (SELECT id FROM public.analyses WHERE is_public = true)
);

CREATE POLICY "Service can insert analysis sources"
ON public.analysis_sources FOR INSERT TO authenticated
WITH CHECK (true);
