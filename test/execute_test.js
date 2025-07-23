// Execute test in browser console
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    await page.goto('http://127.0.0.1:5500');
    await page.waitForTimeout(2000);
    
    const result = await page.evaluate(() => {
        return testeFinal2Litros();
    });
    
    console.log('Test Result:', JSON.stringify(result, null, 2));
    
    await browser.close();
})();
EOF < /dev/null
