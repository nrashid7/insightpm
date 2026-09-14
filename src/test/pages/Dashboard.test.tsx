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

const mockUser = { id: "user-1", email: "test@example.com" };

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser, signOut: vi.fn(), session: { user: mockUser }, loading: false }),
}));

let subscriptionReady = true;
vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    isActive: subscriptionReady,
    loading: !subscriptionReady,
    plan: "growth",
    analysesRemaining: 5,
    analysesUsed: 0,
    limits: { analysesPerMonth: 5, label: "Growth" },
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
  trackPageView: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
        })),
      })),
    })),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock("@/lib/api/analyze", () => ({
  analyzeProduct: vi.fn(),
}));

import Dashboard from "@/pages/Dashboard";

function renderDashboard(search = "") {
  return render(
    <MemoryRouter initialEntries={[`/dashboard${search}`]}>
      <Dashboard />
    </MemoryRouter>
  );
}

describe("Dashboard page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subscriptionReady = true;
  });

  it("shows empty state when no product specified", () => {
    renderDashboard();
    expect(screen.getByText("No Analysis Yet")).toBeInTheDocument();
    expect(screen.getByText("Analyze a Product")).toBeInTheDocument();
  });

  it("waits for access to load and starts the requested analysis exactly once", async () => {
    const { analyzeProduct } = await import("@/lib/api/analyze");
    vi.mocked(analyzeProduct).mockImplementation(() => new Promise(() => {}));
    subscriptionReady = false;
    const view = renderDashboard("?product=TestProduct");
    expect(analyzeProduct).not.toHaveBeenCalled();
    expect(screen.queryByText("Analysis Failed")).not.toBeInTheDocument();
    subscriptionReady = true;
    view.rerender(<MemoryRouter initialEntries={["/dashboard?product=TestProduct"]}><Dashboard /></MemoryRouter>);
    await waitFor(() => expect(analyzeProduct).toHaveBeenCalledTimes(1));
  });

  it("shows loading state during analysis", async () => {
    const { analyzeProduct } = await import("@/lib/api/analyze");
    (analyzeProduct as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {})
    );

    renderDashboard("?product=TestProduct");
    await waitFor(() => {
      expect(screen.getByText(/Analyzing/i)).toBeInTheDocument();
    });
  });

  it("displays error state on analysis failure", async () => {
    const { analyzeProduct } = await import("@/lib/api/analyze");
    (analyzeProduct as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error")
    );

    renderDashboard("?product=TestProduct");
    await waitFor(() => {
      expect(screen.getByText("Analysis Failed")).toBeInTheDocument();
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });
});
