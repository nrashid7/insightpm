import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders, handleCors } from '../_shared/cors.ts';

serve(async req => {
  const cors = handleCors(req);
  if (cors) return cors;
  const configured = (key: string) => Boolean(Deno.env.get(key)?.trim());
  const capability = (id: string, available: boolean, reason = 'Provider credentials are not configured') => ({ id, available, ...(available ? {} : { reason }) });
  let auth = { google: false, github: false };
  try {
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/settings`, {
      headers: { apikey: Deno.env.get('SUPABASE_ANON_KEY') || '' }, signal: AbortSignal.timeout(5000),
    });
    if (response.ok) { const settings = await response.json(); auth = { google: settings.external?.google === true, github: settings.external?.github === true }; }
  } catch { /* Keep unavailable OAuth providers hidden. */ }
  return new Response(JSON.stringify({
    billingEnabled: Deno.env.get('BILLING_ENABLED') === 'true',
    analysisMode: configured('OPENROUTER_API_KEY') ? 'ai' : 'evidence', auth,
    feedbackSources: [
      ...['custom', 'hackernews', 'github', 'stackoverflow', 'appstore', 'reddit'].map(id => capability(id, true)),
      capability('youtube', configured('YOUTUBE_API_KEY')),
      ...['web', 'trustpilot', 'googleplay'].map(id => capability(id, configured('FIRECRAWL_API_KEY'))),
    ],
    marketSources: [
      ...['polymarket', 'hackernews', 'github', 'reddit_top'].map(id => capability(id, true)),
      capability('youtube', configured('YOUTUBE_API_KEY')),
      capability('tiktok', configured('SCRAPECREATORS_API_KEY')),
      capability('x', false, 'No supported hosted X integration'),
      capability('perplexity', false, 'No supported hosted Perplexity integration'),
    ],
  }), { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
});
