'use strict';
// Mexico: "La plática". Mexicans do not chat, they platicar - and the best
// plática is the sobremesa, the talk that lingers after the meal. Papel picado
// bunting in rosa mexicano, marigold and turquoise over a dark green ground.
// Archivo Black for display, Source Serif 4 to read.
const BUNTING = ['#e4007c', '#f6a000', '#00a19a', '#7b2d8e', '#e4007c', '#f6a000', '#00a19a', '#7b2d8e', '#e4007c', '#f6a000', '#00a19a', '#7b2d8e'];
const WORDS = [
  ['¿Qué onda?', 'What\'s up? The universal Mexican hello.'],
  ['¿Mande?', 'Pardon? - a polite "what did you say?"'],
  ['Chido', 'Cool, great.'],
  ['Órale', 'Wow / OK / let\'s go - depending on the tone.'],
  ['Ahorita', 'Right now. Or later. Or possibly never.'],
  ['Provecho', 'Enjoy your meal - said even to strangers.'],
];

module.exports = {
  slug: 'mexico',
  name: 'Mexico',
  date: '2026-10-07',
  title: 'Talk to Strangers in Mexico - Free Voice Chat | TalkLive',
  description: 'Free voice and text chat with people in Mexico - platica in Spanish or English, no sign-up, no camera. Slang, food, football and when Mexico is online.',
  keywords: 'talk to strangers mexico, mexico chat, chat mexico, hablar con extraños, platicar con desconocidos, random chat mexico, mexican voice chat, chat de voz',
  h1: 'Talk to Strangers in Mexico',
  theme: '#0f3b2e',
  preload: ['archivo-black-latin-400-normal', 'source-serif-4-latin-400-normal'],
  css: `
:root{--paper:#fdf8f1;--ink:#1c1410;--rule:#ecdccb;--pink:#e4007c;--gold:#f6a000;--teal:#00a19a;--green:#0f3b2e;--mast:#fdf8f1}
body{font-family:"Source Serif 4",Georgia,serif;background:var(--paper);color:var(--ink)}
.c-bar{color:var(--mast);background:var(--green);max-width:none}
.mx-flags{display:flex;justify-content:space-between;background:var(--green);padding:0 10px 4px;overflow:hidden}
.mx-flags i{flex:1;height:46px;margin:0 3px;clip-path:polygon(0 0,100% 0,100% 82%,85% 100%,70% 82%,50% 100%,30% 82%,15% 100%,0 82%);background:var(--c);-webkit-mask:radial-gradient(circle at 50% 42%,transparent 6px,#000 7px);mask:radial-gradient(circle at 50% 42%,transparent 6px,#000 7px)}
.mx-hero{background:var(--green);color:var(--paper);padding:40px 20px 64px}
.mx-hero-in{max-width:980px;margin:0 auto;text-align:center}
.mx-kicker{font:400 12px/1 "Archivo Black",sans-serif;letter-spacing:.22em;text-transform:uppercase;color:var(--gold)}
.mx-hero h1{font:400 clamp(40px,7.4vw,92px)/.94 "Archivo Black",sans-serif;letter-spacing:-.03em;text-transform:uppercase;margin:18px 0 20px}
.mx-hero h1 span{color:var(--pink)}
.mx-dek{font:400 20px/1.6 "Source Serif 4",serif;max-width:660px;margin:0 auto 28px}
.mx-hero .c-ctas{justify-content:center;margin:0 auto}
.mx-main{max-width:760px;margin:0 auto;padding:20px 20px 0}
.mx-sec{padding:40px 0 6px}
.mx-sec h2{font:400 clamp(26px,3.8vw,40px)/1.05 "Archivo Black",sans-serif;letter-spacing:-.02em;margin:0 0 16px}
.mx-sec h2 span{color:var(--pink)}
.mx-sec p{font:400 18.5px/1.75 "Source Serif 4",serif;margin:0 0 1.05em}
.mx-sec a{color:var(--pink)}
.mx-words{display:grid;grid-template-columns:repeat(2,1fr);gap:0;margin:22px 0;border-top:3px solid var(--ink)}
.mx-words div{padding:16px 12px 16px 0;border-bottom:1px solid var(--rule)}
.mx-words div:nth-child(odd){padding-right:20px;border-right:1px solid var(--rule)}
.mx-words div:nth-child(even){padding-left:20px}
.mx-words b{display:block;font:400 21px/1.15 "Archivo Black",sans-serif;color:var(--teal);margin-bottom:4px}
.mx-words span{font:400 16px/1.5 "Source Serif 4",serif}
.mx-big{display:grid;grid-template-columns:auto 1fr;gap:22px;align-items:center;border:3px solid var(--ink);padding:22px 24px;margin:22px 0;background:#fff}
.mx-big b{font:400 54px/1 "Archivo Black",sans-serif;color:var(--pink)}
.mx-big span{font:400 17px/1.55 "Source Serif 4",serif}
.mx-help{background:var(--green);color:var(--paper);padding:18px 22px;font:400 17px/1.6 "Source Serif 4",serif}
.mx-help b{color:var(--gold)}
.c-faq{max-width:760px;margin:36px auto 0;padding:0 20px}
.c-faq h2{font:400 30px/1.05 "Archivo Black",sans-serif;margin:0 0 12px}
.c-faq summary{font:600 18px/1.45 "Source Serif 4",serif}
.c-faq p{font:400 17px/1.65 "Source Serif 4",serif}
.mx-end{margin-top:60px;background:var(--green);color:var(--paper);text-align:center}
.mx-end-in{padding:44px 20px 64px}
.mx-end h2{font:400 clamp(32px,5.6vw,64px)/1 "Archivo Black",sans-serif;text-transform:uppercase;margin:0 0 12px}
.mx-end p{font:400 19px/1.55 "Source Serif 4",serif;margin:0 auto 24px;max-width:540px}
.mx-end .c-ctas{justify-content:center;margin:0 auto}
@media (max-width:640px){.mx-words{grid-template-columns:1fr}.mx-words div:nth-child(odd){border-right:0;padding-right:0}.mx-words div:nth-child(even){padding-left:0}.mx-big{grid-template-columns:1fr}.mx-flags i:nth-child(n+9){display:none}}
`,
  faq: [
    { q: 'Can I chat in Spanish on TalkLive?', a: 'Claro. Speak whichever language you and your match share, and switch the whole interface to Spanish at talklive.app/es/ if you prefer.' },
    { q: 'Is TalkLive free in Mexico?', a: 'Yes. Voice and text chat are free, need no account, and preferring Mexico in the country filter is free.' },
    { q: 'When is Mexico busiest on TalkLive?', a: 'TalkLive is busiest worldwide between 15:00 and 21:00 UTC - 9 am to 3 pm in Mexico City, which has kept the same time all year since Mexico ended daylight saving in 2022.' },
    { q: 'Will I always be matched with someone in Mexico?', a: 'Not always. A country preference steers matching, but it depends on who is searching at that moment. Adding a second Spanish-speaking country, or the United States, gives you more chances.' },
    { q: 'Does anyone see my phone number or face?', a: 'No. Calls run in the browser, no number is exchanged and there is no video.' },
    { q: 'Is there someone to talk to if I am in crisis in Mexico?', a: 'Yes. Línea de la Vida answers on 800 911 2000, free and at any hour. In an emergency, call 911.' },
  ],
  body: (c) => `<main id="story">
<div class="mx-flags" aria-hidden="true">${BUNTING.map((col) => `<i style="--c:${col}"></i>`).join('')}</div>
<section class="mx-hero"><div class="mx-hero-in">
  <span class="mx-kicker">Country guide &middot; Mexico &middot; México</span>
  <h1>Talk to strangers in <span>Mexico</span></h1>
  <p class="mx-dek">In Mexico you do not just chat, you <em>platicas</em> - and the best plática is the <em>sobremesa</em>, the talk that keeps going long after the plates are empty. Start one by voice or text, free, with no account, no number and no camera.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</div></section>

<div class="mx-main">
  <section class="mx-sec">
    <h2>The world's biggest <span>Spanish-speaking</span> country</h2>
    <div class="mx-big"><b>126M</b><span>people were counted in Mexico's 2020 census - more Spanish speakers than any other country on earth, Spain included.</span></div>
    <p>Mexico City alone is one of the largest cities in the world, and the country stretches from the deserts of the north to the jungles of the Yucatán. It has 68 recognised Indigenous languages alongside Spanish, from Nahuatl and Maya to Zapotec and Mixtec, and Nahuatl gave English words like chocolate, tomato and avocado.</p>
    <p>Mexicans are famously warm with strangers, and politeness runs deep: <em>buenos días</em> to everyone in the lift, <em>provecho</em> to people eating, <em>¿mande?</em> instead of a blunt "what?". Bring the same courtesy to a call and it will be returned.</p>
  </section>

  <section class="mx-sec">
    <h2>Habla <span>como chilango</span></h2>
    <p>Many Mexicans speak English, especially near the border and in the cities, and plenty are glad to practise it. A few words of Mexican Spanish still go a long way. The whole app works <a href="/es/">in Spanish</a>.</p>
    <div class="mx-words">
${WORDS.map(([w, m]) => `      <div><b>${w}</b><span>${m}</span></div>`).join('\n')}
    </div>
    <p>If you are learning Spanish, Mexican Spanish is one of the clearest accents to start with, and Mexican speakers are patient with learners. Say you are learning in your first sentence, and see our guide to <a href="/language-exchange">language exchange</a> for how to make the swap fair.</p>
  </section>

  <section class="mx-sec">
    <h2>What to <span>talk about</span></h2>
    <p>Food is a safe bet and a bottomless one: tacos al pastor versus everything else, the right salsa, mole that takes three days to make, tamales at Christmas. Then football - Liga MX, Chivas versus América, the national team's long hunt for a quinto partido. Music runs from mariachi and banda to corridos and Mexican pop that charts worldwide. Ask about Día de Muertos, a grandmother's recipe, or the best place nobody visits. Ahorita has its own debate: ask someone what it really means.</p>
  </section>

  <section class="mx-sec">
    <h2>Privacy and <span>safety</span></h2>
    <p>Keep your full name, address, CURP, workplace and social media to yourself in a first conversation. Never share a bank code or one-time password, and hang up on anyone who claims a relative is in trouble and needs money - telephone extortion (<em>extorsión telefónica</em>) is a known script in Mexico. Be wary of anyone who asks for photos, gift cards or crypto, or wants to move to WhatsApp at once; our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">guide to chat scams</a> covers the rest. Every call and chat has Report and Block, and TalkLive is for adults 18 and over only.</p>
    <div class="mx-help"><b>Need to talk?</b> Línea de la Vida answers on <b>800 911 2000</b>, free and at any hour. In an emergency in Mexico, call <b>911</b>.</div>
    <p style="margin-top:20px">Getting started: open TalkLive in your browser (no app, no sign-up), prefer Mexico in Filters if you like (two preferred countries are free), and Tap to Talk or Tap to Chat. See also our <a href="/countries/united-states">United States guide</a> for the neighbours, our <a href="/countries/brazil">Brazil guide</a>, and the Journal's <a href="/regions/americas">Americas feature</a>.</p>
  </section>
</div>

${c.ad()}
${c.faq('Preguntas - questions people ask')}
<section class="mx-end">
  <div class="mx-flags" aria-hidden="true">${BUNTING.map((col) => `<i style="--c:${col}"></i>`).join('')}</div>
  <div class="mx-end-in">
    <h2>¿Echamos la plática?</h2>
    <p>Shall we have a chat? Someone in Mexico City, Guadalajara or Monterrey is up for one.</p>
    ${c.ctas('Tap to Talk', 'Tap to Chat')}
  </div>
</section>
</main>`,
};
