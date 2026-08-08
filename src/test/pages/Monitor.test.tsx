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

vi.mock("@/lib/analytics", () => ({
  trackPageView: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => ({
    isActive: true,
    loading: false,
    plan: "growth",
    analysesRemaining: 5,
    analysesUsed: 0,
    limits: { maxMonitoredProducts: 5 },
    refresh: vi.fn(),
  }),
}));

const mockFrom = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import Monitor from "@/pages/Monitor";
import { useAuth } from "@/hooks/useAuth";

function renderMonitor() {
  return render(
    <MemoryRouter>
      <Monitor />
    </MemoryRouter>
  );
}

describe("Monitor page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /auth when not authenticated", async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      signOut: vi.fn(),
      session: null,
      loading: false,
    });

    renderMonitor();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth");
    });
  });

  it("shows empty state when no products are monitored", async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: "user-1", email: "test@example.com" },
      signOut: vi.fn(),
      session: { access_token: "tok" },
      loading: false,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "monitored_products") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      if (table === "monitoring_alerts") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    renderMonitor();

    await waitFor(() => {
      expect(screen.getByText("No products being monitored yet.")).toBeInTheDocument();
    });
  });

  it("displays monitored products", async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { id: "user-1", email: "test@example.com" },
      signOut: vi.fn(),
      session: { access_token: "tok" },
      loading: false,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "monitored_products") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "prod-1",
                  product_name: "Notion",
                  website: "https://notion.so",
                  competitors: null,
                  frequency: "daily",
                  last_run_at: null,
                  next_run_at: "2026-01-02T00:00:00Z",
                  is_active: true,
                  created_at: "2026-01-01T00:00:00Z",
                  user_id: "user-1",
                },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === "monitoring_alerts") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      if (table === "analyses") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
    });

    renderMonitor();

    await waitFor(() => {
      expect(screen.getByText("Notion")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("daily")).toBeInTheDocument();
    });
  });
});
