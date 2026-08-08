import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { verifyInternalSecret } from "../_shared/auth.ts";
import { checkRateLimit, getRateLimitKey } from "../_shared/rate-limit.ts";
import { withRetry } from "../_shared/retry.ts";
import { initLogger, logger } from "../_shared/logger.ts";
import { normalizeEngagement, mergeAndRank } from "../_shared/scoring.ts";
import type { ScoredSignal } from "../_shared/scoring.ts";

interface PredictionMarket {
  question: string;
  probability: number;
  volume: number;
  endDate?: string;
  url: string;
}

interface GithubVelocity {
  repo: string;
  stars: number;
  recentPRs: number;
  latestRelease?: string;
  url: string;
}

interface SourceResult {
  source: string;
  signals: ScoredSignal[];
  predictionMarkets?: PredictionMarket[];
  githubVelocity?: GithubVelocity[];
  error?: string;
  duration_ms: number;
}

// Common stopwords to filter Polymarket false positives
const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "shall", "to", "of", "in", "for",
  "on", "with", "at", "by", "from", "up", "about", "into", "through",
  "it", "its", "this", "that", "these", "those", "and", "or", "but",
  "not", "no", "so", "if", "as", "than", "too", "very", "just",
]);

function isStopwordOnly(topic: string): boolean {
  const words = topic.toLowerCase().split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((w) => STOPWORDS.has(w));
}

// ─── Polymarket ─────────────────────────────────────────────────

async function collectPolymarket(topic: string): Promise<{ signals: ScoredSignal[]; markets: PredictionMarket[] }> {
  const signals: ScoredSignal[] = [];
  const markets: PredictionMarket[] = [];

  if (isStopwordOnly(topic)) return { signals, markets };

  try {
    const res = await fetch(
      `https://gamma-api.polymarket.com/markets?_limit=10&closed=false&active=true&_q=${encodeURIComponent(topic)}`
    );
    if (!res.ok) return { signals, markets };
    const data = await res.json();

    for (const market of data || []) {
      if (!market.question) continue;

      const questionLower = market.question.toLowerCase();
      const topicWords = topic.toLowerCase().split(/\s+/).filter((w) => !STOPWORDS.has(w));
      const hasRelevantMatch = topicWords.some((w) => questionLower.includes(w));
      if (!hasRelevantMatch) continue;

      const volume = Number(market.volume) || 0;
      const probability = Math.round((Number(market.outcomePrices?.[0]) || 0) * 100);
      const url = `https://polymarket.com/event/${market.conditionId || market.slug || ""}`;
      const endDate = market.endDate || market.expirationDate || undefined;

      markets.push({ question: market.question, probability, volume, endDate, url });

      signals.push({
        source: "polymarket",
        title: market.question,
        text: `${market.question} — ${probability}% Yes (${volume > 0 ? `$${Math.round(volume).toLocaleString()} volume` : "new market"})`,
        url,
        engagement: volume,
        normalizedScore: normalizeEngagement(volume, "polymarket"),
        timestamp: market.startDate || undefined,
        metadata: { probability, volume, endDate },
      });
    }
  } catch (e) {
    logger.error("Polymarket collection error", { error: e instanceof Error ? e.message : String(e) });
  }

  return { signals, markets };
}

// ─── Reddit (public JSON with upvote scores) ───────────────────

async function collectRedditTop(topic: string): Promise<ScoredSignal[]> {
  const signals: ScoredSignal[] = [];

  try {
    const res = await fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(topic)}&sort=top&t=month&limit=15`,
      { headers: { "User-Agent": "InsightPM/1.0" } }
    );
    if (!res.ok) return signals;
    const data = await res.json();

    const posts = data?.data?.children || [];
    for (const child of posts) {
      const post = child.data;
      if (!post?.title) continue;

      signals.push({
        source: "reddit",
        title: post.title,
        text: `[r/${post.subreddit}] ${post.title}${post.selftext ? "\n" + post.selftext.slice(0, 500) : ""}`,
        url: `https://reddit.com${post.permalink}`,
        author: post.author,
        engagement: post.ups || 0,
        normalizedScore: normalizeEngagement(post.ups || 0, "reddit"),
        timestamp: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : undefined,
        metadata: { subreddit: post.subreddit, num_comments: post.num_comments, ups: post.ups },
      });
    }

    // Fetch top comments from the top 3 posts
    const topPosts = posts.slice(0, 3);
    for (const child of topPosts) {
      const post = child.data;
      if (!post?.permalink) continue;
      try {
        const commentRes = await fetch(
          `https://www.reddit.com${post.permalink}.json?sort=top&limit=5`,
          { headers: { "User-Agent": "InsightPM/1.0" } }
        );
        if (!commentRes.ok) continue;
        const commentData = await commentRes.json();
        const comments = commentData?.[1]?.data?.children || [];
        for (const c of comments) {
          const comment = c.data;
          if (!comment?.body || comment.body.length < 30) continue;
          signals.push({
            source: "reddit",
            title: `Comment on: ${post.title}`,
            text: comment.body.slice(0, 800),
            url: `https://reddit.com${post.permalink}${comment.id}`,
            author: comment.author,
            engagement: comment.ups || 0,
            normalizedScore: normalizeEngagement(comment.ups || 0, "reddit"),
            timestamp: comment.created_utc ? new Date(comment.created_utc * 1000).toISOString() : undefined,
            metadata: { subreddit: post.subreddit, ups: comment.ups, parent_title: post.title },
          });
        }
      } catch { /* skip individual comment fetch failures */ }
    }
  } catch (e) {
    logger.error("Reddit top collection error", { error: e instanceof Error ? e.message : String(e) });
  }

  return signals;
}

// ─── Hacker News (with engagement scores) ───────────────────────

async function collectHNScored(topic: string): Promise<ScoredSignal[]> {
  const signals: ScoredSignal[] = [];

  const queries = [topic, `${topic} problem`, `${topic} review`];
  const seen = new Set<string>();

  for (const query of queries) {
    try {
      const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
      const res = await fetch(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=10&numericFilters=created_at_i>${thirtyDaysAgo}`
      );
      if (!res.ok) continue;
      const data = await res.json();

      for (const hit of data.hits || []) {
        if (!hit.title || seen.has(hit.objectID)) continue;
        seen.add(hit.objectID);
        signals.push({
          source: "hackernews",
          title: hit.title,
          text: hit.title + (hit.story_text ? `\n${hit.story_text.replace(/<[^>]*>/g, "").slice(0, 500)}` : ""),
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          author: hit.author,
          engagement: hit.points || 0,
          normalizedScore: normalizeEngagement(hit.points || 0, "hackernews"),
          timestamp: hit.created_at,
          metadata: { points: hit.points, num_comments: hit.num_comments },
        });
      }
    } catch (e) {
      logger.error("HN scored collection error", { error: e instanceof Error ? e.message : String(e) });
    }
  }

  return signals;
}

// ─── GitHub Velocity ────────────────────────────────────────────

async function collectGitHubVelocity(topic: string): Promise<{ signals: ScoredSignal[]; velocity: GithubVelocity[] }> {
  const signals: ScoredSignal[] = [];
  const velocity: GithubVelocity[] = [];

  try {
    // Search repos
    const repoRes = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(topic)}&sort=stars&per_page=5`,
      { headers: { Accept: "application/vnd.github.v3+json", "User-Agent": "InsightPM" } }
    );
    if (!repoRes.ok) return { signals, velocity };
    const repoData = await repoRes.json();

    for (const repo of repoData.items || []) {
      const stars = repo.stargazers_count || 0;

      signals.push({
        source: "github",
        title: `${repo.full_name} (${stars.toLocaleString()} stars)`,
        text: `${repo.full_name}: ${repo.description || "No description"}. ${stars.toLocaleString()} stars, ${repo.forks_count || 0} forks. Language: ${repo.language || "N/A"}`,
        url: repo.html_url,
        author: repo.owner?.login,
        engagement: stars,
        normalizedScore: normalizeEngagement(stars, "github"),
        timestamp: repo.pushed_at || repo.updated_at,
        metadata: { stars, forks: repo.forks_count, language: repo.language, open_issues: repo.open_issues_count },
      });

      // Fetch recent merged PRs for top repos
      let recentPRs = 0;
      let latestRelease: string | undefined;
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const prRes = await fetch(
          `https://api.github.com/search/issues?q=repo:${repo.full_name}+type:pr+is:merged+merged:>=${thirtyDaysAgo}&per_page=1`,
          { headers: { Accept: "application/vnd.github.v3+json", "User-Agent": "InsightPM" } }
        );
        if (prRes.ok) {
          const prData = await prRes.json();
          recentPRs = prData.total_count || 0;
        }
      } catch { /* skip */ }

      try {
        const releaseRes = await fetch(
          `https://api.github.com/repos/${repo.full_name}/releases/latest`,
          { headers: { Accept: "application/vnd.github.v3+json", "User-Agent": "InsightPM" } }
        );
        if (releaseRes.ok) {
          const releaseData = await releaseRes.json();
          latestRelease = releaseData.tag_name || undefined;
        }
      } catch { /* skip */ }

      velocity.push({
        repo: repo.full_name,
        stars,
        recentPRs,
        latestRelease,
        url: repo.html_url,
      });
    }
  } catch (e) {
    logger.error("GitHub velocity collection error", { error: e instanceof Error ? e.message : String(e) });
  }

  return { signals, velocity };
}

// ─── YouTube (with view/like counts) ────────────────────────────

async function collectYouTubeScored(topic: string, apiKey: string): Promise<ScoredSignal[]> {
  const signals: ScoredSignal[] = [];
  if (!apiKey) return signals;

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(topic)}&type=video&maxResults=8&publishedAfter=${thirtyDaysAgo}&order=viewCount&key=${apiKey}`
    );
    if (!searchRes.ok) return signals;
    const searchData = await searchRes.json();

    const videoIds = (searchData.items || []).map((v: any) => v.id?.videoId).filter(Boolean);
    if (videoIds.length === 0) return signals;

    // Fetch stats for these videos
    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds.join(",")}&key=${apiKey}`
    );
    if (!statsRes.ok) return signals;
    const statsData = await statsRes.json();

    for (const video of statsData.items || []) {
      const views = Number(video.statistics?.viewCount) || 0;
      const likes = Number(video.statistics?.likeCount) || 0;

      signals.push({
        source: "youtube",
        title: video.snippet?.title || "",
        text: `${video.snippet?.title || ""} — ${views.toLocaleString()} views, ${likes.toLocaleString()} likes. Channel: ${video.snippet?.channelTitle || "Unknown"}`,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        author: video.snippet?.channelTitle,
        engagement: views,
        normalizedScore: normalizeEngagement(views, "youtube"),
        timestamp: video.snippet?.publishedAt,
        metadata: { views, likes, channelTitle: video.snippet?.channelTitle },
      });
    }
  } catch (e) {
    logger.error("YouTube scored collection error", { error: e instanceof Error ? e.message : String(e) });
  }

  return signals;
}

// ─── ScrapeCreators (TikTok + X) — optional ─────────────────────

async function collectScrapeCreators(topic: string, apiKey: string, platform: "tiktok" | "x"): Promise<ScoredSignal[]> {
  const signals: ScoredSignal[] = [];
  if (!apiKey) return signals;

  try {
    const endpoint = platform === "tiktok"
      ? "https://api.scrapecreators.com/v2/tiktok/search"
      : "https://api.scrapecreators.com/v2/twitter/search";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: topic, limit: 10 }),
    });
    if (!res.ok) return signals;
    const data = await res.json();

    for (const item of data.results || data.data || []) {
      const engagement = platform === "tiktok"
        ? (item.play_count || item.views || 0)
        : (item.like_count || item.likes || 0);

      signals.push({
        source: platform,
        title: (item.text || item.desc || item.title || "").slice(0, 120),
        text: (item.text || item.desc || item.title || "").slice(0, 800),
        url: item.url || item.link || "",
        author: item.author?.username || item.user?.screen_name || item.username || undefined,
        engagement,
        normalizedScore: normalizeEngagement(engagement, platform),
        timestamp: item.created_at || item.create_time ? new Date((item.create_time || 0) * 1000).toISOString() : undefined,
        metadata: {
          platform,
          likes: item.like_count || item.likes || item.digg_count,
          views: item.play_count || item.views,
          retweets: item.retweet_count,
          comments: item.comment_count,
        },
      });
    }
  } catch (e) {
    logger.error(`ScrapeCreators ${platform} collection error`, { error: e instanceof Error ? e.message : String(e) });
  }

  return signals;
}

// ─── Orchestrator ────────────────────────────────────────────────

serve(async (req) => {
  initLogger("collect-market-signals", req);
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
    const topic = (body.topic || body.productName || "").trim();
    if (!topic) {
      return new Response(
        JSON.stringify({ error: "topic is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const enabledSources: string[] = body.sources || ["polymarket", "reddit_top", "hackernews", "github", "youtube"];
    const youtubeKey = Deno.env.get("YOUTUBE_API_KEY") || "";
    const scrapeCreatorsKey = Deno.env.get("SCRAPECREATORS_API_KEY") || "";

    // Build collector tasks
    const tasks: Array<{ source: string; fn: () => Promise<SourceResult> }> = [];

    if (enabledSources.includes("polymarket")) {
      tasks.push({
        source: "polymarket",
        fn: async () => {
          const start = Date.now();
          try {
            const { signals, markets } = await withRetry(() => collectPolymarket(topic), { maxRetries: 1, baseDelayMs: 500 });
            return { source: "polymarket", signals, predictionMarkets: markets, duration_ms: Date.now() - start };
          } catch (e) {
            return { source: "polymarket", signals: [], error: e instanceof Error ? e.message : String(e), duration_ms: Date.now() - start };
          }
        },
      });
    }

    if (enabledSources.includes("reddit_top")) {
      tasks.push({
        source: "reddit_top",
        fn: async () => {
          const start = Date.now();
          try {
            const signals = await withRetry(() => collectRedditTop(topic), { maxRetries: 1, baseDelayMs: 500 });
            return { source: "reddit_top", signals, duration_ms: Date.now() - start };
          } catch (e) {
            return { source: "reddit_top", signals: [], error: e instanceof Error ? e.message : String(e), duration_ms: Date.now() - start };
          }
        },
      });
    }

    if (enabledSources.includes("hackernews")) {
      tasks.push({
        source: "hackernews",
        fn: async () => {
          const start = Date.now();
          try {
            const signals = await withRetry(() => collectHNScored(topic), { maxRetries: 1, baseDelayMs: 500 });
            return { source: "hackernews", signals, duration_ms: Date.now() - start };
          } catch (e) {
            return { source: "hackernews", signals: [], error: e instanceof Error ? e.message : String(e), duration_ms: Date.now() - start };
          }
        },
      });
    }

    if (enabledSources.includes("github")) {
      tasks.push({
        source: "github",
        fn: async () => {
          const start = Date.now();
          try {
            const { signals, velocity } = await withRetry(() => collectGitHubVelocity(topic), { maxRetries: 1, baseDelayMs: 500 });
            return { source: "github", signals, githubVelocity: velocity, duration_ms: Date.now() - start };
          } catch (e) {
            return { source: "github", signals: [], error: e instanceof Error ? e.message : String(e), duration_ms: Date.now() - start };
          }
        },
      });
    }

    if (enabledSources.includes("youtube")) {
      tasks.push({
        source: "youtube",
        fn: async () => {
          const start = Date.now();
          try {
            const signals = await withRetry(() => collectYouTubeScored(topic, youtubeKey), { maxRetries: 1, baseDelayMs: 500 });
            return { source: "youtube", signals, duration_ms: Date.now() - start };
          } catch (e) {
            return { source: "youtube", signals: [], error: e instanceof Error ? e.message : String(e), duration_ms: Date.now() - start };
          }
        },
      });
    }

    if (enabledSources.includes("tiktok") && scrapeCreatorsKey) {
      tasks.push({
        source: "tiktok",
        fn: async () => {
          const start = Date.now();
          try {
            const signals = await withRetry(() => collectScrapeCreators(topic, scrapeCreatorsKey, "tiktok"), { maxRetries: 1, baseDelayMs: 500 });
            return { source: "tiktok", signals, duration_ms: Date.now() - start };
          } catch (e) {
            return { source: "tiktok", signals: [], error: e instanceof Error ? e.message : String(e), duration_ms: Date.now() - start };
          }
        },
      });
    }

    if (enabledSources.includes("x") && scrapeCreatorsKey) {
      tasks.push({
        source: "x",
        fn: async () => {
          const start = Date.now();
          try {
            const signals = await withRetry(() => collectScrapeCreators(topic, scrapeCreatorsKey, "x"), { maxRetries: 1, baseDelayMs: 500 });
            return { source: "x", signals, duration_ms: Date.now() - start };
          } catch (e) {
            return { source: "x", signals: [], error: e instanceof Error ? e.message : String(e), duration_ms: Date.now() - start };
          }
        },
      });
    }

    // Run all in parallel
    const results: SourceResult[] = [];
    const promises = tasks.map(async (t) => {
      const result = await t.fn();
      results.push(result);
    });
    await Promise.allSettled(promises);

    // Collect all signals, merge, rank
    const allSignals: ScoredSignal[] = [];
    const allPredictionMarkets: PredictionMarket[] = [];
    const allGithubVelocity: GithubVelocity[] = [];

    for (const r of results) {
      allSignals.push(...r.signals);
      if (r.predictionMarkets) allPredictionMarkets.push(...r.predictionMarkets);
      if (r.githubVelocity) allGithubVelocity.push(...r.githubVelocity);
    }

    const rankedSignals = mergeAndRank(allSignals);

    const sourceBreakdown = results.map((r) => ({
      source: r.source,
      count: r.signals.length,
      status: r.error ? "failed" : r.signals.length > 0 ? "success" : "skipped",
      duration_ms: r.duration_ms,
      error: r.error,
    }));

    logger.info("Market signals collected", {
      totalSignals: rankedSignals.length,
      predictionMarkets: allPredictionMarkets.length,
      githubRepos: allGithubVelocity.length,
      sources: sourceBreakdown.length,
    });

    return new Response(
      JSON.stringify({
        signals: rankedSignals.slice(0, 50),
        predictionMarkets: allPredictionMarkets,
        githubVelocity: allGithubVelocity,
        sourceBreakdown,
        totalSignals: rankedSignals.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    logger.error("collect-market-signals error", { error: e instanceof Error ? e.message : String(e) });
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
