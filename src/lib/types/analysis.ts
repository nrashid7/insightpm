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
}

export interface AnalysisInput {
  productName: string;
  website?: string;
  competitors?: string;
}
