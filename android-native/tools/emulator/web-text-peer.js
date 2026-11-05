// The other person for the text-chat part of the emulator test: the website's
// text chat page, which answers every message it gets with a reply.
// Writes web-text-peer.json with what it received and sent.
//   node web-text-peer.js <baseUrl> <outDir> <seconds>
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const [base = 'http://localhost:5000', out = 'emulator-out', seconds = '480'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const t00 = Date.now();
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await browser.newContext({
    viewport: { width: 420, height: 860 },
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  });
  await ctx.addInitScript(() => {
    localStorage.setItem('talklive_age_consent', 'yes');
    localStorage.setItem('talklive_avatar', 'a:panda');
    localStorage.setItem('talklive_lang', 'en');
    localStorage.setItem('talklive_gender_asked', 'yes');
  });
  const page = await ctx.newPage();
  const events = [];
  page.on('console', (m) => events.push(Math.round((Date.now() - t00) / 1000) + 's ' + m.type() + ': ' + m.text().slice(0, 200)));
  await page.goto(base + '/chat', { waitUntil: 'domcontentloaded' });
  await wait(3000);
  await page.click('#startBtn').catch(() => {});
  await wait(4000);
  await page.screenshot({ path: path.join(out, 'web-text-start.png') }).catch(() => {});
  const state = { received: [], sent: [] };
  const t0 = Date.now();
  let seen = 0;
  while (Date.now() - t0 < Number(seconds) * 1000) {
    const theirs = await page.$$eval('.msg.them', (els) => els.map((e) => e.textContent.trim())).catch(() => []);
    if (theirs.length > seen) {
      for (const t of theirs.slice(seen)) state.received.push(t);
      seen = theirs.length;
      const reply = 'hello from the website';
      await page.fill('#msgInput', reply).catch(() => {});
      await page.press('#msgInput', 'Enter').catch(() => {});
      state.sent.push(reply);
      await page.screenshot({ path: path.join(out, 'web-text-chat.png') }).catch(() => {});
    }
    state.t = Math.round((Date.now() - t0) / 1000);
    const st = await page.evaluate(() => (document.querySelector('#chatStatus, .chat-status, #status') || {}).textContent || '').catch(() => '');
    if (st && st !== state.lastStatus) { (state.status = state.status || []).push(state.t + 's ' + st.trim().slice(0, 120)); state.lastStatus = st; }
    state.events = events.slice(-60);
    if (state.t % 20 === 0) await page.screenshot({ path: path.join(out, 'web-text-' + state.t + '.png') }).catch(() => {});
    fs.writeFileSync(path.join(out, 'web-text-peer.json'), JSON.stringify(state, null, 2));
    await wait(1000);
  }
  await browser.close();
})().catch((e) => { fs.writeFileSync(path.join(out, 'web-text-peer-error.txt'), String(e && e.stack || e)); process.exit(1); });
