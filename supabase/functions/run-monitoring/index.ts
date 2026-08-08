import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { verifyServiceRole } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey } from "../_shared/rate-limit.ts";
import { initLogger, logger } from "../_shared/logger.ts";

serve(async (req) => {
  initLogger("run-monitoring", req);
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    verifyServiceRole(req);

    const rateLimitKey = getRateLimitKey(req);
    const rateCheck = checkRateLimit(rateLimitKey, { maxRequests: 5, windowMs: 60_000 });
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again shortly." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil(rateCheck.retryAfterMs / 1000)) } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find all products due for monitoring
    const now = new Date().toISOString();
    const { data: dueProducts, error: fetchErr } = await supabase
      .from("monitored_products")
      .select("*")
      .eq("is_active", true)
      .lte("next_run_at", now);

    if (fetchErr) throw new Error(`Failed to fetch products: ${fetchErr.message}`);
    if (!dueProducts || dueProducts.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No products due for monitoring" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info("Processing monitoring batch", { productCount: dueProducts.length });
    const results: { productId: string; alerts: number; error?: string }[] = [];

    for (const product of dueProducts) {
      try {
        // Get previous analysis for comparison
        const { data: prevAnalysis } = await supabase
          .from("analyses")
          .select("results, created_at")
          .eq("product_name", product.product_name)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // Run new analysis
        const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") || "";
        const analyzeRes = await fetch(`${supabaseUrl}/functions/v1/analyze-product`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
            "x-internal-secret": internalSecret,
          },
          body: JSON.stringify({
            productName: product.product_name,
            website: product.website,
            competitors: product.competitors,
            sources: product.sources || undefined,
            monitoringUserId: product.user_id,
          }),
        });

        if (!analyzeRes.ok) {
          results.push({ productId: product.id, alerts: 0, error: `Analysis failed: ${analyzeRes.status}` });
          continue;
        }

        const newResults = await analyzeRes.json();
        const newAnalysisId = newResults.analysisId || null;
        const alerts: { alert_type: string; message: string; data: any }[] = [];

        // Compare with previous analysis
        if (prevAnalysis?.results) {
          const prev = prevAnalysis.results as any;

          // Check for sentiment shift
          const prevSentiment = prev.avgSentiment || 3;
          const newSentiment = newResults.avgSentiment || 3;
          const sentimentDiff = newSentiment - prevSentiment;
          if (Math.abs(sentimentDiff) >= 0.3) {
            alerts.push({
              alert_type: "sentiment_shift",
              message: sentimentDiff > 0
                ? `Sentiment improved from ${prevSentiment.toFixed(1)} to ${newSentiment.toFixed(1)}`
                : `Sentiment dropped from ${prevSentiment.toFixed(1)} to ${newSentiment.toFixed(1)}`,
              data: { prevSentiment, newSentiment, change: sentimentDiff },
            });
          }

          // Check for new top complaint
          const prevTopComplaint = prev.complaints?.[0]?.name?.toLowerCase();
          const newTopComplaint = newResults.complaints?.[0]?.name?.toLowerCase();
          if (prevTopComplaint && newTopComplaint && prevTopComplaint !== newTopComplaint) {
            alerts.push({
              alert_type: "new_top_complaint",
              message: `New top complaint: "${newResults.complaints[0].name}"`,
              data: { previous: prevTopComplaint, new: newTopComplaint },
            });
          }

          // Check for feedback volume change
          const prevTotal = prev.totalFeedback || 0;
          const newTotal = newResults.totalFeedback || 0;
          if (prevTotal > 0 && newTotal > 0) {
            const volumeChange = ((newTotal - prevTotal) / prevTotal) * 100;
            if (Math.abs(volumeChange) >= 20) {
              alerts.push({
                alert_type: "volume_change",
                message: volumeChange > 0
                  ? `Feedback volume increased by ${volumeChange.toFixed(0)}%`
                  : `Feedback volume decreased by ${Math.abs(volumeChange).toFixed(0)}%`,
                data: { prevTotal, newTotal, percentChange: volumeChange },
              });
            }
          }

          // Check for new cluster emerging
          const prevClusters = new Set((prev.clusters || []).map((c: any) => c.name?.toLowerCase()));
          const newClusters = (newResults.clusters || []).filter(
            (c: any) => c.count >= 3 && !prevClusters.has(c.name?.toLowerCase())
          );
          for (const cluster of newClusters.slice(0, 2)) {
            alerts.push({
              alert_type: "new_cluster",
              message: `New feedback cluster detected: "${cluster.name}" (${cluster.count} items)`,
              data: { cluster: cluster.name, count: cluster.count, sentiment: cluster.avgSentiment },
            });
          }
        }

        // Insert alerts
        if (alerts.length > 0) {
          const alertRows = alerts.map((a) => ({
            user_id: product.user_id,
            product_id: product.id,
            alert_type: a.alert_type,
            message: a.message,
            data: a.data,
          }));

          await supabase.from("monitoring_alerts").insert(alertRows);
        }

        // Save analysis only if not already persisted by analyze-product pipeline
        if (!newAnalysisId) {
          await supabase.from("analyses").insert({
            user_id: product.user_id,
            product_name: product.product_name,
            website: product.website,
            competitors: product.competitors,
            results: newResults,
          });
        }

        // Update next_run_at
        const nextRun = new Date();
        if (product.frequency === "daily") {
          nextRun.setDate(nextRun.getDate() + 1);
        } else {
          nextRun.setDate(nextRun.getDate() + 7);
        }

        await supabase
          .from("monitored_products")
          .update({ last_run_at: now, next_run_at: nextRun.toISOString() })
          .eq("id", product.id);

        results.push({ productId: product.id, alerts: alerts.length });
      } catch (e) {
        logger.error("Error processing product", { product: product.product_name, error: e instanceof Error ? e.message : String(e) });
        results.push({ productId: product.id, alerts: 0, error: e instanceof Error ? e.message : "Unknown" });
      }
    }

    const totalAlerts = results.reduce((sum, r) => sum + r.alerts, 0);
    logger.info("Monitoring complete", { processed: results.length, totalAlerts });

    return new Response(
      JSON.stringify({ processed: results.length, totalAlerts, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    logger.error("run-monitoring error", { error: e instanceof Error ? e.message : String(e) });
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
