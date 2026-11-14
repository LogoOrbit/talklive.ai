#!/usr/bin/env node
// UI regression check: opens the main panels in dark and light at phone and
// desktop sizes, fails on (a) text with contrast under 3:1 against its solid
// background, (b) horizontal page overflow. Needs Playwright + Chromium.
// UI_SCAN=1 prints offenders instead of failing.
/* global document, getComputedStyle, NodeFilter, innerHeight, innerWidth, localStorage, sessionStorage */
const fs = require('fs'), os = require('os'), path = require('path');
const { spawn } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); } catch (_) { console.log('skip: playwright not installed'); process.exit(0); }

const PANELS = [
  ['home', null], ['filters', '#filtersBtn'], ['friends', '#friendsBtn'], ['history', '#historyBtn'],
  ['shop', '#navShopBtn'], ['settings', '#appSettingsBtn'],
];
const SIZES = { desk: { viewport: { width: 1366, height: 800 } }, mob: { viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true } };

const SCAN = () => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const bgOf = (el) => { // composite ancestors; give up (null) on images/gradients
    const stack = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage !== 'none') return null;
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; }
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    if (!stack.length || stack[stack.length - 1].a < 1) { const rb = parse(getComputedStyle(document.body).backgroundColor); if (rb && rb.a > 0) base = rb; else base = document.documentElement.dataset.theme === 'light' ? { r: 238, g: 241, b: 249, a: 1 } : { r: 11, g: 15, b: 26, a: 1 }; }
    for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base);
    return base;
  };
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n; (n = w.nextNode());) {
    if (!n.nodeValue.trim()) continue;
    const el = n.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    let hidden = false; for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (+s.opacity === 0 || s.visibility === 'hidden') { hidden = true; break; } }
    if (hidden) continue;
    const fg = parse(cs.color), bg = bgOf(el); if (!fg || !bg) continue;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    const f = over({ ...fg, a: fg.a * op }, bg);
    const L1 = lum(f), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    if (ratio < 3) out.push({ ratio: +ratio.toFixed(2), text: n.nodeValue.trim().slice(0, 40), cls: (el.className && el.className.baseVal === undefined ? el.className : el.tagName).toString().slice(0, 60), fg: cs.color, bg: `rgb(${bg.r|0},${bg.g|0},${bg.b|0})` });
  }
  return out;
};

(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-ui-'));
  const port = 6500 + Math.floor(Math.random() * 400);
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], { env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, DATABASE_URL: '', NODE_ENV: 'development' }, stdio: 'ignore' });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 60; i++) { try { await fetch(base + '/healthz'); break; } catch (_) { await new Promise((r) => setTimeout(r, 250)); } }
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const problems = [];
  try {
    for (const [sn, so] of Object.entries(SIZES)) for (const theme of ['dark', 'light']) {
      const ctx = await b.newContext({ ...so, colorScheme: theme });
      await ctx.addInitScript((t) => { try { localStorage.setItem('talklive_theme', t); localStorage.setItem('tl_ff', '-progressiveDisclosure'); } catch (_) {} }, theme);
      for (const [name, sel] of PANELS) {
        const pg = await ctx.newPage();
        await pg.goto(base + '/', { waitUntil: 'load' }); await pg.waitForTimeout(900);
        if (sel) {
          const direct = pg.locator(sel).first();
          try {
            if (await direct.isVisible()) await direct.click({ timeout: 3000 });
            else { // phone: Shop and Settings live in the More drawer
              await pg.locator('#navMoreBtn').click({ timeout: 3000 }); await pg.waitForTimeout(400);
              await pg.locator(`#navDrawer [data-opens="${sel.slice(1)}"]`).click({ timeout: 3000 });
            }
          } catch (e) { problems.push(`${sn}/${theme}/${name}: could not open (${e.message.split('\n')[0]})`); await pg.close(); continue; }
          await pg.waitForTimeout(600);
        }
        const ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (ov > 1) problems.push(`${sn}/${theme}/${name}: horizontal overflow ${ov}px`);
        // Scan what is visible, then scroll every scrollable panel and scan again.
        const found = new Set();
        for (let step = 0; step < 8; step++) {
          for (const o of await pg.evaluate(SCAN)) found.add(`${sn}/${theme}/${name}: ${o.ratio}:1 "${o.text}" .${o.cls} ${o.fg} on ${o.bg}`);
          const moved = await pg.evaluate(() => { let m = false; document.querySelectorAll('*').forEach((e) => { const cs = getComputedStyle(e); if (/(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 4 && e.scrollTop + e.clientHeight < e.scrollHeight - 2) { e.scrollTop += Math.max(200, e.clientHeight - 80); m = true; } }); return m; });
          if (!moved) break;
          await pg.waitForTimeout(150);
        }
        problems.push(...found);
        await pg.close();
      }
      await ctx.close();
    }
    // First-run consent dialog: readable in both themes, fits the screen.
    for (const [sn, so] of Object.entries(SIZES)) for (const theme of ['dark', 'light']) {
      const ctx = await b.newContext({ ...so, colorScheme: theme });
      await ctx.addInitScript((t) => { try { localStorage.setItem('talklive_theme', t); localStorage.setItem('tl_ff', '-progressiveDisclosure'); } catch (_) {} }, theme);
      const pg = await ctx.newPage();
      await pg.goto(base + '/', { waitUntil: 'load' }); await pg.waitForTimeout(900);
      await pg.locator('#startBtn').click(); await pg.waitForTimeout(1500);
      if (!(await pg.locator('#ageConsentModal').isVisible())) problems.push(`${sn}/${theme}/consent: dialog did not open`);
      else {
        for (const o of await pg.evaluate(SCAN)) problems.push(`${sn}/${theme}/consent: ${o.ratio}:1 "${o.text}" .${o.cls}`);
        if (!(await pg.locator('.consent-short-list').isVisible())) problems.push(`${sn}/${theme}/consent: short summary missing`);
        await pg.screenshot({ path: path.join(os.tmpdir(), `tl-ui-consent-${sn}-${theme}.png`) });
        await pg.locator('.consent-full-terms > summary').click(); await pg.waitForTimeout(1200); // full Terms stay one tap away
        if (!(await pg.locator('.consent-full-terms .policy-remote h3, .consent-full-terms .policy-remote p').first().isVisible())) problems.push(`${sn}/${theme}/consent: full Terms not shown when opened`);
        for (const o of await pg.evaluate(SCAN)) problems.push(`${sn}/${theme}/consent-open: ${o.ratio}:1 "${o.text}" .${o.cls}`);
        const box = await pg.locator('#ageConsentModal .modal-box').boundingBox();
        if (box.y < 0 || box.y + box.height > so.viewport.height) problems.push(`${sn}/${theme}/consent: dialog does not fit the screen`);
        if (!(await pg.locator('#ageAgreeBtn').isVisible())) problems.push(`${sn}/${theme}/consent: agree button not visible`);
      }
      await ctx.close();
    }
    // Selected filters are visible on Home and while searching (display only).
    for (const [sn, so] of Object.entries(SIZES)) for (const theme of ['dark', 'light']) {
      const ctx = await b.newContext({ ...so, colorScheme: theme, permissions: ['microphone'] });
      await ctx.addInitScript((t) => {
        try {
          localStorage.setItem('talklive_theme', t); localStorage.setItem('tl_ff', '-progressiveDisclosure'); localStorage.setItem('talklive_age_consent', 'yes');
          sessionStorage.setItem('talklive_filters', JSON.stringify({ prefGender: 'any', prefLang: 'es', includeCountries: ['ES', 'MX'], excludeCountries: [], interests: [] }));
        } catch (_) {}
      }, theme);
      const pg = await ctx.newPage();
      await pg.goto(base + '/', { waitUntil: 'load' }); await pg.waitForTimeout(1200);
      const home = pg.locator('#homeFilterSummary');
      if (!(await home.isVisible())) problems.push(`${sn}/${theme}: home filter summary not visible`);
      else {
        const txt = await home.textContent();
        if (!/🇪🇸/.test(txt) || !/Español|Spanish/i.test(txt)) problems.push(`${sn}/${theme}: home filter summary wrong: ${txt}`);
        const box = await home.boundingBox();
        if (box.height < 32 || box.x < 0 || box.x + box.width > so.viewport.width) problems.push(`${sn}/${theme}: home filter summary size/overflow`);
      }
      await pg.locator('#startBtn').click(); // real flow; alone on the server it stays in "searching"
      await pg.waitForTimeout(2500);
      if (!(await pg.locator('#searchFilterSummary').isVisible())) problems.push(`${sn}/${theme}: search filter summary not visible while searching`);
      const ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (ov > 1) problems.push(`${sn}/${theme}/filter-summary: horizontal overflow ${ov}px`);
      for (const o of await pg.evaluate(SCAN)) problems.push(`${sn}/${theme}/filter-summary: ${o.ratio}:1 "${o.text}" .${o.cls}`);
      await pg.screenshot({ path: path.join(os.tmpdir(), `tl-ui-filters-${sn}-${theme}.png`) });
      await ctx.close();
    }
  } finally { await b.close(); srv.kill(); }
  if (problems.length) { console.log(problems.join('\n')); console.log(`\n${problems.length} problem(s)`); process.exit(process.env.UI_SCAN ? 0 : 1); }
  console.log('ok   ui contrast + overflow');
})();
