import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("supabase/migrations/20260808135832_tighten_service_policies.sql"),
  "utf8",
);
const schemaSnapshot = readFileSync(resolve("migration/schema.sql"), "utf8");

describe("launch hardening migration", () => {
  it("limits backend-only write policies to service_role", () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "Users can insert own profile"');
    expect(migration).toContain('DROP POLICY IF EXISTS "Users can update own profile"');
    expect(migration).toContain("REVOKE INSERT, UPDATE ON public.profiles FROM authenticated");
    expect(migration).toMatch(/analysis_sources[\s\S]+FOR INSERT[\s\S]+TO service_role/i);
    expect(migration).toMatch(/feedback_items[\s\S]+FOR INSERT[\s\S]+TO service_role/i);
    expect(migration).toMatch(/monitoring_alerts[\s\S]+FOR INSERT[\s\S]+TO service_role/i);
    expect(migration).toMatch(/monitored_products[\s\S]+FOR SELECT[\s\S]+TO service_role/i);
  });

  it("moves the privileged monitor-limit function out of public", () => {
    expect(migration).toContain("CREATE SCHEMA IF NOT EXISTS private");
    expect(migration).toContain("FUNCTION private.check_monitor_limit()");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("SET search_path = ''");
  });

  it("keeps the fresh-install schema aligned with launch hardening", () => {
    expect(schemaSnapshot).toContain("stripe_customer_id TEXT");
    expect(schemaSnapshot).toContain("CREATE TABLE public.rate_limit_buckets");
    expect(schemaSnapshot).toContain("FUNCTION private.check_monitor_limit()");
    expect(schemaSnapshot).not.toContain('POLICY "Users can update own profile"');
    expect(schemaSnapshot).not.toMatch(/FOR INSERT TO authenticated WITH CHECK \(true\)/);
    expect(schemaSnapshot).not.toMatch(/FOR UPDATE TO public USING \(true\)/);
  });
});
