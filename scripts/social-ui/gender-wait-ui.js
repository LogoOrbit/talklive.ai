// The web voice page while a Plus "women only" search waits: it says who it
// is waiting for, shows how many people the filter allows (updated live), is
// never put through to a man, and connects as soon as a woman searches.
//
//   node scripts/social-ui/gender-wait-ui.js
process.env.PREMIUM_CLIENT_IDS = 'c_ann_browser_01';
const H = require('./harness');

(async () => {
  const port = 6100 + Math.floor(Math.random() * 300);
  const base = `http://127.0.0.1:${port}`;
  const { srv } = await H.start({ port });
  let br;
  try {
    br = await H.browser(base, {
      init: () => {
        try {
          sessionStorage.setItem('talklive_filters', JSON.stringify({ prefGender: 'female', prefVoiceChecked: false, prefLang: '', includeCountries: [], excludeCountries: [], interests: [] }));
          localStorage.setItem('talklive_age_ok', '1');
        } catch (_) { /* storage blocked */ }
      },
    });
    const { page } = br;
    await H.wait(2500);
    const text = (sel) => page.$eval(sel, (el) => el.textContent.trim()).catch(() => '');

    // A man is already searching; he must never be matched with this search.
    const man = H.bot(base, 'ben');
    await H.wait(400);
    man.emit('find-partner', { mode: 'talk' });

    await page.click('#startBtn', { timeout: 5000 }).catch(() => page.evaluate(() => document.getElementById('startBtn').click()));
    // First call: accept the terms like a person would (and any follow-up step).
    for (let i = 0; i < 3; i++) {
      await H.wait(700);
      const agree = page.getByRole('button', { name: /i agree/i });
      if (await agree.isVisible().catch(() => false)) await agree.click().catch(() => {});
    }
    let status = '';
    for (let i = 0; i < 30 && !/woman/i.test(status); i++) { await H.wait(300); status = await text('#statusText'); }
    H.ok('the page says it is looking for a woman', /looking for a woman/i.test(status), status);
    H.ok('the page says nobody matching is online yet', /nobody matching your filters/i.test(await text('#subText')), await text('#subText'));

    await H.wait(12000);
    H.ok('still waiting past the old 10s fallback (no man)', /looking for a woman/i.test(await text('#statusText')), await text('#statusText'));

    // A woman comes online: the count updates while waiting.
    const woman = H.bot(base, 'cat');
    woman.emit('register', { clientId: H.ID.cat, identityToken: H.tokenFor(H.ID.cat), nickname: 'Cat', gender: 'female' });
    let sub = '';
    for (let i = 0; i < 40 && !/1 online/.test(sub); i++) { await H.wait(300); sub = await text('#subText'); }
    H.ok('the count shows the woman who came online', /1 online matching your filters/.test(sub), sub);
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });

    const matched = H.once(woman, 'matched', 8000).catch(() => null);
    woman.emit('find-partner', { mode: 'talk' });
    const m = await matched;
    H.ok('the search connects with the woman (not the man also waiting)', !!(m && m.partner && m.partner.clientId === H.ID.ann), m && m.partner && m.partner.clientId);
    H.ok('no page errors', page.errors.length === 0, page.errors.join(' | '));
    man.close(); woman.close();
  } catch (err) {
    console.error(err);
    H.ok('ran without throwing', false, err.message);
  } finally {
    if (br) await br.b.close();
    srv.kill('SIGKILL');
  }
  const f = H.failed();
  console.log(f ? `\n${f} check(s) failed` : '\nAll checks passed');
  process.exit(f ? 1 : 0);
})();
