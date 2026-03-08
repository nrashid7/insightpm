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
    const { productName, website, competitors, sources, useCache, customFeedback } = await req.json();

    if (!productName) {
      return new Response(
        JSON.stringify({ error: "productName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const competitorList = competitors
      ? competitors.split(",").map((c: string) => c.trim()).filter(Boolean)
      : [];

    let corpus = "";
    let totalItems = 0;
    let sourceBreakdown: { source: string; count: number; status: string }[] = [];
    let feedbackSamples: { text: string; source: string; title?: string; url?: string; rating?: number }[] = [];
    let clusters: { name: string; count: number; avgSentiment: string; samples: string[] }[] = [];
    let usedCache = false;

    // Check for cached data if requested
    if (useCache) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: cachedItems, error: cacheErr } = await supabase
        .from("feedback_items")
        .select("id, text, title, source, rating, url, sentiment, cluster, quality_score, classified_at")
        .eq("product_name", productName)
        .gte("collected_at", oneDayAgo)
        .neq("sentiment", "filtered")
        .limit(500);

      if (!cacheErr && cachedItems && cachedItems.length > 20) {
        console.log(`Using cached data: ${cachedItems.length} items`);
        usedCache = true;
        totalItems = cachedItems.length;

        // Build corpus from cached items
        corpus = cachedItems
          .map((item) => `[${item.source}] ${item.title ? item.title + ": " : ""}${item.text}`)
          .join("\n\n---\n\n")
          .slice(0, 25000);

        // Build source breakdown from cached
        const sourceCounts: Record<string, number> = {};
        for (const item of cachedItems) {
          sourceCounts[item.source] = (sourceCounts[item.source] || 0) + 1;
        }
        sourceBreakdown = Object.entries(sourceCounts).map(([source, count]) => ({
          source, count, status: "success",
        }));

        feedbackSamples = cachedItems.slice(0, 20).map((item) => ({
          text: (item.text || "").slice(0, 300),
          source: item.source,
          title: item.title || undefined,
          url: item.url || undefined,
          rating: item.rating || undefined,
        }));

        // Build clusters from classified items
        const clusterMap = new Map<string, { count: number; sentiments: string[]; samples: string[] }>();
        for (const item of cachedItems) {
          if (!item.cluster) continue;
          if (!clusterMap.has(item.cluster)) {
            clusterMap.set(item.cluster, { count: 0, sentiments: [], samples: [] });
          }
          const entry = clusterMap.get(item.cluster)!;
          entry.count++;
          if (item.sentiment) entry.sentiments.push(item.sentiment);
          if (entry.samples.length < 2) entry.samples.push((item.text || "").slice(0, 200));
        }
        clusters = Array.from(clusterMap.entries())
          .map(([name, data]) => {
            const sentimentCounts: Record<string, number> = {};
            for (const s of data.sentiments) sentimentCounts[s] = (sentimentCounts[s] || 0) + 1;
            const dominant = Object.entries(sentimentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";
            return { name, count: data.count, avgSentiment: dominant, samples: data.samples };
          })
          .sort((a, b) => b.count - a.count);
      }
    }

    // Step 1: Collect feedback (if not using cache)
    if (!usedCache) {
      console.log("Collecting feedback from multiple sources...");
      const collectRes = await fetch(`${supabaseUrl}/functions/v1/collect-feedback`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productName, website, competitors, sources, customFeedback }),
      });

      if (collectRes.ok) {
        const collectData = await collectRes.json();
        corpus = collectData.corpus || "";
        totalItems = collectData.totalItems || 0;
        sourceBreakdown = collectData.sourceBreakdown || [];
        feedbackSamples = collectData.feedbackSamples || [];
        console.log(`Collected ${totalItems} items from ${sourceBreakdown.length} sources`);
      } else {
        console.error("collect-feedback failed:", collectRes.status);
      }

      // Step 1.5: Classify feedback if we have an analysis context
      // We call classify-feedback to get clusters even without a saved analysisId
      // For now, we pass the feedback through the classifier inline
      if (totalItems > 0) {
        try {
          // Create a temporary analysis record to store feedback for classification
          // Or classify inline - for performance, let's classify inline with the main AI call
          console.log("Skipping separate classification - will include cluster analysis in main AI call");
        } catch (e) {
          console.error("Classification step error:", e);
        }
      }
    }

    const hasScrapedData = corpus.length > 100;

    // Build cluster context for prompt
    const clusterContext = clusters.length > 0
      ? `\nExisting cluster analysis:\n${clusters.slice(0, 15).map((c) => `- "${c.name}": ${c.count} items, dominant sentiment: ${c.avgSentiment}`).join("\n")}`
      : "";

    // Step 2: AI Analysis
    const systemPrompt = `You are a product intelligence analyst for InsightPM. ${hasScrapedData ? "You have real user feedback scraped from multiple internet sources." : "Generate realistic analysis based on your knowledge."} Use the analyze_product tool to return structured data.

Guidelines:
- ${hasScrapedData ? "Base your analysis primarily on the real scraped feedback data. Extract ACTUAL complaints and feature requests mentioned in the data." : "Generate realistic analysis based on your knowledge of the product"}
- complaints: 4-8 items, sorted by mention count (highest first)
- featureRequests: 5-10 items with mention counts and trend direction
- sentiment: 3 items (Positive, Neutral, Negative) as percentages adding to 100
- trendData: 6 months of data
- competitors: highlight real weaknesses
- aiRecommendation: specific, actionable, 2-3 sentences
- opportunityScore: 5-8 product opportunities ranked by score (1-100), with mention counts
- clusters: 5-12 feedback clusters grouping similar themes. Each cluster has a name, count, avgSentiment (dominant sentiment label), and 1-2 sample quotes from the feedback
- totalFeedback should reflect the actual volume analyzed (${totalItems} items collected)
- avgSentiment: 1-5 scale
- sourcesCount: ${sourceBreakdown.filter((s) => s.status === "success").length || "4-12"}`;

    const userPrompt = `Analyze this product:
Product: ${productName}
${website ? `Website: ${website}` : ""}
${competitorList.length > 0 ? `Competitors: ${competitorList.join(", ")}` : ""}
${clusterContext}
${hasScrapedData ? `\n--- REAL USER FEEDBACK FROM ${sourceBreakdown.filter((s) => s.count > 0).map((s) => s.source.toUpperCase()).join(", ")} ---\n${corpus}\n--- END FEEDBACK ---` : ""}

Provide a comprehensive product intelligence analysis with feedback clusters.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_product",
              description: "Return structured product analysis data",
              parameters: {
                type: "object",
                properties: {
                  productName: { type: "string" },
                  totalFeedback: { type: "number" },
                  avgSentiment: { type: "number" },
                  topComplaintsCount: { type: "number" },
                  topFeatureRequestCount: { type: "number" },
                  complaints: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { name: { type: "string" }, mentions: { type: "number" } },
                      required: ["name", "mentions"],
                    },
                  },
                  sentiment: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", enum: ["Positive", "Neutral", "Negative"] },
                        value: { type: "number" },
                      },
                      required: ["name", "value"],
                    },
                  },
                  trendData: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { month: { type: "string" }, requests: { type: "number" } },
                      required: ["month", "requests"],
                    },
                  },
                  featureRequests: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        mentions: { type: "number" },
                        trend: { type: "string", enum: ["up", "down", "stable"] },
                      },
                      required: ["name", "mentions", "trend"],
                    },
                  },
                  competitors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        weakness: { type: "string" },
                        sentiment: { type: "number" },
                      },
                      required: ["name", "weakness", "sentiment"],
                    },
                  },
                  opportunityScore: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        score: { type: "number" },
                        mentions: { type: "number" },
                      },
                      required: ["name", "score", "mentions"],
                    },
                  },
                  clusters: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        count: { type: "number" },
                        avgSentiment: { type: "string" },
                        samples: { type: "array", items: { type: "string" } },
                      },
                      required: ["name", "count", "avgSentiment", "samples"],
                    },
                  },
                  aiRecommendation: { type: "string" },
                  sourcesCount: { type: "number" },
                },
                required: [
                  "productName", "totalFeedback", "avgSentiment", "topComplaintsCount",
                  "topFeatureRequestCount", "complaints", "sentiment", "trendData",
                  "featureRequests", "competitors", "opportunityScore", "clusters",
                  "aiRecommendation", "sourcesCount",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_product" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(aiResponse));
      throw new Error("AI did not return structured data");
    }

    const analysisData = JSON.parse(toolCall.function.arguments);

    // Add sentiment colors
    const sentimentColors: Record<string, string> = {
      Positive: "hsl(150, 60%, 50%)",
      Neutral: "hsl(215, 20%, 55%)",
      Negative: "hsl(0, 72%, 55%)",
    };
    analysisData.sentiment = analysisData.sentiment.map((s: { name: string; value: number }) => ({
      ...s,
      color: sentimentColors[s.name] || "hsl(215, 20%, 55%)",
    }));

    // Attach source breakdown and feedback samples
    analysisData.sourceBreakdown = sourceBreakdown.map((s) => ({
      source: s.source,
      count: s.count,
    }));
    analysisData.feedbackSamples = feedbackSamples;

    // If we had pre-computed clusters from cache, prefer those over AI-generated ones
    if (usedCache && clusters.length > 0) {
      analysisData.clusters = clusters;
    }

    return new Response(JSON.stringify(analysisData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-product error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
