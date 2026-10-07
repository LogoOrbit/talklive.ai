'use strict';
// Malaysia: "Mamak at Midnight". TalkLive's busiest hours land in Malaysia's
// small hours, when the 24-hour mamak stalls are full of people talking over
// teh tarik. A night page: neon signage on deep teal, a menu board of
// Manglish, Big Shoulders Display for the signs, Libre Caslon Text to read.
const MENU = [
  ['Teh tarik', '"Pulled tea", poured from height until it froths'],
  ['Roti canai', 'Flaky flatbread with dhal or curry'],
  ['Nasi lemak', 'Coconut rice, sambal, anchovies - the national dish'],
  ['Milo ais', 'Iced chocolate malt, a Malaysian institution'],
];
const MANGLISH = [
  ['Can lah', 'Sure, no problem'],
  ['Alamak!', 'Oh no!'],
  ['Makan already?', 'Have you eaten yet? - a greeting'],
  ['Jom!', 'Let\'s go!'],
];

module.exports = {
  slug: 'malaysia',
  name: 'Malaysia',
  date: '2026-10-07',
  title: 'Talk to Strangers in Malaysia - Free Voice Chat | TalkLive',
  description: 'Free voice and text chat with people in Malaysia - in Malay, English, Mandarin or Tamil, no sign-up, no camera. Mamak nights, Manglish and when Malaysia is online.',
  keywords: 'talk to strangers malaysia, malaysia chat, malaysian voice chat, chat with malaysians, random chat malaysia, kuala lumpur chat, borak dengan orang asing, sembang',
  h1: 'Talk to Strangers in Malaysia',
  theme: '#06302e',
  preload: ['big-shoulders-display-latin-600-normal', 'libre-caslon-text-latin-400-normal'],
  css: `
:root{--paper:#f8f5ee;--ink:#14201f;--rule:#ddd5c4;--night:#06302e;--neon:#ffd23f;--pink:#ff4f7b;--mint:#4fe3c1;--mast:#f8f5ee}
body{font-family:"Libre Caslon Text",Georgia,serif;background:var(--paper);color:var(--ink)}
.c-bar{color:var(--mast);background:var(--night);max-width:none}
.my-hero{background:radial-gradient(ellipse at 50% 0,#0d4a46 0,var(--night) 60%,#031a19 100%);color:#fff;padding:60px 20px 64px}
.my-hero-in{max-width:1080px;margin:0 auto;display:grid;grid-template-columns:1.25fr 1fr;gap:40px;align-items:center}
.my-kicker{font:600 14px/1 "Big Shoulders Display",sans-serif;letter-spacing:.24em;text-transform:uppercase;color:var(--mint)}
.my-hero h1{font:800 clamp(48px,8vw,104px)/.88 "Big Shoulders Display",sans-serif;text-transform:uppercase;margin:14px 0 18px;color:var(--neon);text-shadow:0 0 18px rgba(255,210,63,.45)}
.my-dek{font:400 18.5px/1.7 "Libre Caslon Text",serif;margin:0 0 26px;max-width:600px;opacity:.94}
.my-board{border:3px solid var(--neon);border-radius:10px;padding:20px 22px;box-shadow:0 0 22px rgba(255,210,63,.25),inset 0 0 22px rgba(255,210,63,.08)}
.my-board h2{font:800 26px/1 "Big Shoulders Display",sans-serif;text-transform:uppercase;letter-spacing:.08em;color:var(--pink);margin:0 0 12px;text-shadow:0 0 12px rgba(255,79,123,.5)}
.my-board dl{margin:0}
.my-board dt{font:600 22px/1.1 "Big Shoulders Display",sans-serif;color:var(--neon);margin-top:10px}
.my-board dd{margin:2px 0 0;font:400 14.5px/1.45 "Libre Caslon Text",serif;opacity:.88}
.my-main{max-width:760px;margin:0 auto;padding:20px 20px 0}
.my-sec{padding:40px 0 6px}
.my-sec h2{font:800 clamp(32px,4.8vw,52px)/.95 "Big Shoulders Display",sans-serif;text-transform:uppercase;margin:0 0 16px;color:var(--night)}
.my-sec h2 span{color:#c2185b}
.my-sec p{font:400 17.5px/1.8 "Libre Caslon Text",serif;margin:0 0 1.05em}
.my-sec a{color:#c2185b}
.my-clock{display:grid;grid-template-columns:auto 1fr;gap:22px;align-items:center;background:var(--night);color:#fff;border-radius:10px;padding:22px 24px;margin:22px 0}
.my-clock b{font:800 54px/1 "Big Shoulders Display",sans-serif;color:var(--neon);white-space:nowrap}
.my-clock span{font:400 16.5px/1.55 "Libre Caslon Text",serif}
.my-mang{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:20px 0}
.my-mang div{background:#fff;border:1px solid var(--rule);border-top:5px solid var(--mint);padding:14px}
.my-mang b{display:block;font:800 22px/1 "Big Shoulders Display",sans-serif;margin-bottom:6px}
.my-mang span{font:400 14px/1.45 "Libre Caslon Text",serif}
.my-help{background:#fff;border:2px solid var(--night);border-radius:10px;padding:18px 22px;font:400 16.5px/1.6 "Libre Caslon Text",serif}
.my-help b{color:#c2185b}
.c-faq{max-width:760px;margin:36px auto 0;padding:0 20px}
.c-faq h2{font:800 40px/1 "Big Shoulders Display",sans-serif;text-transform:uppercase;margin:0 0 12px}
.c-faq summary{font:700 17px/1.45 "Libre Caslon Text",serif}
.c-faq p{font:400 16px/1.7 "Libre Caslon Text",serif}
.my-end{margin-top:60px;background:var(--night);color:#fff;padding:60px 20px;text-align:center}
.my-end h2{font:800 clamp(44px,7vw,84px)/.9 "Big Shoulders Display",sans-serif;text-transform:uppercase;color:var(--neon);margin:0 0 12px;text-shadow:0 0 18px rgba(255,210,63,.45)}
.my-end p{font:400 18px/1.55 "Libre Caslon Text",serif;margin:0 auto 24px;max-width:520px}
.my-end .c-ctas{justify-content:center;margin:0 auto}
@media (max-width:860px){.my-hero-in{grid-template-columns:1fr}.my-mang{grid-template-columns:repeat(2,1fr)}}
@media (max-width:520px){.my-clock{grid-template-columns:1fr}}
`,
  faq: [
    { q: 'Can I chat in Malay on TalkLive?', a: 'Boleh. Speak whichever language you and your match share - Malay, English, Mandarin, Tamil or a mix. The interface is available in English and 16 other languages, including Chinese and Indonesian.' },
    { q: 'Is TalkLive free in Malaysia?', a: 'Yes. Voice and text chat are free, need no account, and preferring Malaysia in the country filter is free.' },
    { q: 'When is Malaysia busiest on TalkLive?', a: 'TalkLive is busiest worldwide between 15:00 and 21:00 UTC, which is 11 pm to 5 am in Malaysia. Malaysian evenings, 7 pm to 11 pm, are quieter but often match you with Europe\'s afternoon.' },
    { q: 'Will I always be matched with someone in Malaysia?', a: 'Not always. A country preference steers matching, but it depends on who is searching at that moment. Adding Indonesia or Singapore gives you more chances in your time zone.' },
    { q: 'Does anyone see my phone number or face?', a: 'No. Calls run in the browser, no number is exchanged and there is no video.' },
    { q: 'Is there someone to talk to if I am in crisis in Malaysia?', a: 'Yes. Befrienders Kuala Lumpur answers on 03-7627 2929 at any hour, and the Ministry of Health\'s Talian HEAL is on 15555. In an emergency, call 999.' },
  ],
  body: (c) => `<main id="story">
<section class="my-hero"><div class="my-hero-in">
  <div>
    <span class="my-kicker">Country guide &middot; Malaysia</span>
    <h1>Talk to strangers in Malaysia</h1>
    <p class="my-dek">It is past midnight in Kuala Lumpur, the mamak stall is still full, and somebody is still talking. TalkLive's busiest hours fall right in Malaysia's late night, which makes it the best time to find someone awake. Start a call or a chat, free, with no account, no number and no camera.</p>
    ${c.ctas('Tap to Talk', 'Tap to Chat')}
  </div>
  <aside class="my-board" aria-label="The mamak menu"><h2>Open 24 jam</h2><dl>
${MENU.map(([d, t]) => `    <dt>${d}</dt><dd>${t}</dd>`).join('\n')}
  </dl></aside>
</div></section>

<div class="my-main">
  <section class="my-sec">
    <h2>Talk is <span>open 24 hours</span></h2>
    <p>Mamak restaurants, run by Tamil Muslim families, are where Malaysians of every background end up after dark: to watch football on the big screen, to argue about politics and food, or just to <em>lepak</em> - hang out with no agenda. Many never close. If a country has an institution built for long conversations with people you just met, this is it.</p>
    <div class="my-clock"><b>11 pm-5 am</b><span>TalkLive's busiest hours, 15:00-21:00 UTC, on Malaysian time (UTC+8, all year). Night owls get the fullest queue.</span></div>
    <p>Not a night owl? Malaysian evenings line up with Europe's afternoon and the Middle East's evening, so you can still meet people from the other side of the world on your way home.</p>
  </section>

  <section class="my-sec">
    <h2>Four languages, <span>one sentence</span></h2>
    <p>About 34 million people live in Malaysia. Malay - Bahasa Malaysia - is the national language, and English, Mandarin, Cantonese, Hokkien and Tamil are spoken every day; in Sabah and Sarawak, on Borneo, dozens of Indigenous languages add to the mix. Most Malaysians move between them without thinking, and the result is Manglish: English with Malay, Chinese and Tamil words and a <em>lah</em> at the end for warmth.</p>
    <div class="my-mang">
${MANGLISH.map(([w, m]) => `      <div><b>${w}</b><span>${m}</span></div>`).join('\n')}
    </div>
    <p>If you are learning Malay, or Mandarin, or simply want English practice with an easy-going partner, Malaysians make generous conversation partners. The Malay of Malaysia and the Indonesian of Indonesia are close cousins, so our <a href="/countries/indonesia">Indonesia guide</a> is worth a read too.</p>
  </section>

  <section class="my-sec">
    <h2>What to <span>talk about</span></h2>
    <p>Food first, always: whose nasi lemak is best, Penang versus Ipoh versus KL for hawker food, the durian question (you love it or you cannot be in the same room). Then badminton, which Malaysia follows with real passion, football, K-dramas and C-dramas, balik kampung - the trip back to the home village for Hari Raya, Chinese New Year or Deepavali - and the traffic in the Klang Valley, which needs no introduction.</p>
  </section>

  <section class="my-sec">
    <h2>Privacy and <span>safety</span></h2>
    <p>Keep your full name, IC number, address, workplace and social media to yourself in a first conversation. Never share a TAC, a bank code or a one-time password, and hang up on anyone who claims to be from the police, a court, LHDN or your bank and asks you to move money - the "Macau scam" is a well-known script in Malaysia. Be wary of anyone who asks for photos, gift cards or crypto, or wants to move to another app at once; our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">guide to chat scams</a> covers the rest. Every call and chat has Report and Block, and TalkLive is for adults 18 and over only.</p>
    <div class="my-help"><b>Need to talk?</b> Befrienders Kuala Lumpur answers on <b>03-7627 2929</b> at any hour, and Talian HEAL is on <b>15555</b>. In an emergency in Malaysia, call <b>999</b>.</div>
    <p style="margin-top:20px">Getting started: open TalkLive in your browser (no app, no sign-up), prefer Malaysia in Filters if you like (two preferred countries are free), and Tap to Talk or Tap to Chat. The Journal's <a href="/regions/southeast-asia">Southeast Asia feature</a> covers the neighbours, and our <a href="/late-night-chat">late-night chat guide</a> is for the hours after the mamak.</p>
  </section>
</div>

${c.ad()}
${c.faq('Soalan - questions people ask')}
<section class="my-end">
  <h2>Jom borak!</h2>
  <p>Let's chat. Someone in KL, Penang or Kuching is still awake.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
