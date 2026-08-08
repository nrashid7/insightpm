const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitMap) {
    if (entry.resetAt < now) rateLimitMap.delete(key);
  }
}

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

export function checkRateLimit(
  identifier: string,
  opts: RateLimitOptions = { maxRequests: 10, windowMs: 60_000 }
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  cleanup();
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + opts.windowMs });
    return { allowed: true, remaining: opts.maxRequests - 1, retryAfterMs: 0 };
  }

  entry.count++;
  if (entry.count > opts.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: entry.resetAt - now,
    };
  }

  return { allowed: true, remaining: opts.maxRequests - entry.count, retryAfterMs: 0 };
}

export function getRateLimitKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").slice(-16);
  return token ? `user:${token}` : `ip:${ip}`;
}
