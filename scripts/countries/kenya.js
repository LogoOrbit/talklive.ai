'use strict';
// Kenya: "Sasa? Poa." The Nairobi greeting and its answer, set like matatu
// livery - bold Space Grotesk, a black, red and green stripe with the white
// fimbriation of the flag, and painted panels. IBM Plex Serif to read.
const GREETINGS = [
  ['Sasa?', 'Poa', 'Sheng, Nairobi\'s street slang: "Now?" - "Cool."'],
  ['Niaje?', 'Fiti', 'Sheng again: "What\'s up?" - "Fine."'],
  ['Habari?', 'Nzuri', 'Kiswahili: "News?" - "Good."'],
  ['Mambo?', 'Vipi / Poa', 'Kiswahili: "Things?" - "Cool."'],
];

module.exports = {
  slug: 'kenya',
  name: 'Kenya',
  date: '2026-10-07',
  title: 'Talk to Strangers in Kenya - Free Voice Chat | TalkLive',
  description: 'Free voice and text chat with people in Kenya - in English, Kiswahili or Sheng, no sign-up, no camera. Greetings, topics, safety and when Kenya is online.',
  keywords: 'talk to strangers kenya, kenya chat, kenyan voice chat, chat with kenyans, random chat kenya, nairobi chat, ongea na watu, sheng',
  h1: 'Talk to Strangers in Kenya',
  theme: '#0b0b0b',
  preload: ['space-grotesk-latin-700-normal', 'ibm-plex-serif-latin-400-normal'],
  css: `
:root{--paper:#f7f4ee;--ink:#111;--rule:#ddd6c8;--red:#bb0000;--green:#006600;--mast:#fff}
body{font-family:"IBM Plex Serif",Georgia,serif;background:var(--paper);color:var(--ink)}
.c-bar{color:var(--mast);background:#000;max-width:none}
.ke-flag{height:30px;background:linear-gradient(#000 0 28%,#fff 28% 36%,var(--red) 36% 64%,#fff 64% 72%,var(--green) 72%)}
.ke-hero{background:#000;color:#fff;padding:56px 20px 60px}
.ke-hero-in{max-width:1080px;margin:0 auto}
.ke-kicker{font:700 12px/1 "Space Grotesk",sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#ff5a4f}
.ke-hero h1{font:700 clamp(40px,7.2vw,90px)/.95 "Space Grotesk",sans-serif;letter-spacing:-.04em;margin:16px 0 18px}
.ke-hero h1 span{display:inline-block;background:var(--red);padding:0 .14em}
.ke-dek{font:400 19px/1.65 "IBM Plex Serif",serif;max-width:640px;margin:0 0 26px;opacity:.94}
.ke-greet{max-width:1080px;margin:0 auto;padding:34px 20px 0;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.ke-g{border:3px solid var(--ink);background:#fff;padding:16px}
.ke-g:nth-child(2){background:var(--red);color:#fff;border-color:var(--red)}
.ke-g:nth-child(3){background:var(--green);color:#fff;border-color:var(--green)}
.ke-g b{display:block;font:700 30px/1 "Space Grotesk",sans-serif;letter-spacing:-.02em}
.ke-g em{display:block;font:700 italic 20px/1.2 "Space Grotesk",sans-serif;margin:6px 0 10px;opacity:.85}
.ke-g span{font:400 14.5px/1.45 "IBM Plex Serif",serif}
.ke-main{max-width:760px;margin:0 auto;padding:18px 20px 0}
.ke-sec{padding:40px 0 6px}
.ke-sec h2{font:700 clamp(26px,3.8vw,40px)/1.05 "Space Grotesk",sans-serif;letter-spacing:-.03em;margin:0 0 16px}
.ke-sec h2 i{font-style:normal;color:var(--red)}
.ke-sec p{font:400 18px/1.75 "IBM Plex Serif",serif;margin:0 0 1.05em}
.ke-sec a{color:var(--green);font-weight:600}
.ke-clock{display:grid;grid-template-columns:auto 1fr;gap:22px;align-items:center;background:var(--green);color:#fff;padding:22px 24px;margin:22px 0}
.ke-clock b{font:700 44px/1 "Space Grotesk",sans-serif;white-space:nowrap}
.ke-clock span{font:400 17px/1.55 "IBM Plex Serif",serif}
.ke-warn{border-left:6px solid var(--red);background:#fff;padding:16px 20px;margin:20px 0;font:400 17px/1.6 "IBM Plex Serif",serif}
.ke-warn b{font-family:"Space Grotesk",sans-serif}
.ke-help{background:#000;color:#fff;padding:18px 22px;font:400 17px/1.6 "IBM Plex Serif",serif}
.ke-help b{color:#ff5a4f}
.c-faq{max-width:760px;margin:36px auto 0;padding:0 20px}
.c-faq h2{font:700 32px/1.05 "Space Grotesk",sans-serif;letter-spacing:-.03em;margin:0 0 12px}
.c-faq summary{font:700 17px/1.45 "Space Grotesk",sans-serif}
.c-faq p{font:400 16.5px/1.65 "IBM Plex Serif",serif}
.ke-end{margin-top:60px;background:#000;color:#fff;text-align:center}
.ke-end-in{padding:52px 20px 64px}
.ke-end h2{font:700 clamp(38px,6.4vw,76px)/.95 "Space Grotesk",sans-serif;letter-spacing:-.04em;margin:0 0 12px}
.ke-end p{font:400 18px/1.55 "IBM Plex Serif",serif;margin:0 auto 24px;max-width:520px}
.ke-end .c-ctas{justify-content:center;margin:0 auto}
@media (max-width:860px){.ke-greet{grid-template-columns:repeat(2,1fr)}}
@media (max-width:520px){.ke-greet{grid-template-columns:1fr}.ke-clock{grid-template-columns:1fr}}
`,
  faq: [
    { q: 'Can I chat in Kiswahili on TalkLive?', a: 'Yes. Speak whichever language you and your match share - English, Kiswahili, Sheng or anything else. The interface is in English and 16 other languages.' },
    { q: 'Is TalkLive free in Kenya?', a: 'Yes. Voice and text chat are free, need no account, and preferring Kenya in the country filter is free. A voice call uses mobile data, roughly like a WhatsApp call.' },
    { q: 'When is Kenya busiest on TalkLive?', a: 'TalkLive is busiest worldwide between 15:00 and 21:00 UTC, which is 6 pm to midnight in East Africa Time. Kenya does not change its clocks, so those hours hold all year.' },
    { q: 'Will I always be matched with someone in Kenya?', a: 'Not always. A country preference steers matching, but it depends on who is searching at that moment. Adding Nigeria or another African country gives you more chances.' },
    { q: 'Does anyone see my phone number or face?', a: 'No. Calls run in the browser, no number is exchanged and there is no video.' },
    { q: 'Who can I call in an emergency in Kenya?', a: 'Call 999 or 112 for police, ambulance and fire. The Kenya Red Cross also runs a free helpline on 1199.' },
  ],
  body: (c) => `<main id="story">
<div class="ke-flag" role="presentation"></div>
<section class="ke-hero"><div class="ke-hero-in">
  <span class="ke-kicker">Country guide &middot; Kenya</span>
  <h1>Talk to strangers in <span>Kenya</span></h1>
  <p class="ke-dek">"Sasa?" - "Poa." Two words, and a conversation has started. Kenya is a country of easy greetings, three languages in one sentence and some of the most talkative cities in Africa. Start a call or a chat, free, with no account, no number and no camera.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</div></section>

<div class="ke-greet" aria-label="Kenyan greetings and their replies">
${GREETINGS.map(([q, a, note]) => `<div class="ke-g"><b>${q}</b><em>${a}</em><span>${note}</span></div>`).join('\n')}
</div>

<div class="ke-main">
  <section class="ke-sec">
    <h2>English, Kiswahili <i>and Sheng</i></h2>
    <p>Kenya's 2019 census counted about 47.6 million people, and its two official languages are English and Kiswahili. Most Kenyans also speak the language of their own community - Kikuyu, Luhya, Luo, Kalenjin, Kamba and many more - and in Nairobi young people mix all of it into Sheng, a fast-moving street slang that changes almost by the season. Switching language mid-sentence is normal, and nobody will mind if you stay in English.</p>
    <p>If you are learning Kiswahili, Kenyans are proud and patient teachers. Start with <em>habari</em>, thank people with <em>asante</em>, and say goodbye with <em>kwaheri</em>. You will be told <em>karibu</em> - welcome - more than once.</p>
    <div class="ke-clock"><b>6 pm-12 am</b><span>TalkLive's busiest hours, 15:00-21:00 UTC, in East Africa Time (UTC+3). Kenya keeps the same time all year.</span></div>
  </section>

  <section class="ke-sec">
    <h2>What to <i>talk about</i></h2>
    <p>Running is a point of national pride: Kenyan athletes have dominated distance running for decades, and Eliud Kipchoge's sub-two-hour marathon in 2019 is a story people love to tell. The English Premier League is followed almost as closely as local football, so expect strong opinions about Arsenal, Manchester United and Chelsea. Then music - gengetone, Afrobeats, benga and gospel - the matatus that carry Nairobi to work with their graffiti and sound systems, nyama choma on a Sunday, ugali and who makes the best chapati.</p>
    <p>Kenya is also one of the most mobile-first countries anywhere. M-Pesa, launched in 2007, made sending money by text message ordinary long before most of the world caught up, and it is worth asking anyone about - it changed daily life.</p>
  </section>

  <section class="ke-sec">
    <h2>Privacy and <i>safety</i></h2>
    <p>Keep your full name, ID number, location, workplace and social media to yourself in a first conversation. Never share an M-Pesa PIN or a one-time code, and be careful with anyone who asks for money, airtime, photos, or wants to move to WhatsApp straight away. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">guide to chat scams</a> covers the usual scripts.</p>
    <div class="ke-warn"><b>A Kenyan classic:</b> a text says money was sent to you "by mistake" and asks you to send it back. Check your actual M-Pesa balance first - the message is usually fake. Nobody genuine will ask for your PIN.</div>
    <p>Every TalkLive call and chat has Report and Block, and TalkLive is for adults 18 and over only.</p>
    <div class="ke-help"><b>In an emergency</b> in Kenya, call <b>999</b> or <b>112</b>. The Kenya Red Cross runs a free helpline on <b>1199</b>.</div>
    <p style="margin-top:20px">Getting started: open TalkLive in your browser (no app, no sign-up), prefer Kenya in Filters if you like (two preferred countries are free), and Tap to Talk or Tap to Chat. Our <a href="/countries/nigeria">Nigeria guide</a> covers West Africa, and the Journal's <a href="/regions/africa">Africa feature</a> the continent.</p>
  </section>
</div>

${c.ad()}
${c.faq('Maswali - questions people ask')}
<section class="ke-end">
  <div class="ke-flag" role="presentation"></div>
  <div class="ke-end-in">
    <h2>Sasa? Tuongee.</h2>
    <p>Let's talk. Someone in Nairobi, Mombasa or Kisumu is up for a chat.</p>
    ${c.ctas('Tap to Talk', 'Tap to Chat')}
  </div>
</section>
</main>`,
};
