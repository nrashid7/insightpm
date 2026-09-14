import { collectFeedback } from './feedback-collector.ts';
import { ResearchClient, SourceUnavailable, object, records, string, number, env, researchWindow, timestamp, withinWindow, relevant, mapLimit } from './research.ts';
import { normalizeEngagement, type ScoredSignal } from './scoring.ts';
interface PredictionMarket { question: string; probability: number; volume: number; url: string; endDate?: string }
const arrayValue = (value: unknown): unknown[] => {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  if (!Array.isArray(parsed)) throw new Error('Invalid market outcome data');
  return parsed;
};
export async function collectMarketSignals(input: { topic: string; sources?: string[]; days?: number; website?: string }) {
  const window = researchWindow(input.days);
  const results = await mapLimit([...new Set(input.sources || ['polymarket', 'hackernews', 'github'])], 3, async source => {
    const started = Date.now(); const client = new ResearchClient();
    const signals: ScoredSignal[] = []; const markets: PredictionMarket[] = [];
    let status = 'empty'; let error: string | undefined;
    try {
      if (source === 'polymarket') {
        const data = object(await client.json(`https://gamma-api.polymarket.com/public-search?${new URLSearchParams({ q: input.topic, limit_per_type: '10', events_status: 'active' })}`));
        for (const event of records(data.events)) for (const market of records(event.markets)) {
          const question = string(market.question);
          if (market.closed === true || market.active === false || !relevant(input.topic, question, '', input.website)) continue;
          const outcomes = arrayValue(market.outcomes); const prices = arrayValue(market.outcomePrices);
          const index = outcomes.findIndex(o => string(o).toLowerCase() === 'yes');
          if (index < 0 || prices[index] === null || prices[index] === undefined || prices[index] === '') throw new Error('Unsupported prediction outcome');
          const price = Number(prices[index]);
          if (!Number.isFinite(price) || price < 0 || price > 1) throw new Error('Invalid prediction price');
          const date = timestamp(market.updatedAt);
          if (!withinWindow(date, window) || !event.slug) continue;
          const url = `https://polymarket.com/event/${encodeURIComponent(string(event.slug))}`;
          const volume = number(market.volume);
          markets.push({ question, probability: price * 100, volume, url, endDate: timestamp(market.endDate) });
          signals.push({ source, title: question, text: `Yes outcome market price: ${(price * 100).toFixed(1)}%. This is a market price, not a verified forecast.`, url, engagement: volume, normalizedScore: normalizeEngagement(volume, source), timestamp: date });
        }
      } else if (source === 'tiktok') {
        const key = env('SCRAPECREATORS_API_KEY');
        if (!key) throw new SourceUnavailable('not_configured', 'TikTok provider is not configured');
        const data = object(await client.json(`https://api.scrapecreators.com/v1/tiktok/search/keyword?${new URLSearchParams({ query: input.topic })}`, { method: 'GET', headers: { 'x-api-key': key } }));
        for (const row of records(data.aweme_list)) {
          const title = string(row.desc); const date = timestamp(row.created_at || row.create_time);
          if (!relevant(input.topic, title, '', input.website) || !withinWindow(date, window)) continue;
          const author = string(object(row.author).unique_id); const id = string(row.aweme_id);
          if (!author || !id) continue;
          const engagement = number(object(row.statistics).play_count);
          signals.push({ source, title, text: title, author, timestamp: date, url: `https://www.tiktok.com/@${encodeURIComponent(author)}/video/${encodeURIComponent(id)}`, engagement, normalizedScore: normalizeEngagement(engagement, source) });
        }
      } else if (['hackernews', 'github', 'reddit_top', 'youtube'].includes(source)) {
        const collected = await collectFeedback({ productName: input.topic, website: input.website, sources: [source === 'reddit_top' ? 'reddit' : source], days: input.days });
        const sourceStatus = collected.sourceBreakdown[0];
        status = sourceStatus.status; error = sourceStatus.error;
        for (const item of collected.items) {
          if (!item.url) continue;
          const engagement = number(item.metadata?.score || item.metadata?.likes || item.metadata?.comments);
          signals.push({ source, title: item.title || item.text.slice(0, 100), text: item.text, url: item.url, timestamp: item.source_timestamp, engagement, normalizedScore: normalizeEngagement(engagement, source), metadata: item.metadata });
        }
      } else throw new SourceUnavailable('unsupported', 'This market source has no supported hosted integration');
      if (!error) status = signals.length ? 'success' : 'empty';
    } catch (cause) { status = cause instanceof SourceUnavailable ? cause.status : 'failed'; error = cause instanceof Error ? cause.message : 'Source failed'; }
    return { signals, markets, status: { source, status, error, count: signals.length, duration_ms: Date.now() - started } };
  });
  const seen = new Set<string>();
  const signals = results.flatMap(r => r.signals).filter(s => { if (seen.has(s.url)) return false; seen.add(s.url); return true; }).sort((a, b) => b.normalizedScore - a.normalizedScore);
  return { signals, predictionMarkets: results.flatMap(r => r.markets), githubVelocity: [], sourceBreakdown: results.map(r => r.status), totalSignals: signals.length };
}
