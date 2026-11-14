// node render_ad.js preview 0.2,1.8,...   -> prev/t.png
// node render_ad.js frames                 -> frames/00000.jpg ... (30 fps, 34 s)
const { chromium } = require('playwright');
const fs = require('fs');
const serve = require('./server');
(async () => {
  const mode = process.argv[2] || 'preview';
  const { server, port } = await serve();
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => console.log('[err]', e.message));
  await p.goto(`http://127.0.0.1:${port}/ad.html`);
  await p.waitForFunction(() => window.__ready === true);
  await p.evaluate(() => window.__assets());
  if (mode === 'preview') {
    fs.mkdirSync('prev', { recursive: true });
    for (const t of process.argv[3].split(',').map(Number)) {
      await p.evaluate(([tt, f]) => window.renderAt(tt, f), [t, Math.round(t * 30)]);
      await p.screenshot({ path: `prev/${t.toFixed(2)}.png` });
    }
  } else {
    fs.mkdirSync('frames', { recursive: true });
    const FPS = 30, N = Math.round(34 * FPS);
    const from = +(process.argv[3] || 0), to = Math.min(N, +(process.argv[4] || N));
    const t0 = Date.now();
    for (let f = from; f < to; f++) {
      await p.evaluate(([tt, ff]) => window.renderAt(tt, ff), [f / FPS, f]);
      await p.screenshot({ path: `frames/${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 95 });
      if (f % 150 === 0) console.log('frame', f, Math.round((Date.now() - t0) / 1000) + 's');
    }
  }
  await b.close(); server.close();
})();
