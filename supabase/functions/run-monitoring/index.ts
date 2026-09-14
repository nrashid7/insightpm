import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { UnauthorizedError, verifyMonitoringRequest } from '../_shared/auth.ts';
import { processMonitoringBatch } from '../_shared/monitoring-worker.ts';
import { runAnalysis } from '../_shared/analyze-engine.ts';

serve(async req => {
  const cors = handleCors(req);
  if (cors) return cors;
  const headers = { ...getCorsHeaders(req), 'Content-Type': 'application/json' };
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Use POST' }), { status: 405, headers });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    try { verifyMonitoringRequest(req); }
    catch {
      const token = req.headers.get('x-monitoring-secret');
      if (!token || token.length < 32 || token.length > 256) throw new UnauthorizedError('Unauthorized');
      const { data, error } = await supabase.rpc('verify_monitoring_token', { p_token: token });
      if (error || data !== true) throw new UnauthorizedError('Unauthorized');
    }
    const result = await processMonitoringBatch(supabase, product => runAnalysis({
      productName: product.product_name, website: product.website || undefined,
      competitors: product.competitors || undefined,
      sources: product.sources?.length ? product.sources : undefined, days: 30,
    }, { supabase, userId: product.user_id, monitoring: true }));
    return new Response(JSON.stringify(result), { status: result.failed ? 207 : 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof UnauthorizedError ? 'Unauthorized' : 'Monitoring could not complete' }), {
      status: error instanceof UnauthorizedError ? 401 : 500, headers,
    });
  }
});
