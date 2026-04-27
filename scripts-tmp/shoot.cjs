const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  for (const name of ['login','categorias']) {
    const page = await ctx.newPage();
    await page.goto(`http://localhost:5179/shot-${name}.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `/tmp/shot-${name}.png`, clip: {x:0,y:0,width:390,height:844} });
    await page.close();
  }
  await browser.close();
})();
