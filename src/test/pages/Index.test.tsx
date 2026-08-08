import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/components/landing/Navbar", () => ({ default: () => <div>Navigation</div> }));
vi.mock("@/components/landing/HeroSection", () => ({ default: () => <div>Hero</div> }));
vi.mock("@/components/landing/BentoFeatures", () => ({ default: () => <div>Features</div> }));
vi.mock("@/components/landing/HowItWorksSection", () => ({ default: () => <div>How it works</div> }));
vi.mock("@/components/landing/Testimonials", () => ({ default: () => <div>Use cases</div> }));
vi.mock("@/components/landing/PricingSection", () => ({ default: () => <div>Pricing</div> }));
vi.mock("@/components/landing/CTABanner", () => ({ default: () => <div>Call to action</div> }));
vi.mock("@/components/landing/Footer", () => ({ default: () => <div>Footer</div> }));

import Index from "@/pages/Index";

describe("Index page", () => {
  it("assembles every landing-page section", () => {
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>,
    );

    for (const section of [
      "Navigation",
      "Hero",
      "Features",
      "How it works",
      "Use cases",
      "Pricing",
      "Call to action",
      "Footer",
    ]) {
      expect(screen.getByText(section)).toBeInTheDocument();
    }
  });
});
