const fs = require('fs');
const file = 'src/App.tsx';
let txt = fs.readFileSync(file, 'utf8');

const sIdx = txt.indexOf('  const renderHome = () => (');
const eIdx = txt.lastIndexOf('  return (');

if (sIdx !== -1 && eIdx !== -1) {
  const newTxt = txt.substring(0, sIdx) + txt.substring(eIdx);
  fs.writeFileSync(file, newTxt);
  console.log('Done: ', sIdx, eIdx);
} else {
  console.log('Not found', sIdx, eIdx);
}
