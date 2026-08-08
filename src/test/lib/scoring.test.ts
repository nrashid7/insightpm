import { describe, it, expect } from "vitest";

// Import from supabase shared module (pure TS, no Deno deps)
import { normalizeEngagement, mergeAndRank } from "../../../supabase/functions/_shared/scoring";
import type { ScoredSignal } from "../../../supabase/functions/_shared/scoring";

describe("normalizeEngagement", () => {
  it("returns 0 for zero or negative metrics", () => {
    expect(normalizeEngagement(0, "reddit")).toBe(0);
    expect(normalizeEngagement(-5, "github")).toBe(0);
  });

  it("is monotonically increasing for the same source", () => {
    const a = normalizeEngagement(10, "reddit");
    const b = normalizeEngagement(100, "reddit");
    const c = normalizeEngagement(1000, "reddit");
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  it("caps at 100", () => {
    const score = normalizeEngagement(999_999_999, "reddit");
    expect(score).toBe(100);
  });

  it("floors at 0", () => {
    const score = normalizeEngagement(0.001, "hackernews");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("uses source-specific thresholds", () => {
    // YouTube has much higher thresholds than Reddit
    const ytScore = normalizeEngagement(5000, "youtube");
    const redditScore = normalizeEngagement(5000, "reddit");
    expect(redditScore).toBeGreaterThan(ytScore);
  });

  it("falls back to default thresholds for unknown sources", () => {
    const score = normalizeEngagement(100, "unknown_source");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("mergeAndRank", () => {
  function makeSignal(overrides: Partial<ScoredSignal> = {}): ScoredSignal {
    return {
      source: "reddit",
      title: "Test signal",
      text: "Test signal text",
      url: `https://example.com/${Math.random()}`,
      engagement: 100,
      normalizedScore: 50,
      ...overrides,
    };
  }

  it("deduplicates by URL", () => {
    const signals: ScoredSignal[] = [
      makeSignal({ url: "https://reddit.com/a", normalizedScore: 80 }),
      makeSignal({ url: "https://reddit.com/a", normalizedScore: 60 }),
      makeSignal({ url: "https://reddit.com/b", normalizedScore: 70 }),
    ];
    const result = mergeAndRank(signals);
    expect(result).toHaveLength(2);
  });

  it("sorts by normalizedScore descending", () => {
    const signals: ScoredSignal[] = [
      makeSignal({ url: "https://a.com", normalizedScore: 30 }),
      makeSignal({ url: "https://b.com", normalizedScore: 90 }),
      makeSignal({ url: "https://c.com", normalizedScore: 60 }),
    ];
    const result = mergeAndRank(signals);
    expect(result[0].normalizedScore).toBe(90);
    expect(result[1].normalizedScore).toBe(60);
    expect(result[2].normalizedScore).toBe(30);
  });

  it("enforces per-author cap of 3", () => {
    const signals: ScoredSignal[] = [
      makeSignal({ url: "https://1.com", author: "prolific_user", normalizedScore: 90 }),
      makeSignal({ url: "https://2.com", author: "prolific_user", normalizedScore: 85 }),
      makeSignal({ url: "https://3.com", author: "prolific_user", normalizedScore: 80 }),
      makeSignal({ url: "https://4.com", author: "prolific_user", normalizedScore: 75 }),
      makeSignal({ url: "https://5.com", author: "prolific_user", normalizedScore: 70 }),
      makeSignal({ url: "https://other.com", author: "other_user", normalizedScore: 50 }),
    ];
    const result = mergeAndRank(signals);
    const prolificCount = result.filter((s) => s.author === "prolific_user").length;
    expect(prolificCount).toBe(3);
    expect(result).toHaveLength(4);
  });

  it("treats author matching as case-insensitive", () => {
    const signals: ScoredSignal[] = [
      makeSignal({ url: "https://1.com", author: "TestUser", normalizedScore: 90 }),
      makeSignal({ url: "https://2.com", author: "testuser", normalizedScore: 85 }),
      makeSignal({ url: "https://3.com", author: "TESTUSER", normalizedScore: 80 }),
      makeSignal({ url: "https://4.com", author: "testUser", normalizedScore: 75 }),
    ];
    const result = mergeAndRank(signals);
    expect(result).toHaveLength(3);
  });

  it("allows unlimited items when author is empty/undefined", () => {
    const signals: ScoredSignal[] = Array.from({ length: 10 }, (_, i) =>
      makeSignal({ url: `https://${i}.com`, normalizedScore: 50 + i })
    );
    const result = mergeAndRank(signals);
    expect(result).toHaveLength(10);
  });

  it("drops items older than 30 days", () => {
    const fresh = new Date().toISOString();
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();

    const signals: ScoredSignal[] = [
      makeSignal({ url: "https://fresh.com", timestamp: fresh, normalizedScore: 50 }),
      makeSignal({ url: "https://old.com", timestamp: old, normalizedScore: 80 }),
    ];
    const result = mergeAndRank(signals);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://fresh.com");
  });

  it("keeps items with no timestamp", () => {
    const signals: ScoredSignal[] = [
      makeSignal({ url: "https://no-ts.com", timestamp: undefined, normalizedScore: 50 }),
    ];
    const result = mergeAndRank(signals);
    expect(result).toHaveLength(1);
  });

  it("returns empty array for empty input", () => {
    expect(mergeAndRank([])).toEqual([]);
  });
});

describe("Polymarket response parsing", () => {
  it("extracts probability from outcomePrices array", () => {
    const mockMarket = {
      question: "Will OpenAI release GPT-5 by July 2026?",
      outcomePrices: [0.72, 0.28],
      volume: 150000,
      conditionId: "test-condition-123",
      startDate: "2026-04-01T00:00:00Z",
    };

    const probability = Math.round((Number(mockMarket.outcomePrices?.[0]) || 0) * 100);
    expect(probability).toBe(72);
  });

  it("handles missing outcomePrices gracefully", () => {
    const mockMarket = {
      question: "Some market?",
      outcomePrices: undefined,
      volume: 0,
    };

    const probability = Math.round((Number(mockMarket.outcomePrices?.[0]) || 0) * 100);
    expect(probability).toBe(0);
  });

  it("handles empty outcomePrices array", () => {
    const mockMarket = {
      question: "Another market",
      outcomePrices: [] as number[],
      volume: 5000,
    };

    const probability = Math.round((Number(mockMarket.outcomePrices?.[0]) || 0) * 100);
    expect(probability).toBe(0);
  });

  it("filters stopword-only topics", () => {
    const STOPWORDS = new Set([
      "the", "a", "an", "is", "are", "was", "were", "be", "been",
      "to", "of", "in", "for", "on", "with", "at", "by", "from",
      "it", "its", "this", "that", "and", "or", "but", "not", "no",
    ]);

    function isStopwordOnly(topic: string): boolean {
      const words = topic.toLowerCase().split(/\s+/).filter(Boolean);
      return words.length > 0 && words.every((w) => STOPWORDS.has(w));
    }

    expect(isStopwordOnly("the")).toBe(true);
    expect(isStopwordOnly("a an the")).toBe(true);
    expect(isStopwordOnly("")).toBe(false);
    expect(isStopwordOnly("OpenAI")).toBe(false);
    expect(isStopwordOnly("the Apple")).toBe(false);
  });
});
