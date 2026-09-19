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

const [,, cmd, targetFile] = process.argv;

if (!cmd || !targetFile) {
  console.log('Usage: node scripts/ast.cjs <outline|verify> <path/to/file>');
  process.exit(1);
}

if (cmd === 'outline') {
  outline(targetFile);
} else if (cmd === 'verify') {
  verify(targetFile);
} else {
  console.error(`[AST] Unknown command: ${cmd}`);
  process.exit(1);
}
