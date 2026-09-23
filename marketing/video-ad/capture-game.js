// Two browsers pair up in text chat and play Tic Tac Toe; screenshots of player A
// after each step -> shots/game-*.png (used by ads.html?ad=games).
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
process.chdir(__dirname); require('fs').mkdirSync('shots', { recursive: true });
const W = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = process.env.BASE || 'http://127.0.0.1:6900';
(async () => {
  const b = await chromium.launch();
  const mk = async (animal) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    await ctx.addInitScript((animal) => { try { ['talklive_age_consent:yes', 'talklive_mic_explained:yes', 'talklive_devnotice_2026-09:1', 'talklive_data_notice_v1:1', 'talklive_gender_asked:yes', 'talklive_avatar:' + animal]
      .forEach((kv) => { const [k, v] = kv.split(':'); localStorage.setItem(k, v); }); } catch (e) {} }, animal);
    await ctx.addInitScript(() => { const s = document.createElement('style'); s.textContent = '#visitorCount,#liveCount{visibility:hidden!important}'; document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s)); });
    return ctx.newPage();
  };
  const A = await mk('fox'), B = await mk('panda');
  let n = 0; const shot = async (name) => A.screenshot({ path: `shots/game-${String(n++).padStart(2, '0')}-${name}.png` });
  for (const p of [A, B]) { await p.goto(BASE + '/chat', { waitUntil: 'networkidle' }); await W(600); }
  const gate = async (p, name) => { await W(700); const btn = p.locator('#animalGateGrid button', { hasText: name }); if (await btn.count()) { await btn.first().click(); await W(900); } const ok = p.locator('#consentModal button:visible', { hasText: /agree/i }); if (await ok.count()) { await ok.first().click(); await W(600); } };
  await A.click('#startBtn'); await gate(A, 'Fox'); await B.click('#startBtn'); await gate(B, 'Panda'); await W(3000); await B.screenshot({ path: 'prev/dbgB.png' }); await A.screenshot({ path: 'prev/dbgA.png' });
  const say = async (p, t) => { await p.fill('#msgInput', t); await p.press('#msgInput', 'Enter'); await W(900); };
  await say(B, 'hii'); await say(A, 'hey! wanna play something?'); await say(B, 'sure, loser buys coffee'); await shot('chat');
  const open = async (p) => { if (!(await p.isVisible('#gameBtn'))) await p.click('#moreBtn'); await W(300); await p.click('#gameBtn'); await W(700); };
  await open(A); await shot('picker');
  await A.click('.game-pick-card[data-game="ttt"]'); await W(1000); await shot('invite');
  await B.click('#gameInviteAcceptBtn').catch(async () => { await open(B); await B.click('#gameAcceptBtn'); }); await W(1200); await shot('start');
  const cell = (p, i) => p.click(`#tttBoard > *:nth-child(${i + 1})`);
  const aFirst = await A.evaluate(() => /your turn|you go/i.test(document.getElementById('gameStatus').textContent));
  console.log('status A:', await A.textContent('#gameStatus'), 'aFirst', aFirst);
  // A wins on the diagonal 0,4,8; B plays 1,2
  const moves = aFirst ? [[A, 4], [B, 1], [A, 0], [B, 2], [A, 8]] : [[B, 1], [A, 4], [B, 2], [A, 0], [B, 5], [A, 8]];
  for (const [p, i] of moves) { await cell(p, i).catch((e) => console.log('move fail', i, e.message.split('\n')[0])); await W(900); await shot('m' + i); }
  await W(1500); await shot('end');
  await b.close();
})();
