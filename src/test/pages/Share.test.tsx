import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/lib/analytics", () => ({
  trackPageView: vi.fn(),
}));

vi.mock("@/components/dashboard/AnalysisProgress", () => ({
  default: () => <div>Loading analysis...</div>,
}));

vi.mock("@/components/dashboard/AnalysisResultsView", () => ({
  default: ({ data }: { data: { productName: string } }) => (
    <div>Shared analysis: {data.productName}</div>
  ),
}));

const mockSingle = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      }),
    }),
  },
}));

import Share from "@/pages/Share";

function renderShare(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/share/${id}`]}>
      <Routes>
        <Route path="/share/:analysisId" element={<Share />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Share page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows error when analysis is not public", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });

    renderShare("missing-id");

    await waitFor(() => {
      expect(screen.getByText("Analysis Unavailable")).toBeInTheDocument();
    });
  });

  it("renders public analysis without auth", async () => {
    mockSingle.mockResolvedValue({
      data: {
        product_name: "Notion",
        is_public: true,
        results: {
          productName: "Notion",
          totalFeedback: 42,
          sourcesCount: 3,
          complaints: [],
          featureRequests: [],
          sentiment: [],
          competitors: [],
          aiRecommendation: "Focus on mobile performance.",
          feedbackSamples: [],
        },
      },
      error: null,
    });

    renderShare("public-id");

    await waitFor(() => {
      expect(screen.getByText("Shared analysis: Notion")).toBeInTheDocument();
      expect(screen.getByText("Analyze your product")).toBeInTheDocument();
    });
  });
});
