// The other person in the emulator test: the real website in headless
// Chromium (fake microphone), searching for a voice call on the local server.
// Writes web-peer.json every second with the call state, and screenshots.
//   node web-peer.js <baseUrl> <outDir> <seconds>
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const [base = 'http://localhost:5000', out = 'emulator-out', seconds = '240'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    // Real local IPs instead of mDNS names, which the emulator cannot resolve.
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--disable-features=WebRtcHideLocalIpsWithMdns'],
  });
  // A normal browser identity: the server leaves "HeadlessChrome" (crawlers) out of matching.
  const ctx = await browser.newContext({
    viewport: { width: 420, height: 860 },
    permissions: ['microphone'],
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  });
  await ctx.addInitScript(() => {
    localStorage.setItem('talklive_age_consent', 'yes');
    localStorage.setItem('talklive_avatar', 'a:owl');
    localStorage.setItem('talklive_lang', 'en');
    localStorage.setItem('tl_whatsnew_voice_v1', '1');
  });
  const page = await ctx.newPage();
  const log = [];
  page.on('console', (m) => { if (m.type() === 'error') log.push(m.text()); });
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await wait(3000);
  await page.click('#startBtn');
  const t0 = Date.now();
  let shotConnected = false;
  let state = {};
  while (Date.now() - t0 < Number(seconds) * 1000) {
    state = await page.evaluate(() => ({
      // Top-level `let pc` in app.js is reachable from here.
      pc: (typeof pc !== 'undefined' && pc) ? pc.connectionState : null,
      ice: (typeof pc !== 'undefined' && pc) ? pc.iceConnectionState : null,
      partner: (typeof currentPartner !== 'undefined' && currentPartner) ? (currentPartner.username || 'someone') : null,
    })).catch(() => ({}));
    state.t = Math.round((Date.now() - t0) / 1000);
    state.errors = log.slice(-5);
    fs.writeFileSync(path.join(out, 'web-peer.json'), JSON.stringify(state, null, 2));
    if (state.pc === 'connected' && !shotConnected) {
      shotConnected = true;
      await page.screenshot({ path: path.join(out, 'web-connected.png') });
    }
    await wait(1000);
  }
  await page.screenshot({ path: path.join(out, 'web-final.png') });
  await browser.close();
})().catch((e) => { fs.writeFileSync(path.join(out, 'web-peer-error.txt'), String(e && e.stack || e)); process.exit(1); });
