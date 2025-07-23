const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('http://127.0.0.1:5500');
  await page.waitForTimeout(2000);
  
  // Execute kcdiag() in console
  const result = await page.evaluate(() => {
    if (typeof kcdiag === 'function') {
      return kcdiag();
    } else {
      return 'kcdiag function not found';
    }
  });
  
  console.log('kcdiag() result:', JSON.stringify(result, null, 2));
  
  await browser.close();
})();
