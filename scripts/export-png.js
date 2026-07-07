import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async () => {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
    const svg = fs.readFileSync(path.join(process.cwd(), 'public/logo-export.svg'), 'utf-8');
    await page.setContent(`
      <style>
        body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; background: transparent; }
        svg { width: 512px; height: 512px; }
      </style>
      ${svg}
    `);
    
    // Ожидание рендера шрифтов и SVG
    await page.waitForTimeout(500); 

    await page.locator('svg').screenshot({ 
      path: path.join(process.cwd(), 'public/logo-export.png'), 
      omitBackground: true 
    });
    
    await browser.close();
    console.log('PNG generated successfully');
  } catch (err) {
    console.error('Error generating PNG:', err);
    process.exit(1);
  }
})();
