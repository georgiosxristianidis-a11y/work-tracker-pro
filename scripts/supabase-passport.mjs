#!/usr/bin/env node
/**
 * Паспорт проекта Supabase (supabase/project.json) — единственный источник
 * ref, региона и GitHub-репо. У владельца два Free-проекта с keepalive_ping
 * (Work_tracker и Athlete-PRO-V7), URL одной длины: 01.11 секреты ушли не в тот
 * репо, и зелёный прогон этого не показал.
 *
 *   node scripts/supabase-passport.mjs          — команды gh secret set с --repo и URL из паспорта
 *   node scripts/supabase-passport.mjs --check  — ref в keep-alive и в ссылке Settings = паспорт (гоняет gate)
 *   node scripts/supabase-passport.mjs --prod   — ref, вшитый в прод-бандл (VITE_SUPABASE_URL), = паспорт
 *
 * Ключ скрипт не видит и не печатает: gh secret set без --body спросит его сам.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROD_URL = 'https://work-tracker-pro-kohl.vercel.app';
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const { name, ref, region, githubRepo } = JSON.parse(read('supabase/project.json'));

function check() {
  const problems = [];
  const workflowRefs = [...read('.github/workflows/supabase-keepalive.yml').matchAll(/^ *expected_ref=(\S+) *$/gm)].map((m) => m[1]);
  if (workflowRefs.length !== 1 || workflowRefs[0] !== ref) {
    problems.push(`keep-alive: expected_ref ${JSON.stringify(workflowRefs)} вместо ${ref}`);
  }
  if (/secrets\.SUPABASE_URL\s*\|\|/.test(read('.github/workflows/supabase-keepalive.yml'))) {
    problems.push('keep-alive: у SUPABASE_URL дефолт — пропавший секрет прячется за подставленным URL');
  }
  for (const m of read('src/components/SettingsScreen.tsx').matchAll(/supabase\.com\/dashboard\/project\/([a-z]+)/g)) {
    if (m[1] !== ref) problems.push(`SettingsScreen.tsx: ссылка на дашборд проекта ${m[1]} вместо ${ref}`);
  }
  if (problems.length) {
    console.error(`[PASSPORT] FAIL (${name}, ${ref}):\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`[PASSPORT] OK: ref ${ref} совпадает в keep-alive и SettingsScreen`);
}

async function checkProd(base) {
  const html = await (await fetch(base, { signal: AbortSignal.timeout(15000) })).text();
  // Клиент Supabase живёт в ленивом чанке: обходим граф импортов от entry.
  const queue = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => new URL(m[1], base).href);
  const seen = new Set();
  const found = new Set();
  while (queue.length && seen.size < 200) {
    const src = queue.shift();
    if (seen.has(src)) continue;
    seen.add(src);
    const js = await (await fetch(src, { signal: AbortSignal.timeout(15000) })).text();
    for (const m of js.matchAll(/https:\/\/([a-z]{20})\.supabase\.co/g)) found.add(m[1]);
    for (const m of js.matchAll(/["'(/]((?:\.\/|\/)?(?:assets\/)?[\w.-]+\.js)["')]/g)) {
      const next = m[1].includes('assets/') ? new URL(m[1].replace(/^\.?\//, '/'), base).href : new URL(m[1], src).href;
      if (next.startsWith(base) && !seen.has(next)) queue.push(next);
    }
  }
  if (found.size === 0) {
    console.error(`Прод ${base}: URL Supabase в бандле не найден (VITE_SUPABASE_URL не задан в Vercel?).`);
    process.exit(1);
  }
  const foreign = [...found].filter((r) => r !== ref);
  if (foreign.length) {
    console.error(`Прод ${base}: в бандле ref ${foreign.join(', ')}, паспорт — ${ref} (${name}). Поправить VITE_SUPABASE_URL в Vercel.`);
    process.exit(2);
  }
  console.log(`Прод ${base}: ref ${ref} совпадает с паспортом (${name}).`);
}

if (process.argv.includes('--check')) {
  check();
} else if (process.argv.includes('--prod')) {
  await checkProd(PROD_URL);
} else {
  console.log(`Паспорт: ${name} · ref ${ref} · ${region} · GitHub ${githubRepo}`);
  console.log('');
  console.log('Секреты keep-alive (ключ: Supabase Dashboard этого ref → Settings → API Keys → anon):');
  console.log(`  gh secret set SUPABASE_URL --repo ${githubRepo} --body "https://${ref}.supabase.co"`);
  console.log(`  gh secret set SUPABASE_ANON_KEY --repo ${githubRepo}`);
  console.log('');
  console.log('Проверка:');
  console.log(`  gh workflow run supabase-keepalive.yml --repo ${githubRepo}`);
}
