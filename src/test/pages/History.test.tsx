import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    isActive: true,
    loading: false,
    plan: "growth",
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/analytics", () => ({
  trackPageView: vi.fn(),
}));

const mockAnalysesFrom = vi.fn();

function createChainMock(): Record<string, unknown> {
  const result = { data: null, error: null, count: 0 };
  const chainable: Record<string, unknown> = {};
  const createMethod = () => vi.fn().mockReturnValue(chainable);
  chainable.select = createMethod();
  chainable.eq = createMethod();
  chainable.in = createMethod();
  chainable.order = createMethod();
  chainable.range = vi.fn().mockResolvedValue(result);
  chainable.limit = vi.fn().mockResolvedValue(result);
  chainable.single = vi.fn().mockResolvedValue(result);
  chainable.maybeSingle = vi.fn().mockResolvedValue(result);
  chainable.delete = createMethod();
  chainable.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chainable;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn(),
    },
    from: (table: string) => {
      if (table === "analyses") {
        return mockAnalysesFrom() || createChainMock();
      }
      return createChainMock();
    },
  },
}));

import History from "@/pages/History";
import { supabase } from "@/integrations/supabase/client";

function renderHistory() {
  return render(
    <MemoryRouter>
      <History />
    </MemoryRouter>
  );
}

describe("History page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /auth when not authenticated", async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: null },
    });

    renderHistory();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth");
    });
  });

  it("shows empty state when no analyses exist", async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: { id: "1" }, access_token: "tok" } },
    });

    mockAnalysesFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText("No analyses yet")).toBeInTheDocument();
    });
  });

  it("displays analyses when they exist", async () => {
    (supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { session: { user: { id: "1" }, access_token: "tok" } },
    });

    mockAnalysesFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({
            data: [
              {
                id: "analysis-1",
                product_name: "TestProduct",
                website: "https://test.com",
                competitors: null,
                created_at: "2026-01-01T00:00:00Z",
                results: { productName: "TestProduct", totalFeedback: 10 },
              },
            ],
            error: null,
          }),
        }),
      }),
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText("TestProduct")).toBeInTheDocument();
    });
  });
});
