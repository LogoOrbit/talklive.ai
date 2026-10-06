'use strict';
// /country-chat-guide: "The Atlas". The hub for the fourteen country guides:
// each card is a small preview of its guide, in that guide's own colours and
// typeface, followed by how country preferences really work. A navigation
// hub, so it carries no ads (noAds). Inter for the frame around the cards.
const CARDS = [
  ['india', 'India', 'The berth opposite', 'Busiest 8:30 pm - 2:30 am IST', '#0b1320', '#ffb200', 'Big Shoulders Display', 800, true],
  ['pakistan', 'Pakistan', 'Bol - speak', 'Busiest 8 pm - 2 am PKT', '#0a241d', '#e7b54a', 'Abril Fatface', 400, false],
  ['bangladesh', 'Bangladesh', 'An adda with someone new', 'Busiest 9 pm - 3 am', '#f7f1e3', '#006a4e', 'Old Standard TT', 700, false],
  ['united-states', 'United States', 'Caller, you\'re on the air', 'Busiest 11 am - 5 pm ET', '#fbfaf6', '#d7261e', 'Bebas Neue', 400, true],
  ['united-kingdom', 'United Kingdom', 'Talkative, becoming very talkative', 'Busiest 4 pm - 10 pm BST', '#e7edf0', '#10263b', 'DM Serif Display', 400, false],
  ['egypt', 'Egypt', 'The first Thursday', 'Busiest 6 pm - midnight, summer', '#5a0f1b', '#d9a441', 'Playfair Display', 700, false],
  ['nigeria', 'Nigeria', 'How far? Wole!', 'Busiest 4 pm - 10 pm WAT', '#ffcc00', '#111111', 'Anton', 400, true],
  ['indonesia', 'Indonesia', 'Sudah makan?', 'Busiest 10 pm - 4 am WIB', '#1f3a5f', '#f2c48d', 'Instrument Serif', 400, false],
  ['germany', 'Germany', 'Feierabend', 'Busiest 5 pm - 11 pm CEST', '#f2c230', '#111111', 'Syne', 800, true],
  ['saudi-arabia', 'Saudi Arabia', 'The majlis', 'Busiest 6 pm - midnight AST', '#141a33', '#e8c98f', 'Literata', 700, false],
  ['united-arab-emirates', 'UAE', 'A country of arrivals', 'Busiest 7 pm - 1 am GST', '#0b0b0c', '#ffb627', 'JetBrains Mono', 400, true],
  ['morocco', 'Morocco', 'Three glasses of tea', 'Busiest 4 pm - 10 pm', '#12406b', '#e3a21a', 'Fraunces', 700, false],
  ['canada', 'Canada', 'Six time zones', 'Busiest 11 am - 5 pm ET', '#b3121f', '#ffffff', 'Unbounded', 800, false],
  ['philippines', 'Philippines', 'Kwentuhan tayo', 'Busiest 11 pm - 5 am PHT', '#0038a8', '#fcd116', 'Nunito', 800, false],
];

module.exports = {
  slug: 'country-chat-guide',
  name: 'Countries',
  date: '2026-10-05',
  noAds: true,
  about: { '@type': 'Thing', name: 'Country guides and country preferences on TalkLive' },
  title: 'Talk to Strangers by Country - 14 Country Guides | TalkLive',
  description: 'Guides to talking with people in India, Pakistan, Bangladesh, the US, the UK, Egypt, Nigeria, Indonesia, Germany, Saudi Arabia, the UAE, Morocco, Canada and the Philippines - plus how country preferences really work.',
  keywords: 'talk to people from other countries, country voice chat, international voice chat, chat with people worldwide, country chat preferences',
  h1: 'Talk to People Around the World',
  theme: '#f5f3ee',
  preload: ['inter-latin-600-normal'],
  css: `
:root{--paper:#f5f3ee;--ink:#1a1a1a;--rule:#dcd8ce;--mast:#1a1a1a}
body{font-family:"Inter",system-ui,sans-serif;background:var(--paper)}
.at-head{max-width:1180px;margin:0 auto;padding:50px 20px 20px;display:grid;grid-template-columns:1.2fr 1fr;gap:40px;align-items:end}
.at-head h1{font:600 clamp(42px,6.6vw,84px)/.98 "Inter",sans-serif;letter-spacing:-.045em;margin:0}
.at-head p{font-size:19px;line-height:1.6;margin:0 0 20px}
.c-ctas a{font:600 15px/1 "Inter",sans-serif;padding:15px 20px;border-radius:999px}
.c-talk{background:var(--ink);color:#fff}
.c-chat{background:#fff;color:var(--ink);border:1px solid var(--rule)}
.at-grid{max-width:1180px;margin:0 auto;padding:20px 20px 10px;display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.at-card{display:flex;flex-direction:column;justify-content:space-between;min-height:230px;padding:20px;border-radius:14px;background:var(--bg);color:var(--fg);text-decoration:none;border:1px solid rgba(0,0,0,.08);transition:transform .15s}
.at-card:hover{transform:translateY(-4px)}
.at-card small{font:600 12px/1.3 "Inter",sans-serif;letter-spacing:.12em;text-transform:uppercase;opacity:.85}
.at-card b{display:block;font-family:var(--ff);font-weight:var(--fw);font-size:clamp(28px,2.9vw,38px);overflow-wrap:anywhere;line-height:.95;margin:10px 0 8px}
.at-card b.up{text-transform:uppercase}
.at-card span{font-size:14.5px;line-height:1.45;opacity:.9}
.at-card i{font-style:normal;font:600 13px/1 "Inter",sans-serif;margin-top:16px;display:block}
.at-main{max-width:820px;margin:0 auto;padding:20px 20px 0}
.at-sec{padding:38px 0;border-top:1px solid var(--rule)}
.at-sec h2{font:600 clamp(26px,3.4vw,36px)/1.1 "Inter",sans-serif;letter-spacing:-.03em;margin:0 0 14px}
.at-sec p{font-size:18px;line-height:1.72;margin:0 0 1.05em}
.at-sec a{color:#1d5fd1}
.at-facts{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:18px 0}
.at-facts div{background:#fff;border:1px solid var(--rule);border-radius:12px;padding:16px;font-size:15.5px;line-height:1.55}
.at-facts b{display:block;margin-bottom:4px}
.c-faq{max-width:820px;margin:0 auto;padding:30px 20px 0}
.c-faq h2{font:600 32px/1.1 "Inter",sans-serif;letter-spacing:-.03em;margin:0 0 12px}
.c-faq summary{font:600 17px/1.4 "Inter",sans-serif}
.c-faq p{font-size:16px;line-height:1.65}
.at-end{max-width:820px;margin:40px auto 0;padding:30px 20px;text-align:center;border-top:1px solid var(--rule)}
.at-end h2{font:600 clamp(26px,4vw,40px)/1.1 "Inter",sans-serif;letter-spacing:-.03em;margin:0 0 16px}
.at-end .c-ctas{justify-content:center}
@media (max-width:980px){.at-grid{grid-template-columns:repeat(2,1fr)}.at-head{grid-template-columns:1fr}}
@media (max-width:560px){.at-grid{grid-template-columns:1fr}.at-facts{grid-template-columns:1fr}}
`,
  faq: [
    { q: 'Can TalkLive guarantee a match from a selected country?', a: 'No. Preferences depend on who is searching at that moment and on compatible settings. If nobody suitable is available, matching widens after a short wait.' },
    { q: 'Does the country label verify where someone lives?', a: 'No. It is estimated from the network connection and is not proof of nationality, residence or language.' },
    { q: 'Is a country preference a language filter?', a: 'No. Countries are multilingual, and individuals speak different languages. Ask at the start of a conversation.' },
    { q: 'How many countries can I choose for free?', a: 'The free plan allows up to two preferred and two avoided countries.' },
    { q: 'Why are there guides for only fourteen countries?', a: 'They are the countries that bring TalkLive the most people, and each guide is written by hand with information specific to that country. We add a guide only when there is something genuinely useful to say.' },
  ],
  body: (c) => `<main id="story">
<section class="at-head">
  <h1>Talk to people around the world</h1>
  <div>
    <p>In a typical month, people come to TalkLive from more than 150 countries. The fourteen that bring us the most people each have their own guide - its languages, its late nights, what people talk about, when they are online in local time, and the safety advice that applies there.</p>
    ${c.ctas('Talk to the world', 'Text the world')}
  </div>
</section>

<nav class="at-grid" aria-label="Country guides">
${CARDS.map(([slug, name, hook, busy, bg, fg, ff, fw, up]) => `<a class="at-card" href="/countries/${slug}" style="--bg:${bg};--fg:${fg};--ff:'${ff}';--fw:${fw}"><small>Country guide</small><div><b class="${up ? 'up' : ''}">${name}</b><span>${hook}</span></div><i>${busy} &rarr;</i></a>`).join('\n')}
</nav>

<div class="at-main">
  <section class="at-sec">
    <h2>How country preferences really work</h2>
    <p>In Filters, you can choose countries you would prefer to be matched with, and countries you would rather avoid. The free plan allows two of each. When you search, TalkLive looks for someone who is available right now and whose settings are compatible with yours.</p>
    <div class="at-facts">
      <div><b>A preference, not a reservation</b>It depends on who is searching at that moment. If nobody suitable is, matching widens after a short wait rather than leaving you stuck.</div>
      <div><b>An estimate, not an identity check</b>The country shown for a match comes from their network connection. It is not proof of where they live or what they speak.</div>
      <div><b>Countries are multilingual</b>A preferred country is not a language filter. Ask which language is easiest for your match.</div>
      <div><b>Blocks always win</b>No preference ever overrides a block. Someone you have blocked is never matched with you again.</div>
    </div>
    <p>Global matching - no preference at all - gives the queue the most ways to find you someone, and is usually the quickest. It is the better choice whenever your real goal is simply to hear a new perspective. Our own match counts put TalkLive's busiest hours at 15:00 to 21:00 UTC; each country guide converts that into local time.</p>
  </section>

  <section class="at-sec">
    <h2>Talking across borders, well</h2>
    <p>Curiosity travels; stereotypes do not. Ask broad, open questions - what is a normal weekend like, what should I eat if I visit, what do outsiders usually get wrong about where you live - and let the other person decide how specific to be. Politics, religion and relationships can be wonderful conversations, but let your match lead into them. And the same privacy rules apply everywhere: talking about a country never requires sharing your city, neighbourhood, school, workplace or daily routine.</p>
    <p>For the wider picture, the Journal's regional features cover <a href="/regions/south-asia">South Asia</a>, <a href="/regions/middle-east">the Middle East</a>, <a href="/regions/southeast-asia">Southeast Asia</a>, <a href="/regions/africa">Africa</a>, <a href="/regions/europe">Europe</a> and <a href="/regions/americas">the Americas</a>, and <a href="/language-chat-guide">TalkLive in 17 languages</a> covers using the app in your own language.</p>
  </section>
</div>

${c.faq('Questions about countries')}
<section class="at-end">
  <h2>The world is one tap away</h2>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
