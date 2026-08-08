const ALLOWED_ORIGINS = [
  "https://insightpm.app",
  "https://www.insightpm.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Vercel preview deployments
  if (/^https:\/\/insightpm(-[a-z0-9-]+)?\.vercel\.app$/.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+-taylorcorp\.vercel\.app$/.test(origin)) return true;
  return false;
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-internal-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}
