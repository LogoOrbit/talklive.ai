// The Android status bar and gesture handle drawn around each app screen (dark and light ink).
const { chromium } = require('playwright');
const path = require('path');
const serve = require('./server');
(async () => {
  const { server, port } = await serve();
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 392, height: 871 }, deviceScaleFactor: 4 });
  for (const [name, ink, po] of [['dark', '#F2F4FF', '.85'], ['light', '#1A2033', '.72']]) {
    await p.goto(`http://127.0.0.1:${port}/sysbars.html?ink=${encodeURIComponent(ink)}&po=${po}`);
    await p.waitForFunction(() => window.__ready);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(__dirname, `sysbars-${name}.png`), omitBackground: true });
  }
  await b.close(); server.close();
})();
