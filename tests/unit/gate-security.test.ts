import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  scanTextForSecrets,
  checkSqlContent,
  decodeJwtRole,
} = require('../../scripts/gate.cjs') as {
  scanTextForSecrets: (text: string, label: string, opts?: { checkFallbacks?: boolean }) => string[];
  checkSqlContent: (sql: string, label: string) => string[];
  decodeJwtRole: (token: string) => string | null;
};

function makeFakeJwt(payload: Record<string, unknown>): string {
  const b64url = (obj: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
  return [b64url({ alg: 'HS256', typ: 'JWT' }), b64url(payload), 'sig_placeholder_123456'].join('.');
}

test('gate secrets - catches secret signatures, service_role JWT, and non-empty env fallbacks', () => {
  const fakeGoogleKey = ['AIza', 'Sy', 'A'.repeat(33)].join('');
  const fakeGithubPat = ['ghp', '_', 'a'.repeat(36)].join('');
  const fakeSupabaseSecret = ['sb_secret', '_', 'X'.repeat(24)].join('');
  const fakeServiceJwt = makeFakeJwt({ iss: 'supabase', role: 'service_role', iat: 1700000000 });
  const fakeFallback = "const s = process.env.JWT_SECRET || 'hardcoded-dev-secret';";

  assert.equal(decodeJwtRole(fakeServiceJwt), 'service_role');
  assert.ok(scanTextForSecrets(fakeGoogleKey, 'fixture.ts').length > 0);
  assert.ok(scanTextForSecrets(fakeGithubPat, 'fixture.ts').length > 0);
  assert.ok(scanTextForSecrets(fakeSupabaseSecret, 'fixture.ts').length > 0);
  assert.ok(scanTextForSecrets(fakeServiceJwt, 'fixture.js', { checkFallbacks: false }).length > 0);
  assert.ok(scanTextForSecrets(fakeFallback, 'fixture.ts').length > 0);
});

test('gate secrets - allows sb_publishable_, anon JWT, and empty env fallback', () => {
  const fakePublishable = ['sb_publishable', '_', 'P'.repeat(24)].join('');
  const fakeAnonJwt = makeFakeJwt({ iss: 'supabase', role: 'anon', iat: 1700000000 });
  const emptyFallback = "const k = import.meta.env.VITE_SUPABASE_ANON_KEY || '';";
  const emptyServerFallback = "const s = process.env.GEMINI_API_KEY || '';";

  assert.equal(decodeJwtRole(fakeAnonJwt), 'anon');
  assert.deepEqual(scanTextForSecrets(fakePublishable, 'dist/app.js', { checkFallbacks: false }), []);
  assert.deepEqual(scanTextForSecrets(fakeAnonJwt, 'dist/app.js', { checkFallbacks: false }), []);
  assert.deepEqual(scanTextForSecrets(emptyFallback, 'src/lib/supabase.ts'), []);
  assert.deepEqual(scanTextForSecrets(emptyServerFallback, 'api/test.ts'), []);
});

test('gate sql/rls - catches missing RLS, permissive using(true), and SECURITY DEFINER without search_path', () => {
  const missingRls = 'create table public.orders (id uuid primary key);';
  assert.ok(checkSqlContent(missingRls, 'bad1.sql').some((m) => m.includes('enable row level security')));

  const permissive = `
    create table public.items (id uuid primary key);
    alter table public.items enable row level security;
    create policy "open" on public.items for select using (true);
  `;
  assert.ok(checkSqlContent(permissive, 'bad2.sql').some((m) => m.includes('rls-allow-public')));

  const annotatedPermissive = `
    create table public.items (id uuid primary key);
    alter table public.items enable row level security;
    -- rls-allow-public: intentionally public catalog
    create policy "open" on public.items for select using (true);
  `;
  assert.deepEqual(checkSqlContent(annotatedPermissive, 'ok-annotated.sql'), []);

  const unsafeDefiner = `
    create or replace function public.do_thing()
    returns void
    language sql
    security definer
    as $$ select 1; $$;
  `;
  assert.ok(checkSqlContent(unsafeDefiner, 'bad3.sql').some((m) => m.includes('set search_path')));

  // Regression: SECURITY DEFINER placed after $$ ... $$ body
  const trailingDefiner = `
    create or replace function public.do_other()
    returns void
    as $$ select 1; $$
    language sql
    security definer;
  `;
  assert.ok(checkSqlContent(trailingDefiner, 'bad4.sql').some((m) => m.includes('set search_path')));

  // Regression: cross-statement policy bypass (policy on a + index on b must NOT satisfy b)
  const crossStmt = `
    create table public.a (id uuid primary key);
    alter table public.a enable row level security;
    create policy "own a" on public.a for select using (auth.uid() = id);
    create table public.b (id uuid primary key);
    alter table public.b enable row level security;
    create index idx_b on public.b (id);
  `;
  assert.ok(checkSqlContent(crossStmt, 'bad5.sql').some((m) => m.includes("table 'public.b'")));

  // Regression: non-public schema table
  const customSchema = `
    create table app.secrets (id uuid primary key);
  `;
  assert.ok(checkSqlContent(customSchema, 'bad6.sql').some((m) => m.includes("table 'app.secrets'")));
});

test('gate sql/rls - passes real supabase/schema.sql and deny-all supabase/keepalive.sql', () => {
  const root = path.resolve(import.meta.dirname, '..', '..');
  const schemaSql = fs.readFileSync(path.join(root, 'supabase', 'schema.sql'), 'utf8');
  const keepaliveSql = fs.readFileSync(path.join(root, 'supabase', 'keepalive.sql'), 'utf8');

  assert.deepEqual(checkSqlContent(schemaSql, 'supabase/schema.sql'), []);
  assert.deepEqual(checkSqlContent(keepaliveSql, 'supabase/keepalive.sql'), []);
});
