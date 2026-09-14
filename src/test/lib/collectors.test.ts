// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { collectFeedback } from "../../../supabase/functions/_shared/feedback-collector.ts";
import { collectMarketSignals } from "../../../supabase/functions/_shared/market-collector.ts";

const recent = "2026-09-10T12:00:00Z";
const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-14T12:00:00Z"));
  vi.stubGlobal("Deno", { env: { get: () => undefined } });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("feedback collector evidence integrity", () => {
  it("preserves Hacker News points when ranking market signals", async () => {
    vi.stubGlobal("fetch", async (url: string) => reply({ hits: url.includes('tags=story') ? [{ objectID: '42', title: 'Notion adds offline mode', created_at: recent, points: 120, num_comments: 7 }] : [] }));
    const result = await collectMarketSignals({ topic: 'Notion', sources: ['hackernews'] });
    expect(result.signals[0].engagement).toBe(120);
    expect(result.signals[0].normalizedScore).toBeGreaterThan(0);
  });

  it("reports an upstream 429 as failed without fabricating empty success", async () => {
    vi.stubGlobal("fetch", async () => reply({ message: "quota" }, 429));
    const result = await collectFeedback({ productName: "Notion", sources: ["github"] });
    expect(result.sourceBreakdown[0]).toMatchObject({ status: "failed", count: 0 });
    expect(result.sourceBreakdown[0].error).toContain("429");
  });

  it("reports missing paid credentials and unsupported sources explicitly", async () => {
    const result = await collectFeedback({ productName: "Notion", sources: ["youtube", "web", "madeup"] });
    expect(result.sourceBreakdown.map(s => s.status)).toEqual(["not_configured", "not_configured", "unsupported"]);
  });

  it("preserves individual Apple review IDs and selects only the official primary app", async () => {
    vi.stubGlobal("fetch", async (url: string) => url.includes("/search?") ? reply({ results: [
      { trackId: 1, trackName: "Notion: Notes, Tasks, AI", sellerName: "Notion Labs", sellerUrl: "https://notion.so" },
      { trackId: 2, trackName: "Notion Calendar", sellerName: "Notion Labs", sellerUrl: "https://notion.so" },
      { trackId: 3, trackName: "To-Do for Notion", sellerName: "Other Company" },
    ] }) : reply({ feed: { entry: [10, 11].map(id => ({
      id: { label: String(id) }, title: { label: "Sync is broken" }, content: { label: "The app cannot sync my notes after an update." },
      updated: { label: recent }, "im:rating": { label: "2" }, link: { attributes: { href: "https://itunes.apple.com/us/review?id=1" } },
    })) } }));
    const result = await collectFeedback({ productName: "Notion", website: "https://notion.so", sources: ["appstore"] });
    expect(result.totalItems).toBe(2);
    expect(new Set(result.items.map(i => i.id)).size).toBe(2);
    expect(result.items.every(i => i.metadata?.app_id === 1)).toBe(true);
    expect(result.sourceBreakdown[0].count).toBe(2);
  });

  it("rejects old and unrelated issue results and deduplicates counts", async () => {
    const valid = { id: 10, title: "Notion sync fails", body: "Notion cannot sync my pages", html_url: "https://github.com/makenotion/sdk/issues/10", created_at: recent, repository_url: "https://api.github.com/repos/makenotion/sdk" };
    vi.stubGlobal("fetch", async () => reply({ items: [valid, valid,
      { ...valid, id: 11, title: "generic programming", body: "the notion of generic types", html_url: "https://github.com/golang/go/issues/11" },
      { ...valid, id: 12, created_at: "2020-01-01T00:00:00Z" },
      { ...valid, id: 13, pull_request: {} },
    ] }));
    const result = await collectFeedback({ productName: "Notion", sources: ["github"] });
    expect(result.items.map(i => i.id)).toEqual(["github:10"]);
    expect(result.sourceBreakdown[0].count).toBe(1);
    expect(result.corpus).toContain("github:10");
    expect(result.corpus).toContain(new Date(recent).toISOString());
  });

  it("excludes ordinary-word Stack Overflow matches", async () => {
    vi.stubGlobal("fetch", async () => reply({ items: [
      { question_id: 1, title: "What does O(log n) mean?", body: "the notion of complexity", link: "https://stackoverflow.com/q/1", creation_date: 1789041600, tags: ["algorithms"] },
      { question_id: 2, title: "Notion API returns 400", body: "Cannot create a Notion page", link: "https://stackoverflow.com/q/2", creation_date: 1789041600, tags: ["notion-api"] },
    ] }));
    const result = await collectFeedback({ productName: "Notion", sources: ["stackoverflow"] });
    expect(result.items.map(i => i.id)).toEqual(["stackoverflow:2"]);
  });

  it("keeps unknown custom dates explicitly unknown", async () => {
    const result = await collectFeedback({ productName: "Notion", sources: [], customFeedback: "Sync is broken when I open a page.\nSync is broken when I open a page." });
    expect(result.totalItems).toBe(1);
    expect(result.items[0].source_timestamp).toBeUndefined();
    expect(result.items[0].metadata?.date_status).toBe("unknown");
    expect(result.sourceBreakdown[0].count).toBe(1);
  });

  it("rejects dates outside the research window including future records", async () => {
    vi.stubGlobal("fetch", async () => reply({ hits: [
      { objectID: "1", title: "Notion bug", created_at: "2026-10-01T00:00:00Z" },
      { objectID: "2", title: "Notion bug", created_at: "2026-07-01T00:00:00Z" },
    ] }));
    expect((await collectFeedback({ productName: "Notion", sources: ["hackernews"] })).totalItems).toBe(0);
  });
});

describe("market collector contracts", () => {
  it("parses JSON prices and selects the Yes outcome and event slug", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      expect(url).toContain("/public-search?");
      return reply({ events: [{ slug: "notion-launch", markets: [{ id: "1", question: "Will Notion launch AI?", active: true, closed: false,
        outcomes: '["No","Yes"]', outcomePrices: '["0.38","0.62"]', conditionId: "0xabc", updatedAt: recent, volume: "1000" }] }] });
    });
    const result = await collectMarketSignals({ topic: "Notion", sources: ["polymarket"] });
    expect(result.predictionMarkets[0]).toMatchObject({ probability: 62, url: "https://polymarket.com/event/notion-launch" });
    expect(result.sourceBreakdown[0].status).toBe("success");
  });

  it("does not replace malformed prices or unsupported outcomes with zero percent", async () => {
    vi.stubGlobal("fetch", async () => reply({ events: [{ slug: "notion", markets: [{ id: "1", question: "Will Notion launch?", active: true, closed: false, outcomes: '["Yes","No"]', outcomePrices: "bad" }] }] }));
    const result = await collectMarketSignals({ topic: "Notion", sources: ["polymarket"] });
    expect(result.predictionMarkets).toHaveLength(0);
    expect(result.sourceBreakdown[0].status).toBe("failed");
  });

  it("reports X as unsupported even when the provider key exists", async () => {
    vi.stubGlobal("Deno", { env: { get: () => "test-key" } });
    const result = await collectMarketSignals({ topic: "Notion", sources: ["x"] });
    expect(result.sourceBreakdown[0].status).toBe("unsupported");
  });

  it("uses the documented TikTok method and nested statistics without erasing created_at", async () => {
    vi.stubGlobal("Deno", { env: { get: () => "test-key" } });
    vi.stubGlobal("fetch", async (url: string, options: RequestInit) => {
      expect(url).toContain("/v1/tiktok/search/keyword?");
      expect(options.method || "GET").toBe("GET");
      return reply({ aweme_list: [{ aweme_id: "123", desc: "Notion tutorial", created_at: recent, statistics: { play_count: 12000, digg_count: 25 }, author: { unique_id: "creator" } }] });
    });
    const result = await collectMarketSignals({ topic: "Notion", sources: ["tiktok"] });
    expect(result.signals[0]).toMatchObject({ engagement: 12000, timestamp: new Date(recent).toISOString(), url: "https://www.tiktok.com/@creator/video/123" });
  });
});
