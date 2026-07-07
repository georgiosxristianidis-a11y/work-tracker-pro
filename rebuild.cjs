const fs = require('fs');

const file = 'src/App.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const validLines = [];
// 1. imports and utilities up to line 78 (0 to 77)
for (let i = 0; i < 78; i++) {
  validLines.push(lines[i]);
}

// 2. The App component from line 905 (index 904) to the end
for (let i = 904; i < lines.length; i++) {
  validLines.push(lines[i]);
}

fs.writeFileSync(file, validLines.join('\n'));
console.log('Done rebuilding App.tsx!');
