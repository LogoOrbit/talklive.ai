const { chromium } = require('playwright');
const path = require('path');
// Inputs: the app screens rendered by ScreenshotTest (./gradlew testDebugUnitTest --tests '*ScreenshotTest*' -Proborazzi.test.record=true).
// Run from the repo root: node android-native/play-screenshots/make-store-images.js android-native/play-screenshots
const SHOTS = require('path').join(__dirname, '..', 'app', 'build', 'screenshots') + '/';

const OUT = process.argv[2];
const fs = require('fs');
const img = (f) => 'data:image/png;base64,' + fs.readFileSync(SHOTS + f + '.png').toString('base64');
const fontData = 'data:font/woff2;base64,' + fs.readFileSync(require('path').join(__dirname, '..', '..', 'public', 'fonts', 'plus-jakarta-sans-latin.woff2')).toString('base64');
const slides = [
  { f: 'ad_home', h: 'Talk to someone new.<br><em>One tap.</em>', s: 'Live voice calls or text chat with real people worldwide.', g: ['#5b4cf0', '#12b5b0'],
    b: [['🌍', '3,412 people online now', 'l', 640], ['🎙️', 'No sign-up · No camera', 'r', 1080], ['⚡', 'Matched in seconds', 'l', 1480]] },
  { f: '09_in_call', h: 'Real voices.<br><em>Real people.</em>', s: 'One-to-one calls, never recorded.', g: ['#1b8f6a', '#2a6fe8'],
    b: [['🇪🇸', 'Matched with Sofia · Spain', 'r', 620], ['❤️', 'Send a reaction mid-call', 'l', 1180], ['📶', 'Great connection · 12 ms', 'r', 1560]] },
  { f: '19_text_chat', h: 'Prefer typing?<br><em>Tap to Chat.</em>', s: 'Private text chats when you can’t talk out loud.', g: ['#2a6fe8', '#7b5cf0'],
    b: [['🇯🇵', 'Kenji · Japan · 7:07 AM there', 'l', 640], ['✨', 'You both like anime & music', 'r', 1100], ['💬', 'Kenji is typing…', 'l', 1500]] },
  { f: '14_friends', h: 'Keep the<br><em>good ones.</em>', s: 'Add people you click with and talk again any time.', g: ['#c2418f', '#6c5ce7'],
    b: [['🤝', 'Lucas wants to be friends', 'r', 600], ['🟢', 'Sofia is online now', 'l', 1060], ['📞', 'Call friends in one tap', 'r', 1480]] },
  { f: '27_voice_chat', h: 'Messages that<br><em>feel alive.</em>', s: 'Voice notes, GIFs, reactions — and replies right from the notification.', g: ['#0e9f8a', '#5b4cf0'],
    b: [['🔔', 'Sofia: haha love that  ·  Reply', 'l', 600], ['🎤', 'Send a voice note', 'r', 1100], ['✓✓', 'Seen', 'l', 1500]] },
  { f: '24_game_dots', h: 'Break the ice<br><em>with a game.</em>', s: 'Play mini-games together during a call or chat.', g: ['#e0663a', '#7b5cf0'],
    b: [['🎮', 'Sofia invited you to play', 'r', 620], ['🏆', 'You won 3 – 2', 'l', 1180], ['🔁', 'Rematch?', 'r', 1520]] },
  { f: '10_animals', h: 'Be anyone.<br><em>Pick your avatar.</em>', s: 'Spirit animals and movie characters — no photo needed.', g: ['#f0a52b', '#c2418f'],
    b: [['🦉', 'Owl · “A good listener”', 'l', 660], ['🎭', '56 avatars to choose from', 'r', 1120], ['🎲', 'Or tap Surprise me', 'l', 1520]] },
  { f: '42_plus_ready', h: 'Go further with<br><em>TalkLive Plus.</em>', s: 'Choose who you meet, undo a skip and shine with an animated avatar.', g: ['#d8a32a', '#6c5ce7'], crop: true,
    b: [['💎', 'Choose women or men', 'r', 640], ['↩️', 'Undo a skip', 'l', 1100], ['✨', 'Animated, shining avatar', 'r', 1500]] },
];
const css = `@font-face{font-family:J;src:url(${fontData})}
*{margin:0;box-sizing:border-box}
body{width:1080px;height:1920px;overflow:hidden;font-family:J,'DejaVu Sans',sans-serif;background:#0b0f1a;color:#fff;position:relative}
.bg{position:absolute;inset:0;background:radial-gradient(900px 700px at 15% 8%,var(--a),transparent 70%),radial-gradient(900px 800px at 95% 70%,var(--b),transparent 70%),#0b0f1a;opacity:.95}
.grain{position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.04),transparent 40%)}
h1{position:absolute;top:100px;left:40px;right:40px;text-align:center;font-size:84px;line-height:1.02;font-weight:800;letter-spacing:-3px}
h1 em{font-style:normal;background:linear-gradient(90deg,#fff,#cfd8ff);-webkit-background-clip:text;color:transparent}
p.s{position:absolute;top:330px;left:110px;right:110px;text-align:center;font-size:36px;line-height:1.3;color:rgba(255,255,255,.78);font-weight:500}
.phone{position:absolute;left:50%;transform:translateX(-50%);top:480px;width:700px;height:1505px;border-radius:84px;background:#05070d;padding:18px;box-shadow:0 40px 120px rgba(0,0,0,.6),0 0 0 3px rgba(255,255,255,.12) inset}
.phone .scr{width:100%;height:100%;border-radius:68px;overflow:hidden;background:#0b0f1a}
.phone img{width:100%;display:block}
.bub{position:absolute;display:flex;align-items:center;gap:18px;padding:22px 34px 22px 22px;border-radius:999px;background:rgba(255,255,255,.96);color:#141826;font-size:34px;font-weight:700;box-shadow:0 18px 50px rgba(0,0,0,.45);white-space:nowrap}
.bub i{font-family:'Noto Color Emoji',J;font-style:normal;display:flex;align-items:center;justify-content:center;width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg,var(--a),var(--b));font-size:34px;color:#fff;font-weight:800}
.l{left:40px;transform:rotate(-3deg)} .r{right:40px;transform:rotate(3deg)}`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const bubs = s.b.map(([ic, t, side, top]) => `<div class="bub ${side}" style="top:${top}px"><i>${ic}</i>${t}</div>`).join('');
    const html = `<html><head><style>${css}</style></head><body style="--a:${s.g[0]};--b:${s.g[1]}"><div class="bg"></div><div class="grain"></div>
      <h1>${s.h}</h1><p class="s">${s.s}</p>
      <div class="phone"><div class="scr"><img src="${img(s.f)}"></div></div>${bubs}</body></html>`;
    await p.setContent(html, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, `${String(i + 1).padStart(2, '0')}-${s.f.replace(/^\d+_|^ad_/, '')}.png`) });
  }
  // Feature graphic 1024x500
  await p.setViewportSize({ width: 1024, height: 500 });
  await p.setContent(`<html><head><style>@font-face{font-family:J;src:url(${fontData})}*{margin:0}body{width:1024px;height:500px;overflow:hidden;font-family:J,'DejaVu Sans',sans-serif;background:radial-gradient(600px 400px at 10% 10%,#5b4cf0,transparent 70%),radial-gradient(600px 500px at 90% 90%,#12b5b0,transparent 70%),#0b0f1a;color:#fff;position:relative}
  h1{position:absolute;left:70px;top:130px;font-size:78px;font-weight:800;letter-spacing:-2px;line-height:1}p{position:absolute;left:72px;top:250px;font-size:30px;color:rgba(255,255,255,.8);width:520px;line-height:1.3}
  img{position:absolute;right:60px;top:40px;width:300px;border-radius:40px;box-shadow:0 20px 60px rgba(0,0,0,.6)}</style></head><body>
  <h1>TalkLive</h1><p>Talk to someone new, right now. Voice or text, worldwide.</p><img src="${img('09_in_call')}"></body></html>`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(OUT, 'feature-graphic.png') });
  await b.close();
})();
