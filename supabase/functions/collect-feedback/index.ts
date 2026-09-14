import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { UnauthorizedError, verifyInternalSecret } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey } from "../_shared/rate-limit.ts";
import { validateAnalyzeInput, validateCollectInput, ValidationError } from "../_shared/validation.ts";
import { collectFeedback } from "../_shared/feedback-collector.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;
  const headers = { ...getCorsHeaders(req), "Content-Type": "application/json" };
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  try {
    verifyInternalSecret(req);
    if (!checkRateLimit(getRateLimitKey(req)).allowed) return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers });
    const body = await req.json();
    const { analysisId } = validateCollectInput(body);
    const input = validateAnalyzeInput(body);
    const result = await collectFeedback(input);
    if (analysisId && result.items.length) {
      const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      // Legacy internal callers may attach evidence to an existing analysis.
      // Stable external IDs belong in metadata; feedback_items.id is a database UUID.
      const rows = result.items.map(({ id, ...item }) => ({ ...item, analysis_id: analysisId, metadata: { ...item.metadata, evidence_id: id } }));
      const { error } = await db.from("feedback_items").insert(rows);
      if (error) throw new Error("Could not persist collected evidence");
      const { error: sourceError } = await db.from("analysis_sources").insert(result.sourceBreakdown.map(source => ({
        analysis_id: analysisId, source: source.source,
        status: source.status === 'success' ? 'success' : source.status === 'empty' ? 'skipped' : 'failed',
        items_count: source.count, error_message: source.error || null, duration_ms: source.duration_ms,
      })));
      if (sourceError) throw new Error("Could not persist source diagnostics");
    }
    return new Response(JSON.stringify(result), { headers });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : error instanceof ValidationError || error instanceof SyntaxError ? 400 : 500;
    return new Response(JSON.stringify({ error: status === 500 ? "Feedback collection failed" : error instanceof Error ? error.message : "Invalid request" }), { status, headers });
  }
});
