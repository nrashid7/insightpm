import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { productName, website, competitors, sources } = await req.json();

    if (!productName) {
      return new Response(
        JSON.stringify({ error: "productName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const competitorList = competitors
      ? competitors.split(",").map((c: string) => c.trim()).filter(Boolean)
      : [];

    // Step 1: Collect feedback via the collect-feedback function
    console.log("Collecting feedback from multiple sources...");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const collectRes = await fetch(`${supabaseUrl}/functions/v1/collect-feedback`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productName, website, competitors, sources }),
    });

    let corpus = "";
    let totalItems = 0;
    let sourceBreakdown: { source: string; count: number; status: string }[] = [];
    let feedbackSamples: { text: string; source: string; title?: string; url?: string; rating?: number }[] = [];

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

    const hasScrapedData = corpus.length > 100;

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
- totalFeedback should reflect the actual volume analyzed (${totalItems} items collected)
- avgSentiment: 1-5 scale
- sourcesCount: ${sourceBreakdown.filter((s) => s.status === "success").length || "4-12"}`;

    const userPrompt = `Analyze this product:
Product: ${productName}
${website ? `Website: ${website}` : ""}
${competitorList.length > 0 ? `Competitors: ${competitorList.join(", ")}` : ""}
${hasScrapedData ? `\n--- REAL USER FEEDBACK FROM ${sourceBreakdown.filter((s) => s.count > 0).map((s) => s.source.toUpperCase()).join(", ")} ---\n${corpus}\n--- END FEEDBACK ---` : ""}

Provide a comprehensive product intelligence analysis.`;

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
                  aiRecommendation: { type: "string" },
                  sourcesCount: { type: "number" },
                },
                required: [
                  "productName", "totalFeedback", "avgSentiment", "topComplaintsCount",
                  "topFeatureRequestCount", "complaints", "sentiment", "trendData",
                  "featureRequests", "competitors", "opportunityScore", "aiRecommendation", "sourcesCount",
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
