const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');

function getExec(cmd) {
  try {
    return execSync(cmd, { cwd: projectRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (err) {
    return '';
  }
}

function generateHandoff() {
  const branch = getExec('git rev-parse --abbrev-ref HEAD') || 'unknown';
  const status = getExec('git status -s') || '(clean working tree)';
  const lastCommit = getExec('git log -1 --oneline') || '(no commits yet)';

  // Run gate quickly to assess status
  let gateStatus = 'NOT_RUN';
  try {
    execSync(`node "${path.join(projectRoot, 'scripts/gate.cjs')}" --bypass-diff-limit`, {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    gateStatus = 'PASS (TypeScript + Build OK)';
  } catch (e) {
    gateStatus = 'FAIL (Needs Attention)';
  }

  const now = new Date().toISOString();
  const targetDir = path.resolve(__dirname, '../docs/handoff');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const handoffContent = `# TASK HANDOFF: ${branch}
- **Timestamp**: ${now}
- **Branch**: ${branch}
- **Last Commit**: ${lastCommit}
- **Gate Status**: ${gateStatus}

## Changed Files (git status -s)
\`\`\`
${status}
\`\`\`

## Next Action
- [ ] Verify next atomic goal
- [ ] Run \`npm run gate\` before commit
`;

  const targetFile = path.join(targetDir, 'current_task.md');
  fs.writeFileSync(targetFile, handoffContent.trim() + '\n', 'utf8');
  console.log(`[HANDOFF] Micro-state saved to docs/handoff/current_task.md (${handoffContent.split('\n').length} lines)`);
}

generateHandoff();
