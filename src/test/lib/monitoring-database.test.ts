// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  `);
  await db.exec(readFileSync("migration/schema.sql", "utf8"));
  await db.query("insert into auth.users(id) values ($1), ($2)", [owner, other]);
}, 30000);

afterAll(async () => { await db?.close(); });

describe("executable fresh schema and monitoring", () => {
  it("creates beta profiles and enforces the five-monitor cap without billing", async () => {
    for (let i = 0; i < 5; i++) {
      await db.query("insert into public.monitored_products(user_id, product_name) values ($1, $2)", [owner, `Product ${i}`]);
    }
    await expect(db.query("insert into public.monitored_products(user_id, product_name) values ($1, 'Sixth')", [owner])).rejects.toThrow(/Monitor limit/);
  });

  it("claims each due monitor once, atomically completes and rejects a stale lease", async () => {
    const first = await db.query<any>("select * from public.claim_monitoring_products(2)");
    const second = await db.query<any>("select * from public.claim_monitoring_products(2)");
    expect(first.rows).toHaveLength(2);
    expect(second.rows).toHaveLength(2);
    expect(new Set([...first.rows, ...second.rows].map(row => row.id)).size).toBe(4);
    const row = first.rows[0];
    const saved = await db.query<{id: string}>("select public.save_completed_analysis($1, $2, null, null, $3, false, 5) as id", [owner, row.product_name, { totalFeedback: 3, runType: "monitoring" }]);
    const args = [row.id, row.lease_token, saved.rows[0].id, [{ alert_type: "volume_change", message: "More feedback", data: {} }]];
    await db.query("select public.complete_monitoring_product($1, $2, $3, $4)", args);
    await expect(db.query("select public.complete_monitoring_product($1, $2, $3, $4)", args)).rejects.toThrow(/lease/i);
    const state = await db.query<any>("select run_status, last_run_at, next_run_at, lease_token from public.monitored_products where id=$1", [row.id]);
    expect(state.rows[0].run_status).toBe("succeeded");
    expect(state.rows[0].lease_token).toBeNull();
    expect(new Date(state.rows[0].next_run_at).getTime()).toBeGreaterThan(Date.now());
  });

  it("keeps failed runs observable and schedules a retry", async () => {
    const claimed = await db.query<any>("select * from public.monitored_products where lease_token is not null limit 1");
    const row = claimed.rows[0];
    await db.query("select public.fail_monitoring_product($1,$2,'Temporary collection failure')", [row.id, row.lease_token]);
    const result = await db.query<any>("select run_status, consecutive_failures, last_error, next_run_at from public.monitored_products where id=$1", [row.id]);
    expect(result.rows[0]).toMatchObject({ run_status: "failed", consecutive_failures: 1, last_error: "Temporary collection failure" });
    expect(new Date(result.rows[0].next_run_at).getTime()).toBeGreaterThan(Date.now());
  });

  it("cascades linked evidence and alerts when owners delete their parent records", async () => {
    const saved = await db.query<any>("select public.save_completed_analysis($1,'Delete me',null,null,$2,false,5) as id", [owner, { totalFeedback: 2 }]);
    await db.query("insert into public.feedback_items(analysis_id,product_name,source,text) values ($1,'Delete me','custom','Evidence')", [saved.rows[0].id]);
    await db.query("insert into public.analysis_sources(analysis_id,source) values ($1,'custom')", [saved.rows[0].id]);
    await db.query("delete from public.analyses where id=$1", [saved.rows[0].id]);
    await db.exec("delete from public.monitored_products where id in (select product_id from public.monitoring_alerts)");
    expect((await db.query<any>("select count(*)::int as count from public.monitoring_alerts")).rows[0].count).toBe(0);
  });

  it("limits manual completed analyses atomically while excluding monitoring", async () => {
    await db.query("select public.save_completed_analysis($1,'Scheduled',null,null,$2,false,1)", [other, { totalFeedback: 2, runType: "monitoring" }]);
    await db.query("select public.save_completed_analysis($1,'Manual',null,null,$2,true,1)", [other, { totalFeedback: 2 }]);
    await expect(db.query("select public.save_completed_analysis($1,'Manual 2',null,null,$2,true,1)", [other, { totalFeedback: 2 }])).rejects.toThrow(/Monthly analysis limit/);
  });

  it("blocks an authenticated user from claims and operational-column updates", async () => {
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${other}';`);
    try {
      await expect(db.query("select * from public.claim_monitoring_products(2)")).rejects.toThrow(/permission denied/);
      await expect(db.query("update public.monitored_products set lease_token=gen_random_uuid() where user_id=$1", [other])).rejects.toThrow(/permission denied/);
      const rows = await db.query<any>("select * from public.monitored_products where user_id=$1", [owner]);
      expect(rows.rows).toEqual([]);
    } finally { await db.exec("reset role"); }
  });
});
