'use strict';
// Canada: "Six Time Zones". The country is a weather report and a long
// distance call: buffalo-check plaid, maple red and snow white, and a strip of
// six clocks from St. John's to Vancouver. Unbounded for display, Lora to
// read.
const ZONES = [
  ['Vancouver', 'Pacific', '8 am - 2 pm'],
  ['Calgary', 'Mountain', '9 am - 3 pm'],
  ['Winnipeg', 'Central', '10 am - 4 pm'],
  ['Toronto', 'Eastern', '11 am - 5 pm'],
  ['Halifax', 'Atlantic', '12 pm - 6 pm'],
  ['St. John\'s', 'Newfoundland', '12:30 pm - 6:30 pm'],
];

module.exports = {
  slug: 'canada',
  name: 'Canada',
  date: '2026-10-06',
  title: 'Talk to Strangers in Canada - Free Voice Chat in English & French | TalkLive',
  description: 'Free voice and text chat with people in Canada - in English or French, no sign-up, no camera. Six time zones, two official languages, a country of newcomers, and when Canada is online.',
  keywords: 'talk to strangers canada, canada chat, canadian voice chat, chat with canadians, random chat canada, toronto chat, quebec chat, clavarder avec des inconnus',
  h1: 'Talk to Strangers in Canada',
  theme: '#b3121f',
  preload: ['unbounded-latin-800-normal', 'lora-latin-400-normal'],
  css: `
:root{--paper:#fbfaf7;--ink:#1b1b1b;--rule:#e2ddd3;--red:#b3121f;--deep:#6e0b13;--snow:#fff;--pine:#1f4d3a;--mast:#fff}
body{font-family:"Lora",Georgia,serif;background:var(--paper);color:var(--ink)}
.c-bar{color:var(--mast);background:var(--deep);max-width:none}
.ca-plaid{background:
 repeating-linear-gradient(0deg,rgba(0,0,0,.42) 0 40px,transparent 40px 80px),
 repeating-linear-gradient(90deg,rgba(0,0,0,.42) 0 40px,transparent 40px 80px),
 var(--red)}
.ca-hero{padding:56px 20px 64px}
.ca-card{max-width:860px;margin:0 auto;background:var(--paper);padding:44px 40px 40px;border-top:10px solid var(--ink)}
.ca-kicker{font:500 12px/1 "Unbounded",sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--red)}
.ca-card h1{font:800 clamp(36px,6vw,74px)/1 "Unbounded",sans-serif;letter-spacing:-.03em;margin:16px 0 18px}
.ca-card h1 span{color:var(--red)}
.ca-dek{font:400 19.5px/1.6 "Lora",serif;margin:0 0 26px;max-width:640px}
.ca-zones{max-width:1180px;margin:0 auto;padding:30px 20px 0;display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
.ca-zone{border:2px solid var(--ink);padding:14px 12px;background:#fff}
.ca-zone:nth-child(4){background:var(--red);color:#fff;border-color:var(--red)}
.ca-zone b{display:block;font:800 15px/1.15 "Unbounded",sans-serif;margin-bottom:4px}
.ca-zone small{display:block;font:500 11px/1.2 "Unbounded",sans-serif;letter-spacing:.1em;text-transform:uppercase;opacity:.75;margin-bottom:10px}
.ca-zone span{font:400 15px/1.3 "Lora",serif}
.ca-zcap{max-width:1180px;margin:10px auto 0;padding:0 20px;font:400 italic 15px/1.5 "Lora",serif;opacity:.8}
.ca-main{max-width:780px;margin:0 auto;padding:20px 20px 0}
.ca-sec{padding:40px 0 6px}
.ca-sec h2{font:800 clamp(24px,3.6vw,38px)/1.12 "Unbounded",sans-serif;letter-spacing:-.02em;margin:0 0 16px}
.ca-sec h2 i{font-style:normal;color:var(--red)}
.ca-sec p{font:400 18.5px/1.75 "Lora",serif;margin:0 0 1.05em}
.ca-sec a{color:var(--red)}
.ca-two{display:grid;grid-template-columns:1fr 1fr;gap:0;margin:20px 0;border:2px solid var(--ink)}
.ca-two div{padding:20px}
.ca-two div:first-child{border-right:2px solid var(--ink)}
.ca-two div:last-child{background:#13315c;color:#fff}
.ca-two b{display:block;font:800 18px/1.2 "Unbounded",sans-serif;margin-bottom:10px}
.ca-two ul{margin:0;padding-left:18px;font:400 16.5px/1.6 "Lora",serif}
.ca-stat{display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:center;background:var(--pine);color:#fff;padding:22px 24px;margin:22px 0}
.ca-stat b{font:800 54px/1 "Unbounded",sans-serif}
.ca-stat span{font:400 17px/1.55 "Lora",serif}
.ca-help{border:2px solid var(--red);padding:18px 22px;background:#fff;font:400 17px/1.6 "Lora",serif}
.ca-help b{color:var(--red)}
.c-faq{max-width:780px;margin:36px auto 0;padding:0 20px}
.c-faq h2{font:800 30px/1.1 "Unbounded",sans-serif;margin:0 0 14px}
.c-faq summary{font:700 18px/1.4 "Lora",serif}
.c-faq p{font:400 17px/1.65 "Lora",serif}
.ca-end{margin-top:60px;padding:56px 20px}
.ca-end .ca-card{text-align:center}
.ca-end h2{font:800 clamp(30px,5vw,54px)/1 "Unbounded",sans-serif;margin:0 0 10px}
.ca-end p{font:400 18px/1.55 "Lora",serif;margin:0 0 22px}
.ca-end .c-ctas{justify-content:center}
@media (max-width:980px){.ca-zones{grid-template-columns:repeat(3,1fr)}}
@media (max-width:640px){.ca-card{padding:30px 20px}.ca-zones{grid-template-columns:repeat(2,1fr)}.ca-two{grid-template-columns:1fr}.ca-two div:first-child{border-right:0;border-bottom:2px solid var(--ink)}.ca-stat{grid-template-columns:1fr}}
`,
  faq: [
    { q: 'Can I chat in French on TalkLive?', a: 'Yes. Speak whichever language you and your match share, and switch the whole interface to French at talklive.app/fr/ if you prefer.' },
    { q: 'Is TalkLive free in Canada?', a: 'Yes. Voice and text chat are free, need no account, and preferring Canada in the country filter is free.' },
    { q: 'When is Canada busiest on TalkLive?', a: 'TalkLive is busiest worldwide between 15:00 and 21:00 UTC - 11 am to 5 pm in Toronto and 8 am to 2 pm in Vancouver while daylight time is in force. Canadian evenings are quieter, but often match you with Asia\'s morning.' },
    { q: 'Will I always be matched with someone in Canada?', a: 'Not always. A country preference steers matching, but it depends on who is searching at that moment. Prefer the United States too if you want North American time zones.' },
    { q: 'Does anyone see my phone number or face?', a: 'No. Calls run in the browser, no number is exchanged and there is no video.' },
    { q: 'Is there someone to talk to if I am in crisis?', a: 'Yes. In Canada you can call or text 9-8-8, the Suicide Crisis Helpline, free, at any hour. In an emergency, call 911.' },
  ],
  body: (c) => `<main id="story">
<section class="ca-hero ca-plaid">
  <div class="ca-card">
    <span class="ca-kicker">Country guide &middot; Canada &middot; Le Canada</span>
    <h1>Talk to strangers in <span>Canada</span></h1>
    <p class="ca-dek">The second-largest country on earth, six time zones wide, with two official languages and a population that grows mostly through people arriving from elsewhere. Canadians are good at long-distance conversations. Start one by voice or text, free, with no account, no number and no camera.</p>
    ${c.ctas('Tap to Talk', 'Tap to Chat')}
  </div>
</section>

<div class="ca-zones" aria-label="TalkLive's busiest hours in each Canadian time zone, during daylight time">
${ZONES.map(([city, zone, busy]) => `<div class="ca-zone"><small>${zone}</small><b>${city}</b><span>${busy}</span></div>`).join('\n')}
</div>
<p class="ca-zcap">TalkLive's busiest hours, 15:00-21:00 UTC, on Canadian clocks during daylight time (March to November). Subtract an hour in winter. Most of Saskatchewan keeps Central Standard Time all year.</p>

<div class="ca-main">
  <section class="ca-sec">
    <h2>A country built for <i>long-distance calls</i></h2>
    <p>Canada is the second-largest country in the world by area, and most of its roughly 41 million people live within a few hundred kilometres of the US border, strung out along it from the Atlantic to the Pacific. Newfoundland even keeps its own half-hour time zone, three and a half hours behind UTC. Distance has always shaped how Canadians stay in touch: with family on the other coast, with the north, and with the countries so many of them came from.</p>
    <p>And Canadians do like to talk. Small talk here is a genuine social art, built on the safest subject in the world: the weather. It is not filler. In a country where it can be minus thirty in January and thirty above in July, weather is logistics, shared suffering and a reliable opener in one. Ask a Canadian how cold it got last winter and settle in.</p>
  </section>

  <section class="ca-sec">
    <h2>Two languages, <i>two solitudes</i></h2>
    <p>The Official Languages Act of 1969 made English and French equal in federal institutions. French is the language of most people in Quebec and of communities in New Brunswick, Ontario and Manitoba; English dominates almost everywhere else. Hugh MacLennan's 1945 novel <em>Two Solitudes</em> gave the country a phrase for the distance between them, and a TalkLive call is one small way across it. The whole app is available <a href="/fr/">in French</a>.</p>
    <div class="ca-two">
      <div><b>English Canada says</b><ul><li><em>Eh?</em> - to end a sentence, or check you agree</li><li><em>Toque</em> - a knitted winter hat</li><li><em>Double-double</em> - coffee, two cream, two sugar</li><li><em>Loonie, toonie</em> - the one- and two-dollar coins</li></ul></div>
      <div><b>Le Québec dit</b><ul><li><em>Ça va?</em> - how's it going?</li><li><em>Tiguidou!</em> - great, perfect</li><li><em>Pantoute</em> - not at all</li><li><em>Bienvenue</em> - also "you're welcome"</li></ul></div>
    </div>
    <p>If you are learning French, Quebec French is a joy to practise - it has its own vocabulary, its own accent and a great deal of humour, and Quebecers are usually delighted when someone makes the effort. Say you are learning in your first sentence.</p>
  </section>

  <section class="ca-sec">
    <h2>A country of <i>newcomers</i></h2>
    <div class="ca-stat"><b>23%</b><span>of people in Canada were, or had ever been, immigrants or permanent residents in the 2021 census - the highest share in more than 150 years.</span></div>
    <p>Toronto, Vancouver and Montreal are among the most diverse cities on earth, and most Canadians either moved here or have parents who did, from India, the Philippines, China, Pakistan, Nigeria, the Middle East, the Caribbean and everywhere else. That makes "where did your family come from?" a natural question and a rich one. Indigenous peoples - First Nations, Inuit and Métis - have been here far longer than anyone; their languages and land acknowledgements are part of public life, and they are worth asking about respectfully if your match brings them up.</p>
    <p>For newcomers, the first winter is a famous rite of passage, and the loneliness of starting over in a new city is common. If that is you, our Journal piece on <a href="/blog/lonely-after-moving-abroad">loneliness after moving abroad</a> is written for you, and a conversation in your own language can help.</p>
  </section>

  <section class="ca-sec">
    <h2>What to <i>talk about</i></h2>
    <p>Hockey is the national conversation - which team, which rivalry, the long wait for a Canadian Stanley Cup winner - with basketball rising fast since the Toronto Raptors won the NBA title in 2019. Then the weather, the cost of housing, the best poutine, which province is best (everyone has an answer), cottages and lakes, Tim Hortons versus everyone else. Canadians are famously polite and will say sorry a great deal; you do not have to, but it helps.</p>
  </section>

  <section class="ca-sec">
    <h2>Privacy and <i>safety</i></h2>
    <p>Keep your full name, address, SIN, workplace and social media accounts private in a first conversation. Never share a banking code or one-time password, and be careful with anyone who claims to be from the CRA, immigration or the police, asks for gift cards or crypto, asks for photos, or wants to move to another app at once - our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">guide to chat scams</a> covers these scripts. Every TalkLive call and chat has Report and Block. TalkLive is for adults 18 and over only.</p>
    <div class="ca-help"><b>In an emergency</b> in Canada, call <b>911</b>. If you are struggling, call or text <b>9-8-8</b>, the Suicide Crisis Helpline, free and at any hour, in English or French.</div>
    <p style="margin-top:20px">Getting started: open TalkLive in your browser (no app, no sign-up), optionally prefer Canada in Filters (two preferred countries are free), and Tap to Talk or Tap to Chat. Our <a href="/countries/united-states">United States guide</a> covers the neighbours, and the Journal's <a href="/regions/americas">Americas feature</a> the rest of the hemisphere.</p>
  </section>
</div>

${c.ad()}
${c.faq('Questions, eh?')}
<section class="ca-end ca-plaid"><div class="ca-card">
  <h2>Coast to coast to coast</h2>
  <p>St. John's to Vancouver, Montreal to Whitehorse - someone is up for a chat.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</div></section>
</main>`,
};
