import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { UnauthorizedError, verifyInternalSecret } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey } from "../_shared/rate-limit.ts";
import { validateMarketSignalsInput, ValidationError } from "../_shared/validation.ts";
import { collectMarketSignals } from "../_shared/market-collector.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  const headers = { ...getCorsHeaders(req), "Content-Type": "application/json" };
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  try {
    verifyInternalSecret(req);
    const limit = checkRateLimit(getRateLimitKey(req));
    if (!limit.allowed) return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers });
    const body = await req.json();
    const input = validateMarketSignalsInput(body);
    if (body.days !== undefined && (!Number.isInteger(body.days) || body.days < 1 || body.days > 90)) throw new ValidationError("days must be an integer between 1 and 90");
    const result = await collectMarketSignals({ ...input, days: body.days });
    return new Response(JSON.stringify(result), { headers });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ValidationError || error instanceof SyntaxError ? 400 : 500;
    return new Response(JSON.stringify({ error: status === 500 ? "Market collection failed" : error instanceof Error ? error.message : "Invalid request" }), { status, headers });
  }
});
