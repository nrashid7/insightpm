interface EvidenceItem {
  id?: string; source: string; text: string; title?: string; url?: string;
  source_timestamp?: string; rating?: number;
}
interface SourceStatus { source: string; count: number; status?: string; error?: string }

/** Deterministic measurements; undated material never becomes a fabricated trend. */
export function summarizeEvidence(productName: string, items: EvidenceItem[], statuses: SourceStatus[], days = 30, now = new Date()) {
  const from = new Date(now.getTime() - days * 86400000).toISOString();
  const to = now.toISOString();
  const seen = new Set<string>();
  const retained = items.filter(item => {
    if (!item.text.trim()) return false;
    const key = item.id || `${item.source}:${item.text.trim().toLowerCase()}`;
    if (seen.has(key)) return false;
    const time = item.source_timestamp && Date.parse(item.source_timestamp);
    if (time && (time < Date.parse(from) || time > now.getTime())) return false;
    seen.add(key); return true;
  });
  if (!retained.length) throw new Error('No evidence was found for this research window.');
  const evidence = retained.map((item, index) => ({
    id: item.id || `evidence-${index + 1}`, source: item.source, text: item.text,
    title: item.title, url: /^https?:\/\//i.test(item.url || '') ? item.url : undefined,
    timestamp: item.source_timestamp && Number.isFinite(Date.parse(item.source_timestamp)) ? new Date(item.source_timestamp).toISOString() : undefined,
  }));
  const ratings = retained.map(i => i.rating).filter((r): r is number => typeof r === 'number' && Number.isFinite(r) && r >= 1 && r <= 5);
  const featureRequests = evidence.filter(e => /\b(please add|feature request|wish|would like|need to be able|should support)\b/i.test(e.text))
    .map(e => ({ name: e.text.slice(0, 180), mentions: 1, trend: 'stable' as const, evidenceIds: [e.id] }));
  const complaints = evidence.filter(e => /\b(fails?|broken|crash(?:es)?|bug|slow|unusable|frustrat\w*|expensive)\b/i.test(e.text))
    .map(e => ({ name: e.text.slice(0, 180), mentions: 1, evidenceIds: [e.id] }));
  const months = new Map<string, number>();
  for (const e of evidence) if (e.timestamp) { const month = e.timestamp.slice(0, 7); months.set(month, (months.get(month) || 0) + 1); }
  const warnings = ['Evidence mode uses literal request and complaint phrases; it is not an AI interpretation. Feature trends are unmeasured.'];
  if (evidence.some(e => !e.timestamp)) warnings.push('Some evidence has no publication date and is excluded from date-based trends.');
  if (statuses.some(s => s.status && !['success', 'empty'].includes(s.status))) warnings.push('Some sources were unavailable; findings cover only the evidence collected.');
  const sentiment = [
    { name: 'Positive', value: ratings.filter(r => r >= 4).length, color: '#22c55e' },
    { name: 'Neutral', value: ratings.filter(r => r === 3).length, color: '#eab308' },
    { name: 'Negative', value: ratings.filter(r => r <= 2).length, color: '#ef4444' },
  ];
  return {
    productName, analysisMode: 'evidence' as const, totalFeedback: evidence.length,
    avgSentiment: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
    ratingCount: ratings.length, sourcesCount: new Set(evidence.map(e => e.source)).size,
    complaints, featureRequests, topComplaintsCount: complaints.length, topFeatureRequestCount: featureRequests.length,
    sentiment, trendData: [...months].sort(([a], [b]) => a.localeCompare(b)).map(([month, requests]) => ({ month, requests })),
    competitors: [] as { name: string; weakness: string; sentiment: number; ratingCount?: number; evidence?: typeof evidence }[], aiRecommendation: 'Review the linked evidence and validate recurring requests with customers before prioritizing changes.',
    evidence, sourceBreakdown: statuses, feedbackSamples: retained.slice(0, 30), warnings, researchWindow: { days, from, to },
  };
}
