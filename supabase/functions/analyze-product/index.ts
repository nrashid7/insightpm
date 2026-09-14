import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { validateAnalyzeInput, ValidationError } from '../_shared/validation.ts';
import { checkDbRateLimit } from '../_shared/db-rate-limit.ts';
import { runAnalysis, NoEvidenceError } from '../_shared/analyze-engine.ts';

serve(async req => {
  const cors = handleCors(req);
  if (cors) return cors;
  const headers = { ...getCorsHeaders(req), 'Content-Type': 'application/json' };
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (req.method !== 'POST') return reply({ error: 'Use POST for analyses.' }, 405);
  try {
    const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return reply({ error: 'Sign in to run an analysis.' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user }, error: authError } = await auth.auth.getUser(token);
    if (authError || !user) return reply({ error: 'Your session expired. Please sign in again.' }, 401);
    let body: unknown;
    try { body = await req.json(); } catch { return reply({ error: 'Invalid JSON request.' }, 400); }
    const input = validateAnalyzeInput(body);
    const supabase = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const rate = await checkDbRateLimit(supabase, `analysis:${user.id}`, { maxRequests: 5, windowMs: 60_000 });
    if (!rate.allowed) return new Response(JSON.stringify({ error: 'Too many requests. Please try again shortly.' }), {
      status: 429, headers: { ...headers, 'Retry-After': String(Math.ceil(rate.retryAfterMs / 1000)) },
    });
    return reply(await runAnalysis(input, { supabase, userId: user.id }));
  } catch (error) {
    if (error instanceof ValidationError) return reply({ error: error.message }, 400);
    if (error instanceof NoEvidenceError) return reply({ error: error.message, sourceBreakdown: error.sourceBreakdown }, 422);
    const message = error instanceof Error ? error.message : '';
    if (message.startsWith('No evidence')) return reply({ error: message }, 422);
    if (message.startsWith('Monthly analysis limit')) return reply({ error: message }, 429);
    console.error('Analysis failed', error instanceof Error ? error.name : 'UnknownError');
    return reply({ error: 'The analysis could not complete. Please retry.' }, 500);
  }
});
