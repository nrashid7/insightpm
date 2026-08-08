export interface ScoredSignal {
  source: string;
  title: string;
  text: string;
  url: string;
  author?: string;
  engagement: number; // raw metric (upvotes, stars, views, etc.)
  normalizedScore: number; // 0-100
  timestamp?: string; // ISO 8601
  metadata?: Record<string, unknown>;
}

const SOURCE_THRESHOLDS: Record<string, { low: number; high: number }> = {
  reddit: { low: 5, high: 5000 },
  hackernews: { low: 3, high: 1000 },
  github: { low: 1, high: 10000 },
  youtube: { low: 100, high: 1_000_000 },
  tiktok: { low: 500, high: 5_000_000 },
  x: { low: 5, high: 50000 },
  polymarket: { low: 1000, high: 500_000 },
  default: { low: 1, high: 10000 },
};

/**
 * Normalize a raw engagement metric to 0-100 using a log scale
 * tuned per source so that platform-specific thresholds are comparable.
 */
export function normalizeEngagement(metric: number, source: string): number {
  if (metric <= 0) return 0;
  const { low, high } = SOURCE_THRESHOLDS[source] ?? SOURCE_THRESHOLDS.default;
  const logVal = Math.log10(Math.max(metric, 1));
  const logLow = Math.log10(Math.max(low, 1));
  const logHigh = Math.log10(Math.max(high, 1));
  if (logHigh <= logLow) return 50;
  const normalized = ((logVal - logLow) / (logHigh - logLow)) * 100;
  return Math.round(Math.min(100, Math.max(0, normalized)));
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_PER_AUTHOR = 3;

/**
 * Deduplicate by URL, enforce per-author cap, drop items older than 30 days,
 * and sort descending by normalizedScore.
 */
export function mergeAndRank(signals: ScoredSignal[]): ScoredSignal[] {
  const now = Date.now();

  // 1. Drop items older than 30 days
  const recent = signals.filter((s) => {
    if (!s.timestamp) return true;
    const ts = new Date(s.timestamp).getTime();
    if (Number.isNaN(ts)) return true;
    return now - ts <= THIRTY_DAYS_MS;
  });

  // 2. Deduplicate by URL
  const seenUrls = new Set<string>();
  const deduped: ScoredSignal[] = [];
  for (const s of recent) {
    const key = s.url || s.text.slice(0, 120);
    if (seenUrls.has(key)) continue;
    seenUrls.add(key);
    deduped.push(s);
  }

  // 3. Sort by score descending
  deduped.sort((a, b) => b.normalizedScore - a.normalizedScore);

  // 4. Per-author cap
  const authorCounts = new Map<string, number>();
  const capped: ScoredSignal[] = [];
  for (const s of deduped) {
    const author = (s.author ?? "").toLowerCase().trim();
    if (!author) {
      capped.push(s);
      continue;
    }
    const count = authorCounts.get(author) ?? 0;
    if (count >= MAX_PER_AUTHOR) continue;
    authorCounts.set(author, count + 1);
    capped.push(s);
  }

  return capped;
}
