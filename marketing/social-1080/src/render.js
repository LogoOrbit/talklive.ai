// Renders every <section class="post"> in posts.html to a 1080x1080 PNG in ../
// Run: NODE_PATH=$(npm root -g) node marketing/social-1080/src/render.js
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, 'posts.html'));
  await page.evaluate(() => document.fonts.ready);
  const ids = await page.$$eval('section.post', (els) => els.map((e) => e.id));
  for (const id of ids) {
    await page.locator('#' + id).screenshot({ path: path.join(__dirname, '..', id + '.png') });
    console.log(id);
  }
  await browser.close();
})();
