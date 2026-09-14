// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

describe('completed analysis transaction', () => {
  it('enforces owner quota, excludes scheduled runs and restricts RPC access', async () => {
    const db = new PGlite();
    try {
      await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
        create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
        create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
        insert into auth.users values ('00000000-0000-4000-8000-000000000001');`);
      await db.exec(readFileSync('migration/schema.sql', 'utf8'));
      const args = ['00000000-0000-4000-8000-000000000001', 'Example', null, null, {totalFeedback: 2, runType: 'monitoring'}, false, 1];
      const sql = 'select public.save_completed_analysis($1,$2,$3,$4,$5,$6,$7) as id';
      await db.query(sql, args);
      args[4] = {totalFeedback: 2, runType: 'manual'}; args[5] = true;
      expect((await db.query(sql,args)).rows).toHaveLength(1);
      await expect(db.query(sql,args)).rejects.toThrow(/Monthly analysis limit/);
      expect((await db.query('select * from public.analyses')).rows).toHaveLength(2);
      await db.exec('set role authenticated');
      await expect(db.query(sql,args)).rejects.toThrow(/permission denied/);
    } finally { await db.close(); }
  }, 30000);
});
