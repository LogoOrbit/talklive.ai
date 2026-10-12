'use strict';
// Australia: "Between the Flags". Surf beach at golden hour: sand, a rolling
// SVG swell, the red and yellow lifesaver flags that mark the safe zone, and the
// slang written on surfboards. Anton for display, Archivo to read. The meme is
// spring magpie swooping season, which every Aussie has lived through.
function star(cx, cy, r, points, inner) {
  const pts = [];
  for (let i = 0; i < points * 2; i += 1) {
    const rad = i % 2 ? r * inner : r;
    const a = (Math.PI / points) * i - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="#fff"/>`;
}

const FLAG = `<svg class="au-flag" viewBox="0 0 120 60" role="img" aria-label="Flag of Australia">
<defs><clipPath id="au-t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath><clipPath id="au-c"><rect width="60" height="30"/></clipPath></defs>
<rect width="120" height="60" fill="#012169"/>
<g clip-path="url(#au-c)"><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#au-t)" stroke="#c8102e" stroke-width="4"/><path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/><path d="M30,0 v30 M0,15 h60" stroke="#c8102e" stroke-width="6"/></g>
${star(30, 45, 9, 7, 0.45)}${star(90, 50, 4.3, 7, 0.45)}${star(75, 26.3, 4.3, 7, 0.45)}${star(90, 10, 4.3, 7, 0.45)}${star(103.3, 22.3, 4.3, 7, 0.45)}${star(96, 32.5, 2.5, 5, 0.4)}
</svg>`;

const BOARDS = [
  ['Arvo', 'Afternoon. "Chat this arvo?"', '#ffd23f'],
  ['Heaps', 'A lot. Heaps good = very good.', '#3fc1c9'],
  ['Reckon', 'Think. "Reckon you’d like it."', '#ff6b6b'],
  ['Keen', 'Up for it. "You keen for a call?"', '#9be564'],
  ['Stoked', 'Stoked = absolutely buzzing.', '#ffa45b'],
  ['Yeah nah', 'No. Nah yeah means yes. Good luck.', '#c9b6ff'],
  ['Suss', 'Suspicious. That DM is a bit suss.', '#ffd23f'],
  ['She’ll be right', 'It will all work out. National motto, basically.', '#3fc1c9'],
];

module.exports = {
  slug: 'australia',
  name: 'Australia',
  date: '2026-10-12',
  title: 'Talk to Strangers in Australia: Free Random Voice Chat, No Sign-Up | TalkLive',
  description: 'Free random voice and text chat with people in Australia and around the world. No account, no camera, no app. Aussie slang, the best hours to call and how to keep it safe.',
  keywords: 'talk to strangers australia, random chat australia, free voice chat australia, anonymous chat, chat with strangers no sign up, aussie chat, omegle alternative australia, meet new people online australia, random call app, talk to someone australia',
  h1: 'Talk to Strangers in Australia',
  theme: '#0b5d8a',
  preload: ['anton-latin-400-normal', 'archivo-latin-400-normal'],
  css: `
:root{--paper:#fff8ec;--ink:#13202b;--rule:#ecd9b6;--sea:#0b5d8a;--surf:#3fc1c9;--sand:#f3d9a4;--red:#e63946;--yel:#ffd23f;--mast:#fff}
body{font-family:Archivo,system-ui,sans-serif;background:var(--paper);color:var(--ink)}
.c-bar{background:var(--sea);color:var(--mast);max-width:none}
.au-hero{position:relative;background:linear-gradient(180deg,#ffb36b 0,#ffd9a0 38%,#8fd3e0 38.2%,var(--surf) 60%,var(--sand) 60.2%,var(--sand) 100%);padding:54px 20px 90px;overflow:hidden}
.au-hero-in{position:relative;max-width:1040px;margin:0 auto;display:grid;grid-template-columns:1fr 240px;gap:24px;align-items:end;z-index:2}
.au-hero h1{font:400 clamp(48px,9vw,118px)/.9 Anton,sans-serif;margin:0 0 16px;color:#13202b;text-transform:uppercase;letter-spacing:.01em}
.au-hero p{font-size:19px;line-height:1.55;margin:0 0 24px;max-width:540px;background:rgba(255,248,236,.86);padding:12px 14px;border-radius:8px}
.au-flagpost{text-align:center}
.au-flag{width:220px;height:110px;display:block;margin:0 auto 10px;border:3px solid #fff;box-shadow:0 10px 24px -14px rgba(0,0,0,.5)}
.au-lsv{padding:0 56px;display:flex;justify-content:center;gap:24px;margin-top:6px}
.au-lsv i{display:block;width:6px;height:96px;background:#6b4a2b;position:relative}
.au-lsv i::after{content:"";position:absolute;right:6px;top:0;width:50px;height:34px;background:linear-gradient(180deg,var(--red) 50%,var(--yel) 50%)}
.au-lsv i:last-child::after{right:auto;left:6px}
.au-cap{font:600 12px/1.3 Archivo,sans-serif;letter-spacing:.08em;text-transform:uppercase;margin-top:8px}
.au-wave{position:absolute;left:0;right:0;bottom:-2px;width:100%;height:80px;z-index:1}
.au-main{max-width:780px;margin:0 auto;padding:14px 20px 0}
.au-sec{padding:40px 0 6px}
.au-sec h2{font:400 clamp(34px,5vw,54px)/1 Anton,sans-serif;text-transform:uppercase;margin:0 0 14px;color:var(--sea)}
.au-sec p{font-size:18px;line-height:1.75;margin:0 0 1.05em}
.au-sec a{color:var(--sea)}
.au-boards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:22px 0}
.au-board{background:var(--c);border-radius:999px/46%;padding:30px 14px;text-align:center;min-height:200px;display:flex;flex-direction:column;justify-content:center;box-shadow:inset 0 0 0 3px rgba(255,255,255,.6),0 10px 22px -16px rgba(0,0,0,.6);position:relative}
.au-board::before{content:"";position:absolute;left:50%;top:10%;bottom:10%;width:2px;background:rgba(19,32,43,.25)}
.au-board b{position:relative;display:block;font:400 26px/1 Anton,sans-serif;text-transform:uppercase;margin-bottom:8px}
.au-board span{position:relative;font-size:14px;line-height:1.4;background:rgba(255,255,255,.75);border-radius:6px;padding:4px 6px}
.au-meme{background:#13202b;color:#fff;border-radius:16px;padding:22px;margin:24px 0;display:grid;grid-template-columns:90px 1fr;gap:16px;align-items:center}
.au-meme .au-bird{font-size:64px;line-height:1;text-align:center}
.au-meme b{font:400 26px/1.05 Anton,sans-serif;text-transform:uppercase;color:var(--yel);display:block;margin-bottom:6px}
.au-meme span{font-size:16px;line-height:1.5}
.au-time{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0}
.au-time div{background:#fff;border:2px solid var(--sea);border-radius:12px;padding:14px 16px}
.au-time b{display:block;font:400 30px/1 Anton,sans-serif;color:var(--sea);margin-bottom:6px}
.au-help{background:var(--red);color:#fff;border-radius:12px;padding:16px 20px;font-size:16.5px;line-height:1.6}
.c-faq{max-width:780px;margin:36px auto 0;padding:0 20px}
.c-faq h2{font:400 40px/1 Anton,sans-serif;text-transform:uppercase;color:var(--sea);margin:0 0 12px}
.c-faq summary{font:600 17px/1.45 Archivo,sans-serif}
.c-faq p{font-size:16.5px;line-height:1.65}
.au-end{margin-top:60px;background:linear-gradient(180deg,var(--surf),var(--sea));color:#fff;text-align:center;padding:60px 20px}
.au-end h2{font:400 clamp(40px,7vw,80px)/.95 Anton,sans-serif;text-transform:uppercase;margin:0 0 10px}
.au-end p{font-size:18px;line-height:1.55;margin:0 auto 24px;max-width:540px}
.au-end .c-ctas{justify-content:center;margin:0 auto}
@media (max-width:800px){.au-hero-in{grid-template-columns:1fr}.au-boards{grid-template-columns:1fr 1fr}.au-meme{grid-template-columns:1fr;text-align:center}.au-time{grid-template-columns:1fr}}
`,
  faq: [
    { q: 'Is TalkLive free in Australia?', a: 'Yes. Voice and text chat are free, with no account, no phone number and no camera. Setting Australia as a preferred country is free as well.' },
    { q: 'Will I get matched with other Australians?', a: 'Sometimes. You can prefer Australia in Filters, but matching depends on who is online. Global matching is the fastest and usually means people from India, the UK, the US and beyond.' },
    { q: 'What is the best time to chat from Australia?', a: 'Aussie evenings, roughly 7 pm to 11 pm on the east coast, line up with afternoon in South Asia and morning in Europe, so there is always someone around. TalkLive is busiest globally between 15:00 and 21:00 UTC, which is the middle of the night in Australia.' },
    { q: 'Do I need to download an app?', a: 'Nah. It runs in your browser on Android, iPhone and computer. Add it to your home screen if you want an icon.' },
    { q: 'What is the emergency number in Australia?', a: 'Call 000 for police, ambulance or fire. 112 also works from mobile phones. For crisis support, Lifeline is 13 11 14.' },
  ],
  body: (c) => `<main id="story">
<section class="au-hero">
  <div class="au-hero-in">
    <div>
      <h1>Talk to strangers, Aussie style</h1>
      <p>Random voice and text chat with real people, no sign-up, no camera, no app. G’day someone new in Sydney, Melbourne, Brisbane or Perth, or go global and chat with the world.</p>
      ${c.ctas('Tap to Talk', 'Tap to Chat')}
    </div>
    <div class="au-flagpost">
      ${FLAG}
      <div class="au-lsv" aria-hidden="true"><i></i><i></i></div>
      <div class="au-cap">Always chat between the flags</div>
    </div>
  </div>
  <svg class="au-wave" viewBox="0 0 1200 80" preserveAspectRatio="none" aria-hidden="true"><path d="M0 40 Q 150 0 300 40 T 600 40 T 900 40 T 1200 40 V80 H0 Z" fill="#fff8ec"/></svg>
</section>

<div class="au-main">
  <section class="au-sec">
    <h2>A big country, a lot of quiet nights</h2>
    <p>Australia is huge and spread out, and plenty of people end up with an empty arvo or a long night shift and nobody to chat to. TalkLive fixes that in one tap. You get a real person on a voice call, or switch to text if you are on the train or the housemates are asleep.</p>
    <p>Because of the time zones, Australia is a bit special. Here is when it is good to jump on:</p>
    <div class="au-time">
      <div><b>7pm to 11pm AEDT</b>Evening for you, afternoon in India and Pakistan, morning in the UK. Great mix of people.</div>
      <div><b>Weekend arvos</b>Lazy Saturday and Sunday afternoons, when everyone else in the world is having their Friday or Saturday night.</div>
    </div>
  </section>

  <section class="au-sec">
    <h2>Talk like a local</h2>
    <p>Aussie English is a whole language. Drop a couple of these on a call and watch the other person lose it.</p>
    <div class="au-boards">${BOARDS.map(([w, m, col]) => `<div class="au-board" style="--c:${col}"><b>${w}</b><span>${m}</span></div>`).join('')}</div>
    <p>Gen Z bonus: if something is mid it is mid everywhere, but in Australia it is also probably <em>a bit cooked</em>. If someone is <em>cooked</em>, they are done for. And yes, people really say <em>no worries</em> about absolutely everything.</p>
    <div class="au-meme" aria-label="Meme: magpie season">
      <div class="au-bird" aria-hidden="true">\u{1F426}\u{1F6B4}</div>
      <div><b>POV: it’s spring and you hear wings behind you</b><span>Swooping season. Every Aussie has a magpie story, a zip-tie helmet story, or a mate who sprinted down the footpath screaming. Ask your match for theirs.</span></div>
    </div>
  </section>

  <section class="au-sec">
    <h2>What to talk about</h2>
    <p>Footy, but check which code first, because AFL people and NRL people are not the same people. Cricket in summer. The Bunnings sausage sizzle, and whether the onion goes under or on top. Beach versus pool, the cost of rent, uni, travel, and of course the wildlife, which non-Aussies will always ask about.</p>
    <p>Chatting with someone overseas? People love hearing about Australia, so you will rarely be stuck for something to say.</p>
  </section>

  <section class="au-sec">
    <h2>Stay safe</h2>
    <p>Keep your full name, address, socials and workplace to yourself at first. Never share bank details or a verification code, and if someone asks for money, gift cards, photos or wants to move to another app fast, that is suss, so leave. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">scam guide</a> covers the common tricks. Every call has Report and Block, and TalkLive is 18+ only.</p>
    <div class="au-help"><b>Emergency:</b> call <b>000</b> (112 also works from mobiles). Crisis support: Lifeline <b>13 11 14</b>, any time.</div>
  </section>
</div>

${c.ad()}
${c.faq('Questions, mate')}
<section class="au-end">
  <h2>Keen for a yarn?</h2>
  <p>Someone, somewhere is up for a chat. Could be in Adelaide, could be in Mumbai. Only one way to find out.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
