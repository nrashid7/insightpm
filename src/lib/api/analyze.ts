import { supabase } from "@/integrations/supabase/client";
import type { AnalysisInput, AnalysisResult } from "@/lib/types/analysis";

export async function analyzeProduct(input: AnalysisInput): Promise<AnalysisResult> {
  const { data, error } = await supabase.functions.invoke("analyze-product", {
    body: {
      productName: input.productName,
      website: input.website,
      competitors: input.competitors,
      sources: input.sources,
      useCache: input.useCache,
    },
  });

  if (error) {
    throw new Error(error.message || "Failed to analyze product");
  }

  if (!data || data.error) {
    throw new Error(data?.error || "Analysis returned no results");
  }

  return data as AnalysisResult;
}
