import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
export interface RateLimitOptions { maxRequests: number; windowMs: number }
export async function checkDbRateLimit(supabase: SupabaseClient, identifier: string,
  opts: RateLimitOptions = { maxRequests: 10, windowMs: 60_000 }
): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }> {
  const { data, error } = await supabase.rpc('consume_rate_limit', {
    p_key: identifier, p_max: opts.maxRequests, p_window_ms: opts.windowMs,
  });
  if (error || typeof data?.allowed !== 'boolean') throw new Error('Rate limit verification unavailable');
  return data;
}
