import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function scrapeProductFeedback(productName: string, website?: string, competitors?: string[]): Promise<string> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) {
    console.log("No FIRECRAWL_API_KEY, skipping web scraping");
    return "";
  }

  const queries = [
    `"${productName}" review complaints problems`,
    `"${productName}" feature request wishlist`,
  ];
  if (competitors && competitors.length > 0) {
    queries.push(`"${productName}" vs ${competitors[0]} comparison`);
  }

  const allContent: string[] = [];

  for (const query of queries) {
    try {
      const response = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          limit: 5,
          scrapeOptions: { formats: ["markdown"] },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const results = data.data || [];
        for (const r of results) {
          const md = r.markdown || r.description || "";
          if (md) allContent.push(md.slice(0, 2000));
        }
      } else {
        console.error(`Firecrawl search failed for "${query}":`, response.status);
      }
    } catch (e) {
      console.error(`Firecrawl error for "${query}":`, e);
    }
  }

  const combined = allContent.join("\n\n---\n\n");
  // Limit to ~15k chars to stay within AI context
  return combined.slice(0, 15000);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, website, competitors } = await req.json();

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

    // Scrape real feedback from the web
    console.log("Scraping product feedback...");
    const scrapedContent = await scrapeProductFeedback(productName, website, competitorList);
    console.log(`Scraped ${scrapedContent.length} chars of feedback`);

    const hasScrapedData = scrapedContent.length > 100;

    const systemPrompt = `You are a product intelligence analyst. Given a product name${hasScrapedData ? " and real user feedback scraped from the web" : ""}, generate a detailed product analysis. Use the analyze_product tool to return structured data.

Guidelines:
- ${hasScrapedData ? "Base your analysis primarily on the real scraped feedback data provided" : "Generate realistic analysis based on your knowledge of the product"}
- Generate complaint data with mention counts (highest first, 4-6 items)
- Generate feature request data with mention counts and trend direction (5-8 items)
- Sentiment should be percentages adding to 100
- Trend data should show 6 months of data
- Competitor intel should highlight real weaknesses if competitors are provided
- AI recommendation should be specific and actionable
- totalFeedback should reflect the rough volume analyzed
- avgSentiment should be between 1-5
- sourcesCount should be between 4-12`;

    const userPrompt = `Analyze this product:
Product: ${productName}
${website ? `Website: ${website}` : ""}
${competitorList.length > 0 ? `Competitors: ${competitorList.join(", ")}` : ""}
${hasScrapedData ? `\n--- REAL USER FEEDBACK FROM WEB ---\n${scrapedContent}\n--- END FEEDBACK ---` : ""}

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
                  aiRecommendation: { type: "string" },
                  sourcesCount: { type: "number" },
                },
                required: [
                  "productName", "totalFeedback", "avgSentiment", "topComplaintsCount",
                  "topFeatureRequestCount", "complaints", "sentiment", "trendData",
                  "featureRequests", "competitors", "aiRecommendation", "sourcesCount",
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

    const sentimentColors: Record<string, string> = {
      Positive: "hsl(150, 60%, 50%)",
      Neutral: "hsl(215, 20%, 55%)",
      Negative: "hsl(0, 72%, 55%)",
    };

    analysisData.sentiment = analysisData.sentiment.map((s: { name: string; value: number }) => ({
      ...s,
      color: sentimentColors[s.name] || "hsl(215, 20%, 55%)",
    }));

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
