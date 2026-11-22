const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const HEX_EXEMPT_FILES = new Set(['Logo.tsx', 'BrandedQRCode.tsx']); // Brand mark & QR scan contrast require fixed colors
const MAX_COMPONENT_HEX = 40; // Ratchet ceiling: lower this as legacy #hex occurrences are migrated to tokens

function countComponentHex(dir) {
  let total = 0;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) total += countComponentHex(full);
    else if (/\.(ts|tsx)$/.test(ent.name) && !HEX_EXEMPT_FILES.has(ent.name)) {
      const matches = fs.readFileSync(full, 'utf8').match(/#[0-9a-fA-F]{3,8}\b/g);
      if (matches) total += matches.length;
    }
  }
  return total;
}

function checkDesignTokens() {
  const hexCount = countComponentHex(path.join(projectRoot, 'src/components'));
  if (hexCount > MAX_COMPONENT_HEX) {
    return { ok: false, message: `Hardcoded #hex ratchet exceeded: ${hexCount} > ${MAX_COMPONENT_HEX}. Use CSS tokens from src/index.css.` };
  }
  const assetsDir = path.join(projectRoot, 'dist/assets');
  const cssFiles = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).filter(f => f.endsWith('.css')) : [];
  for (const file of cssFiles) {
    const css = fs.readFileSync(path.join(assetsDir, file), 'utf8');
    const wk = (css.match(/-webkit-backdrop-filter:/g) || []).length;
    const std = (css.replace(/-webkit-backdrop-filter:/g, '').match(/backdrop-filter:/g) || []).length;
    if (wk === 0 || wk !== std) {
      return { ok: false, message: `Backdrop-filter mismatch in dist/assets/${file} (webkit=${wk}, std=${std}). Put -webkit-backdrop-filter first.` };
    }
  }
  return { ok: true, hexCount };
}

function runCommand(cmd, options = {}) {
  try {
    const output = execSync(cmd, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      ...options
    });
    return { success: true, code: 0, output };
  } catch (err) {
    const stdout = err.stdout ? err.stdout.toString() : '';
    const stderr = err.stderr ? err.stderr.toString() : '';
    return {
      success: false,
      code: err.status || 1,
      output: (stdout + '\n' + stderr).trim()
    };
  }
}

function filterNoise(rawText, maxLines = 14) {
  if (!rawText) return 'Unknown error (empty output)';
  
  // Cursor-style LSP diagnostic parsing: file(line,col): error TSXXXX: message
  const tsErrorRegex = /^([^\s(]+)\((\d+),(\d+)\):\s*error\s*(TS\d+):\s*(.+)$/gm;
  const diagnostics = [];
  let match;
  while ((match = tsErrorRegex.exec(rawText)) !== null) {
    const [, relFile, lineStr, colStr, code, msg] = match;
    const lineNum = parseInt(lineStr, 10);
    let codeSnippet = '';
    try {
      const fullPath = path.resolve(projectRoot, relFile);
      if (fs.existsSync(fullPath)) {
        const fileLines = fs.readFileSync(fullPath, 'utf8').split('\n');
        if (fileLines[lineNum - 1]) {
          codeSnippet = `\n    > ${lineNum} | ${fileLines[lineNum - 1].trim()}`;
        }
      }
    } catch (_) {}
    diagnostics.push(`[LSP DIAGNOSTIC] ${relFile}:${lineNum}:${colStr} [${code}]\n    ${msg}${codeSnippet}`);
  }

  if (diagnostics.length > 0) {
    return diagnostics.slice(0, 4).join('\n\n');
  }

  const lines = rawText.split('\n')
    .map(l => l.trimEnd())
    .filter(l => l.length > 0 && !l.includes('node_modules') && !l.startsWith('npm warn'));
  return lines.slice(0, maxLines).join('\n');
}

function checkDiff() {
  try {
    const statusOut = execSync('git status --porcelain', { cwd: projectRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    if (!statusOut) {
      return { ok: true, filesCount: 0, lineDiff: 0, message: 'clean' };
    }
    const lines = statusOut.split('\n').filter(Boolean);
    const filesCount = lines.length;

    let lineDiff = 0;
    try {
      const numstatOut = execSync('git diff --numstat HEAD', { cwd: projectRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
      if (numstatOut) {
        numstatOut.split('\n').forEach(line => {
          const parts = line.split('\t');
          if (parts.length >= 2) {
            const added = parseInt(parts[0], 10) || 0;
            const deleted = parseInt(parts[1], 10) || 0;
            lineDiff += (added + deleted);
          }
        });
      }
    } catch (_) {
      // ignore
    }

    const maxFiles = 3;
    const maxLines = 80;
    const bypass = process.argv.includes('--bypass-diff-limit');

    if (!bypass && (filesCount > maxFiles || lineDiff > maxLines)) {
      return {
        ok: false,
        filesCount,
        lineDiff,
        message: `Diff limit exceeded: ${filesCount} files (max ${maxFiles}), ${lineDiff} lines (max ${maxLines}). Plan approval required.`
      };
    }

    return { ok: true, filesCount, lineDiff, message: `${filesCount} files, ${lineDiff} lines` };
  } catch (err) {
    return { ok: true, filesCount: 0, lineDiff: 0, message: 'git check skipped' };
  }
}

function decodeJwtRole(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
    return typeof payload.role === 'string' ? payload.role : null;
  } catch (_) {
    return null;
  }
}

const SECRET_PATTERNS = [
  { name: 'Google API key', regex: /AIza[0-9A-Za-z_-]{35}/ },
  { name: 'Secret API key (sk-*)', regex: /\bsk-(?:proj-|live-|test-)?[A-Za-z0-9_-]{20,}\b/ },
  { name: 'GitHub PAT', regex: /\bghp_[A-Za-z0-9]{36}\b/ },
  { name: 'Supabase secret key', regex: /\bsb_secret_[A-Za-z0-9_-]{10,}\b/ },
  { name: 'Private key block', regex: /-----BEGIN [A-Z ]+PRIVATE KEY-----/ },
];

const FALLBACK_SECRET_REGEX =
  /\b(?:process|import\.meta)\.env\.[A-Z0-9_]*(?:SECRET|API_KEY|PRIVATE_KEY|SERVICE_ROLE|TOKEN)[A-Z0-9_]*\s*(?:\|\||\?\?)\s*(['"`])(?!\1)[^'"`]+\1/;

const JWT_REGEX = /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;

function scanTextForSecrets(text, fileLabel, options = {}) {
  const { checkFallbacks = true } = options;
  const findings = [];

  for (const { name, regex } of SECRET_PATTERNS) {
    if (regex.test(text)) {
      findings.push(`${fileLabel}: ${name} detected`);
    }
  }

  let jwtMatch;
  JWT_REGEX.lastIndex = 0;
  while ((jwtMatch = JWT_REGEX.exec(text)) !== null) {
    const role = decodeJwtRole(jwtMatch[0]);
    if (role === 'service_role') {
      findings.push(`${fileLabel}: Supabase service_role JWT detected`);
    }
  }

  if (checkFallbacks && FALLBACK_SECRET_REGEX.test(text)) {
    findings.push(`${fileLabel}: non-empty fallback secret in env expression`);
  }

  return findings;
}

function collectFiles(dir, exts) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      results.push(...collectFiles(full, exts));
    } else if (exts.test(ent.name)) {
      results.push(full);
    }
  }
  return results;
}

function checkSecrets(rootDir = projectRoot) {
  const findings = [];

  // 1. Tracked .env* files (allow .env.example / .env.sample / .env.template)
  try {
    const tracked = execSync('git ls-files', { cwd: rootDir, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
      .split(/\r?\n/)
      .filter(Boolean);
    for (const rel of tracked) {
      if (/(^|\/)\.env(\..+)?$/i.test(rel) && !/\.env\.(example|sample|template)$/i.test(rel)) {
        findings.push(`${rel}: tracked env file is forbidden`);
      }
    }
  } catch (_) {
    // non-git environment
  }

  // 2. Source directories + root config files
  const sourceDirs = ['src', 'api', 'scripts', 'supabase', '.github'];
  for (const relDir of sourceDirs) {
    for (const full of collectFiles(path.join(rootDir, relDir), /\.(ts|tsx|js|cjs|mjs|sql|yml|yaml)$/)) {
      const rel = path.relative(rootDir, full).replace(/\\/g, '/');
      const content = fs.readFileSync(full, 'utf8');
      findings.push(...scanTextForSecrets(content, rel, { checkFallbacks: true }));
    }
  }
  for (const rootFile of ['vite.config.ts', 'index.html', 'vercel.json']) {
    const full = path.join(rootDir, rootFile);
    if (fs.existsSync(full)) {
      const content = fs.readFileSync(full, 'utf8');
      findings.push(...scanTextForSecrets(content, rootFile, { checkFallbacks: true }));
    }
  }

  // 3. Built client assets (dist/assets/*.js)
  const distAssetsDir = path.join(rootDir, 'dist', 'assets');
  for (const full of collectFiles(distAssetsDir, /\.js$/)) {
    const rel = path.relative(rootDir, full).replace(/\\/g, '/');
    const content = fs.readFileSync(full, 'utf8');
    findings.push(...scanTextForSecrets(content, rel, { checkFallbacks: false }));
  }

  if (findings.length > 0) {
    return { ok: false, findings, message: `Secret gate failed:\n  - ${findings.slice(0, 6).join('\n  - ')}` };
  }
  return { ok: true, findings: [] };
}

function checkSqlContent(sql, fileLabel) {
  const findings = [];
  const lines = sql.split(/\r?\n/);

  // 1. Permissive policy check: using (true) / with check (true) without explicit annotation
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*--/.test(line)) continue;
    const codePart = line.replace(/--.*$/, '');
    if (/\b(?:using|with\s+check)\s*\(\s*true\s*\)/i.test(codePart)) {
      const prevLine = i > 0 ? lines[i - 1] : '';
      if (!/--\s*rls-allow-public:/i.test(line) && !/--\s*rls-allow-public:/i.test(prevLine)) {
        findings.push(`${fileLabel}:${i + 1}: permissive RLS predicate (true) requires '-- rls-allow-public: <reason>'`);
      }
    }
  }

  // Strip SQL comments for structural checks
  const cleanSql = sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\r\n]*/g, ' ');

  // 2. Every CREATE TABLE must enable RLS + declare a policy OR revoke all
  const tableRegex = /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?(?:(?:"?([a-zA-Z_][a-zA-Z0-9_]*)"?)\.)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?/gi;
  const tables = new Map();
  let tMatch;
  while ((tMatch = tableRegex.exec(cleanSql)) !== null) {
    const schema = tMatch[1] ? tMatch[1].toLowerCase() : null;
    const name = tMatch[2].toLowerCase();
    tables.set(schema ? `${schema}.${name}` : name, { schema, name });
  }

  for (const [label, { schema, name }] of tables) {
    const schemaPrefix = schema
      ? `(?:"?${schema}"?\\.)?`
      : '(?:(?:"?[a-zA-Z_][a-zA-Z0-9_]*"?)\\.)?';
    const rlsRegex = new RegExp(`\\balter\\s+table\\s+(?:only\\s+)?${schemaPrefix}"?${name}"?\\s+enable\\s+row\\s+level\\s+security\\b`, 'i');
    if (!rlsRegex.test(cleanSql)) {
      findings.push(`${fileLabel}: table '${label}' missing 'enable row level security'`);
    }
    const policyRegex = new RegExp(`\\bcreate\\s+policy\\s+[^;]*?\\bon\\s+${schemaPrefix}"?${name}"?\\b`, 'i');
    const revokeRegex = new RegExp(`\\brevoke\\s+all\\s+(?:privileges\\s+)?on\\s+(?:table\\s+)?${schemaPrefix}"?${name}"?\\b`, 'i');
    if (!policyRegex.test(cleanSql) && !revokeRegex.test(cleanSql)) {
      findings.push(`${fileLabel}: table '${label}' must define at least one policy or 'revoke all on table'`);
    }
  }

  // 3. Every SECURITY DEFINER function must set search_path (handles attributes before OR after body)
  const strippedBodies = cleanSql.replace(/\$([a-zA-Z0-9_]*)\$[\s\S]*?\$\1\$/g, '$$BODY$$');
  const fnStmtRegex = /\bcreate\s+(?:or\s+replace\s+)?function\s+([a-zA-Z0-9_."]+)\s*\([^;]*?;/gi;
  let fnMatch;
  while ((fnMatch = fnStmtRegex.exec(strippedBodies)) !== null) {
    const fnName = fnMatch[1];
    const stmt = fnMatch[0];
    if (/\bsecurity\s+definer\b/i.test(stmt) && !/\bset\s+search_path\b/i.test(stmt)) {
      findings.push(`${fileLabel}: SECURITY DEFINER function '${fnName}' missing 'set search_path'`);
    }
  }

  return findings;
}

function checkSqlRls(rootDir = projectRoot) {
  const sqlDir = path.join(rootDir, 'supabase');
  if (!fs.existsSync(sqlDir)) return { ok: true, findings: [] };

  const findings = [];
  for (const full of collectFiles(sqlDir, /\.sql$/)) {
    const rel = path.relative(rootDir, full).replace(/\\/g, '/');
    const sql = fs.readFileSync(full, 'utf8');
    findings.push(...checkSqlContent(sql, rel));
  }

  if (findings.length > 0) {
    return { ok: false, findings, message: `SQL/RLS gate failed:\n  - ${findings.slice(0, 6).join('\n  - ')}` };
  }
  return { ok: true, findings: [] };
}

function main() {
  // 1. TypeScript Check
  const tscPath = path.join(projectRoot, 'node_modules/typescript/lib/tsc.js');
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
  const tscCmd = fs.existsSync(tscPath)
    ? `node "${tscPath}" -p "${tsconfigPath}" --noEmit`
    : `npx tsc -p "${tsconfigPath}" --noEmit`;
  const tscRes = runCommand(tscCmd);
  if (!tscRes.success) {
    console.error('[GATE] FAIL: TypeScript check failed (exit 1)');
    console.error(filterNoise(tscRes.output));
    process.exit(1);
  }

  // 2. ESLint Check
  const eslintRes = runCommand('npm run lint:eslint');
  if (!eslintRes.success) {
    console.error('[GATE] FAIL: ESLint failed (exit 1)');
    console.error(filterNoise(eslintRes.output));
    process.exit(1);
  }

  // 3. Unit Tests
  const unitRes = runCommand('npm run test:unit');
  if (!unitRes.success) {
    console.error('[GATE] FAIL: Unit tests failed (exit 1)');
    console.error(filterNoise(unitRes.output));
    process.exit(1);
  }

  // 4. Vite Build Check
  const vitePath = path.join(projectRoot, 'node_modules/vite/bin/vite.js');
  const viteCmd = fs.existsSync(vitePath)
    ? `node "${vitePath}" build "${projectRoot}"`
    : `npx vite build "${projectRoot}"`;
  const buildRes = runCommand(viteCmd);
  if (!buildRes.success) {
    console.error('[GATE] FAIL: Build failed (exit 1)');
    console.error(filterNoise(buildRes.output));
    process.exit(1);
  }

  // 5. Supabase Passport Check — ref в keep-alive и ссылках = supabase/project.json
  const passportRes = runCommand(`node "${path.join(projectRoot, 'scripts/supabase-passport.mjs')}" --check`);
  if (!passportRes.success) {
    console.error('[GATE] FAIL: Supabase passport mismatch (exit 1)');
    console.error(filterNoise(passportRes.output));
    process.exit(1);
  }

  // 6. Design Tokens & Glass Ratchet Check
  const tokenRes = checkDesignTokens();
  if (!tokenRes.ok) {
    console.error(`[GATE] FAIL: ${tokenRes.message}`);
    process.exit(1);
  }

  // 7. Secret & Client Bundle Gate
  const secretRes = checkSecrets();
  if (!secretRes.ok) {
    console.error(`[GATE] FAIL: ${secretRes.message}`);
    process.exit(1);
  }

  // 8. SQL / Row-Level Security Gate
  const rlsRes = checkSqlRls();
  if (!rlsRes.ok) {
    console.error(`[GATE] FAIL: ${rlsRes.message}`);
    process.exit(1);
  }

  // 9. Diff Check
  const diffCheck = checkDiff();
  if (!diffCheck.ok) {
    console.error(`[GATE] FAIL: ${diffCheck.message}`);
    console.error('Hint: Use --bypass-diff-limit if user explicitly approved a larger scope.');
    process.exit(1);
  }

  console.log(`[GATE] PASS: TypeScript OK | ESLint OK | Build OK | Secrets OK | RLS OK | Hex: ${tokenRes.hexCount}/${MAX_COMPONENT_HEX} | Diff: ${diffCheck.message} (exit 0)`);
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = {
  checkSecrets,
  checkSqlRls,
  scanTextForSecrets,
  decodeJwtRole,
  checkSqlContent,
};
