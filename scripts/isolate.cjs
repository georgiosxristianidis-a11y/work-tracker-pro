const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function execSafe(cmd, cwd = process.cwd()) {
  try {
    const out = execSync(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { ok: true, code: 0, out: out.trim() };
  } catch (err) {
    const stdout = err.stdout ? err.stdout.toString() : '';
    const stderr = err.stderr ? err.stderr.toString() : '';
    return { ok: false, code: err.status || 1, out: (stdout + '\n' + stderr).trim() };
  }
}

const rootDir = path.resolve(__dirname, '..');
const worktreesDir = path.join(rootDir, '.worktrees');

function start(name) {
  if (!name || !/^[a-zA-Z0-9-_]+$/.test(name)) {
    console.error('[ISOLATE] Invalid task name. Use alphanumeric characters, hyphens, and underscores.');
    process.exit(1);
  }

  if (!fs.existsSync(worktreesDir)) {
    fs.mkdirSync(worktreesDir, { recursive: true });
  }

  const targetPath = path.join(worktreesDir, name);
  const branchName = `worktree/${name}`;

  if (fs.existsSync(targetPath)) {
    console.error(`[ISOLATE] Worktree directory already exists: ${targetPath}`);
    process.exit(1);
  }

  console.log(`[ISOLATE] Creating ephemeral worktree: ${branchName} at .worktrees/${name}`);
  const addRes = execSafe(`git worktree add -b ${branchName} "${targetPath}" HEAD`, rootDir);
  if (!addRes.ok) {
    console.error(`[ISOLATE] Failed to create git worktree:\n${addRes.out}`);
    process.exit(1);
  }

  // Link node_modules via Windows junction / symlink
  const rootNodeModules = path.join(rootDir, 'node_modules');
  const targetNodeModules = path.join(targetPath, 'node_modules');

  if (fs.existsSync(rootNodeModules) && !fs.existsSync(targetNodeModules)) {
    try {
      if (process.platform === 'win32') {
        execSync(`cmd /c mklink /j "${targetNodeModules}" "${rootNodeModules}"`, { stdio: ['pipe', 'pipe', 'pipe'] });
      } else {
        fs.symlinkSync(rootNodeModules, targetNodeModules, 'junction');
      }
      console.log('[ISOLATE] Linked node_modules (instant junction, 0 install time).');
    } catch (e) {
      console.warn('[ISOLATE] Warning: Could not create node_modules junction. Manual npm install may be needed.');
    }
  }

  console.log(`[ISOLATE] READY: Worktree isolated at .worktrees/${name}`);
  console.log(`[ISOLATE] To work: cd .worktrees/${name}`);
  process.exit(0);
}

function verify(name) {
  const targetPath = path.join(worktreesDir, name);
  if (!fs.existsSync(targetPath)) {
    console.error(`[ISOLATE] Worktree not found: ${targetPath}`);
    process.exit(1);
  }

  console.log(`[ISOLATE] Running Gatekeeper in .worktrees/${name}...`);
  const gateRes = execSafe('node scripts/gate.cjs --bypass-diff-limit', targetPath);
  if (!gateRes.ok) {
    console.error(`[ISOLATE] GATE FAILED in worktree:\n${gateRes.out}`);
    process.exit(1);
  }
  console.log(`[ISOLATE] GATE PASSED (exit 0) in .worktrees/${name}`);
  process.exit(0);
}

function merge(name) {
  const targetPath = path.join(worktreesDir, name);
  const branchName = `worktree/${name}`;

  if (!fs.existsSync(targetPath)) {
    console.error(`[ISOLATE] Worktree not found: ${targetPath}`);
    process.exit(1);
  }

  console.log(`[ISOLATE] Verifying gate before merge...`);
  const gateRes = execSafe('node scripts/gate.cjs --bypass-diff-limit', targetPath);
  if (!gateRes.ok) {
    console.error(`[ISOLATE] Cannot merge: Gate failed in worktree:\n${gateRes.out}`);
    process.exit(1);
  }

  console.log(`[ISOLATE] Performing fast-forward merge into main...`);
  const mergeRes = execSafe(`git merge --ff-only ${branchName}`, rootDir);
  if (!mergeRes.ok) {
    console.error(`[ISOLATE] Fast-forward merge failed:\n${mergeRes.out}`);
    process.exit(1);
  }

  // Cleanup worktree and branch
  abort(name, true);
  console.log(`[ISOLATE] Merge and cleanup complete for: ${name}`);
  process.exit(0);
}

function abort(name, isMerged = false) {
  const targetPath = path.join(worktreesDir, name);
  const branchName = `worktree/${name}`;

  // Remove worktree
  execSafe(`git worktree remove --force "${targetPath}"`, rootDir);
  if (fs.existsSync(targetPath)) {
    try {
      fs.rmSync(targetPath, { recursive: true, force: true });
    } catch (_) {}
  }

  // Delete branch
  execSafe(`git branch -D ${branchName}`, rootDir);

  if (!isMerged) {
    console.log(`[ISOLATE] Wiped worktree and branch: ${name} (clean rollback, 0 leftover diff)`);
  }
}

const [,, cmd, taskName] = process.argv;

if (!cmd || !taskName) {
  console.log('Usage: node scripts/isolate.cjs <start|verify|merge|abort> <task_name>');
  process.exit(1);
}

if (cmd === 'start') {
  start(taskName);
} else if (cmd === 'verify') {
  verify(taskName);
} else if (cmd === 'merge') {
  merge(taskName);
} else if (cmd === 'abort') {
  abort(taskName);
} else {
  console.error(`[ISOLATE] Unknown command: ${cmd}`);
  process.exit(1);
}
