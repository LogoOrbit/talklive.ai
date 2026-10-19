'use strict';
// Iran: "Isfahan Blue". A turquoise tiled dome over a carpet: the hero sits in
// a pointed iwan arch in lapis and turquoise, the page is framed by a woven
// carpet border, and the Persian slang is set as a row of tiles. Saffron for
// accents. DM Serif Display for display, Manrope to read. The meme is taarof,
// the politeness battle every Iranian knows.
const WORDS = [
  ['Chetori?', 'چطوری؟', 'How are you? Casual and friendly.'],
  ['Che khabar?', 'چه خبر؟', 'What’s new? The classic opener.'],
  ['Damet garm', 'دمت گرم', 'Respect, thanks, nice one. Literally "may your breath be warm".'],
  ['Khafan', 'خفن', 'Awesome, intense, next level.'],
  ['Bahal', 'باحال', 'Fun, cool. "Kheyli bahal bood" = that was so fun.'],
  ['Eyval', 'ایول', 'Nice! Bravo! Let’s go!'],
  ['Dadash / Abji', 'داداش / آبجی', 'Bro / sis. For friends you just made, too.'],
  ['Bikhial', 'بیخیال', 'Forget it, chill, never mind.'],
];
const FLAG = `<svg class="ir-flag" viewBox="0 0 70 40" role="img" aria-label="Flag of Iran">
<rect width="70" height="13.33" fill="#239f40"/><rect y="13.33" width="70" height="13.34" fill="#fff"/><rect y="26.67" width="70" height="13.33" fill="#da0000"/>
<g stroke="#fff" stroke-width="0.8" stroke-dasharray="1.4 1.1" opacity=".9"><line x1="2" y1="12.6" x2="68" y2="12.6"/><line x1="2" y1="27.4" x2="68" y2="27.4"/></g>
<text x="35" y="24.2" text-anchor="middle" font-size="12" fill="#da0000" font-family="'Segoe UI Symbol','DejaVu Sans','Noto Sans Symbols',sans-serif">&#x262B;</text>
</svg>`;

module.exports = {
  slug: 'iran',
  name: 'Iran',
  date: '2026-10-12',
  title: 'Talk to Strangers in Iran: Free Persian Voice Chat, No Sign-Up | TalkLive',
  description: 'چت تصادفی رایگان بدون ثبت نام. Free voice and text chat with people from Iran, in Persian or English. No account, no camera. Persian slang, best hours and safety tips.',
  keywords: 'چت تصادفی, چت صوتی رایگان, چت با غریبه, چت ناشناس, چت بدون ثبت نام, گپ صوتی, talk to strangers iran, persian voice chat, farsi chat, chat with iranians, random chat iran',
  h1: 'Talk to Strangers in Iran',
  theme: '#0f4c81',
  preload: ['dm-serif-display-latin-400-normal', 'manrope-latin-400-normal'],
  css: `
:root{--paper:#f8f3ea;--ink:#1a1f2b;--rule:#e2d5bd;--lapis:#0f4c81;--turq:#1fa3a6;--saffron:#e8a33d;--carpet:#8c1c13;--mast:#fff}
body{font-family:Manrope,system-ui,sans-serif;background:var(--paper);color:var(--ink)}
.c-bar{background:var(--lapis);color:var(--mast);max-width:none}
.ir-hero{background:radial-gradient(circle at 50% 0,#2a6fb0,var(--lapis) 60%,#0a3157);padding:46px 18px 0}
.ir-arch{max-width:860px;margin:0 auto;background:repeating-conic-gradient(from 45deg,var(--turq) 0 25%,#178a8d 0 50%) 0 0/28px 28px;padding:16px 16px 0;border-radius:430px 430px 0 0}
.ir-arch-in{background:var(--paper);border-radius:420px 420px 0 0;padding:110px 34px 40px;text-align:center}
.ir-flag{width:105px;height:60px;display:block;margin:0 auto 18px;border:2px solid var(--lapis)}
.ir-arch-in h1{font:400 clamp(36px,6vw,70px)/1 "DM Serif Display",serif;margin:0 0 14px;color:var(--lapis)}
.ir-fa{font-size:24px;color:var(--carpet);margin:0 0 14px;direction:rtl}
.ir-arch-in p.ir-dek{font-size:18.5px;line-height:1.6;margin:0 auto 24px;max-width:560px}
.ir-arch-in .c-ctas{justify-content:center;margin:0 auto}
.ir-carpet{max-width:820px;margin:34px auto 0;border:14px solid var(--carpet);border-image:repeating-linear-gradient(45deg,var(--carpet) 0 8px,var(--saffron) 8px 12px,var(--lapis) 12px 18px) 14;background:#fffaf2;padding:6px 26px 20px}
.ir-sec{padding:30px 0 8px;border-bottom:1px solid var(--rule)}
.ir-sec:last-child{border-bottom:0}
.ir-sec h2{font:400 clamp(28px,4vw,40px)/1.05 "DM Serif Display",serif;margin:0 0 14px;color:var(--lapis)}
.ir-sec p{font-size:18px;line-height:1.75;margin:0 0 1.05em}
.ir-sec a{color:var(--lapis)}
.ir-tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:2px solid var(--lapis);margin:18px 0}
.ir-tiles div{padding:16px 12px;text-align:center;border:1px solid rgba(15,76,129,.25);background:radial-gradient(circle at 50% 0,rgba(31,163,166,.16),transparent 70%)}
.ir-tiles span{display:block;font-size:22px;color:var(--carpet);direction:rtl;margin-bottom:4px}
.ir-tiles b{display:block;font:400 20px/1.1 "DM Serif Display",serif;color:var(--lapis);margin-bottom:6px}
.ir-tiles small{font-size:13.5px;line-height:1.4;display:block}
.ir-meme{background:var(--lapis);color:#fff;border-radius:14px;padding:20px 22px;margin:22px 0}
.ir-meme h3{font:400 22px/1.2 "DM Serif Display",serif;margin:0 0 10px;color:var(--saffron)}
.ir-meme p{margin:0 0 6px;font-size:16.5px;line-height:1.5}
.ir-help{background:#fff;border:2px solid var(--carpet);border-radius:10px;padding:16px 20px;font-size:16.5px;line-height:1.6}
.c-faq{max-width:820px;margin:36px auto 0;padding:0 20px}
.c-faq h2{font:400 34px/1.05 "DM Serif Display",serif;margin:0 0 12px;color:var(--lapis)}
.c-faq summary{font:700 17px/1.45 Manrope,sans-serif}
.c-faq p{font-size:16.5px;line-height:1.65}
.ir-end{margin-top:60px;background:var(--turq);background-image:repeating-conic-gradient(from 45deg,var(--turq) 0 25%,#1a9497 0 50%);background-size:34px 34px;padding:22px}
.ir-end-in{background:var(--lapis);color:#fff;text-align:center;padding:48px 20px;border-radius:12px}
.ir-end h2{font:400 clamp(34px,6vw,58px)/1 "DM Serif Display",serif;margin:0 0 10px}
.ir-end p{font-size:18px;line-height:1.55;margin:0 auto 24px;max-width:540px}
.ir-end .c-ctas{justify-content:center;margin:0 auto}
@media (max-width:760px){.ir-arch{border-radius:180px 180px 0 0;padding:10px 10px 0}.ir-arch-in{border-radius:170px 170px 0 0;padding:70px 18px 30px}.ir-tiles{grid-template-columns:1fr 1fr}.ir-carpet{padding:4px 16px 16px}}
`,
  faq: [
    { q: 'Is TalkLive free?', a: 'Yes. Voice and text chat are free, with no account, no phone number and no camera. Choosing Iran as a preferred country is free too.' },
    { q: 'Can I chat in Persian?', a: 'Yes. Talk in any language you and your match share, and switch the whole site to Persian at talklive.app/fa/.' },
    { q: 'When is Iran busiest on TalkLive?', a: 'TalkLive is busiest between 15:00 and 21:00 UTC, which is about 6:30 pm to 12:30 am in Iran.' },
    { q: 'Do I need to download an app?', a: 'No. TalkLive runs in the browser on Android, iPhone and computer, and you can add it to your home screen.' },
    { q: 'What are the emergency numbers in Iran?', a: 'Call 110 for police, 115 for an ambulance and 125 for the fire service.' },
  ],
  body: (c) => `<main id="story">
<section class="ir-hero"><div class="ir-arch"><div class="ir-arch-in">
  ${FLAG}
  <h1>Talk to strangers, Persian style</h1>
  <p class="ir-fa" lang="fa">با یه غریبه گپ بزن، رایگان و بدون ثبت نام</p>
  <p class="ir-dek">A voice call or a text chat with someone new, from Tehran to Shiraz, Tabriz to Mashhad, or Iranians anywhere in the world. Free, no account, no camera.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</div></div></section>

<div class="ir-carpet">
  <section class="ir-sec">
    <h2>A culture built on conversation</h2>
    <p>Iranians are famous hosts. Guests get the best seat, the best chai and a bowl of fruit they are not allowed to refuse. Poetry shows up in everyday talk, people quote Hafez and Rumi without thinking, and a simple "how are you" can turn into an hour. TalkLive is that kind of chat, online. One tap, a real person, talk as long as you like.</p>
    <p>The busiest time is the evening, roughly 6:30 pm to after midnight Iran time, when everyone has had dinner and finally has time for their phone.</p>
  </section>

  <section class="ir-sec">
    <h2>Speak like a local</h2>
    <p>Persian slang is warm, dramatic and very fun to learn. Here is what you will hear on a call.</p>
    <div class="ir-tiles">${WORDS.map(([en, fa, m]) => `<div><span lang="fa">${fa}</span><b>${en}</b><small>${m}</small></div>`).join('')}</div>
    <p>Bonus: when someone thanks you with <em>ghorbunet beram</em>, it literally means "may I be sacrificed for you". Iranians do not do small compliments.</p>
    <div class="ir-meme" aria-label="Meme: taarof">
      <h3>POV: the bill arrives and taarof begins</h3>
      <p><b>You:</b> "I’ll pay." <b>Them:</b> "No, no, ghabel nadare."</p>
      <p><b>You:</b> "Please, I insist." <b>Them:</b> "Don’t even think about it."</p>
      <p><b>Waiter:</b> stands there for 15 minutes \u{1F605}</p>
      <p><em>Ask anyone from Iran for their best taarof story. Everyone has one.</em></p>
    </div>
  </section>

  <section class="ir-sec">
    <h2>What to talk about</h2>
    <p>Football is the easy door, especially the Tehran derby between Persepolis and Esteghlal, red versus blue. Food is the other one: tahdig, the crispy rice at the bottom of the pot that people literally fight over, plus ghormeh sabzi and whose mum makes it best. Nowruz in spring, Yalda night in winter with pomegranates and Hafez, poetry, music, travel and uni life are all great topics.</p>
    <p>Learning Persian? Say so at the start. People are patient and love hearing foreigners try. The whole site also works <a href="/fa/">in Persian</a>.</p>
  </section>

  <section class="ir-sec">
    <h2>Stay safe</h2>
    <p>Keep your full name, address, socials, phone number and workplace to yourself. Never share bank codes or SMS codes, and leave if someone asks for money, crypto, photos or wants to move to another app quickly. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">scam guide</a> explains the usual tricks. Every call and chat has Report and Block, and TalkLive is for adults 18+.</p>
    <div class="ir-help"><b>Emergency:</b> <b>110</b> police, <b>115</b> ambulance, <b>125</b> fire.</div>
  </section>
</div>

${c.faq('Questions people ask')}
<section class="ir-end"><div class="ir-end-in">
  <h2>Ye chai bokhorim, ye gap bezanim?</h2>
  <p>Shall we have a tea and a chat? Someone is online right now. Say salam.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</div></section>
</main>`,
};
