import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { getRateLimitKey } from "../_shared/rate-limit.ts";
import { checkDbRateLimit } from "../_shared/db-rate-limit.ts";
import { validateAnalyzeInput, ValidationError } from "../_shared/validation.ts";
import { withRetry } from "../_shared/retry.ts";
import { initLogger, logger } from "../_shared/logger.ts";
import { isInternalMonitoringRequest } from "../_shared/auth.ts";
import { getUserSubscription, assertCanAnalyze } from "../_shared/subscription.ts";
import {
  ANALYZE_MODEL,
  aiProviderErrorResponse,
  openRouterChatCompletion,
  requireOpenRouterApiKey,
} from "../_shared/ai.ts";

// Sanitize AI-generated strings: strip non-printable and common encoding artifacts
function sanitizeString(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
    .replace(/[肢肣肤肥肦肧肨肩肪肫肬肭肮肯肰肱育肳肴肵肶肷肸肹肺肻肼肽肾肿胀胁胂胃胄胅胆胇胈胉胊胋背胍胎胏胐胑胒胓胔胕胖胗胘胙胚胛胜胝胞胟胠胡胢胣胤胥胦胧胨胩胪胫胬胭胮胯胰胱胲胳胴胵胶胷胸胹胺胻胼能胾胿脀脁脂脃脄脅脆脇脈脉脊脋脌脍脎脏脐脑脒脓脔脕脖脗脘脙脚脛脜脝脞脟脠脡脢脣脤脥脦脧脨脩脪脫脬脭脮脯脰脱脲脳脴脵脶脷脸脹脺脻脼脽脾脿]/g, "")
    .trim();
}

function sanitizeDeep(obj: any): any {
  if (typeof obj === "string") return sanitizeString(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeDeep);
  if (obj && typeof obj === "object") {
    const result: any = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = sanitizeDeep(v);
    }
    return result;
  }
  return obj;
}

serve(async (req) => {
  initLogger("analyze-product", req);
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const internalMonitoring = isInternalMonitoringRequest(req);
    const authHeader = req.headers.get("authorization") || "";

    let userId: string | null = null;
    if (internalMonitoring) {
      // Cron/monitoring: user resolved later from monitored product owner if needed
    } else {
      if (!authHeader.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Sign in and subscribe to run analyses." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authErr } = await anonClient.auth.getUser();
      if (authErr || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired session. Please sign in again." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = user.id;

      const sub = await getUserSubscription(supabase, userId);
      if (!sub) {
        return new Response(
          JSON.stringify({ error: "An active subscription is required. Choose a plan on the pricing page." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const rateLimitKey = userId ? `user:${userId}` : getRateLimitKey(req);
    const rateCheck = await checkDbRateLimit(supabase, rateLimitKey, { maxRequests: 5, windowMs: 60_000 });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again shortly." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)),
          },
        }
      );
    }

    const body = await req.json();
    let { productName, website, competitors, sources, useCache, customFeedback } = validateAnalyzeInput(body);
    let includeMarketSignals = body.includeMarketSignals !== false;
    const marketSignalSources: string[] = Array.isArray(body.marketSignalSources) ? body.marketSignalSources : undefined;

    if (userId && !internalMonitoring) {
      const sub = await getUserSubscription(supabase, userId);
      if (!sub) {
        return new Response(
          JSON.stringify({ error: "An active subscription is required." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const allowed = assertCanAnalyze(sub, sources, includeMarketSignals);
      sources = allowed.sources;
      includeMarketSignals = allowed.includeMarketSignals;
    }

    if (internalMonitoring && body.monitoringUserId) {
      userId = body.monitoringUserId;
      const sub = await getUserSubscription(supabase, userId);
      if (!sub || sub.plan === "starter") {
        return new Response(
          JSON.stringify({ error: "Monitoring requires Growth or Enterprise plan." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const openRouterApiKey = requireOpenRouterApiKey();

    const competitorList = competitors
      ? competitors.split(",").map((c: string) => c.trim()).filter(Boolean)
      : [];

    let corpus = "";
    let totalItems = 0;
    let sourceBreakdown: { source: string; count: number; status: string }[] = [];
    let feedbackSamples: { text: string; source: string; title?: string; url?: string; rating?: number }[] = [];
    let clusters: { name: string; count: number; avgSentiment: string; samples: string[] }[] = [];
    let usedCache = false;
    let analysisId: string | null = null;

    // Market signals data (industry layer)
    let marketSignalsData: {
      signals?: any[];
      predictionMarkets?: any[];
      githubVelocity?: any[];
      sourceBreakdown?: any[];
      totalSignals?: number;
      industryBrief?: string;
    } | null = null;

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
        logger.info("Using cached data", { count: cachedItems.length });
        usedCache = true;
        totalItems = cachedItems.length;

        corpus = cachedItems
          .map((item) => `[${item.source}] ${item.title ? item.title + ": " : ""}${item.text}`)
          .join("\n\n---\n\n")
          .slice(0, 25000);

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
      // Generate a UUID for analysisId so collect-feedback persists items to DB
      analysisId = crypto.randomUUID();
      logger.info("Collecting feedback", { analysisId });

      // Insert placeholder analysis (use service role so RLS doesn't block)
      if (userId) {
        await supabase.from("analyses").insert({
          id: analysisId,
          user_id: userId,
          product_name: productName,
          website: website || null,
          competitors: competitors || null,
          results: {},
        });
      }

      // Fire collect-feedback and collect-market-signals in parallel
      const collectFeedbackPromise = fetch(`${supabaseUrl}/functions/v1/collect-feedback`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
          "x-internal-secret": internalSecret,
        },
        body: JSON.stringify({
          productName,
          website,
          competitors,
          sources,
          customFeedback,
          analysisId: userId ? analysisId : undefined,
        }),
      });

      const marketSignalsPromise = includeMarketSignals
        ? fetch(`${supabaseUrl}/functions/v1/collect-market-signals`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseAnonKey}`,
              "Content-Type": "application/json",
              "x-internal-secret": internalSecret,
            },
            body: JSON.stringify({
              topic: productName,
              sources: marketSignalSources,
            }),
          }).catch((e: unknown) => {
            logger.error("collect-market-signals fetch error", { error: e instanceof Error ? e.message : String(e) });
            return null;
          })
        : Promise.resolve(null);

      const [collectRes, marketRes] = await Promise.all([collectFeedbackPromise, marketSignalsPromise]);

      // Process market signals response
      if (marketRes && marketRes.ok) {
        try {
          marketSignalsData = await marketRes.json();
          logger.info("Market signals collected", { totalSignals: marketSignalsData?.totalSignals || 0 });
        } catch (e) {
          logger.error("Failed to parse market signals", { error: e instanceof Error ? e.message : String(e) });
        }
      } else if (marketRes) {
        logger.error("collect-market-signals failed", { status: marketRes.status });
      }

      if (collectRes.ok) {
        const collectData = await collectRes.json();
        corpus = collectData.corpus || "";
        totalItems = collectData.totalItems || 0;
        sourceBreakdown = collectData.sourceBreakdown || [];
        feedbackSamples = collectData.feedbackSamples || [];
        logger.info("Collected feedback", { totalItems, sourceCount: sourceBreakdown.length });

        // Step 1.5: Classify feedback if items were persisted
        if (userId && totalItems > 0) {
          try {
            logger.info("Classifying feedback", { analysisId });
            const classifyRes = await fetch(`${supabaseUrl}/functions/v1/classify-feedback`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${supabaseAnonKey}`,
                "Content-Type": "application/json",
                "x-internal-secret": internalSecret,
              },
              body: JSON.stringify({ analysisId }),
            });

            if (classifyRes.ok) {
              const classifyData = await classifyRes.json();
              logger.info("Classification complete", { classified: classifyData.classified, filtered: classifyData.filtered, unclassified: classifyData.unclassified || 0, clusters: classifyData.clusters?.length || 0 });
              if (classifyData.unclassified > 0) {
                logger.warn("Some feedback items could not be classified", { unclassified: classifyData.unclassified });
              }
              if (classifyData.clusters && classifyData.clusters.length > 0) {
                clusters = classifyData.clusters;
              }
            } else {
              logger.error("classify-feedback failed", { status: classifyRes.status });
            }
          } catch (e) {
            logger.error("Classification step error", { error: e instanceof Error ? e.message : String(e) });
          }
        }
      } else {
        logger.error("collect-feedback failed", { status: collectRes.status });
      }
    }

    const hasScrapedData = corpus.length > 100;

    const clusterContext = clusters.length > 0
      ? `\nExisting cluster analysis:\n${clusters.slice(0, 15).map((c) => `- "${c.name}": ${c.count} items, dominant sentiment: ${c.avgSentiment}`).join("\n")}`
      : "";

    // Build market signals context for the AI prompt
    let marketContext = "";
    const hasMarketData = marketSignalsData && ((marketSignalsData.signals?.length ?? 0) > 0 || (marketSignalsData.predictionMarkets?.length ?? 0) > 0);
    if (hasMarketData) {
      const parts: string[] = [];
      if (marketSignalsData!.predictionMarkets && marketSignalsData!.predictionMarkets.length > 0) {
        parts.push("PREDICTION MARKETS (real money-backed odds):\n" +
          marketSignalsData!.predictionMarkets.slice(0, 8).map((m: any) =>
            `- "${m.question}" → ${m.probability}% Yes ($${Math.round(m.volume).toLocaleString()} volume)`
          ).join("\n"));
      }
      if (marketSignalsData!.githubVelocity && marketSignalsData!.githubVelocity.length > 0) {
        parts.push("GITHUB VELOCITY:\n" +
          marketSignalsData!.githubVelocity.slice(0, 5).map((g: any) =>
            `- ${g.repo}: ${g.stars.toLocaleString()} stars, ${g.recentPRs} PRs merged last 30d${g.latestRelease ? `, latest: ${g.latestRelease}` : ""}`
          ).join("\n"));
      }
      if (marketSignalsData!.signals && marketSignalsData!.signals.length > 0) {
        parts.push("TOP ENGAGEMENT-SCORED SIGNALS (last 30 days):\n" +
          marketSignalsData!.signals.slice(0, 15).map((s: any) =>
            `- [${s.source}] (score: ${s.normalizedScore}/100) ${s.title}`
          ).join("\n"));
      }
      marketContext = "\n--- INDUSTRY / MARKET SIGNALS ---\n" + parts.join("\n\n") + "\n--- END MARKET SIGNALS ---";
    }

    // Step 2: AI Analysis
    const systemPrompt = `You are a product intelligence analyst for InsightPM. ${hasScrapedData ? "You have real user feedback scraped from multiple internet sources." : "Generate realistic analysis based on your knowledge."}${hasMarketData ? " You also have engagement-scored industry signals including prediction market odds, GitHub velocity, and social platform engagement data from the last 30 days." : ""} Use the analyze_product tool to return structured data.

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
- sourcesCount: ${sourceBreakdown.filter((s) => s.status === "success").length || "4-12"}${hasMarketData ? `
- industryBrief: a 3-5 sentence synthesis of the industry/market signals — what prediction markets, GitHub activity, and social engagement reveal about this product's trajectory and market position. Ground it in specific data points (odds percentages, star counts, engagement scores).` : ""}`;

    const userPrompt = `Analyze this product:
Product: ${productName}
${website ? `Website: ${website}` : ""}
${competitorList.length > 0 ? `Competitors: ${competitorList.join(", ")}` : ""}
${clusterContext}
${hasScrapedData ? `\n--- REAL USER FEEDBACK FROM ${sourceBreakdown.filter((s) => s.count > 0).map((s) => s.source.toUpperCase()).join(", ")} ---\n${corpus}\n--- END FEEDBACK ---` : ""}${marketContext}

Provide a comprehensive product intelligence analysis with feedback clusters${hasMarketData ? " and an industry brief synthesizing the market signals" : ""}.`;

    const response = await withRetry(
      async () => {
        const res = await openRouterChatCompletion(
          {
            model: ANALYZE_MODEL,
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
                      industryBrief: {
                        type: "string",
                        description:
                          "3-5 sentence synthesis of industry/market signals (prediction markets, GitHub velocity, social engagement). Omit if no market data provided.",
                      },
                      sourcesCount: { type: "number" },
                    },
                    required: [
                      "productName",
                      "totalFeedback",
                      "avgSentiment",
                      "topComplaintsCount",
                      "topFeatureRequestCount",
                      "complaints",
                      "sentiment",
                      "trendData",
                      "featureRequests",
                      "competitors",
                      "opportunityScore",
                      "clusters",
                      "aiRecommendation",
                      "sourcesCount",
                    ],
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "analyze_product" } },
          },
          openRouterApiKey,
        );
        if (!res.ok && res.status >= 500) {
          throw new Error(`AI gateway error: ${res.status}`);
        }
        return res;
      },
      { maxRetries: 2, baseDelayMs: 1000 },
    );

    if (!response.ok) {
      const special = aiProviderErrorResponse(response.status, corsHeaders);
      if (special) return special;
      const text = await response.text();
      logger.error("AI gateway error", { status: response.status, body: text.slice(0, 200) });
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      logger.error("No tool call in AI response");
      throw new Error("AI did not return structured data");
    }

    let analysisData = JSON.parse(toolCall.function.arguments);

    // Sanitize encoding artifacts
    analysisData = sanitizeDeep(analysisData);

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

    // If we had pre-computed clusters from classify-feedback or cache, prefer those
    if (clusters.length > 0) {
      analysisData.clusters = clusters;
    }

    // Attach market signals as a separate layer
    if (marketSignalsData && hasMarketData) {
      analysisData.marketSignals = {
        signals: marketSignalsData.signals || [],
        predictionMarkets: marketSignalsData.predictionMarkets || [],
        githubVelocity: marketSignalsData.githubVelocity || [],
        sourceBreakdown: marketSignalsData.sourceBreakdown || [],
        totalSignals: marketSignalsData.totalSignals || 0,
        industryBrief: analysisData.industryBrief || null,
      };
    }

    // Update placeholder with real results and return analysisId
    if (userId && analysisId) {
      await supabase.from("analyses").update({ results: analysisData }).eq("id", analysisId);
      analysisData.analysisId = analysisId;
    }

    return new Response(JSON.stringify(analysisData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    logger.error("analyze-product error", { error: e instanceof Error ? e.message : String(e) });
    const status = e instanceof ValidationError ? 400 : 500;
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
