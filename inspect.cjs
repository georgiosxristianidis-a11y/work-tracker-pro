const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/');
  
  // Wait a bit for render
  await page.waitForTimeout(2000);
  
  const selector = "div#root:nth-of-type(1) > div:nth-of-type(1) > div#frame:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1)";
  
  try {
    const el = await page.$(selector);
    if (el) {
      const html = await el.evaluate(node => node.outerHTML);
      console.log(html);
    } else {
      console.log('Element not found');
    }
  } catch (e) {
    console.error(e);
  }
  
  await browser.close();
})();
