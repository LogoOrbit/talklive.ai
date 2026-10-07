'use strict';
// South Africa: "Twelve Languages". A country that writes twelve official
// languages into its constitution, set as a wall of greetings in the flag's
// six colours. Archivo for the bold uppercase display, Literata to read.
const HELLOS = [
  ['Sawubona', 'isiZulu', '#007a4d'],
  ['Molo', 'isiXhosa', '#de3831'],
  ['Hallo', 'Afrikaans', '#002395'],
  ['Hello', 'English', '#111'],
  ['Dumela', 'Sepedi, Setswana, Sesotho', '#ffb612'],
  ['Avuxeni', 'Xitsonga', '#007a4d'],
  ['Ndaa', 'Tshivenda', '#de3831'],
  ['Sawubona', 'siSwati', '#002395'],
  ['Lotjhani', 'isiNdebele', '#111'],
  ['(a wave)', 'South African Sign Language', '#ffb612'],
];
const SLANG = [
  ['Howzit', 'Hello, how is it going?'],
  ['Lekker', 'Nice, great, delicious'],
  ['Eish', 'Surprise, frustration or sympathy'],
  ['Now-now', 'Soon. "Just now" is later. "Now" is... eventually.'],
  ['Sharp', 'OK, cool, see you'],
  ['Braai', 'A barbecue - and a social event'],
];

module.exports = {
  slug: 'south-africa',
  name: 'South Africa',
  date: '2026-10-07',
  title: 'Talk to Strangers in South Africa - Free Voice Chat | TalkLive',
  description: 'Free voice and text chat with people in South Africa - howzit in any of twelve languages, no sign-up, no camera. Slang, rugby, the braai and when SA is online.',
  keywords: 'talk to strangers south africa, south africa chat, sa chat, south african voice chat, chat with south africans, random chat south africa, johannesburg chat, cape town chat',
  h1: 'Talk to Strangers in South Africa',
  theme: '#007a4d',
  preload: ['archivo-latin-600-normal', 'literata-latin-400-normal'],
  css: `
:root{--paper:#faf8f3;--ink:#121212;--rule:#e0dacd;--green:#007a4d;--gold:#ffb612;--red:#de3831;--blue:#002395;--mast:#fff}
body{font-family:"Literata",Georgia,serif;background:var(--paper);color:var(--ink)}
.c-bar{color:var(--mast);background:var(--green);max-width:none}
.za-hero{padding:56px 20px 30px;max-width:1120px;margin:0 auto}
.za-kicker{font:600 12px/1 "Archivo",sans-serif;letter-spacing:.22em;text-transform:uppercase;color:var(--green)}
.za-hero h1{font:600 clamp(40px,7vw,88px)/.92 "Archivo",sans-serif;letter-spacing:-.04em;text-transform:uppercase;margin:16px 0 18px;max-width:900px}
.za-hero h1 span{color:var(--green)}
.za-dek{font:400 19px/1.65 "Literata",serif;max-width:660px;margin:0 0 26px}
.za-wall{max-width:1120px;margin:0 auto;padding:10px 20px 0;display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.za-wall div{background:var(--c);color:#fff;padding:16px 14px;min-height:108px;display:flex;flex-direction:column;justify-content:space-between}
.za-wall div.lt{color:#121212}
.za-wall b{font:600 clamp(20px,2.2vw,28px)/1 "Archivo",sans-serif;letter-spacing:-.02em}
.za-wall span{font:400 12.5px/1.35 "Literata",serif;opacity:.9;margin-top:10px}
.za-wcap{max-width:1120px;margin:10px auto 0;padding:0 20px;font:400 italic 14.5px/1.5 "Literata",serif;opacity:.75}
.za-main{max-width:760px;margin:0 auto;padding:16px 20px 0}
.za-sec{padding:40px 0 6px}
.za-sec h2{font:600 clamp(26px,3.8vw,40px)/1.02 "Archivo",sans-serif;letter-spacing:-.03em;text-transform:uppercase;margin:0 0 16px}
.za-sec h2 span{color:var(--red)}
.za-sec p{font:400 18px/1.78 "Literata",serif;margin:0 0 1.05em}
.za-sec a{color:var(--blue)}
.za-slang{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin:22px 0;border:2px solid var(--ink)}
.za-slang div{padding:14px 16px;border-right:1px solid var(--rule);border-bottom:1px solid var(--rule);background:#fff}
.za-slang b{display:block;font:600 20px/1.1 "Archivo",sans-serif;text-transform:uppercase;margin-bottom:4px;color:var(--green)}
.za-slang span{font:400 15px/1.45 "Literata",serif}
.za-clock{display:grid;grid-template-columns:auto 1fr;gap:22px;align-items:center;background:var(--ink);color:#fff;padding:22px 24px;margin:22px 0;border-left:10px solid var(--gold)}
.za-clock b{font:600 42px/1 "Archivo",sans-serif;white-space:nowrap;color:var(--gold)}
.za-clock span{font:400 16.5px/1.55 "Literata",serif}
.za-help{background:#fff;border:2px solid var(--green);padding:18px 22px;font:400 16.5px/1.6 "Literata",serif}
.za-help b{color:var(--green)}
.c-faq{max-width:760px;margin:36px auto 0;padding:0 20px}
.c-faq h2{font:600 32px/1.05 "Archivo",sans-serif;letter-spacing:-.03em;text-transform:uppercase;margin:0 0 12px}
.c-faq summary{font:700 17px/1.45 "Literata",serif}
.c-faq p{font:400 16.5px/1.65 "Literata",serif}
.za-end{margin-top:60px;background:var(--green);color:#fff;text-align:center;border-top:12px solid var(--gold)}
.za-end-in{padding:56px 20px 64px}
.za-end h2{font:600 clamp(40px,7vw,84px)/.92 "Archivo",sans-serif;letter-spacing:-.04em;text-transform:uppercase;margin:0 0 12px}
.za-end p{font:400 18px/1.55 "Literata",serif;margin:0 auto 24px;max-width:520px}
.za-end .c-ctas{justify-content:center;margin:0 auto}
@media (max-width:900px){.za-wall{grid-template-columns:repeat(2,1fr)}.za-slang{grid-template-columns:repeat(2,1fr)}}
@media (max-width:520px){.za-slang{grid-template-columns:1fr}.za-clock{grid-template-columns:1fr}}
`,
  faq: [
    { q: 'Which languages can I use on TalkLive in South Africa?', a: 'Any language you and your match share - English, isiZulu, Afrikaans or anything else. Most international matches will be in English, and the interface is available in English and 16 other languages.' },
    { q: 'Is TalkLive free in South Africa?', a: 'Yes. Voice and text chat are free, need no account, and preferring South Africa in the country filter is free. A voice call uses mobile data, roughly like a WhatsApp call.' },
    { q: 'When is South Africa busiest on TalkLive?', a: 'TalkLive is busiest worldwide between 15:00 and 21:00 UTC, which is 5 pm to 11 pm in South Africa. SAST does not change with the seasons.' },
    { q: 'Will I always be matched with someone in South Africa?', a: 'Not always. A country preference steers matching, but it depends on who is searching at that moment. Adding Kenya, Nigeria or the United Kingdom gives you more chances.' },
    { q: 'Does anyone see my phone number or face?', a: 'No. Calls run in the browser, no number is exchanged and there is no video.' },
    { q: 'Is there someone to talk to if I am in crisis in South Africa?', a: 'Yes. SADAG\'s Suicide Crisis Helpline is free on 0800 567 567 at any hour. In an emergency, call 112 from a mobile or 10111 for the police.' },
  ],
  body: (c) => `<main id="story">
<section class="za-hero">
  <span class="za-kicker">Country guide &middot; South Africa &middot; Mzansi</span>
  <h1>Talk to strangers in <span>South Africa</span></h1>
  <p class="za-dek">Howzit? South Africa has twelve official languages, a world-class gift for small talk and a phrase for every kind of "later". Start a voice call or a text chat with someone new, free, with no account, no phone number and no camera.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>

<div class="za-wall" aria-label="Hello in South Africa's official languages">
${HELLOS.map(([w, lang, col]) => `<div style="--c:${col}"${col === '#ffb612' ? ' class="lt"' : ''}><b>${w}</b><span>${lang}</span></div>`).join('\n')}
</div>
<p class="za-wcap">Greetings in South Africa's official languages. "Sawubona" is shared by isiZulu and siSwati, "Dumela" by the three Sotho-Tswana languages. Sign language became the twelfth official language in 2023.</p>

<div class="za-main">
  <section class="za-sec">
    <h2>A country of <span>many voices</span></h2>
    <p>South Africa's 2022 census counted about 62 million people. isiZulu is the most widely spoken home language, followed by isiXhosa and Afrikaans, and English is the language of business, government and most conversations between strangers. Nelson Mandela's line - talk to a man in a language he understands and it goes to his head; talk to him in his language and it goes to his heart - is quoted here for a reason.</p>
    <p>Ubuntu, the idea that a person is a person through other people, is a word South Africans actually use, and it shows in how readily they talk to someone new. Expect warmth, a sense of humour that runs dry, and a lot of questions about where you are calling from.</p>
    <div class="za-clock"><b>5-11 pm</b><span>TalkLive's busiest hours, 15:00-21:00 UTC, in South African Standard Time. South Africa keeps the same time all year.</span></div>
  </section>

  <section class="za-sec">
    <h2>Speak <span>South African</span></h2>
    <p>South African English borrows freely from Afrikaans, isiZulu, isiXhosa and everywhere else, and it has a vocabulary all its own. Use a few of these and your match will notice.</p>
    <div class="za-slang">
${SLANG.map(([w, m]) => `      <div><b>${w}</b><span>${m}</span></div>`).join('\n')}
    </div>
  </section>

  <section class="za-sec">
    <h2>What to <span>talk about</span></h2>
    <p>Rugby is a national conversation - the Springboks won the Rugby World Cup in 2019 and again in 2023 - and so are cricket and football. The braai is a ritual and an argument (gas or wood? who is in charge of the fire?). Music runs from amapiano, which went from Pretoria and Johannesburg townships to the world, to gqom, kwaito and jazz. Load-shedding, taxis, Joburg versus Cape Town, the best bunny chow in Durban, and what "just now" actually means will keep a call going for as long as you want.</p>
  </section>

  <section class="za-sec">
    <h2>Privacy and <span>safety</span></h2>
    <p>Keep your full name, ID number, address, workplace and social media to yourself in a first conversation. Never share a banking OTP or PIN, and be careful with anyone who asks for money, airtime, vouchers or crypto, asks for photos, or wants to move to WhatsApp straight away. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">guide to chat scams</a> covers the usual scripts. Every TalkLive call and chat has Report and Block, and TalkLive is for adults 18 and over only.</p>
    <div class="za-help"><b>Need to talk?</b> SADAG's Suicide Crisis Helpline is free on <b>0800 567 567</b>, at any hour. In an emergency, call <b>112</b> from a mobile or <b>10111</b> for the police.</div>
    <p style="margin-top:20px">Getting started: open TalkLive in your browser (no app, no sign-up), prefer South Africa in Filters if you like (two preferred countries are free), and Tap to Talk or Tap to Chat. Our <a href="/countries/kenya">Kenya</a> and <a href="/countries/nigeria">Nigeria</a> guides and the Journal's <a href="/regions/africa">Africa feature</a> cover the rest of the continent.</p>
  </section>
</div>

${c.ad()}
${c.faq('Questions, eish')}
<section class="za-end"><div class="za-end-in">
  <h2>Howzit? Let's talk.</h2>
  <p>Someone in Joburg, Cape Town or Durban is up for a chat. Sharp sharp.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</div></section>
</main>`,
};
