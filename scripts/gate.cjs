const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');

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

function filterNoise(rawText, maxLines = 12) {
  if (!rawText) return 'Unknown error (empty output)';
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

function main() {
  // 1. TypeScript Check
  const tscPath = path.join(projectRoot, 'node_modules/typescript/lib/tsc.js');
  const tscCmd = fs.existsSync(tscPath)
    ? `node "${tscPath}" --noEmit`
    : 'npx tsc --noEmit';
  const tscRes = runCommand(tscCmd);
  if (!tscRes.success) {
    console.error('[GATE] FAIL: TypeScript check failed (exit 1)');
    console.error(filterNoise(tscRes.output));
    process.exit(1);
  }

  // 2. Vite Build Check
  const vitePath = path.join(projectRoot, 'node_modules/vite/bin/vite.js');
  const viteCmd = fs.existsSync(vitePath)
    ? `node "${vitePath}" build`
    : 'npx vite build';
  const buildRes = runCommand(viteCmd);
  if (!buildRes.success) {
    console.error('[GATE] FAIL: Build failed (exit 1)');
    console.error(filterNoise(buildRes.output));
    process.exit(1);
  }

  // 3. Diff Check
  const diffCheck = checkDiff();
  if (!diffCheck.ok) {
    console.error(`[GATE] FAIL: ${diffCheck.message}`);
    console.error('Hint: Use --bypass-diff-limit if user explicitly approved a larger scope.');
    process.exit(1);
  }

  console.log(`[GATE] PASS: TypeScript OK | Build OK | Diff: ${diffCheck.message} (exit 0)`);
  process.exit(0);
}

main();
