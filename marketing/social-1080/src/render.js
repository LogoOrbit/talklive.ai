// Renders every <section class="post"> in posts.html to a 1080x1080 PNG in ../
// Run: NODE_PATH=$(npm root -g) node marketing/social-1080/src/render.js [page.html] [outdir]
//   defaults: posts.html -> marketing/social-1080/
const path = require('path');
const { chromium } = require('playwright');

const file = process.argv[2] || 'posts.html';
const outDir = path.join(__dirname, '..', process.argv[3] || '');

(async () => {
  require('fs').mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
  await page.goto('file://' + path.join(__dirname, file));
  await page.evaluate(() => document.fonts.ready);
  const ids = await page.$$eval('section.post', (els) => els.map((e) => e.id));
  for (const id of ids) {
    await page.locator('#' + id).screenshot({ path: path.join(outDir, id + '.png') });
    console.log(id);
  }
  await browser.close();
})();
