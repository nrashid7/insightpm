import { describe, it, expect } from "vitest";
import {
  PLAN_LIMITS,
  isActiveSubscription,
  sourceAllowedForPlan,
} from "@/lib/plans";

describe("plans", () => {
  it("starter allows only reddit and appstore", () => {
    expect(sourceAllowedForPlan("starter", "reddit")).toBe(true);
    expect(sourceAllowedForPlan("starter", "appstore")).toBe(true);
    expect(sourceAllowedForPlan("starter", "github")).toBe(false);
    expect(sourceAllowedForPlan("starter", "custom")).toBe(true);
  });

  it("growth allows all sources", () => {
    expect(sourceAllowedForPlan("growth", "github")).toBe(true);
    expect(PLAN_LIMITS.growth.allowMarketSignals).toBe(true);
  });

  it("recognizes active subscription statuses", () => {
    expect(isActiveSubscription("active")).toBe(true);
    expect(isActiveSubscription("trialing")).toBe(true);
    expect(isActiveSubscription("canceled")).toBe(false);
    expect(isActiveSubscription(null)).toBe(false);
  });
});
