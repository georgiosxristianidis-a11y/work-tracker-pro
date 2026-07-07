const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsScreen.tsx', 'utf8');

const startStr = '        {/* Share Data Choice Modal */}';
const endStr = '        {/* Footer Area */}';

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
    console.error("Could not find start or end string.");
    process.exit(1);
}

const modalsCode = code.substring(startIndex, endIndex);

let newModalsCode = `        {/* Modals via Portal */}
        {createPortal(
          <>
${modalsCode}          </>,
          document.getElementById('frame') || document.body
        )}
`;

// Also replace absolute inset-0 with fixed inset-0 within the modals
newModalsCode = newModalsCode.replace(/absolute inset-0/g, 'absolute inset-0'); // Actually, if we attach to frame which has `relative`, absolute is fine! Let's keep absolute, as the frame is relative and has h-[100dvh] and overflow-hidden, so absolute covers the viewport perfectly.

code = code.substring(0, startIndex) + newModalsCode + code.substring(endIndex);

fs.writeFileSync('src/components/SettingsScreen.tsx', code);
console.log("Success");
