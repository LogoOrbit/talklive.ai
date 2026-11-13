// Play Store launch images: clean phone mockups, headline on top, no floating badges.
// Run from repo root: node android-native/play-screenshots/make-launch-images.js <outDir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const SHOTS = path.join(__dirname, '..', 'app', 'build', 'screenshots');
const OUT = process.argv[2] || path.join(__dirname, 'launch');
fs.mkdirSync(OUT, { recursive: true });
const img = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(SHOTS, f + '.png')).toString('base64');
const font = 'data:font/woff2;base64,' + fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'fonts', 'plus-jakarta-sans-latin.woff2')).toString('base64');

// layout: 'one' = single centred phone, 'two' = back phone + front phone, 'tilt' = single tilted phone
const slides = [
  { name: 'home', k: 'Meet the world', h: 'Talk to someone<br>new. <span>One tap.</span>', g: ['#6d5cff', '#22c4c0'], lay: 'two', a: 'ad_home', b: 'ad_call' },
  { name: 'call', k: 'Live voice calls', h: 'Real voices.<br><span>Real people.</span>', g: ['#2f7bff', '#13b48a'], lay: 'tilt', a: '09_in_call' },
  { name: 'chat', k: 'Text chat', h: 'Prefer typing?<br><span>Just chat.</span>', g: ['#7a5cff', '#ff5ca8'], lay: 'one', a: '19_text_chat' },
  { name: 'friends', k: 'Friends', h: 'Keep the<br><span>good ones.</span>', g: ['#ff6a88', '#7a5cff'], lay: 'two', a: '14_friends', b: '27_voice_chat' },
  { name: 'voice', k: 'Voice notes', h: 'Messages that<br><span>feel alive.</span>', g: ['#12b5a0', '#4c6bff'], lay: 'tilt', a: '27_voice_chat' },
  { name: 'games', k: 'Mini-games', h: 'Break the ice<br><span>with a game.</span>', g: ['#ff8a3d', '#ff4f7b'], lay: 'one', a: '24_game_dots' },
  { name: 'avatars', k: 'No photo needed', h: 'Be anyone.<br><span>Pick an avatar.</span>', g: ['#ffb02e', '#ff5c8a'], lay: 'two', a: '10_animals', b: '40_live_avatars' },
  { name: 'plus', k: 'TalkLive Plus', h: 'Go further with<br><span>Plus.</span>', g: ['#f5b82e', '#8a5cff'], lay: 'tilt', a: '42_plus_ready' },
];

const phone = (src, cls) => `<div class="ph ${cls}"><div class="btn b1"></div><div class="btn b2"></div><div class="scr"><img src="${src}"><div class="cam"></div></div></div>`;

const css = `@font-face{font-family:J;src:url(${font})}
*{margin:0;box-sizing:border-box}
body{width:1080px;height:1920px;overflow:hidden;font-family:J,sans-serif;color:#fff;position:relative;
 background:linear-gradient(160deg,var(--a) 0%,var(--b) 100%)}
.glow{position:absolute;width:1100px;height:1100px;border-radius:50%;left:-10px;top:780px;background:radial-gradient(circle,rgba(255,255,255,.35),transparent 65%)}
.ring{position:absolute;border-radius:50%;border:2px solid rgba(255,255,255,.18)}
.k{position:absolute;top:120px;left:0;right:0;text-align:center}
.k b{display:inline-block;padding:14px 32px;border-radius:99px;background:rgba(255,255,255,.2);font-size:32px;font-weight:700;letter-spacing:1px;text-transform:uppercase}
h1{position:absolute;top:220px;left:40px;right:40px;text-align:center;font-size:100px;line-height:1.02;font-weight:800;letter-spacing:-3px;text-shadow:0 6px 30px rgba(0,0,0,.18)}
h1 span{color:#fff;background:rgba(0,0,0,.16);padding:0 18px;border-radius:24px;-webkit-box-decoration-break:clone}
.ph{position:absolute;width:640px;height:1376px;border-radius:92px;background:linear-gradient(145deg,#2b2f3a,#0c0e14);padding:20px;
 box-shadow:0 60px 120px rgba(10,10,40,.45),0 0 0 4px #3a3f4c inset,0 0 0 2px rgba(255,255,255,.25)}
.ph .scr{position:relative;width:100%;height:100%;border-radius:74px;overflow:hidden;background:#0b0f1a}
.ph img{width:100%;display:block}
.cam{position:absolute;top:26px;left:50%;width:30px;height:30px;margin-left:-15px;border-radius:50%;background:#000;box-shadow:0 0 0 4px #111}
.btn{position:absolute;right:-8px;width:8px;border-radius:0 6px 6px 0;background:#2b2f3a}
.b1{top:260px;height:110px}.b2{top:420px;height:180px}
.one{left:220px;top:620px}
.tilt{left:230px;top:640px;transform:rotate(-7deg)}
.back{left:70px;top:720px;transform:rotate(-9deg) scale(.9);filter:brightness(.92)}
.front{left:380px;top:640px;transform:rotate(6deg)}`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const phones = s.lay === 'two' ? phone(img(s.b), 'back') + phone(img(s.a), 'front') : phone(img(s.a), s.lay);
    await p.setContent(`<html><head><style>${css}</style></head><body style="--a:${s.g[0]};--b:${s.g[1]}">
      <div class="ring" style="width:1400px;height:1400px;left:-160px;top:600px"></div>
      <div class="ring" style="width:1000px;height:1000px;left:40px;top:800px"></div>
      <div class="glow"></div>
      <div class="k"><b>${s.k}</b></div><h1>${s.h}</h1>${phones}</body></html>`, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, `${String(i + 1).padStart(2, '0')}-${s.name}.png`) });
  }
  await b.close();
})();
