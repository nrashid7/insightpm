import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

export async function checkDbRateLimit(
  supabase: SupabaseClient,
  identifier: string,
  opts: RateLimitOptions = { maxRequests: 10, windowMs: 60_000 }
): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + opts.windowMs);

  const { data: existing } = await supabase
    .from("rate_limit_buckets")
    .select("request_count, reset_at")
    .eq("bucket_key", identifier)
    .maybeSingle();

  if (!existing || new Date(existing.reset_at) < now) {
    await supabase.from("rate_limit_buckets").upsert({
      bucket_key: identifier,
      request_count: 1,
      reset_at: resetAt.toISOString(),
    });
    return { allowed: true, remaining: opts.maxRequests - 1, retryAfterMs: 0 };
  }

  const newCount = existing.request_count + 1;
  if (newCount > opts.maxRequests) {
    const retryAfterMs = new Date(existing.reset_at).getTime() - now.getTime();
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  await supabase
    .from("rate_limit_buckets")
    .update({ request_count: newCount })
    .eq("bucket_key", identifier);

  return { allowed: true, remaining: opts.maxRequests - newCount, retryAfterMs: 0 };
}
