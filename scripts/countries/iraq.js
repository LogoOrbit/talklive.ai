'use strict';
// Iraq: "Friday on Al-Mutanabbi Street". Baghdad's book market: the hero is a
// shelf of book spines with Iraqi words on them, the body reads like the pages
// of a well-thumbed book with a ribbon marker, and the end is a glass of chai in
// an istikan. Abril Fatface for display, Source Serif 4 to read. Red, white and
// black with green from the flag.
const SPINES = [
  ['شلونك', 'Shlonak', '#b5121b'], ['شكو ماكو', 'Shaku maku', '#1d1d1d'], ['زين', 'Zain', '#2e6b3d'],
  ['هواية', 'Hwaya', '#7a4b1e'], ['كلش', 'Kulish', '#b5121b'], ['خوش', 'Khosh', '#1d1d1d'], ['عيني', 'Eini', '#2e6b3d'],
];
const WORDS = [
  ['Shlonak? / Shlonich?', 'شلونك؟', 'How are you? (to a guy / to a girl). The start of every call.'],
  ['Shaku maku?', 'شكو ماكو؟', 'What’s new, what’s up. The most Iraqi question there is.'],
  ['Aku / Maku', 'أكو / ماكو', 'There is / there isn’t. "Maku mushkila" = no problem.'],
  ['Zain', 'زين', 'Good, fine, okay. "Zain, al-hamdulillah."'],
  ['Hwaya', 'هواية', 'A lot. "Ashkurak hwaya" = thanks a lot.'],
  ['Kulish', 'كلش', 'Very. "Kulish helw" = really nice.'],
  ['Khosh', 'خوش', 'Good, great. "Khosh walad" = a good guy.'],
  ['Eini', 'عيني', 'My dear, literally "my eye". Warm and everywhere.'],
];
const FLAG = `<svg class="iq-flag" viewBox="0 0 90 60" role="img" aria-label="Flag of Iraq">
<rect width="90" height="20" fill="#ce1126"/><rect y="20" width="90" height="20" fill="#fff"/><rect y="40" width="90" height="20" fill="#000"/>
<text x="45" y="34.5" text-anchor="middle" font-size="13" font-weight="700" fill="#007a3d" font-family="'Noto Kufi Arabic','Geeza Pro','Segoe UI',Tahoma,sans-serif" direction="rtl">الله أكبر</text>
</svg>`;

module.exports = {
  slug: 'iraq',
  name: 'Iraq',
  date: '2026-10-12',
  title: 'Talk to Strangers in Iraq: Free Iraqi Voice Chat, No Sign-Up | TalkLive',
  description: 'دردشة عراقية مجانية. Free voice and text chat with people in Iraq, in Iraqi Arabic, Kurdish or English. No account, no camera. Iraqi slang, best hours and safety tips.',
  keywords: 'دردشة عراقية, شات عراقي, دردشة صوتية عراقية, تعارف عراقي, شات بغداد, دردشة بدون تسجيل, talk to strangers iraq, iraqi voice chat, chat with iraqis, baghdad chat, random chat iraq',
  h1: 'Talk to Strangers in Iraq',
  theme: '#1d1d1d',
  preload: ['abril-fatface-latin-400-normal', 'source-serif-4-latin-400-normal'],
  css: `
:root{--paper:#f6efe0;--ink:#1d1a16;--rule:#dccdb1;--red:#ce1126;--green:#007a3d;--wood:#6b4a2b;--mast:#fff}
body{font-family:"Source Serif 4",Georgia,serif;background:var(--paper);color:var(--ink)}
.c-bar{background:#1d1d1d;color:var(--mast);max-width:none}
.iq-hero{max-width:1080px;margin:0 auto;padding:40px 18px 0;display:grid;grid-template-columns:1.1fr 1fr;gap:34px;align-items:end}
.iq-kick{font:600 13px/1 "Source Serif 4",serif;letter-spacing:.2em;text-transform:uppercase;color:var(--red)}
.iq-hero h1{font:400 clamp(42px,6.6vw,82px)/.98 "Abril Fatface",serif;margin:14px 0 16px}
.iq-hero p{font-size:19px;line-height:1.6;margin:0 0 22px}
.iq-flag{width:120px;height:80px;display:block;margin:0 0 18px;border:2px solid var(--ink)}
.iq-shelf{display:flex;align-items:flex-end;gap:6px;padding:0 10px 0;border-bottom:16px solid var(--wood);height:300px}
.iq-spine{flex:1;color:#f6efe0;background:var(--c);border-radius:3px 3px 0 0;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:12px 4px;box-shadow:inset -4px 0 0 rgba(0,0,0,.18)}
.iq-spine span{writing-mode:vertical-rl;font-size:22px;font-weight:700}
.iq-spine i{font-style:normal;font:400 11px/1 "Source Serif 4",serif;letter-spacing:.08em;writing-mode:vertical-rl;transform:rotate(180deg);opacity:.85}
.iq-main{max-width:760px;margin:0 auto;padding:30px 20px 0}
.iq-page{background:#fffaf0;border:1px solid var(--rule);box-shadow:6px 6px 0 #e9dcc2;padding:34px 36px 24px;position:relative;margin-bottom:30px}
.iq-page::before{content:"";position:absolute;right:30px;top:-6px;width:16px;height:66px;background:var(--red);clip-path:polygon(0 0,100% 0,100% 100%,50% 82%,0 100%)}
.iq-page h2{font:400 clamp(28px,4vw,40px)/1.05 "Abril Fatface",serif;margin:0 0 14px}
.iq-page p{font-size:18px;line-height:1.75;margin:0 0 1.05em}
.iq-page a{color:var(--red)}
.iq-num{font:600 12px/1 "Source Serif 4",serif;letter-spacing:.2em;color:#8a7a5c;display:block;margin-bottom:10px}
.iq-gloss{border-top:2px solid var(--ink);margin:16px 0}
.iq-gloss div{display:grid;grid-template-columns:170px 110px 1fr;gap:12px;padding:10px 0;border-bottom:1px solid var(--rule);align-items:baseline;font-size:15.5px;line-height:1.45}
.iq-gloss b{font-weight:700}
.iq-gloss span{font-size:20px;color:var(--green);direction:rtl}
.iq-meme{border:3px double var(--ink);padding:18px 20px;margin:22px 0;background:#fff}
.iq-meme p{margin:0 0 8px;font-size:17px}
.iq-meme p:last-child{margin:0}
.iq-meme b{color:var(--red)}
.iq-help{background:#1d1d1d;color:#fff;padding:16px 20px;font-size:16.5px;line-height:1.6}
.c-faq{max-width:760px;margin:20px auto 0;padding:0 20px}
.c-faq h2{font:400 34px/1.05 "Abril Fatface",serif;margin:0 0 12px}
.c-faq summary{font:600 17px/1.45 "Source Serif 4",serif}
.c-faq p{font-size:16.5px;line-height:1.65}
.iq-end{margin-top:60px;background:var(--red);color:#fff;text-align:center;padding:56px 20px}
.iq-glass{font-size:58px;line-height:1;display:block;margin-bottom:8px}
.iq-end h2{font:400 clamp(36px,6vw,60px)/1 "Abril Fatface",serif;margin:0 0 10px}
.iq-end p{font-size:18px;line-height:1.55;margin:0 auto 24px;max-width:540px}
.iq-end .c-ctas{justify-content:center;margin:0 auto}
@media (max-width:820px){.iq-hero{grid-template-columns:1fr}.iq-shelf{height:220px}.iq-page{padding:26px 20px 18px}.iq-gloss div{grid-template-columns:1fr;gap:2px}}
`,
  faq: [
    { q: 'Is TalkLive free in Iraq?', a: 'Yes. Voice and text chat are free, with no account, no phone number and no camera. Choosing Iraq as a preferred country is free too.' },
    { q: 'Can I chat in Iraqi Arabic or Kurdish?', a: 'Yes. Talk in whatever language you and your match share. You can also switch the whole site to Arabic at talklive.app/ar/.' },
    { q: 'When is Iraq busiest on TalkLive?', a: 'TalkLive is busiest between 15:00 and 21:00 UTC, which is 6 pm to midnight in Iraq. Iraq stays on UTC+3 all year.' },
    { q: 'Do I need to download an app?', a: 'No. TalkLive runs in the browser on Android, iPhone and computer, and you can add it to your home screen.' },
    { q: 'What are the emergency numbers in Iraq?', a: 'Commonly listed numbers are 104 for police, 122 for an ambulance and 115 for fire. Numbers can differ in the Kurdistan Region, so check locally.' },
  ],
  body: (c) => `<main id="story">
<section class="iq-hero">
  <div>
    ${FLAG}
    <span class="iq-kick">Country guide &middot; Iraq &middot; العراق</span>
    <h1>Talk to strangers in Iraq</h1>
    <p>Shlonak? A voice call or a text chat with someone new, from Baghdad to Basra, Erbil to Najaf. Free, no account, no camera. Just good conversation, Iraqi style.</p>
    ${c.ctas('Tap to Talk', 'Tap to Chat')}
  </div>
  <div class="iq-shelf" aria-label="Book spines with Iraqi words">${SPINES.map(([ar, en, col]) => `<div class="iq-spine" style="--c:${col}"><span lang="ar">${ar}</span><i>${en}</i></div>`).join('')}</div>
</section>

<div class="iq-main">
  <article class="iq-page">
    <span class="iq-num">Page 1</span>
    <h2>Cairo writes, Beirut prints, Baghdad reads</h2>
    <p>That old saying is about books, but it is really about people who love words. Walk down Al-Mutanabbi Street on a Friday and you see it: stalls full of books, old men arguing about poetry, students hunting for bargains, and everyone ending up at the café with a glass of chai. Iraqis love a good chat.</p>
    <p>TalkLive is that chat, online. One tap, a real person, as long or as short as you like. Can’t talk out loud? Tap to Chat and type instead. TalkLive is busiest from 6 pm to midnight in Iraq, right after dinner.</p>
  </article>

  <article class="iq-page">
    <span class="iq-num">Page 2</span>
    <h2>Speak Iraqi, not textbook</h2>
    <p>Iraqi Arabic has its own flavour, with words that people from other Arab countries love to tease. Here are the ones you will hear on every call.</p>
    <div class="iq-gloss">${WORDS.map(([en, ar, m]) => `<div><b>${en}</b><span lang="ar">${ar}</span>${m}</div>`).join('')}</div>
    <div class="iq-meme" aria-label="Meme: shaku maku">
      <p><b>Egyptian friend:</b> "Ezayak?"</p>
      <p><b>Gulf friend:</b> "Shlonak?"</p>
      <p><b>Iraqi friend:</b> "Shlonak, shaku maku, sh’akhbarak, zain? Wallah ishtaqnalak." \u{1F602}</p>
      <p><em>Asking how you are is not one question in Iraq. It is a whole paragraph.</em></p>
    </div>
  </article>

  <article class="iq-page">
    <span class="iq-num">Page 3</span>
    <h2>What to talk about</h2>
    <p>Football first. Ask about the national team, the Lions of Mesopotamia, and someone will tell you exactly where they were when Iraq won the Asian Cup in 2007. Then food: masgouf by the Tigris, dolma, kleicha for Eid, and how much sugar is the right amount in chai (more). Music, uni, work, family and the best place to eat in your city will keep the call going.</p>
    <p>Learning Arabic? Iraqi dialect is a fun one to practise. Say it upfront and people will slow down for you, maybe.</p>
  </article>

  <article class="iq-page">
    <span class="iq-num">Page 4</span>
    <h2>Stay safe</h2>
    <p>Keep your full name, address, socials and workplace to yourself at first. Never share a bank code or SMS code, and leave if someone asks for money, phone credit, photos or wants to move to another app quickly. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">scam guide</a> explains the usual tricks. Every call and chat has Report and Block, and TalkLive is for adults 18+.</p>
    <div class="iq-help"><b>Emergency:</b> <b>104</b> police, <b>122</b> ambulance, <b>115</b> fire. Numbers can differ in the Kurdistan Region.</div>
  </article>
</div>

${c.ad()}
${c.faq('Questions people ask')}
<section class="iq-end">
  <span class="iq-glass" aria-hidden="true">\u{1FAD6}</span>
  <h2>Istikan chai and a chat?</h2>
  <p>Someone in Iraq is online right now. Pour the chai, add too much sugar, and say shlonak.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
