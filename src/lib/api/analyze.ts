import { supabase } from "@/integrations/supabase/client";
import type { AnalysisInput, AnalysisResult } from "@/lib/types/analysis";

let lastCallTimestamp = 0;
const MIN_INTERVAL_MS = 5_000;

export async function analyzeProduct(input: AnalysisInput): Promise<AnalysisResult> {
  const now = Date.now();
  if (now - lastCallTimestamp < MIN_INTERVAL_MS) {
    throw new Error("Please wait a few seconds before running another analysis.");
  }
  lastCallTimestamp = now;

  const { data, error } = await supabase.functions.invoke("analyze-product", {
    body: {
      productName: input.productName,
      website: input.website,
      competitors: input.competitors,
      sources: input.sources,
      useCache: input.useCache,
      customFeedback: input.customFeedback,
      includeMarketSignals: input.includeMarketSignals,
      marketSignalSources: input.marketSignalSources,
    },
  });

  if (error) {
    const status = (error as any)?.status;
    if (status === 429) {
      throw new Error("Rate limit exceeded. Please wait before trying again.");
    }
    throw new Error(error.message || "Failed to analyze product");
  }

  if (!data || data.error) {
    throw new Error(data?.error || "Analysis returned no results");
  }

  return data as AnalysisResult;
}
