ALTER TABLE public.analyses ADD COLUMN is_public boolean NOT NULL DEFAULT false;

CREATE POLICY "Anyone can view public analyses"
ON public.analyses
FOR SELECT
TO anon, authenticated
USING (is_public = true);

CREATE POLICY "Users can update own analyses"
ON public.analyses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);