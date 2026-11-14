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

const SCAN = (opts = {}) => {
  const root = (opts && opts.root && document.querySelector(opts.root)) || document.body;
  const min = (opts && opts.min) || 3;
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
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
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
    if (ratio < min) out.push({ ratio: +ratio.toFixed(2), text: n.nodeValue.trim().slice(0, 40), cls: (el.className && el.className.baseVal === undefined ? el.className : el.tagName).toString().slice(0, 60), fg: cs.color, bg: `rgb(${bg.r|0},${bg.g|0},${bg.b|0})` });
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
        const box = await pg.locator('#ageConsentModal .modal-box').boundingBox();
        if (box.y < 0 || box.y + box.height > so.viewport.height) problems.push(`${sn}/${theme}/consent: dialog does not fit the screen`);
        if (!(await pg.locator('#ageAgreeBtn').isVisible())) problems.push(`${sn}/${theme}/consent: agree button not visible`);
        // Keyboard: the terms can be focused (and so scrolled), and Tab stays
        // inside the dialog.
        if ((await pg.locator('#ageConsentModal .consent-terms-body').getAttribute('tabindex')) !== '0') problems.push(`${sn}/${theme}/consent: terms not keyboard-scrollable`);
        let left = false;
        for (let i = 0; i < 14 && !left; i++) { await pg.keyboard.press('Tab'); left = await pg.evaluate(() => !document.activeElement.closest('#ageConsentModal')); }
        if (left) problems.push(`${sn}/${theme}/consent: Tab leaves the dialog`);
      }
      await ctx.close();
    }
    // Phone: Shop and Settings behave, not only look right.
    for (const theme of ['dark', 'light']) {
      const ctx = await b.newContext({ ...SIZES.mob, colorScheme: theme });
      await ctx.addInitScript((t) => { try { localStorage.setItem('talklive_theme', t); localStorage.setItem('tl_ff', '-progressiveDisclosure'); } catch (_) {} }, theme);
      const pg = await ctx.newPage();
      const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
      const openFromMore = async (id) => {
        await pg.goto(base + '/', { waitUntil: 'load' }); await pg.waitForTimeout(900);
        await pg.locator('#navMoreBtn').click({ timeout: 3000 }); await pg.waitForTimeout(350);
        await pg.locator(`#navDrawer [data-opens="${id}"]`).click({ timeout: 3000 }); await pg.waitForTimeout(900);
      };
      const tag = `mob/${theme}`;
      // Shop
      await openFromMore('navShopBtn');
      if (!(await pg.locator('#shopModal').isVisible())) problems.push(`${tag}/shop: did not open`);
      else {
        // Local prices arrive (no placeholder left) and the buy button names one.
        await pg.waitForFunction(() => !document.querySelector('#passTiers .pass-price-loading'), null, { timeout: 4000 }).catch(() => problems.push(`${tag}/shop: prices never loaded`));
        const buy = (await pg.locator('#passBuyBtn').textContent().catch(() => '')) || '';
        if (!/\d/.test(buy)) problems.push(`${tag}/shop: buy button has no price: "${buy}"`);
        // Picking a pass updates the selection and the button.
        await pg.locator('#passTiers .pass-row').first().click();
        if ((await pg.locator('#passTiers .pass-row.is-selected').count()) !== 1 || !/1/.test(await pg.locator('#passBuyBtn').textContent())) problems.push(`${tag}/shop: picking a pass did not update`);
        // Every control is a real touch target (24px+), links readable at 4.5:1.
        const small = await pg.evaluate(() => [...document.querySelectorAll('#shopModal a, #shopModal button')].filter((e) => e.offsetParent)
          .map((e) => { const r = e.getBoundingClientRect(); return { t: (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 30), h: Math.round(r.height), w: Math.round(r.width) }; })
          .filter((x) => x.h < 24 || x.w < 24));
        small.forEach((x) => problems.push(`${tag}/shop: touch target ${x.w}x${x.h} "${x.t}"`));
        await pg.locator('#shopModal .shop-fine').scrollIntoViewIfNeeded();
        for (const o of await pg.evaluate(SCAN, { root: '#shopModal', min: 4.5 })) if (/^A$/.test(o.cls) || /Terms|Privacy|Safety|month/.test(o.text)) problems.push(`${tag}/shop: link ${o.ratio}:1 "${o.text}" ${o.fg} on ${o.bg}`);
        const box = await pg.locator('#shopModal .shop-fine').boundingBox();
        if (!box || box.y + box.height > SIZES.mob.viewport.height) problems.push(`${tag}/shop: footer links not reachable by scrolling`);
        await pg.locator('#closeShopBtn').click();
        await pg.waitForTimeout(400);
        if (await pg.locator('#shopModal').isVisible()) problems.push(`${tag}/shop: close button did not close it`);
      }
      // Settings
      await openFromMore('appSettingsBtn');
      if (!(await pg.locator('#settingsPanel').isVisible())) problems.push(`${tag}/settings: did not open`);
      else {
        const rows = await pg.evaluate(() => [...document.querySelectorAll('#settingsPanel .tl-set-toggle')].filter((e) => e.offsetParent).map((e) => Math.round(e.getBoundingClientRect().height)));
        if (!rows.length) problems.push(`${tag}/settings: no toggles`);
        rows.filter((h) => h < 44).forEach((h) => problems.push(`${tag}/settings: toggle row only ${h}px tall`));
        // Tapping the row (not the tiny switch) flips the setting and saves it.
        const before = await pg.locator('#qsSound').isChecked();
        await pg.locator('#settingsPanel label[for="qsSound"] .tl-set-text').click();
        await pg.waitForTimeout(200);
        const after = await pg.locator('#qsSound').isChecked();
        const saved = await pg.evaluate(() => localStorage.getItem('talklive_sound'));
        if (after === before || saved !== (after ? 'on' : 'off')) problems.push(`${tag}/settings: tapping the sound row did not toggle/save (${before}->${after}, saved ${saved})`);
        // The theme switch works from here.
        const other = theme === 'dark' ? 'light' : 'dark';
        await pg.locator(`#qsTheme [data-value="${other}"]`).click();
        await pg.waitForTimeout(250);
        if ((await pg.evaluate(() => document.documentElement.dataset.theme)) !== other) problems.push(`${tag}/settings: theme switch did not apply ${other}`);
        await pg.locator(`#qsTheme [data-value="${theme}"]`).click();
        // The last row is reachable and the panel closes.
        await pg.locator('#settingsPanel .side-panel-body').evaluate((e) => { e.scrollTop = e.scrollHeight; });
        await pg.waitForTimeout(200);
        const last = await pg.evaluate(() => { const els = [...document.querySelectorAll('#settingsPanel .side-panel-body button')].filter((e) => e.offsetParent); const r = els[els.length - 1].getBoundingClientRect(); return r.bottom <= innerHeight; });
        if (!last) problems.push(`${tag}/settings: last button not reachable by scrolling`);
        await pg.locator('#settingsPanelClose').click();
        await pg.waitForTimeout(400);
        if (await pg.locator('#settingsPanel').evaluate((e) => e.classList.contains('open'))) problems.push(`${tag}/settings: close did not close it`);
      }
      if (errs.length) problems.push(`${tag}: page errors ${errs.join(' | ')}`);
      if (process.env.UI_SHOTS) await pg.screenshot({ path: path.join(process.env.UI_SHOTS, `mob-${theme}-after.png`) });
      await ctx.close();
    }
    // Components that used hard-coded colours (style.css sweep): rendered in
    // every theme and held to 4.5:1, the WCAG AA minimum for small text.
    for (const theme of ['dark', 'light', 'ocean']) {
      const ctx = await b.newContext({ ...SIZES.mob, colorScheme: theme === 'light' ? 'light' : 'dark' });
      await ctx.addInitScript((t) => { try { localStorage.setItem('talklive_theme', t); localStorage.setItem('tl_ff', '-progressiveDisclosure'); } catch (_) {} }, theme);
      const pg = await ctx.newPage();
      await pg.goto(base + '/', { waitUntil: 'load' }); await pg.waitForTimeout(900);
      const appliedTheme = await pg.evaluate(() => document.documentElement.dataset.theme || 'dark');
      if (theme !== 'dark' && appliedTheme !== theme) problems.push(`components: theme ${theme} did not apply (${appliedTheme})`);
      await pg.evaluate(() => {
        const box = document.createElement('div');
        box.id = 'tlComponentGallery';
        box.innerHTML = `
          <div class="share-prompt show" style="position:fixed;top:10px;bottom:auto"><h3>Enjoyed that chat?</h3><p>Invite a friend.</p><div class="share-prompt-actions"><button class="share-prompt-no">Not now</button></div></div>
          <div class="pwa-prompt show" style="position:fixed;top:170px;bottom:auto"><h3>Add TalkLive</h3><p>Open it with one tap.</p><div class="pwa-prompt-actions"><button class="pwa-prompt-no">Not now</button></div></div>
          <div class="callback-banner" style="top:330px"><span class="callback-banner-text">Ann is calling you</span><span class="callback-banner-actions"><button class="callback-accept">Answer</button><button class="callback-decline">Decline</button></span></div>
          <div class="calling-pill show" style="top:390px"><span class="calling-pill-text">Calling Ben</span><button class="calling-pill-cancel">Cancel</button></div>
          <div style="position:fixed;top:450px;left:10px;display:flex;gap:8px;background:var(--bg-2);padding:8px"><button class="btn-chip btn-chip-accept">Confirm</button><button class="btn-chip">Dismiss</button><span class="chat-badge" style="position:static">3</span><button class="pass-buy" style="width:auto">Buy</button></div>`;
        document.body.appendChild(box);
      });
      await pg.waitForTimeout(300);
      for (const o of await pg.evaluate(SCAN, { root: '#tlComponentGallery', min: 4.5 })) problems.push(`components/${theme}: ${o.ratio}:1 "${o.text}" .${o.cls} ${o.fg} on ${o.bg}`);
      if (process.env.UI_SHOTS) await pg.screenshot({ path: path.join(process.env.UI_SHOTS, `components-${theme}.png`) });
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
