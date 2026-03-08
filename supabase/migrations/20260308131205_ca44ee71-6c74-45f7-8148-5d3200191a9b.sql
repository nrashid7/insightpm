DROP POLICY IF EXISTS "Anyone can view public analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can delete own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can insert own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can update own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can view own analyses" ON public.analyses;

CREATE POLICY "Users can view own analyses"
ON public.analyses FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public analyses"
ON public.analyses FOR SELECT TO anon, authenticated
USING (is_public = true);

CREATE POLICY "Users can insert own analyses"
ON public.analyses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses"
ON public.analyses FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
ON public.analyses FOR DELETE TO authenticated
USING (auth.uid() = user_id);