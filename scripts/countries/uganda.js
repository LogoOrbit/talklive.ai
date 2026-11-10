'use strict';
// Uganda: "The Pearl". Black, yellow and red bands like the flag frame a page
// set like a boda-boda stage signboard: heavy Archivo Black headings, chunky
// yellow panels, and a call-and-answer list of Luganda greetings. Archivo to
// read.
const GREETINGS = [
  ['Oli otya?', 'Gyendi', 'Luganda: "How are you?" - "I am fine."'],
  ['Gyebale ko', 'Kale', '"Well done" - said as a hello to anyone busy. "OK, thanks."'],
  ['Wasuze otya?', 'Bulungi', 'Morning: "How was your night?" - "Good."'],
  ['Habari?', 'Nzuri', 'Kiswahili, understood across East Africa.'],
];

module.exports = {
  slug: 'uganda',
  name: 'Uganda',
  date: '2026-11-10',
  title: 'Talk to Strangers in Uganda - Free Voice Chat | TalkLive',
  description: 'Free voice and text chat with people in Uganda, in English or Luganda. No account or camera. Greetings, topics, safety and when Uganda is online.',
  keywords: 'talk to strangers uganda, uganda chat, ugandan voice chat, random chat uganda, chat with ugandans, kampala chat, online chat uganda, free voice call uganda, oli otya, meet people uganda',
  h1: 'Talk to Strangers in Uganda',
  theme: '#0b0b0b',
  preload: ['archivo-black-latin-400-normal', 'archivo-latin-400-normal'],
  css: `
:root{--paper:#fffdf5;--ink:#111;--rule:#e6dfc8;--yellow:#fcdc04;--red:#d90000;--mast:#fff}
body{font-family:Archivo,system-ui,sans-serif;background:var(--paper);color:var(--ink)}
.c-bar{background:#000;color:var(--mast);max-width:none}
.ug-bands{height:36px;background:linear-gradient(#000 0 33.3%,var(--yellow) 33.3% 66.6%,var(--red) 66.6%)}
.ug-hero{max-width:900px;margin:0 auto;padding:50px 20px 20px}
.ug-hero h1{font:400 clamp(40px,7.4vw,88px)/.95 "Archivo Black",sans-serif;text-transform:uppercase;margin:0 0 16px}
.ug-hero h1 span{background:var(--yellow);padding:0 .12em}
.ug-hero p{font-size:20px;line-height:1.55;margin:0 0 24px;max-width:640px}
.ug-main{max-width:780px;margin:0 auto;padding:0 20px}
.ug-sec{padding-top:44px}
.ug-sec h2{font:400 clamp(24px,3.8vw,38px)/1.05 "Archivo Black",sans-serif;text-transform:uppercase;margin:0 0 12px;border-left:10px solid var(--red);padding-left:12px}
.ug-sec p{font-size:18px;line-height:1.7;margin:0 0 1em}
.ug-sec a{color:var(--red)}
.ug-list{list-style:none;margin:18px 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:12px}
.ug-list li{background:var(--yellow);padding:16px 16px 14px;border:3px solid #000}
.ug-list b{display:block;font:400 22px/1.1 "Archivo Black",sans-serif}
.ug-list em{display:block;font-style:normal;font-weight:600;margin:4px 0 6px;color:var(--red)}
.ug-list span{font-size:15px;line-height:1.4}
.ug-rolex{background:#000;color:#fff;padding:20px 22px;margin:22px 0;font-size:17px;line-height:1.5}
.ug-rolex b{display:block;font:400 22px/1.2 "Archivo Black",sans-serif;color:var(--yellow);margin-bottom:6px}
.ug-help{border:3px solid #000;background:#fff;padding:16px 20px;font-size:16.5px;line-height:1.6}
.c-faq{max-width:780px;margin:44px auto 0;padding:0 20px}
.c-faq h2{font:400 32px/1.05 "Archivo Black",sans-serif;text-transform:uppercase;margin:0 0 12px}
.c-faq summary{font:600 17px/1.45 Archivo,sans-serif}
.c-faq p{font-size:16.5px;line-height:1.65}
.ug-end{margin-top:60px;background:var(--red);color:#fff;text-align:center;padding:56px 20px}
.ug-end h2{font:400 clamp(34px,6vw,60px)/1 "Archivo Black",sans-serif;text-transform:uppercase;margin:0 0 10px}
.ug-end p{font-size:18px;line-height:1.55;margin:0 auto 24px;max-width:540px}
.ug-end .c-ctas{justify-content:center}
@media (max-width:640px){.ug-list{grid-template-columns:1fr}}
`,
  faq: [
    { q: 'Is TalkLive free in Uganda?', a: 'Yes. Voice calls and text chat are free, with no account, no phone number and no camera. Choosing Uganda as a preferred country is free as well.' },
    { q: 'How much data does a voice call use?', a: 'A voice call uses roughly 0.3 to 0.5 MB a minute, far less than video. Text chat uses almost none, so it suits a small data bundle.' },
    { q: 'Which languages can I use?', a: 'Any language you and your match share. Most people from Uganda chat in English, and many also speak Luganda, Kiswahili, Runyankole, Acholi or Lusoga.' },
    { q: 'When is Uganda online on TalkLive?', a: 'TalkLive is busiest between 15:00 and 21:00 UTC, which is 6 in the evening to midnight in Uganda (East Africa Time, UTC+3).' },
    { q: 'What are the emergency numbers in Uganda?', a: 'Call 999 or 112 for the police. Both are free from any phone.' },
  ],
  body: (c) => `<main id="story">
<div class="ug-bands" aria-hidden="true"></div>
<section class="ug-hero">
  <h1>Talk to strangers in <span>Uganda</span></h1>
  <p>A free voice call or text chat with someone new, from Kampala to Gulu to Mbarara. No sign-up, no number, no camera, and light on data.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>

<div class="ug-main">
  <section class="ug-sec">
    <h2>A country that greets properly</h2>
    <p>In Uganda you do not open with your question. You greet first, ask how the person is, how home is, and only then get to the point. That habit makes Ugandans very good at talking to strangers: nobody is in a rush, and nobody minds a long hello.</p>
    <p>It is also one of the youngest countries in the world, with most people under 25, so expect talk of school, hustle, music and plans.</p>
  </section>

  <section class="ug-sec">
    <h2>Greet like you mean it</h2>
    <ul class="ug-list">${GREETINGS.map(([q, a, note]) => `<li><b>${q}</b><em>${a}</em><span>${note}</span></li>`).join('')}</ul>
    <p><em>Ssebo</em> is sir and <em>nnyabo</em> is madam, and adding one makes any greeting polite. <em>Webale</em> is thank you. "You are lost!" just means "I haven't seen you in a while", and "well done" is said to anyone doing anything at all.</p>
    <div class="ug-rolex"><b>Not that kind of Rolex</b>Here a Rolex is rolled eggs: an omelette wrapped in a hot chapati, sold on the street corner. Ask anyone where the best one is and you have a ten-minute conversation.</div>
  </section>

  <section class="ug-sec">
    <h2>What to talk about</h2>
    <p>The Uganda Cranes, and which English Premier League club is yours, because everyone has one. Music, from kadongo kamu to the latest Kampala hits. Boda-boda stories, matoke versus posho, weekend plans in Jinja, and which region has the best food. Ask where someone grew up and you will learn a language, a dish and a greeting.</p>
  </section>

  <section class="ug-sec">
    <h2>Stay safe</h2>
    <p>Keep your full name, address, workplace and social accounts to yourself at first. Never share a Mobile Money PIN or a code sent to your phone, and end the call with anyone who asks for money, airtime, photos or to move to another app straight away. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">scam guide</a> lists the usual tricks, and every call and chat has Report and Block.</p>
    <div class="ug-help"><b>Emergency:</b> police <b>999</b> or <b>112</b>, free from any phone.</div>
  </section>
</div>

${c.faq('Questions people ask')}
<section class="ug-end">
  <h2>Oli otya?</h2>
  <p>Someone in Uganda is online right now and will answer "gyendi". Start a call or a chat.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
