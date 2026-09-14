import { describe, expect, it, vi } from "vitest";
import { compareMonitoringResults, processMonitoringBatch } from "../../../supabase/functions/_shared/monitoring-worker";

const product = { id: "monitor-1", user_id: "owner-1", product_name: "Example", website: null, competitors: null, sources: [], frequency: "daily", lease_token: "lease-1", last_analysis_id: null };

function database(finishError: string | null = null) {
  const filters: [string, unknown][] = [];
  const query: any = {
    select: vi.fn(() => query), eq: vi.fn((key, value) => { filters.push([key, value]); return query; }),
    is: vi.fn((key, value) => { filters.push([key, value]); return query; }),
    order: vi.fn(() => query), limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: { results: { totalFeedback: 10, complaints: [] } }, error: null })),
  };
  const rpc = vi.fn(async (name: string) => {
    if (name === "claim_monitoring_products") return { data: [product], error: null };
    if (name === "complete_monitoring_product") return { data: true, error: finishError ? { message: finishError } : null };
    return { data: true, error: null };
  });
  return { from: vi.fn(() => query), rpc, filters };
}

describe("monitoring worker", () => {
  it("claims a bounded batch and scopes the baseline by owner and identity", async () => {
    const db = database();
    const analyze = vi.fn(async () => ({ analysisId: "saved-1", totalFeedback: 20 }));
    const result = await processMonitoringBatch(db, analyze);
    expect(db.rpc).toHaveBeenCalledWith("claim_monitoring_products", { p_batch_size: 2 });
    expect(db.filters).toContainEqual(["user_id", "owner-1"]);
    expect(db.filters).toContainEqual(["product_name", "Example"]);
    expect(db.filters).toContainEqual(["website", null]);
    expect(db.filters).toContainEqual(["competitors", null]);
    expect(result).toMatchObject({ processed: 1, succeeded: 1, failed: 0 });
    expect(db.rpc).toHaveBeenCalledWith("complete_monitoring_product", expect.objectContaining({ p_product_id: "monitor-1", p_lease_token: "lease-1", p_analysis_id: "saved-1" }));
  });

  it("durably records analysis failures instead of counting them as success", async () => {
    const db = database();
    const result = await processMonitoringBatch(db, async () => { throw new Error("Provider unavailable"); });
    expect(result).toMatchObject({ succeeded: 0, failed: 1 });
    expect(db.rpc).toHaveBeenCalledWith("fail_monitoring_product", expect.objectContaining({ p_product_id: "monitor-1", p_lease_token: "lease-1", p_error: "Monitoring analysis could not complete. Retry is scheduled." }));
    expect(db.rpc).not.toHaveBeenCalledWith("complete_monitoring_product", expect.anything());
  });

  it("does not advance a schedule when persistence is not confirmed", async () => {
    const db = database();
    const result = await processMonitoringBatch(db, async () => ({ totalFeedback: 20 }));
    expect(result.failed).toBe(1);
    expect(db.rpc).not.toHaveBeenCalledWith("complete_monitoring_product", expect.anything());
  });

  it("treats failed atomic completion as a failed run", async () => {
    const db = database("alert insert failed");
    const result = await processMonitoringBatch(db, async () => ({ analysisId: "saved-1", totalFeedback: 20 }));
    expect(result).toMatchObject({ succeeded: 0, failed: 1 });
    expect(db.rpc).toHaveBeenCalledWith("fail_monitoring_product", expect.anything());
  });

  it("does not invent sentiment values when evidence has no rating", () => {
    const alerts = compareMonitoringResults({ totalFeedback: 5 }, { totalFeedback: 10, avgSentiment: 1 });
    expect(alerts.map(a => a.alert_type)).toEqual(["volume_change"]);
  });
});
