'use strict';
// Algeria: "Face A / Face B". A raï cassette from the car stereo: the hero is a
// tape with its two reels and handwritten J-card, sections are the tracklist,
// and the Darja glossary is printed like liner notes. Green and white from the
// flag with the red of the crescent. Unbounded for display, IBM Plex Serif to
// read. The meme is the most Algerian word of all: "normal".
const TRACKS = [
  ['A1', 'Wech rak, sahbi?'],
  ['A2', 'Les heures qui chauffent'],
  ['A3', 'Darja 101'],
  ['B1', 'Foot, couscous et raï'],
  ['B2', 'Reste safe, kho'],
];
const DARJA = [
  ['Wech rak?', 'واش راك؟', 'How are you? The hello of every Algerian.'],
  ['Sahbi / kho', 'صاحبي / خو', 'My friend / bro. Kho is for your closest.'],
  ['Bezzaf', 'بزاف', 'A lot. "Nhabek bezzaf" = I love it a lot.'],
  ['Normal', 'نورمال', 'Fine, sure, no problem. The answer to everything.'],
  ['Saha', 'صحّة', 'Cheers, well done, enjoy. Saha ftourek in Ramadan.'],
  ['Ya3tik saha', 'يعطيك الصحة', 'Thanks a lot, literally "may God give you health".'],
  ['Mlih', 'مليح', 'Good. Kolchi mlih = all good.'],
  ['Zawali', 'زوالي', 'Broke, a simple guy. Said with love and a laugh.'],
];
const FLAG = `<svg class="dz-flag" viewBox="0 0 90 60" role="img" aria-label="Flag of Algeria">
<defs><mask id="dz-m"><rect width="90" height="60" fill="#fff"/><circle cx="49" cy="30" r="12" fill="#000"/></mask></defs>
<rect width="45" height="60" fill="#006233"/><rect x="45" width="45" height="60" fill="#fff"/>
<circle cx="45" cy="30" r="15" fill="#d21034" mask="url(#dz-m)"/>
<polygon points="${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => {
    const r = k % 2 ? 2.9 : 7.2;
    const a = Math.PI + (Math.PI / 5) * k;
    return `${(53 + r * Math.cos(a)).toFixed(2)},${(30 + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ')}" fill="#d21034"/>
</svg>`;

module.exports = {
  slug: 'algeria',
  name: 'Algeria',
  date: '2026-10-12',
  title: 'Talk to Strangers in Algeria: Tchat DZ Gratuit, Sans Inscription | TalkLive',
  description: 'Tchat Algérie gratuit, en darja, en français ou en arabe. Free voice and text chat with people in Algeria, no account, no camera. Darja slang, best hours and how to stay safe.',
  keywords: 'tchat algerie, chat dz, tchat dz gratuit, chat vocal algérie, discuter avec des algériens, دردشة جزائرية, شات الجزائر, دردشة صوتية مجانية, talk to strangers algeria, algerian voice chat, chat with algerians',
  h1: 'Talk to Strangers in Algeria',
  theme: '#006233',
  preload: ['unbounded-latin-800-normal', 'ibm-plex-serif-latin-400-normal'],
  css: `
:root{--paper:#f5f2ea;--ink:#16211b;--rule:#d9d2c0;--vert:#006233;--rouge:#d21034;--tape:#1b1b1d;--label:#fff6dc;--mast:#fff}
body{font-family:"IBM Plex Serif",Georgia,serif;background:var(--paper);color:var(--ink)}
.c-bar{background:var(--vert);color:var(--mast);max-width:none}
.dz-hero{background:linear-gradient(90deg,var(--vert) 0 50%,#fff 50% 100%);padding:46px 16px}
.dz-tape{max-width:960px;margin:0 auto;background:var(--tape);border-radius:18px;padding:22px;box-shadow:0 24px 46px -26px rgba(0,0,0,.7)}
.dz-label{background:var(--label);border-radius:8px;padding:26px 28px 20px;position:relative}
.dz-side{position:absolute;right:20px;top:18px;font:800 40px/1 Unbounded,sans-serif;color:var(--rouge)}
.dz-label h1{font:800 clamp(30px,5.4vw,62px)/1 Unbounded,sans-serif;margin:0 0 12px;letter-spacing:-.02em;max-width:16ch}
.dz-label p{font-size:18px;line-height:1.6;margin:0 0 20px;max-width:560px}
.dz-window{display:flex;align-items:center;justify-content:space-between;gap:20px;background:#2b2b2e;border-radius:40px;margin:18px auto 0;padding:14px 46px;max-width:520px}
.dz-reel{width:70px;height:70px;border-radius:50%;background:radial-gradient(circle,#fff 0 8px,#3a3a3e 9px 22px,#6b4a2b 23px 33px,#2b2b2e 34px);animation:dzspin 6s linear infinite}
.dz-window .dz-flag{width:96px;height:64px;border:2px solid #fff;border-radius:3px}
@keyframes dzspin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.dz-reel{animation:none}}
.dz-tracks{max-width:960px;margin:18px auto 0;display:flex;gap:8px;flex-wrap:wrap;font:800 12px/1 Unbounded,sans-serif}
.dz-tracks span{background:var(--tape);color:#fff;padding:9px 12px;border-radius:6px}
.dz-tracks i{font-style:normal;color:var(--rouge);margin-right:6px}
.dz-main{max-width:780px;margin:0 auto;padding:10px 20px 0}
.dz-sec{padding:40px 0 6px;border-bottom:2px solid var(--rule)}
.dz-sec h2{font:800 clamp(24px,3.8vw,36px)/1.1 Unbounded,sans-serif;margin:0 0 14px}
.dz-sec h2 i{font-style:normal;color:var(--rouge);margin-right:10px}
.dz-sec p{font-size:18px;line-height:1.75;margin:0 0 1.05em}
.dz-sec a{color:var(--vert)}
.dz-notes{display:grid;grid-template-columns:1fr 1fr;gap:0;border:2px solid var(--ink);margin:20px 0;background:#fff}
.dz-notes div{padding:14px 16px;border-bottom:1px dashed var(--rule)}
.dz-notes div:nth-child(odd){border-right:1px dashed var(--rule)}
.dz-notes b{font:800 17px/1.2 Unbounded,sans-serif;color:var(--vert)}
.dz-notes span{display:block;font-size:20px;margin:4px 0;direction:rtl;text-align:left;color:var(--rouge)}
.dz-notes small{font-size:14.5px;line-height:1.45;display:block}
.dz-meme{background:var(--vert);color:#fff;border-radius:14px;padding:22px 24px;margin:24px 0}
.dz-meme ul{list-style:none;margin:0;padding:0}
.dz-meme li{padding:7px 0;border-bottom:1px solid rgba(255,255,255,.2);font-size:16.5px}
.dz-meme li b{font:800 15px/1 Unbounded,sans-serif;color:#ffd166;margin-left:8px}
.dz-meme h3{font:800 20px/1.2 Unbounded,sans-serif;margin:0 0 10px}
.dz-help{background:#fff;border:2px solid var(--rouge);border-radius:10px;padding:16px 20px;font-size:16.5px;line-height:1.6}
.c-faq{max-width:780px;margin:36px auto 0;padding:0 20px}
.c-faq h2{font:800 30px/1.1 Unbounded,sans-serif;margin:0 0 12px}
.c-faq summary{font:600 17px/1.45 "IBM Plex Serif",serif}
.c-faq p{font-size:16.5px;line-height:1.65}
.dz-end{margin-top:60px;background:var(--tape);color:#fff;text-align:center;padding:56px 20px;border-top:10px solid var(--vert);border-bottom:10px solid var(--rouge)}
.dz-end h2{font:800 clamp(32px,5.6vw,58px)/1.05 Unbounded,sans-serif;margin:0 0 10px}
.dz-end p{font-size:18px;line-height:1.55;margin:0 auto 24px;max-width:540px}
.dz-end .c-ctas{justify-content:center;margin:0 auto}
@media (max-width:760px){.dz-notes{grid-template-columns:1fr}.dz-notes div:nth-child(odd){border-right:0}.dz-window{padding:12px 20px}.dz-reel{width:54px;height:54px}.dz-side{position:static;display:block;margin-bottom:8px;font-size:28px}}
`,
  faq: [
    { q: 'TalkLive c’est gratuit en Algérie ?', a: 'Oui, normal. Voice and text chat are free, no account, no phone number, no camera. Choosing Algeria as a preferred country is free too.' },
    { q: 'Can I chat in Darja, French or Arabic?', a: 'Yes. Speak whatever you and your match share. You can also switch the site to French at talklive.app/fr/ or Arabic at talklive.app/ar/.' },
    { q: 'When is Algeria busiest on TalkLive?', a: 'TalkLive is busiest between 15:00 and 21:00 UTC, which is 16h to 22h in Algeria all year, since Algeria stays on UTC+1.' },
    { q: 'Do I need to download an app?', a: 'No. It works in the browser on Android, iPhone and computer, and you can add it to your home screen.' },
    { q: 'What are the emergency numbers in Algeria?', a: 'Call 17 for police and 14 for civil protection, which handles fire and ambulance emergencies. Both are free.' },
  ],
  body: (c) => `<main id="story">
<section class="dz-hero"><div class="dz-tape">
  <div class="dz-label">
    <span class="dz-side" aria-hidden="true">A</span>
    <h1>Talk to strangers in Algeria</h1>
    <p>Wech rak? Tchat DZ, but with real voices. A voice call or a text chat with someone new, from Alger to Oran, Constantine to Tamanrasset. Gratuit, no account, no camera.</p>
    ${c.ctas('Tap to Talk', 'Tap to Chat')}
  </div>
  <div class="dz-window"><i class="dz-reel" aria-hidden="true"></i>${FLAG}<i class="dz-reel" aria-hidden="true"></i></div>
</div>
<div class="dz-tracks" aria-label="Tracklist">${TRACKS.map(([n, t]) => `<span><i>${n}</i>${t}</span>`).join('')}</div>
</section>

<div class="dz-main">
  <section class="dz-sec">
    <h2><i>A1</i>Wech rak, sahbi?</h2>
    <p>Algerians know how to talk. A coffee at the café becomes two hours, a taxi ride becomes a life story, and every neighbour has an opinion. TalkLive brings that energy online: one tap, a real person, a real conversation. On the bus, can’t talk out loud? Tap to Chat and type.</p>
    <p>And yes, people chat in Darja, in French, in Arabic, in Tamazight, or all of them in the same sentence. That is normal.</p>
  </section>

  <section class="dz-sec">
    <h2><i>A2</i>Les heures qui chauffent</h2>
    <p>TalkLive is busiest from 16h to 22h in Algeria, every day. In Ramadan, the real party starts after ftour, when everyone is full, happy and on their phone until shour.</p>
  </section>

  <section class="dz-sec">
    <h2><i>A3</i>Darja 101</h2>
    <p>Chatting with someone who doesn’t know Algerian Darja? Teach them. Chatting with a fellow DZ? You already know, but here are the classics anyway.</p>
    <div class="dz-notes">${DARJA.map(([w, ar, m]) => `<div><b>${w}</b><span lang="ar">${ar}</span><small>${m}</small></div>`).join('')}</div>
    <div class="dz-meme" aria-label="Meme: the Algerian normal">
      <h3>Algerians answering any question:</h3>
      <ul>
        <li>Your team lost 4-0? <b>Normal</b></li>
        <li>The bus is two hours late? <b>Normal</b></li>
        <li>It’s 47 degrees in the shade? <b>Normal</b></li>
        <li>You just met a stranger and talked for three hours? <b>Normal bezzaf</b> \u{1F602}</li>
      </ul>
    </div>
  </section>

  <section class="dz-sec">
    <h2><i>B1</i>Foot, couscous et raï</h2>
    <p>Les Fennecs, the national team, will start any conversation, and so will the 2019 Africa Cup of Nations win. Couscous is a safe topic until someone from Morocco or Tunisia joins in, then it is a friendly war. Raï classics, from Cheb Khaled to Cheb Hasni, are always a vibe, and karantika from the street stall beats any fancy restaurant.</p>
    <p>Fun fact to drop on a call: Algeria is the biggest country in Africa by area. Most people outside guess wrong.</p>
  </section>

  <section class="dz-sec">
    <h2><i>B2</i>Reste safe, kho</h2>
    <p>Keep your full name, address, Insta, Snap and workplace private at first. Never share a bank code, a BaridiMob code or any SMS code. If someone asks for money, flexy credit, photos or wants to move to another app fast, it is a scam, so skip. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">scam guide</a> explains the usual tricks. Every call has Report and Block, and TalkLive is 18+ only.</p>
    <div class="dz-help"><b>Urgence :</b> <b>17</b> for police, <b>14</b> for civil protection (fire and ambulance). Free from any phone.</div>
  </section>
</div>

${c.faq('Questions fréquentes')}
<section class="dz-end">
  <h2>Yallah, on parle ?</h2>
  <p>Face B is waiting. Someone in Algeria is online right now. Wech, say hi.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
