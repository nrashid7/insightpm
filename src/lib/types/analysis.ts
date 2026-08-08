export interface ComplaintData {
  name: string;
  mentions: number;
}

export interface SentimentData {
  name: string;
  value: number;
  color: string;
}

export interface TrendDataPoint {
  month: string;
  requests: number;
}

export interface FeatureRequest {
  name: string;
  mentions: number;
  trend: "up" | "down" | "stable";
}

export interface CompetitorIntel {
  name: string;
  weakness: string;
  sentiment: number;
}

export interface OpportunityScore {
  name: string;
  score: number;
  mentions: number;
}

export interface SourceBreakdown {
  source: string;
  count: number;
}

export interface FeedbackSample {
  text: string;
  source: string;
  title?: string;
  url?: string;
  rating?: number;
  sentiment?: string;
}

export interface AnalysisResult {
  productName: string;
  totalFeedback: number;
  avgSentiment: number;
  topComplaintsCount: number;
  topFeatureRequestCount: number;
  complaints: ComplaintData[];
  sentiment: SentimentData[];
  trendData: TrendDataPoint[];
  featureRequests: FeatureRequest[];
  competitors: CompetitorIntel[];
  aiRecommendation: string;
  sourcesCount: number;
  // Extended fields
  opportunityScore?: OpportunityScore[];
  sourceBreakdown?: SourceBreakdown[];
  feedbackSamples?: FeedbackSample[];
  clusters?: ClusterData[];
  analysisId?: string;
  // Industry signals layer
  marketSignals?: MarketSignals;
  industryBrief?: string;
}

export interface ClusterData {
  name: string;
  count: number;
  avgSentiment: string;
  samples: string[];
}

// ─── Industry / Market Signals types ─────────────────────────────

export interface MarketSignal {
  source: string;
  title: string;
  text: string;
  url: string;
  author?: string;
  engagement: number;
  normalizedScore: number;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface PredictionMarket {
  question: string;
  probability: number;
  volume: number;
  endDate?: string;
  url: string;
}

export interface GithubVelocity {
  repo: string;
  stars: number;
  recentPRs: number;
  latestRelease?: string;
  url: string;
}

export interface MarketSignalSourceBreakdown {
  source: string;
  count: number;
  status: string;
  duration_ms: number;
  error?: string;
}

export interface MarketSignals {
  signals: MarketSignal[];
  predictionMarkets: PredictionMarket[];
  githubVelocity: GithubVelocity[];
  sourceBreakdown: MarketSignalSourceBreakdown[];
  totalSignals: number;
  industryBrief?: string | null;
}

// ─── Input types ─────────────────────────────────────────────────

export interface AnalysisInput {
  productName: string;
  website?: string;
  competitors?: string;
  sources?: string[];
  useCache?: boolean;
  customFeedback?: string;
  includeMarketSignals?: boolean;
  marketSignalSources?: string[];
}
