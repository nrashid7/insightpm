import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { validateClassifyInput, ValidationError } from "../_shared/validation.ts";
import { UnauthorizedError, verifyInternalSecret } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey } from "../_shared/rate-limit.ts";
import { withRetry } from "../_shared/retry.ts";
import { initLogger, logger } from "../_shared/logger.ts";

serve(async (req) => {
  initLogger("classify-feedback", req);
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    verifyInternalSecret(req);

    const rateLimitKey = getRateLimitKey(req);
    const rateCheck = checkRateLimit(rateLimitKey, { maxRequests: 10, windowMs: 60_000 });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again shortly." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)) } }
      );
    }

    const body = await req.json();
    const { analysisId } = validateClassifyInput(body);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: items, error: fetchErr } = await supabase
      .from("feedback_items")
      .select("id, text, title, source, rating")
      .eq("analysis_id", analysisId)
      .is("classified_at", null);

    if (fetchErr) throw new Error(`Failed to fetch feedback: ${fetchErr.message}`);
    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ classified: 0, filtered: 0, clusters: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info("Starting classification", { analysisId, itemCount: items.length });

    // Step 1: Quality filtering
    const spamPatterns = /^(test|asdf|hello|hi|ok|nice|good|bad|yes|no|lol|wow|great|cool|thanks|thx|ty)$/i;
    const filtered: string[] = [];
    const validItems: typeof items = [];
    const seenTexts = new Set<string>();

    for (const item of items) {
      const text = (item.text || "").trim();
      const normalized = text.toLowerCase().replace(/\s+/g, " ");
      if (text.length < 30 || spamPatterns.test(normalized) || seenTexts.has(normalized)) {
        filtered.push(item.id);
        continue;
      }
      seenTexts.add(normalized);
      validItems.push(item);
    }

    // Mark filtered items in batch
    if (filtered.length > 0) {
      await supabase
        .from("feedback_items")
        .update({ sentiment: "filtered", quality_score: 0, classified_at: new Date().toISOString() })
        .in("id", filtered);
    }

    // Step 2: Batch classify valid items with AI
    const BATCH_SIZE = 30;
    const allClassifications: { id: string; sentiment: string; cluster: string; quality_score: number }[] = [];

    for (let i = 0; i < validItems.length; i += BATCH_SIZE) {
      const batch = validItems.slice(i, i + BATCH_SIZE);
      const batchInput = batch.map((item, idx) => ({
        idx,
        text: `${item.title ? item.title + ": " : ""}${item.text}`.slice(0, 500),
        source: item.source,
      }));

      try {
        const response = await withRetry(
          async () => {
            const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `You are a feedback classifier. For each feedback item, determine:
1. sentiment: one of "positive", "negative", "neutral", "feature_request", "bug", "pricing", "performance"
2. cluster: a short descriptive label (2-5 words) grouping similar feedback
3. quality: 1=low relevance, 2=medium, 3=high relevance to product feedback

Use the classify_feedback tool to return your classifications.`,
              },
              {
                role: "user",
                content: `Classify these ${batch.length} feedback items:\n\n${batchInput.map((b) => `[${b.idx}] (${b.source}) ${b.text}`).join("\n\n")}`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "classify_feedback",
                  description: "Return classifications for feedback items",
                  parameters: {
                    type: "object",
                    properties: {
                      items: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            idx: { type: "number" },
                            sentiment: {
                              type: "string",
                              enum: ["positive", "negative", "neutral", "feature_request", "bug", "pricing", "performance"],
                            },
                            cluster: { type: "string" },
                            quality: { type: "number", enum: [1, 2, 3] },
                          },
                          required: ["idx", "sentiment", "cluster", "quality"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["items"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "classify_feedback" } },
          }),
            });
            if (!res.ok && res.status >= 500) {
              throw new Error(`AI classification error: ${res.status}`);
            }
            return res;
          },
          { maxRetries: 1, baseDelayMs: 1000 }
        );

        if (!response.ok) {
          logger.error("AI classification batch failed", { status: response.status });
          continue;
        }

        const aiResponse = await response.json();
        const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall?.function?.arguments) continue;

        const parsed = JSON.parse(toolCall.function.arguments);
        for (const cls of parsed.items || []) {
          if (cls.idx >= 0 && cls.idx < batch.length) {
            allClassifications.push({
              id: batch[cls.idx].id,
              sentiment: cls.sentiment,
              cluster: cls.cluster,
              quality_score: cls.quality,
            });
          }
        }
      } catch (e) {
        logger.error("Classification batch error", { error: e instanceof Error ? e.message : String(e) });
      }
    }

    // Step 3: Batch update classified items grouped by sentiment+cluster
    const now = new Date().toISOString();
    const updateGroups = new Map<string, string[]>();
    const scoreMap = new Map<string, number>();

    for (const cls of allClassifications) {
      const key = `${cls.sentiment}|||${cls.cluster}|||${cls.quality_score}`;
      if (!updateGroups.has(key)) updateGroups.set(key, []);
      updateGroups.get(key)!.push(cls.id);
      scoreMap.set(cls.id, cls.quality_score);
    }

    const updatePromises = Array.from(updateGroups.entries()).map(([key, ids]) => {
      const [sentiment, cluster, qualityStr] = key.split("|||");
      return supabase
        .from("feedback_items")
        .update({
          sentiment,
          cluster,
          quality_score: parseInt(qualityStr, 10),
          classified_at: now,
        })
        .in("id", ids);
    });

    await Promise.allSettled(updatePromises);

    // Build cluster summary
    const clusterMap = new Map<string, { count: number; sentiments: string[]; samples: string[] }>();
    for (const cls of allClassifications) {
      const item = validItems.find((v) => v.id === cls.id);
      if (!clusterMap.has(cls.cluster)) {
        clusterMap.set(cls.cluster, { count: 0, sentiments: [], samples: [] });
      }
      const entry = clusterMap.get(cls.cluster)!;
      entry.count++;
      entry.sentiments.push(cls.sentiment);
      if (entry.samples.length < 2 && item) {
        entry.samples.push((item.text || "").slice(0, 200));
      }
    }

    const clusters = Array.from(clusterMap.entries())
      .map(([name, data]) => {
        const sentimentCounts: Record<string, number> = {};
        for (const s of data.sentiments) sentimentCounts[s] = (sentimentCounts[s] || 0) + 1;
        const dominant = Object.entries(sentimentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";
        return { name, count: data.count, avgSentiment: dominant, samples: data.samples };
      })
      .sort((a, b) => b.count - a.count);

    logger.info("Classification complete", { classified: allClassifications.length, clusters: clusters.length, filtered: filtered.length });

    const unclassified = validItems.length - allClassifications.length;
    return new Response(
      JSON.stringify({
        classified: allClassifications.length,
        filtered: filtered.length,
        unclassified,
        clusters,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    logger.error("classify-feedback error", { error: e instanceof Error ? e.message : String(e) });
    const status = e instanceof UnauthorizedError ? 401 : e instanceof ValidationError ? 400 : 500;
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
