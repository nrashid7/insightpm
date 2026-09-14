import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

const mockResult = {
  productName: "TestApp",
  totalFeedback: 100,
  avgSentiment: 3.5,
  topComplaintsCount: 5,
  topFeatureRequestCount: 3,
  complaints: [],
  sentiment: [],
  trendData: [],
  featureRequests: [],
  competitors: [],
  aiRecommendation: "Focus on UX",
  sourcesCount: 4,
};

describe("analyzeProduct", () => {
  let analyzeProduct: typeof import("@/lib/api/analyze").analyzeProduct;
  let supabase: typeof import("@/integrations/supabase/client").supabase;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import("@/lib/api/analyze");
    analyzeProduct = mod.analyzeProduct;
    const clientMod = await import("@/integrations/supabase/client");
    supabase = clientMod.supabase;
  });

  it("returns analysis result on success", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({ data: mockResult, error: null });
    const result = await analyzeProduct({ productName: "TestApp" });
    expect(result.productName).toBe("TestApp");
    expect(result.totalFeedback).toBe(100);
  });

  it("throws on error response", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: null,
      error: { message: "Server error" } as any,
    });
    await expect(analyzeProduct({ productName: "Fail" })).rejects.toThrow("Server error");
  });

  it("preserves actionable HTTP response errors from the Supabase SDK", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({ data: null, error: {
      message: "Edge Function returned a non-2xx status code",
      context: new Response(JSON.stringify({ error: "No relevant evidence found. Try another source." }), { status: 422 }),
    } as any });
    await expect(analyzeProduct({ productName: "Unknown" })).rejects.toThrow("No relevant evidence found");
  });

  it("throws when data contains error field", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: { error: "productName is required" },
      error: null,
    });
    await expect(analyzeProduct({ productName: "" })).rejects.toThrow("productName is required");
  });

  it("sends correct body to Edge Function", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: mockResult,
      error: null,
    });

    await analyzeProduct({
      productName: "MyApp",
      website: "https://myapp.com",
      competitors: "Rival",
      sources: ["hackernews", "github"],
      useCache: true,
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith("analyze-product", {
      body: {
        productName: "MyApp",
        website: "https://myapp.com",
        competitors: "Rival",
        sources: ["hackernews", "github"],
        useCache: true,
        customFeedback: undefined,
        includeMarketSignals: undefined,
        marketSignalSources: undefined,
      },
    });
  });
});
