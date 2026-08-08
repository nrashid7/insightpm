import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe("billing API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("createCheckoutSession returns checkout URL", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: { url: "https://checkout.stripe.com/test" },
      error: null,
    });

    const { createCheckoutSession } = await import("@/lib/api/billing");
    const url = await createCheckoutSession("growth");
    expect(url).toBe("https://checkout.stripe.com/test");
    expect(supabase.functions.invoke).toHaveBeenCalledWith("stripe-checkout", {
      body: { plan: "growth" },
    });
  });

  it("openBillingPortal throws when no URL", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: { error: "No billing account" },
      error: null,
    });

    const { openBillingPortal } = await import("@/lib/api/billing");
    await expect(openBillingPortal()).rejects.toThrow(/billing account/i);
  });
});
