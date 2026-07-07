import { test, expect } from '@playwright/test';

test('Find the mystery element', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(1000);
  
  // Wait for the specific element just in case
  const selector = 'div#root:nth-of-type(1) > div:nth-of-type(1) > div#frame:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(6)';
  
  const elementHTML = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return 'Not found';
    return el.outerHTML;
  }, selector);
  
  console.log('--- ELEMENT HTML ---');
  console.log(elementHTML);
  console.log('--------------------');
});
