import { cleanText, env, mapLimit, number, object, records, relevant, ResearchClient, researchWindow, safeUrl, sameWebsite, SourceUnavailable, stableId, string, timestamp, websiteHost, withinWindow } from "./research.ts";
import type { ApiObject, ResearchWindow } from "./research.ts";

export interface FeedbackItem {
  id?: string; product_name: string; source: string; title?: string; text: string;
  rating?: number; url?: string; metadata?: Record<string, unknown>; source_timestamp?: string;
}
export interface SourceStatus {
  source: string; count: number; status: "success" | "empty" | "failed" | "not_configured" | "unsupported";
  error?: string; duration_ms: number; dated_count?: number; undated_count?: number;
}
export interface CollectFeedbackInput { productName: string; website?: string; competitors?: string; sources?: string[]; customFeedback?: string; days?: number }
type Context = { input: CollectFeedbackInput; window: ResearchWindow; client: ResearchClient };
const githubHeaders = () => ({ Accept: "application/vnd.github+json", "User-Agent": "InsightPM", ...(env("GITHUB_TOKEN") ? { Authorization: `Bearer ${env("GITHUB_TOKEN")}` } : {}) });
const item = (ctx: Context, source: string, key: string, text: unknown, extras: Partial<FeedbackItem> = {}): FeedbackItem => ({
  product_name: ctx.input.productName, source, id: `${source}:${key}`, text: cleanText(text).slice(0, 2500), ...extras,
});

async function hackernews(ctx: Context): Promise<FeedbackItem[]> {
  const query = new URLSearchParams({ query: ctx.input.productName, tags: "story", hitsPerPage: "30", numericFilters: `created_at_i>=${Math.floor(Date.parse(ctx.window.from) / 1000)},created_at_i<=${Math.floor(Date.parse(ctx.window.to) / 1000)}` });
  const data = object(await ctx.client.json(`https://hn.algolia.com/api/v1/search?${query}`));
  const hits = records(data.hits).filter(hit => relevant(ctx.input.productName, cleanText(hit.title), cleanText(hit.story_text) + " " + string(hit.url), ctx.input.website));
  const items = hits.map(hit => item(ctx, "hackernews", string(hit.objectID), `${cleanText(hit.title)} ${cleanText(hit.story_text)}`, {
    title: cleanText(hit.title), url: `https://news.ycombinator.com/item?id=${hit.objectID}`, source_timestamp: timestamp(hit.created_at),
    metadata: { evidence_kind: "discussion", points: number(hit.points), num_comments: number(hit.num_comments), linked_url: safeUrl(hit.url) },
  }));
  const comments = await mapLimit(hits.filter(hit => withinWindow(timestamp(hit.created_at), ctx.window)).slice(0, 2), 2, hit => ctx.client.optional(async () => {
    const data = object(await ctx.client.json(`https://hn.algolia.com/api/v1/search?${new URLSearchParams({ tags: `comment,story_${hit.objectID}`, hitsPerPage: "10" })}`));
    return records(data.hits).filter(comment => cleanText(comment.comment_text).length >= 20).map(comment => item(ctx, "hackernews", string(comment.objectID), comment.comment_text, {
      title: `Comment on: ${cleanText(hit.title)}`, url: `https://news.ycombinator.com/item?id=${comment.objectID}`, source_timestamp: timestamp(comment.created_at),
      metadata: { evidence_kind: "comment", parent_story: string(hit.objectID), parent_title: cleanText(hit.title) },
    }));
  }, [] as FeedbackItem[]));
  return items.concat(comments.flat());
}

async function github(ctx: Context): Promise<FeedbackItem[]> {
  const query = `"${ctx.input.productName.replace(/"/g, "")}" in:title is:issue created:>=${ctx.window.from.slice(0, 10)}`;
  const data = object(await ctx.client.json(`https://api.github.com/search/issues?${new URLSearchParams({ q: query, sort: "updated", per_page: "30" })}`, { headers: githubHeaders() }));
  return records(data.items).filter(issue => !issue.pull_request && relevant(ctx.input.productName, cleanText(issue.title), cleanText(issue.body), ctx.input.website)).map(issue => item(ctx, "github", string(issue.id), `${cleanText(issue.title)} ${cleanText(issue.body)}`, {
    title: cleanText(issue.title), url: safeUrl(issue.html_url), source_timestamp: timestamp(issue.created_at),
    metadata: { evidence_kind: "issue", repo: string(issue.repository_url).split("/").slice(-2).join("/"), reactions: number(object(issue.reactions).total_count), state: issue.state },
  }));
}

async function stackoverflow(ctx: Context): Promise<FeedbackItem[]> {
  const data = object(await ctx.client.json(`https://api.stackexchange.com/2.3/search/advanced?${new URLSearchParams({ q: ctx.input.productName, title: ctx.input.productName, site: "stackoverflow", order: "desc", sort: "creation", pagesize: "30", filter: "withbody", fromdate: String(Math.floor(Date.parse(ctx.window.from) / 1000)), todate: String(Math.floor(Date.parse(ctx.window.to) / 1000)) })}`));
  if (data.backoff) ctx.client.warnings.push("Stack Exchange requested backoff; additional pages were not requested");
  return records(data.items).filter(q => relevant(ctx.input.productName, cleanText(q.title), cleanText(q.body), ctx.input.website, Array.isArray(q.tags) ? q.tags.map(string) : [])).map(q => item(ctx, "stackoverflow", string(q.question_id), `${cleanText(q.title)} ${cleanText(q.body)}`, {
    title: cleanText(q.title), url: safeUrl(q.link), source_timestamp: timestamp(q.creation_date), metadata: { evidence_kind: "question", score: number(q.score), tags: q.tags, answer_count: number(q.answer_count) },
  }));
}

async function appstore(ctx: Context): Promise<FeedbackItem[]> {
  const data = object(await ctx.client.json(`https://itunes.apple.com/search?${new URLSearchParams({ term: ctx.input.productName, entity: "software", limit: "10", country: "us" })}`));
  const name = ctx.input.productName.toLowerCase().trim();
  const candidates = records(data.results).filter(app => {
    const title = string(app.trackName).toLowerCase();
    const starts = title === name || title.startsWith(`${name}:`) || title.startsWith(`${name} `) || title.startsWith(`${name}-`);
    const seller = string(app.sellerName).toLowerCase();
    return starts && (ctx.input.website ? sameWebsite(app.sellerUrl, ctx.input.website) || seller.startsWith(`${name} `) || seller === name : seller.startsWith(`${name} `) || seller === name || title === name);
  }).sort((a, b) => {
    const score = (app: ApiObject) => string(app.trackName).toLowerCase() === name ? 3 : string(app.trackName).toLowerCase().startsWith(`${name}:`) ? 2 : 1;
    return score(b) - score(a);
  });
  const app = candidates[0];
  if (!app) return [];
  const reviews = object(await ctx.client.json(`https://itunes.apple.com/us/rss/customerreviews/id=${app.trackId}/sortBy=mostRecent/json`));
  return records(object(reviews.feed).entry).filter(entry => object(entry.content).label && object(entry.id).label && object(entry["im:rating"]).label).map(entry => {
    const reviewId = string(object(entry.id).label);
    const rating = number(object(entry["im:rating"]).label);
    return item(ctx, "appstore", `${app.trackId}:${reviewId}`, object(entry.content).label, {
      title: cleanText(object(entry.title).label), rating: rating >= 1 && rating <= 5 ? rating : undefined,
      url: `https://apps.apple.com/us/app/id${app.trackId}?see-all=reviews&reviewId=${encodeURIComponent(reviewId)}`,
      source_timestamp: timestamp(object(entry.updated).label), metadata: { evidence_kind: "review", app_id: app.trackId, review_id: reviewId, app_name: app.trackName, seller_name: app.sellerName, country: "us", sampling: "Latest 50 reviews of the matched primary app" },
    });
  });
}

async function reddit(ctx: Context): Promise<FeedbackItem[]> {
  // Public JSON is attempted once. A blocked host is failed, never silently replaced by invented posts.
  const data = object(await ctx.client.json(`https://www.reddit.com/search.json?${new URLSearchParams({ q: `"${ctx.input.productName.replace(/"/g, "")}"`, sort: "new", t: ctx.window.days <= 30 ? "month" : "year", limit: "25" })}`, { headers: { "User-Agent": "InsightPM research/1.0" } }));
  return records(object(data.data).children).map(child => object(child.data)).filter(post => relevant(ctx.input.productName, string(post.title), string(post.selftext), ctx.input.website, [string(post.subreddit)])).map(post => item(ctx, "reddit", string(post.id), `${string(post.title)} ${string(post.selftext)}`, {
    title: cleanText(post.title), url: safeUrl(`https://www.reddit.com${post.permalink}`), source_timestamp: timestamp(post.created_utc),
    metadata: { evidence_kind: "discussion", subreddit: post.subreddit, upvotes: number(post.ups), num_comments: number(post.num_comments) },
  }));
}

async function web(ctx: Context, source: string): Promise<FeedbackItem[]> {
  const key = env("FIRECRAWL_API_KEY");
  if (!key) throw new SourceUnavailable("not_configured", "Web search provider is not configured");
  const domain = source === "trustpilot" ? "trustpilot.com" : source === "googleplay" ? "play.google.com" : "";
  const query = `${domain ? `site:${domain} ` : ""}"${ctx.input.productName.replace(/"/g, "")}" ${websiteHost(ctx.input.website)} reviews`;
  const data = object(await ctx.client.json("https://api.firecrawl.dev/v1/search", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ query, limit: 5, timeout: 5000, tbs: `qdr:d${ctx.window.days}`, scrapeOptions: { formats: ["markdown"] } }) }));
  return records(data.data).filter(row => (!domain || websiteHost(string(row.url)).endsWith(domain)) && relevant(ctx.input.productName, cleanText(row.title), cleanText(row.description), ctx.input.website)).map(row => {
    const metadata = object(row.metadata);
    return item(ctx, source, stableId(source, string(row.url)), row.markdown || row.description, { title: cleanText(row.title), url: safeUrl(row.url), source_timestamp: timestamp(metadata.publishedTime || metadata.published_time || metadata.date),
      metadata: { evidence_kind: "web_page", sampling: "Search result page excerpt; not an individual verified review", scrape_status: metadata.statusCode },
    });
  }).filter(row => row.text.length >= 30);
}

async function youtube(ctx: Context): Promise<FeedbackItem[]> {
  const key = env("YOUTUBE_API_KEY");
  if (!key) throw new SourceUnavailable("not_configured", "YouTube API key is not configured");
  const search = object(await ctx.client.json(`https://www.googleapis.com/youtube/v3/search?${new URLSearchParams({ part: "snippet", q: `${ctx.input.productName} review`, type: "video", maxResults: "5", publishedAfter: ctx.window.from, key })}`));
  const videos = records(search.items).filter(video => relevant(ctx.input.productName, string(object(video.snippet).title), string(object(video.snippet).description), ctx.input.website)).slice(0, 2);
  const groups = await mapLimit(videos, 2, video => ctx.client.optional(async () => {
    const id = string(object(video.id).videoId); const title = cleanText(object(video.snippet).title);
    const comments = object(await ctx.client.json(`https://www.googleapis.com/youtube/v3/commentThreads?${new URLSearchParams({ part: "snippet", videoId: id, maxResults: "20", textFormat: "plainText", key })}`));
    return records(comments.items).map(thread => {
      const comment = object(object(thread.snippet).topLevelComment); const snippet = object(comment.snippet);
      return item(ctx, "youtube", string(comment.id), snippet.textDisplay, { title: `Comment on: ${title}`, url: `https://www.youtube.com/watch?v=${id}&lc=${comment.id}`, source_timestamp: timestamp(snippet.publishedAt), metadata: { evidence_kind: "comment", video_id: id, video_title: title, likes: number(snippet.likeCount) } });
    });
  }, [] as FeedbackItem[]));
  return groups.flat().filter(row => row.text.length >= 20);
}

export const DEFAULT_FEEDBACK_SOURCES = ["hackernews", "github", "stackoverflow", "appstore"];
export async function collectFeedback(input: CollectFeedbackInput) {
  if (!input.productName?.trim() || input.productName.length > 200) throw new Error("A product name of 1–200 characters is required");
  const window = researchWindow(input.days);
  const enabled = [...new Set(input.sources ?? DEFAULT_FEEDBACK_SOURCES)];
  if (input.customFeedback?.trim() && !enabled.includes("custom")) enabled.push("custom");
  const results = await mapLimit(enabled, 3, async source => {
    const start = Date.now(); const client = new ResearchClient(); const ctx = { input, window, client };
    let items: FeedbackItem[] = []; let status: SourceStatus["status"] = "empty"; let error: string | undefined;
    try {
      if (source === "custom") items = (input.customFeedback || "").split("\n").map(text => text.trim()).filter(Boolean).slice(0, 500).map(text => ({ product_name: input.productName, source, id: stableId(source, text.toLowerCase().replace(/\s+/g, " ")), text: text.slice(0, 2500), title: text.slice(0, 80), metadata: { evidence_kind: "submitted_feedback" } }));
      else if (source === "hackernews") items = await hackernews(ctx);
      else if (source === "github") items = await github(ctx);
      else if (source === "stackoverflow") items = await stackoverflow(ctx);
      else if (source === "appstore") items = await appstore(ctx);
      else if (source === "reddit") items = await reddit(ctx);
      else if (source === "youtube") items = await youtube(ctx);
      else if (["web", "trustpilot", "googleplay"].includes(source)) items = await web(ctx, source);
      else throw new SourceUnavailable("unsupported", "This feedback source is not supported");
      const seen = new Set<string>();
      items = items.filter(row => {
        if (!row.text || !withinWindow(row.source_timestamp, window)) return false;
        const identity = row.id || row.url || stableId(source, row.text);
        if (seen.has(identity)) return false; seen.add(identity); return true;
      }).map(row => ({ ...row, metadata: { ...row.metadata, date_status: row.source_timestamp ? "dated" : "unknown", research_days: window.days } }));
      status = items.length ? "success" : "empty";
      if (client.warnings.length) { status = "failed"; error = `Partial collection: ${client.warnings.join("; ")}`; }
    } catch (cause) { status = cause instanceof SourceUnavailable ? cause.status : "failed"; error = cause instanceof Error ? cause.message : "Source failed"; }
    return { items, status: { source, count: items.length, status, error, duration_ms: Date.now() - start, dated_count: items.filter(row => row.source_timestamp).length, undated_count: items.filter(row => !row.source_timestamp).length } as SourceStatus };
  });
  // Interleave sources deterministically so no provider wins the evidence budget by finishing first.
  const items: FeedbackItem[] = [];
  const max = Math.max(0, ...results.map(result => result.items.length));
  for (let index = 0; index < max; index++) for (const result of results) if (result.items[index]) items.push(result.items[index]);
  const corpus = items.map(row => `[${row.id}] [${row.source}] [${row.source_timestamp || "date unknown"}] ${row.url || "submitted feedback"}\n${row.title || ""}\n${row.text}`).join("\n\n---\n\n");
  return { items, sourceBreakdown: results.map(result => result.status), corpus, totalItems: items.length, feedbackSamples: items.slice(0, 20), researchWindow: window };
}
