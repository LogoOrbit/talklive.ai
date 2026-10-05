'use strict';
// /resources: "The Card Catalogue". Every TalkLive guide, filed like a
// library's card catalogue - oak drawers with brass label holders, typed index
// cards - followed by the editorial standards the guides are written to.
// A navigation hub, so it carries no ads (noAds). Libre Caslon Text to read,
// Courier Prime for the cards.
const DRAWERS = [
  ['Start here', 'A - C', [
    ['/talk-to-strangers', 'Talk to Strangers', 'The first five minutes of a conversation with someone new, minute by minute, with the research behind each.'],
    ['/how-it-works', 'How TalkLive Works', 'Queues, matching, WebRTC, the TURN relay - and what "not recorded" means, exactly.'],
    ['/safety', 'Safety Center', 'Five rules, what to do when a conversation goes wrong, and what TalkLive keeps.'],
  ]],
  ['Ways to talk', 'D - L', [
    ['/random-voice-chat', 'Random Voice Chat', 'The case for the voice: why speech makes strangers seem more human.'],
    ['/random-text-chat', 'Random Text Chat', 'From IRC to now: when typing beats talking, and what happens to what you type.'],
    ['/random-call', 'Random Call', 'A switchboard history, how a browser call is connected, data use and fixes.'],
    ['/voice-chat-vs-video-chat', 'Voice vs Video Chat', 'An honest scorecard, round by round - including where video wins.'],
    ['/anonymous-chat', 'Anonymous Chat', 'What your match sees, what they never see, and what TalkLive keeps.'],
  ]],
  ['Reasons to talk', 'M - R', [
    ['/make-friends-online', 'Make Friends Online', 'How many hours a friendship really takes, and how to keep the people you click with.'],
    ['/late-night-chat', 'Late Night Chat', 'Where it is still evening when it is 2 a.m. for you, and the mind after midnight.'],
    ['/talk-to-someone', 'Talk to Someone', 'When you need to be heard - and where to find trained help if it is urgent.'],
    ['/omegle-alternative', 'Omegle Alternative', 'Six checks for any Omegle alternative, with TalkLive scored honestly.'],
  ]],
  ['Languages and places', 'S - Z', [
    ['/practice-english-speaking', 'Practice English Speaking', 'Why speaking builds fluency, a phrase bank for real calls, and five minutes that count.'],
    ['/language-exchange', 'Language Exchange', 'The tandem method\'s two rules and a script for your first exchange.'],
    ['/language-chat-guide', 'TalkLive in 17 Languages', 'Using TalkLive in your own language, and talking across languages well.'],
    ['/country-chat-guide', 'Country Guides', 'India, Pakistan, Bangladesh, the US, the UK, Egypt, Nigeria and Indonesia.'],
  ]],
];

module.exports = {
  slug: 'resources',
  name: 'All Guides',
  date: '2026-10-05',
  noAds: true,
  about: { '@type': 'Thing', name: 'TalkLive guides' },
  title: 'TalkLive Guides - Every Guide to Voice Chat, Safety and Conversation',
  description: 'Every TalkLive guide in one place: talking to strangers, voice and text chat, safety and privacy, making friends, languages and country guides - and the editorial standards they are written to.',
  keywords: 'talklive guides, voice chat guide, random chat guide, how to talk to strangers guide, online chat safety guide',
  h1: 'All TalkLive Guides',
  theme: '#3b2a1c',
  preload: ['libre-caslon-text-latin-700-normal', 'courier-prime-latin-400-normal'],
  css: `
:root{--paper:#f1e8d8;--ink:#2b2016;--rule:#cdb995;--oak:#6b4a2b;--brass:#c9a34e;--mast:#2b2016}
body{font-family:"Libre Caslon Text",Georgia,serif;background:var(--paper)}
.rs-head{max-width:1100px;margin:0 auto;padding:50px 20px 20px;text-align:center}
.rs-head h1{font:700 clamp(40px,6.4vw,76px)/1.02 "Libre Caslon Text",serif;margin:0 0 14px}
.rs-head p{font-size:19px;line-height:1.6;max-width:700px;margin:0 auto 22px}
.c-ctas{justify-content:center}
.c-ctas a{font:700 15px/1 "Courier Prime",monospace;padding:15px 20px;border-radius:3px}
.c-talk{background:var(--oak);color:#fff}
.c-chat{background:#fffaf0;color:var(--ink);border:1px solid var(--rule)}
.rs-cab{max-width:1100px;margin:20px auto 0;padding:24px;background:linear-gradient(180deg,#7a5532,#5d3f23);border-radius:10px;display:grid;grid-template-columns:repeat(2,1fr);gap:20px;box-shadow:0 18px 40px rgba(50,30,10,.25)}
.rs-drawer{background:linear-gradient(180deg,#8b6238,#6f4b29);border-radius:6px;padding:18px;box-shadow:inset 0 2px 0 rgba(255,255,255,.12),inset 0 -3px 0 rgba(0,0,0,.25)}
.rs-label{display:flex;justify-content:space-between;align-items:center;background:var(--brass);color:#2b2016;border-radius:3px;padding:8px 12px;font:700 13px/1 "Courier Prime",monospace;letter-spacing:.06em;text-transform:uppercase;box-shadow:inset 0 0 0 2px #a8833a;margin-bottom:14px}
.rs-cards{display:grid;gap:10px}
.rs-card{display:block;background:#fffdf6 repeating-linear-gradient(180deg,transparent 0 23px,#e8dcc2 23px 24px);border-top:3px solid #d9534f;padding:12px 14px;text-decoration:none;color:var(--ink);font:400 14.5px/24px "Courier Prime",monospace;border-radius:2px;transition:transform .12s}
.rs-card:hover{transform:translateY(-3px) rotate(-.4deg)}
.rs-card b{display:block;font:700 15px/24px "Courier Prime",monospace;text-transform:uppercase}
.rs-main{max-width:780px;margin:0 auto;padding:30px 20px 0}
.rs-sec{padding:34px 0;border-top:1px solid var(--rule)}
.rs-sec h2{font:700 clamp(26px,3.4vw,36px)/1.15 "Libre Caslon Text",serif;margin:0 0 12px}
.rs-sec p,.rs-sec li{font-size:18px;line-height:1.7}
.rs-sec ul{padding-left:20px}
.rs-sec a{color:#8a3b12}
.c-faq{max-width:780px;margin:0 auto;padding:20px 20px 0}
.c-faq h2{font:700 30px/1.15 "Libre Caslon Text",serif;margin:0 0 10px}
.c-faq summary{font:700 17px/1.4 "Libre Caslon Text",serif}
.c-faq p{font-size:16.5px;line-height:1.65}
.rs-end{max-width:780px;margin:40px auto 0;padding:30px 20px;text-align:center;border-top:1px solid var(--rule)}
.rs-end h2{font:700 clamp(26px,4vw,40px)/1.1 "Libre Caslon Text",serif;margin:0 0 16px}
@media (max-width:760px){.rs-cab{grid-template-columns:1fr;padding:14px}}
`,
  faq: [
    { q: 'Who writes the TalkLive guides?', a: 'The team that builds TalkLive. Every guide is written and designed by hand, and factual claims cite their sources.' },
    { q: 'How do I report a mistake in a guide?', a: 'Email info@talklive.app with the page, the sentence and what you think is wrong. We correct errors and update the page date.' },
    { q: 'Where is the Journal?', a: 'At talklive.app/blog/ - long-form essays and research on conversation, loneliness, listening and language learning.' },
  ],
  body: (c) => `<main id="story">
<section class="rs-head">
  <h1>All TalkLive guides</h1>
  <p>Every guide we have written, filed in one cabinet. Pull a drawer, pick a card. If you came here to talk rather than read, the buttons are below too.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>

<nav class="rs-cab" aria-label="All guides">
${DRAWERS.map(([name, range, cards]) => `<div class="rs-drawer"><div class="rs-label"><span>${name}</span><span>${range}</span></div><div class="rs-cards">${cards.map(([href, title, blurb]) => `<a class="rs-card" href="${href}"><b>${title}</b>${blurb}</a>`).join('')}</div></div>`).join('\n')}
</nav>

<div class="rs-main">
  <section class="rs-sec">
    <h2>The Journal</h2>
    <p>For longer reading, the <a href="/blog/">TalkLive Journal</a> publishes essays, reporting and research digests: on why talking to strangers feels easier than we expect, what happened to Omegle, loneliness, listening, phone anxiety, learning a language by speaking, and the scams that start with "Hi". Its regional features look at <a href="/regions/south-asia">South Asia</a>, <a href="/regions/middle-east">the Middle East</a>, <a href="/regions/southeast-asia">Southeast Asia</a>, <a href="/regions/africa">Africa</a>, <a href="/regions/europe">Europe</a> and <a href="/regions/americas">the Americas</a>, and <a href="/languages/">Seventeen Ways to Say Hello</a> introduces every language TalkLive is available in.</p>
  </section>

  <section class="rs-sec">
    <h2>How these guides are written</h2>
    <ul>
      <li><strong>Every page is written by hand</strong> and designed on its own. None is generated from a template with a keyword swapped in.</li>
      <li><strong>Research is cited by author, year and journal</strong>, so you can look it up. Where a quotation appears, it is from its named source; where we summarise a study, we say so.</li>
      <li><strong>TalkLive's own numbers are labelled</strong> as ours, with the period they cover - such as the busy hours in each country guide.</li>
      <li><strong>Limits are stated, not hidden.</strong> Country preferences are not guarantees; identities are not verified; "not recorded by TalkLive" does not mean "cannot be recorded".</li>
      <li><strong>The policies are the source of truth.</strong> Where a guide summarises the <a href="/privacy">Privacy Policy</a>, <a href="/terms">Terms</a> or <a href="/community-guidelines">Community Guidelines</a>, those documents win.</li>
      <li><strong>Corrections are welcome.</strong> Email info@talklive.app and we will fix it.</li>
    </ul>
  </section>
</div>

${c.faq('About the guides')}
<section class="rs-end">
  <h2>Enough reading - say hello</h2>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
