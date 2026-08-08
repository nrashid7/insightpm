import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { validateCollectInput, ValidationError } from "../_shared/validation.ts";
import { withRetry } from "../_shared/retry.ts";
import { UnauthorizedError, verifyInternalSecret } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey } from "../_shared/rate-limit.ts";
import { initLogger, logger } from "../_shared/logger.ts";

interface FeedbackItem {
  product_name: string;
  source: string;
  title?: string;
  text: string;
  rating?: number;
  url?: string;
  metadata?: Record<string, unknown>;
  source_timestamp?: string;
}

interface SourceResult {
  source: string;
  items: FeedbackItem[];
  error?: string;
  duration_ms: number;
}

// ─── Source Collectors ───────────────────────────────────────────

async function collectHackerNews(productName: string): Promise<FeedbackItem[]> {
  const items: FeedbackItem[] = [];
  const queries = [`${productName} problem`, `${productName} review`, `${productName} alternative`];

  for (const query of queries) {
    try {
      const res = await fetch(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=10`
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const hit of data.hits || []) {
        if (!hit.title) continue;
        items.push({
          product_name: productName,
          source: "hackernews",
          title: hit.title,
          text: hit.title + (hit.story_text ? `\n${hit.story_text}` : ""),
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          metadata: { points: hit.points, num_comments: hit.num_comments, objectID: hit.objectID },
          source_timestamp: hit.created_at,
        });
      }

      // Also get comments for top stories
      const topHits = (data.hits || []).slice(0, 3);
      for (const hit of topHits) {
        try {
          const commentRes = await fetch(
            `https://hn.algolia.com/api/v1/search?tags=comment,story_${hit.objectID}&hitsPerPage=15`
          );
          if (!commentRes.ok) continue;
          const commentData = await commentRes.json();
          for (const comment of commentData.hits || []) {
            if (!comment.comment_text || comment.comment_text.length < 20) continue;
            items.push({
              product_name: productName,
              source: "hackernews",
              title: `Comment on: ${hit.title}`,
              text: comment.comment_text.replace(/<[^>]*>/g, "").slice(0, 2000),
              url: `https://news.ycombinator.com/item?id=${comment.objectID}`,
              metadata: { parent_story: hit.objectID, points: comment.points },
              source_timestamp: comment.created_at,
            });
          }
        } catch { /* skip */ }
      }
    } catch (e) {
      logger.error("HN collection error", { error: e instanceof Error ? e.message : String(e) });
    }
  }
  return items;
}

async function collectGitHub(productName: string): Promise<FeedbackItem[]> {
  const items: FeedbackItem[] = [];
  const queries = [
    `${productName} bug`,
    `${productName} feature request`,
    `${productName} issue`,
  ];

  for (const query of queries) {
    try {
      const res = await fetch(
        `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&sort=reactions&per_page=10`,
        { headers: { Accept: "application/vnd.github.v3+json", "User-Agent": "InsightPM" } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      for (const issue of data.items || []) {
        items.push({
          product_name: productName,
          source: "github",
          title: issue.title,
          text: (issue.title + "\n" + (issue.body || "")).slice(0, 2000),
          url: issue.html_url,
          metadata: {
            labels: (issue.labels || []).map((l: any) => l.name),
            reactions: issue.reactions?.total_count,
            state: issue.state,
            repo: issue.repository_url?.split("/").slice(-2).join("/"),
          },
          source_timestamp: issue.created_at,
        });
      }
    } catch (e) {
      logger.error("GitHub collection error", { error: e instanceof Error ? e.message : String(e) });
    }
  }
  return items;
}

async function collectStackOverflow(productName: string): Promise<FeedbackItem[]> {
  const items: FeedbackItem[] = [];
  try {
    const res = await fetch(
      `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=votes&q=${encodeURIComponent(productName)}&site=stackoverflow&pagesize=15&filter=withbody`
    );
    if (!res.ok) return items;
    const data = await res.json();
    for (const q of data.items || []) {
      items.push({
        product_name: productName,
        source: "stackoverflow",
        title: q.title?.replace(/&[^;]+;/g, " "),
        text: ((q.title || "") + "\n" + (q.body || "")).replace(/<[^>]*>/g, "").slice(0, 2000),
        url: q.link,
        metadata: { score: q.score, answer_count: q.answer_count, tags: q.tags, view_count: q.view_count },
        source_timestamp: q.creation_date ? new Date(q.creation_date * 1000).toISOString() : undefined,
      });
    }
  } catch (e) {
    logger.error("StackOverflow collection error", { error: e instanceof Error ? e.message : String(e) });
  }
  return items;
}

async function collectAppStore(productName: string): Promise<FeedbackItem[]> {
  const items: FeedbackItem[] = [];
  try {
    // Search for the app first
    const searchRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(productName)}&entity=software&limit=3&country=us`
    );
    if (!searchRes.ok) return items;
    const searchData = await searchRes.json();
    const apps = searchData.results || [];

    for (const app of apps) {
      try {
        // Get reviews via RSS feed (JSON format)
        const reviewRes = await fetch(
          `https://itunes.apple.com/us/rss/customerreviews/id=${app.trackId}/sortBy=mostRecent/json`
        );
        if (!reviewRes.ok) continue;
        const reviewData = await reviewRes.json();
        const entries = reviewData.feed?.entry || [];

        for (const entry of entries) {
          if (!entry.content?.label) continue;
          items.push({
            product_name: productName,
            source: "appstore",
            title: entry.title?.label || "",
            text: entry.content.label.slice(0, 2000),
            rating: parseInt(entry["im:rating"]?.label || "0", 10) || undefined,
            url: entry.link?.attributes?.href || "",
            metadata: {
              app_name: app.trackName,
              app_version: entry["im:version"]?.label,
              author: entry.author?.name?.label,
            },
            source_timestamp: entry.updated?.label,
          });
        }
      } catch { /* skip */ }
    }
  } catch (e) {
    logger.error("App Store collection error", { error: e instanceof Error ? e.message : String(e) });
  }
  return items;
}

async function collectReddit(productName: string, firecrawlKey: string): Promise<FeedbackItem[]> {
  const items: FeedbackItem[] = [];
  const queries = [
    `site:reddit.com "${productName}" problem OR complaint OR issue`,
    `site:reddit.com "${productName}" feature request OR wishlist`,
  ];

  for (const query of queries) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 5, scrapeOptions: { formats: ["markdown"] } }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const r of data.data || []) {
        const text = r.markdown || r.description || "";
        if (!text || text.length < 30) continue;
        items.push({
          product_name: productName,
          source: "reddit",
          title: r.title || "",
          text: text.slice(0, 2000),
          url: r.url || "",
          metadata: { firecrawl_title: r.title },
        });
      }
    } catch (e) {
      logger.error("Reddit collection error", { error: e instanceof Error ? e.message : String(e) });
    }
  }
  return items;
}

async function collectTrustpilot(productName: string, firecrawlKey: string): Promise<FeedbackItem[]> {
  const items: FeedbackItem[] = [];
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `site:trustpilot.com "${productName}" reviews`,
        limit: 5,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });
    if (!res.ok) return items;
    const data = await res.json();
    for (const r of data.data || []) {
      const text = r.markdown || r.description || "";
      if (!text || text.length < 30) continue;
      items.push({
        product_name: productName,
        source: "trustpilot",
        title: r.title || "",
        text: text.slice(0, 2000),
        url: r.url || "",
        metadata: {},
      });
    }
  } catch (e) {
    logger.error("Trustpilot collection error", { error: e instanceof Error ? e.message : String(e) });
  }
  return items;
}

async function collectGeneralWeb(productName: string, firecrawlKey: string, competitors: string[]): Promise<FeedbackItem[]> {
  const items: FeedbackItem[] = [];
  const queries = [
    `"${productName}" review complaints problems`,
    `"${productName}" feature request wishlist`,
  ];
  if (competitors.length > 0) {
    queries.push(`"${productName}" vs ${competitors[0]} comparison`);
  }

  for (const query of queries) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 5, scrapeOptions: { formats: ["markdown"] } }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const r of data.data || []) {
        const text = r.markdown || r.description || "";
        if (!text || text.length < 30) continue;
        items.push({
          product_name: productName,
          source: "web",
          title: r.title || "",
          text: text.slice(0, 2000),
          url: r.url || "",
          metadata: {},
        });
      }
    } catch (e) {
      logger.error("Web search collection error", { error: e instanceof Error ? e.message : String(e) });
    }
  }
  return items;
}

async function collectYouTube(productName: string, apiKey: string): Promise<FeedbackItem[]> {
  const items: FeedbackItem[] = [];
  if (!apiKey) return items;

  try {
    // Search for product review videos
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(productName + " review")}&type=video&maxResults=5&key=${apiKey}`
    );
    if (!searchRes.ok) return items;
    const searchData = await searchRes.json();

    const videoIds = (searchData.items || []).map((v: any) => v.id.videoId).filter(Boolean);
    if (videoIds.length === 0) return items;

    // Fetch comments for each video
    for (const videoId of videoIds.slice(0, 3)) {
      try {
        const commentsRes = await fetch(
          `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=20&textFormat=plainText&key=${apiKey}`
        );
        if (!commentsRes.ok) continue;
        const commentsData = await commentsRes.json();

        for (const thread of commentsData.items || []) {
          const comment = thread.snippet?.topLevelComment?.snippet;
          if (!comment?.textDisplay || comment.textDisplay.length < 20) continue;
          items.push({
            product_name: productName,
            source: "youtube",
            title: `Comment on: ${thread.snippet?.videoId}`,
            text: comment.textDisplay.slice(0, 2000),
            url: `https://www.youtube.com/watch?v=${videoId}&lc=${thread.snippet?.topLevelComment?.id}`,
            metadata: { 
              likeCount: comment.likeCount,
              authorDisplayName: comment.authorDisplayName,
              videoId,
            },
            source_timestamp: comment.publishedAt,
          });
        }
      } catch { /* skip */ }
    }
  } catch (e) {
    logger.error("YouTube collection error", { error: e instanceof Error ? e.message : String(e) });
  }
  return items;
}

async function collectGooglePlay(productName: string, firecrawlKey: string): Promise<FeedbackItem[]> {
  const items: FeedbackItem[] = [];
  if (!firecrawlKey) return items;

  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `site:play.google.com "${productName}" reviews`,
        limit: 5,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });
    if (!res.ok) return items;
    const data = await res.json();

    for (const r of data.data || []) {
      const text = r.markdown || r.description || "";
      if (!text || text.length < 30) continue;
      
      // Try to extract rating from the content
      const ratingMatch = text.match(/(\d)\s*stars?/i);
      const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : undefined;

      items.push({
        product_name: productName,
        source: "googleplay",
        title: r.title || "",
        text: text.slice(0, 2000),
        rating,
        url: r.url || "",
        metadata: { firecrawl_title: r.title },
      });
    }
  } catch (e) {
    logger.error("Google Play collection error", { error: e instanceof Error ? e.message : String(e) });
  }
  return items;
}

// ─── Orchestrator ────────────────────────────────────────────────

serve(async (req) => {
  initLogger("collect-feedback", req);
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
    const { productName, website, competitors, analysisId, sources, customFeedback } = validateCollectInput(body);

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY") || "";
    const youtubeKey = Deno.env.get("YOUTUBE_API_KEY") || "";
    const competitorList = competitors
      ? competitors.split(",").map((c: string) => c.trim()).filter(Boolean)
      : [];

    // Determine which sources to run
    const allSources = ["hackernews", "github", "stackoverflow", "appstore", "reddit", "trustpilot", "web", "youtube", "googleplay"];
    const enabledSources: string[] = sources && Array.isArray(sources) ? sources : allSources;

    // Build collector tasks
    const collectors: Record<string, () => Promise<FeedbackItem[]>> = {
      hackernews: () => collectHackerNews(productName),
      github: () => collectGitHub(productName),
      stackoverflow: () => collectStackOverflow(productName),
      appstore: () => collectAppStore(productName),
      reddit: () => firecrawlKey ? collectReddit(productName, firecrawlKey) : Promise.resolve([]),
      trustpilot: () => firecrawlKey ? collectTrustpilot(productName, firecrawlKey) : Promise.resolve([]),
      web: () => firecrawlKey ? collectGeneralWeb(productName, firecrawlKey, competitorList) : Promise.resolve([]),
      youtube: () => youtubeKey ? collectYouTube(productName, youtubeKey) : Promise.resolve([]),
      googleplay: () => firecrawlKey ? collectGooglePlay(productName, firecrawlKey) : Promise.resolve([]),
    };

    // Run enabled collectors in parallel with retry
    const results: SourceResult[] = [];
    const promises = enabledSources
      .filter((s) => collectors[s])
      .map(async (source) => {
        const start = Date.now();
        try {
          const items = await withRetry(() => collectors[source](), { maxRetries: 1, baseDelayMs: 1000 });
          results.push({ source, items, duration_ms: Date.now() - start });
        } catch (e) {
          results.push({
            source,
            items: [],
            error: e instanceof Error ? e.message : "Unknown error",
            duration_ms: Date.now() - start,
          });
        }
      });

    await Promise.allSettled(promises);

    // Handle custom/pasted feedback
    if (customFeedback && typeof customFeedback === "string" && customFeedback.trim()) {
      const lines = customFeedback.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);
      const customItems: FeedbackItem[] = lines.map((line: string) => ({
        product_name: productName,
        source: "custom",
        text: line.slice(0, 2000),
        title: line.slice(0, 80),
      }));
      results.push({ source: "custom", items: customItems, duration_ms: 0 });
    }

    // Deduplicate by URL
    const seenUrls = new Set<string>();
    const allItems: FeedbackItem[] = [];
    for (const r of results) {
      for (const item of r.items) {
        const key = item.url || item.text.slice(0, 100);
        if (seenUrls.has(key)) continue;
        seenUrls.add(key);
        allItems.push(item);
      }
    }

    // Insert into database if analysisId is provided
    if (analysisId && allItems.length > 0) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Insert feedback items
      const rows = allItems.map((item) => ({
        ...item,
        analysis_id: analysisId,
      }));

      const { error: insertErr } = await supabase
        .from("feedback_items")
        .insert(rows);

      if (insertErr) {
        logger.error("Failed to insert feedback", { error: insertErr.message });
      }

      // Insert source tracking
      const sourceRows = results.map((r) => ({
        analysis_id: analysisId,
        source: r.source,
        status: r.error ? "failed" : r.items.length > 0 ? "success" : "skipped",
        items_count: r.items.length,
        error_message: r.error || null,
        duration_ms: r.duration_ms,
      }));

      const { error: sourceErr } = await supabase
        .from("analysis_sources")
        .insert(sourceRows);

      if (sourceErr) {
        logger.error("Failed to insert source tracking", { error: sourceErr.message });
      }
    }

    // Build text corpus for the AI analysis step
    const corpus = allItems
      .map((item) => `[${item.source}] ${item.title ? item.title + ": " : ""}${item.text}`)
      .join("\n\n---\n\n")
      .slice(0, 25000);

    const sourceBreakdown = results.map((r) => ({
      source: r.source,
      count: r.items.length,
      status: r.error ? "failed" : r.items.length > 0 ? "success" : "skipped",
      duration_ms: r.duration_ms,
      error: r.error,
    }));

    return new Response(
      JSON.stringify({
        corpus,
        totalItems: allItems.length,
        sourceBreakdown,
        feedbackSamples: allItems.slice(0, 20).map((item) => ({
          text: item.text.slice(0, 300),
          source: item.source,
          title: item.title,
          url: item.url,
          rating: item.rating,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    logger.error("collect-feedback error", { error: e instanceof Error ? e.message : String(e) });
    const status = e instanceof UnauthorizedError ? 401 : e instanceof ValidationError ? 400 : 500;
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
