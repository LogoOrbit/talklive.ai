// node render.js [01,02,...] [dark,light]  ->  ../dark/NN-name.png, ../light/NN-name.png (1080 x 1920)
// Each slide is drawn at 2x (2160 x 3840) and downsampled, for clean edges and type.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const serve = require('./server');
const NAMES = { '01': 'meet-someone-new', '02': 'hear-a-real-voice', '03': 'prefer-typing', '04': 'keep-the-good-ones', '05': 'messages-that-feel-alive', '06': 'break-the-ice', '07': 'be-anyone', '08': 'go-further-with-plus' };
(async () => {
  const ids = (process.argv[2] || Object.keys(NAMES).join(',')).split(','), themes = (process.argv[3] || 'dark,light').split(',');
  const { server, port } = await serve();
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 2 });
  pg.on('pageerror', (e) => console.log('[error]', e.message));
  for (const th of themes) for (const id of ids) {
    await pg.goto(`http://127.0.0.1:${port}/slide.html?id=${id}&theme=${th}`);
    await pg.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
    const big = path.join(__dirname, '.out2x', `${id}-${th}.png`);
    await pg.screenshot({ path: big });
    execFileSync('python3', [path.join(__dirname, 'down.py'), big, path.resolve(__dirname, '..', th, `${id}-${NAMES[id]}.png`)]);
    console.log(th, id);
  }
  await b.close(); server.close();
})();
