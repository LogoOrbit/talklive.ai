// The one-time "voice messages are here" announcement on the main page.
//
//   node scripts/social-ui/whats-new-ui.js [screenshot-dir]
const H = require('./harness');
const { ok, wait } = H;

(async () => {
  const shots = process.argv[2] || null;
  const { srv, base, dir } = await H.start({ port: 6700 + Math.floor(Math.random() * 100) });
  const { b, page } = await H.browser(base, {
    path: '/',
    init: () => {
      if (!sessionStorage.getItem('wn-armed')) {
        sessionStorage.setItem('wn-armed', '1');
        localStorage.setItem('tl_whatsnew_test_show', '1');
        localStorage.removeItem('tl_whatsnew_voice_v1');
      }
    },
  });
  try {
    await page.waitForSelector('.wn-overlay.open', { timeout: 8000 });
    await wait(900);
    ok('the announcement opens on a first visit', true);
    ok('it has the square tutorial video', await page.evaluate(() => {
      const v = document.querySelector('.wn-video video');
      const r = v.getBoundingClientRect();
      return Math.abs(r.width - r.height) < 2 && v.querySelectorAll('source').length === 2;
    }));
    await wait(1500);
    ok('the video plays', await page.evaluate(() => document.querySelector('.wn-video video').currentTime > 0.3));
    if (shots) await page.screenshot({ path: `${shots}/whats-new.png` });
    await page.setViewportSize({ width: 390, height: 780 });
    await wait(300);
    if (shots) await page.screenshot({ path: `${shots}/whats-new-phone.png` });
    await page.click('.wn-go');
    await wait(500);
    ok('"Go talk now" closes it', await page.evaluate(() => !document.querySelector('.wn-overlay')));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await wait(4000);
    ok('it is not shown again', await page.evaluate(() => !document.querySelector('.wn-overlay')));
    const errors = page.errors.filter((e) => !/Failed to load resource/.test(e));
    ok('no page errors', errors.length === 0, errors.join('\n'));
  } catch (err) {
    console.error(err);
    ok('ran to the end', false, err.message);
  } finally {
    await b.close();
    srv.kill('SIGKILL');
    require('fs').rmSync(dir, { recursive: true, force: true });
    console.log(H.failed() ? `\n${H.failed()} check(s) failed` : '\nAll checks passed');
    process.exit(H.failed() ? 1 : 0);
  }
})();
