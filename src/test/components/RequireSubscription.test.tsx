import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RequireSubscription } from "@/components/RequireSubscription";

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: vi.fn(),
}));

import { useSubscription } from "@/hooks/useSubscription";

describe("RequireSubscription", () => {
  it("shows upgrade message when not subscribed", () => {
    (useSubscription as ReturnType<typeof vi.fn>).mockReturnValue({
      isActive: false,
      loading: false,
      plan: null,
      analysesUsed: 0,
      limits: null,
    });

    render(
      <MemoryRouter>
        <RequireSubscription>
          <div>Protected</div>
        </RequireSubscription>
      </MemoryRouter>
    );

    expect(screen.getByText(/Subscription required/i)).toBeInTheDocument();
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  });

  it("renders children when subscribed", () => {
    (useSubscription as ReturnType<typeof vi.fn>).mockReturnValue({
      isActive: true,
      loading: false,
      plan: "growth",
      analysesUsed: 0,
      limits: { analysesPerMonth: 5, label: "Growth" },
    });

    render(
      <MemoryRouter>
        <RequireSubscription>
          <div>Protected</div>
        </RequireSubscription>
      </MemoryRouter>
    );

    expect(screen.getByText("Protected")).toBeInTheDocument();
  });
});
