import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analysisId } = await req.json();
    if (!analysisId) {
      return new Response(
        JSON.stringify({ error: "analysisId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch all feedback items for this analysis
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

    console.log(`Classifying ${items.length} feedback items for analysis ${analysisId}`);

    // Step 1: Quality filtering
    const spamPatterns = /^(test|asdf|hello|hi|ok|nice|good|bad|yes|no|lol|wow|great|cool|thanks|thx|ty)$/i;
    const filtered: string[] = [];
    const validItems: typeof items = [];

    const seenTexts = new Set<string>();
    for (const item of items) {
      const text = (item.text || "").trim();
      const normalized = text.toLowerCase().replace(/\s+/g, " ");

      if (text.length < 30) {
        filtered.push(item.id);
        continue;
      }
      if (spamPatterns.test(normalized)) {
        filtered.push(item.id);
        continue;
      }
      if (seenTexts.has(normalized)) {
        filtered.push(item.id);
        continue;
      }
      seenTexts.add(normalized);
      validItems.push(item);
    }

    // Mark filtered items
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
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
2. cluster: a short descriptive label (2-5 words) grouping similar feedback, e.g. "UX issues", "pricing complaints", "missing offline mode", "slow performance", "login problems"
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

        if (!response.ok) {
          console.error(`AI classification batch failed: ${response.status}`);
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
        console.error("Classification batch error:", e);
      }
    }

    // Step 3: Update classified items in DB
    const now = new Date().toISOString();
    for (const cls of allClassifications) {
      await supabase
        .from("feedback_items")
        .update({
          sentiment: cls.sentiment,
          cluster: cls.cluster,
          quality_score: cls.quality_score,
          classified_at: now,
        })
        .eq("id", cls.id);
    }

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
        for (const s of data.sentiments) {
          sentimentCounts[s] = (sentimentCounts[s] || 0) + 1;
        }
        const dominant = Object.entries(sentimentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";
        return { name, count: data.count, avgSentiment: dominant, samples: data.samples };
      })
      .sort((a, b) => b.count - a.count);

    console.log(`Classified ${allClassifications.length} items into ${clusters.length} clusters, filtered ${filtered.length}`);

    return new Response(
      JSON.stringify({
        classified: allClassifications.length,
        filtered: filtered.length,
        clusters,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("classify-feedback error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
