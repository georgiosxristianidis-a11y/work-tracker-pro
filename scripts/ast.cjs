const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function getSourceFile(filePath) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`[AST] File not found: ${filePath}`);
    process.exit(1);
  }
  const code = fs.readFileSync(fullPath, 'utf8');
  return ts.createSourceFile(
    fullPath,
    code,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') || filePath.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
}

function outline(filePath) {
  const sourceFile = getSourceFile(filePath);
  const results = [];

  results.push(`## AST Outline: ${path.basename(filePath)} (${sourceFile.text.split('\n').length} lines)`);

  let importCount = 0;
  const declarations = [];

  function visit(node) {
    if (ts.isImportDeclaration(node)) {
      importCount++;
      return;
    }

    if (ts.isInterfaceDeclaration(node)) {
      const name = node.name.text;
      const members = node.members.map(m => {
        if (m.name) return m.name.getText(sourceFile);
        return 'member';
      }).slice(0, 8).join(', ');
      declarations.push(`- interface **${name}** { ${members}${node.members.length > 8 ? ', ...' : ''} }`);
      return;
    }

    if (ts.isTypeAliasDeclaration(node)) {
      declarations.push(`- type **${node.name.text}**`);
      return;
    }

    if (ts.isFunctionDeclaration(node)) {
      const name = node.name ? node.name.text : 'anonymous';
      const params = node.parameters.map(p => p.getText(sourceFile)).join(', ');
      const ret = node.type ? `: ${node.type.getText(sourceFile)}` : '';
      declarations.push(`- function **${name}**(${params})${ret}`);
      return;
    }

    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        const name = decl.name.getText(sourceFile);
        const type = decl.type ? `: ${decl.type.getText(sourceFile)}` : '';
        if (decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
          const fn = decl.initializer;
          const params = fn.parameters.map(p => p.getText(sourceFile)).join(', ');
          const ret = fn.type ? `: ${fn.type.getText(sourceFile)}` : '';
          declarations.push(`- const **${name}** = (${params})${ret} => Component/Fn`);
        } else {
          declarations.push(`- const **${name}**${type}`);
        }
      }
      return;
    }

    if (ts.isClassDeclaration(node)) {
      declarations.push(`- class **${node.name ? node.name.text : 'anonymous'}**`);
      return;
    }

    if (ts.isEnumDeclaration(node)) {
      declarations.push(`- enum **${node.name.text}**`);
      return;
    }
  }

  ts.forEachChild(sourceFile, visit);

  results.push(`- **Imports**: ${importCount} modules`);
  results.push('\n### Declarations:');
  if (declarations.length === 0) {
    results.push('(No top-level declarations found)');
  } else {
    results.push(...declarations);
  }

  console.log(results.join('\n'));
}

function verify(filePath) {
  const sourceFile = getSourceFile(filePath);
  const diags = sourceFile.parseDiagnostics || [];

  if (diags.length > 0) {
    console.error(`[AST] FAIL: ${diags.length} syntax error(s) in ${path.basename(filePath)}`);
    diags.slice(0, 5).forEach(d => {
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(d.start);
      console.error(`  - Line ${line + 1}:${character + 1} - ${d.messageText}`);
    });
    process.exit(1);
  }

  console.log(`[AST] PASS: ${path.basename(filePath)} syntax valid (exit 0)`);
  process.exit(0);
}

function check(filePath) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`[AST] File not found: ${filePath}`);
    process.exit(1);
  }

  const tsconfigPath = path.resolve(__dirname, '../tsconfig.json');
  let compilerOptions = { noEmit: true, skipLibCheck: true, jsx: ts.JsxEmit.ReactJSX };
  if (fs.existsSync(tsconfigPath)) {
    try {
      const parsed = ts.getParsedCommandLineOfConfigFile(tsconfigPath, {}, ts.sys);
      if (parsed && parsed.options) {
        compilerOptions = parsed.options;
      }
    } catch (_) {}
  }

  const rootNames = [fullPath];
  const dtsPath = path.resolve(__dirname, '../src/vite-env.d.ts');
  if (fs.existsSync(dtsPath) && fullPath !== dtsPath) {
    rootNames.push(dtsPath);
  }

  const program = ts.createProgram(rootNames, compilerOptions);
  const sourceFile = program.getSourceFile(fullPath);
  if (!sourceFile) {
    console.error(`[AST] Could not load source file: ${filePath}`);
    process.exit(1);
  }

  const syntactic = program.getSyntacticDiagnostics(sourceFile);
  const semantic = program.getSemanticDiagnostics(sourceFile);
  const allDiags = [...syntactic, ...semantic];

  if (allDiags.length > 0) {
    console.error(`[LSP CHECK] FAIL: ${allDiags.length} diagnostic error(s) in ${path.basename(filePath)}`);
    allDiags.slice(0, 5).forEach(d => {
      const msg = typeof d.messageText === 'string' ? d.messageText : d.messageText.messageText;
      if (d.start !== undefined) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(d.start);
        console.error(`  - Line ${line + 1}:${character + 1} [TS${d.code}]: ${msg}`);
      } else {
        console.error(`  - [TS${d.code}]: ${msg}`);
      }
    });
    process.exit(1);
  }

  console.log(`[LSP CHECK] PASS: ${path.basename(filePath)} has 0 type/syntax errors (exit 0)`);
  process.exit(0);
}

function orderFiles(filePaths) {
  if (!filePaths || filePaths.length === 0) {
    console.log('Usage: node scripts/ast.cjs order <file1> <file2> ...');
    process.exit(1);
  }

  const resolved = filePaths.map(f => path.resolve(f));
  const deps = new Map();

  for (const f of resolved) {
    deps.set(f, new Set());
    if (fs.existsSync(f)) {
      const source = getSourceFile(f);
      function findImports(node) {
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
          const importPath = node.moduleSpecifier.text;
          const dir = path.dirname(f);
          const candidates = [
            path.resolve(dir, importPath),
            path.resolve(dir, importPath + '.ts'),
            path.resolve(dir, importPath + '.tsx'),
            path.resolve(dir, importPath + '/index.ts'),
            path.resolve(dir, importPath + '/index.tsx'),
          ];
          for (const cand of candidates) {
            if (resolved.includes(cand)) {
              deps.get(f).add(cand);
            }
          }
        }
        ts.forEachChild(node, findImports);
      }
      ts.forEachChild(source, findImports);
    }
  }

  const result = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(node) {
    if (visited.has(node)) return;
    if (visiting.has(node)) return;
    visiting.add(node);
    for (const dep of deps.get(node) || []) {
      visit(dep);
    }
    visiting.delete(node);
    visited.add(node);
    result.push(node);
  }

  for (const f of resolved) {
    visit(f);
  }

  console.log('## Topological Dependency Order (Edit from top to bottom):');
  result.forEach((f, idx) => {
    const rel = path.relative(path.resolve(__dirname, '..'), f);
    console.log(`${idx + 1}. \`${rel}\``);
  });
}

const [,, cmd, ...rest] = process.argv;

if (!cmd) {
  console.log('Usage: node scripts/ast.cjs <outline|verify|check|order> <files...>');
  process.exit(1);
}

if (cmd === 'outline') {
  outline(rest[0]);
} else if (cmd === 'verify') {
  verify(rest[0]);
} else if (cmd === 'check') {
  check(rest[0]);
} else if (cmd === 'order') {
  orderFiles(rest);
} else {
  console.error(`[AST] Unknown command: ${cmd}`);
  process.exit(1);
}
