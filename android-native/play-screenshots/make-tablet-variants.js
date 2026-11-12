// Tablet (1600x2560) and desktop (1920x1080) store images, built from the same
// app screens and copy as make-store-images.js.
// Run from the repo root: node android-native/play-screenshots/make-size-variants.js android-native/play-screenshots
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const SHOTS = path.join(__dirname, '..', 'app', 'build', 'screenshots') + '/';
const FONT = 'data:font/woff2;base64,' + fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'fonts', 'plus-jakarta-sans-latin.woff2')).toString('base64');
const img = (f) => 'data:image/png;base64,' + fs.readFileSync(SHOTS + f + '.png').toString('base64');
const OUT = process.argv[2];
const slides = [
  ['01', 'ad_home', 'Talk to someone new.', 'One tap.', 'Live voice calls or text chat with real people worldwide.', ['#5b4cf0', '#12b5b0']],
  ['02', '09_in_call', 'Real voices.', 'Real people.', 'One-to-one calls, never recorded.', ['#1b8f6a', '#2a6fe8']],
  ['03', '19_text_chat', 'Prefer typing?', 'Tap to Chat.', 'Private text chats when you can’t talk out loud.', ['#2a6fe8', '#7b5cf0']],
  ['04', '14_friends', 'Keep the', 'good ones.', 'Add people you click with and talk again any time.', ['#c2418f', '#6c5ce7']],
  ['05', '27_voice_chat', 'Messages that', 'feel alive.', 'Voice notes, GIFs, reactions, and replies from the notification.', ['#0e9f8a', '#5b4cf0']],
  ['06', '24_game_dots', 'Break the ice', 'with a game.', 'Play mini-games together during a call or chat.', ['#e0663a', '#7b5cf0']],
  ['07', '10_animals', 'Be anyone.', 'Pick your avatar.', 'Spirit animals and movie characters, no photo needed.', ['#f0a52b', '#c2418f']],
  ['08', '42_plus_ready', 'Go further with', 'TalkLive Plus.', 'Choose who you meet, undo a skip, and shine with an animated avatar.', ['#d8a32a', '#6c5ce7']],
];
const base = (w, h, a, b, layout) => `@font-face{font-family:J;src:url(${FONT})}*{margin:0;box-sizing:border-box}
body{width:${w}px;height:${h}px;overflow:hidden;font-family:J,'DejaVu Sans',sans-serif;background:#0b0f1a;color:#fff;position:relative;--a:${a};--b:${b}}
.bg{position:absolute;inset:0;background:radial-gradient(${w*0.6}px ${h*0.45}px at 15% 8%,var(--a),transparent 70%),radial-gradient(${w*0.7}px ${h*0.5}px at 95% 75%,var(--b),transparent 70%),#0b0f1a;opacity:.95}
h1{position:absolute;text-align:center;font-weight:800;letter-spacing:-0.03em;line-height:1.02}
h1 em{font-style:normal;background:linear-gradient(90deg,#fff,#cfd8ff);-webkit-background-clip:text;color:transparent}
p.s{position:absolute;text-align:center;color:rgba(255,255,255,.78);font-weight:500;line-height:1.3}
.phone{position:absolute;background:#05070d;box-shadow:0 40px 120px rgba(0,0,0,.6),0 0 0 3px rgba(255,255,255,.12) inset}
.phone .scr{width:100%;height:100%;overflow:hidden;background:#0b0f1a}
.phone img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.bub{position:absolute;display:flex;align-items:center;gap:18px;padding:20px 32px 20px 20px;border-radius:999px;background:rgba(255,255,255,.96);color:#141826;font-weight:700;box-shadow:0 18px 50px rgba(0,0,0,.45);white-space:nowrap}
.bub i{font-family:'Noto Color Emoji',J;font-style:normal;display:flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(135deg,var(--a),var(--b));color:#fff;font-weight:800}
${layout}`;
async function render(p, file, w, h, html) {
  await p.setViewportSize({ width: w, height: h });
  await p.setContent(html, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(OUT, file) });
}
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  // Tablet portrait 1600x2560
  for (const [n, f, h1a, h1b, s, g] of slides) {
    const bubs = [[ '•', 'Tap, talk, done', 'l', 1500], ['✓', 'Free to start', 'r', 1900], ['★', 'Made for every phone', 'l', 2250]];
    const layout = `h1{top:150px;left:60px;right:60px;font-size:150px}p.s{top:520px;left:200px;right:200px;font-size:60px}
      .phone{left:50%;transform:translateX(-50%);top:760px;width:860px;height:1700px;border-radius:110px;padding:24px}
      .phone .scr{border-radius:86px}
      .bub{font-size:52px}.bub i{width:96px;height:96px;font-size:50px}.l{left:80px;transform:rotate(-3deg)}.r{right:80px;transform:rotate(3deg)}`;
    const html = `<html><head><style>${base(1440, 2560, g[0], g[1], layout)}</style></head><body><div class="bg"></div>
      <h1>${h1a}<br><em>${h1b}</em></h1><p class="s">${s}</p>
      <div class="phone"><div class="scr"><img src="${img(f)}"></div></div>
      ${s ? '' : ''}</body></html>`;
    await render(p, `tenin-${n}.png`, 1440, 2560, html);
  }
  if (process.env.ONLY_TABLET) { await b.close(); return; }
  // Desktop landscape 1920x1080
  for (const [n, f, h1a, h1b, s, g] of slides) {
    const layout = `h1{top:200px;left:110px;width:820px;text-align:left;font-size:112px}p.s{top:560px;left:116px;width:760px;text-align:left;font-size:40px}
      .phone{right:260px;top:90px;width:430px;height:900px;border-radius:64px;padding:14px}
      .phone .scr{border-radius:52px}
      .bub{font-size:34px}.bub i{width:70px;height:70px;font-size:34px}.l{left:1080px;top:720px;transform:rotate(-3deg)}.r{left:1080px;top:340px;transform:rotate(3deg)}`;
    const html = `<html><head><style>${base(1920, 1080, g[0], g[1], layout)}</style></head><body><div class="bg"></div>
      <h1>${h1a}<br><em>${h1b}</em></h1><p class="s">${s}</p>
      <div class="phone"><div class="scr"><img src="${img(f)}"></div></div></body></html>`;
    await render(p, `desktop-${n}.png`, 1920, 1080, html);
  }
  await b.close();
})();
