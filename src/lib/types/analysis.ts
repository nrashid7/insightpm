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
}

export interface ClusterData {
  name: string;
  count: number;
  avgSentiment: string;
  samples: string[];
}

export interface AnalysisInput {
  productName: string;
  website?: string;
  competitors?: string;
  sources?: string[];
  useCache?: boolean;
  customFeedback?: string;
}
