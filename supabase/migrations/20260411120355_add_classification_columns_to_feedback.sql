ALTER TABLE public.feedback_items
  ADD COLUMN IF NOT EXISTS cluster text,
  ADD COLUMN IF NOT EXISTS quality_score smallint,
  ADD COLUMN IF NOT EXISTS classified_at timestamptz;

-- Allow service role to update feedback_items (for classify-feedback function)
CREATE POLICY "Service can update feedback"
  ON public.feedback_items
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
