'use strict';
// The Americas: a dusk-gradient magazine spread. Libre Caslon display,
// Space Grotesk labels, a horizontal "same moment" clock strip across cities.
const CLOCK = [
  ['Los Angeles', '5:00', 'p.m.', 'Still at work'],
  ['Mexico City', '6:00', 'p.m.', 'Heading home'],
  ['Chicago', '7:00', 'p.m.', 'Dinner'],
  ['Bogotá', '7:00', 'p.m.', 'Dinner'],
  ['New York', '8:00', 'p.m.', 'Evening starts'],
  ['Toronto', '8:00', 'p.m.', 'Evening starts'],
  ['São Paulo', '9:00', 'p.m.', 'Prime time'],
  ['Buenos Aires', '9:00', 'p.m.', 'Dinner is an hour away'],
];

module.exports = {
  slug: 'americas',
  path: '/regions/americas',
  tag: 'Region',
  h1: 'One Evening, Two Continents',
  title: 'One Evening, Two Continents: How the Americas Share a Night | TalkLive Journal',
  description: 'New York and São Paulo are 7,700 km apart and an hour apart on the clock. How north and south America share an evening, why a Brazilian understands more Spanish than the reverse, and what "vos" tells you.',
  date: '2026-10-03',
  theme: '#1d2a4a',
  preload: ['libre-caslon-text-latin-400-normal', 'space-grotesk-latin-700-normal'],
  css: `
:root{--paper:#fffdf8;--ink:#1d2433;--rule:#e6dfd2;--mast:#1d2433;--sun:#f07b3f;--sea:#1d2a4a}
body{font-family:"Libre Caslon Text",Georgia,serif}
.am-hero{background:linear-gradient(180deg,#1d2a4a 0%,#5b3a6b 45%,#e0714a 82%,#f6b26b 100%);color:#fffdf8;padding:90px 20px 0;text-align:center}
.am-k{font:700 12px/1 "Space Grotesk",sans-serif;letter-spacing:.24em;text-transform:uppercase;opacity:.85}
.am-hero h1{font:400 clamp(44px,8vw,104px)/1 "Libre Caslon Text",serif;margin:22px auto 20px;max-width:12ch;letter-spacing:-.02em}
.am-hero h1 em{font-style:italic}
.am-hero p{font:400 italic 20px/1.5 "Libre Caslon Text",serif;max-width:620px;margin:0 auto;opacity:.92}
.am-strip{display:grid;grid-template-columns:repeat(8,1fr);max-width:1180px;margin:60px auto 0;border-top:1px solid rgba(255,255,255,.35)}
.am-strip div{padding:16px 8px 22px;border-right:1px solid rgba(255,255,255,.25);text-align:left}
.am-strip div:last-child{border-right:0}
.am-strip b{display:block;font:700 26px/1 "Space Grotesk",sans-serif}
.am-strip b small{font-size:12px;font-weight:400;margin-left:2px}
.am-strip span{display:block;font:700 11px/1.3 "Space Grotesk",sans-serif;letter-spacing:.08em;text-transform:uppercase;margin-top:8px}
.am-strip i{display:block;font:400 italic 13px/1.3 "Libre Caslon Text",serif;opacity:.85;margin-top:4px}
.am-hero .am-cap{max-width:1180px;margin:0 auto;font-style:normal;opacity:1;font:400 12px/1.5 "Space Grotesk",sans-serif;text-align:left;padding:10px 8px 18px;color:#2a1a10}
.am-body{max-width:1080px;margin:0 auto;padding:60px 20px 0;display:grid;grid-template-columns:1fr 1fr;gap:28px 56px;font-size:18px;line-height:1.7}
.am-body p{margin:0 0 1em}
.am-body h2{grid-column:1/-1;font:400 italic 34px/1.15 "Libre Caslon Text",serif;margin:30px 0 0;padding-top:24px;border-top:1px solid var(--rule);color:var(--sea)}
.am-body h2:first-child{margin-top:0;padding-top:0;border-top:0}
.am-lede::first-letter{font:400 3.6em/.8 "Libre Caslon Text",serif;float:left;margin:.06em .08em 0 0;color:var(--sun)}
.am-side{background:#f6efe3;padding:20px 22px;font-size:16px;line-height:1.6;align-self:start}
.am-side h3{font:700 12px/1 "Space Grotesk",sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--sun);margin:0 0 12px}
.am-side dl{margin:0}
.am-side dt{font:700 15px/1.3 "Space Grotesk",sans-serif;margin-top:12px;color:var(--sea)}
.am-side dd{margin:2px 0 0}
.am-quote{grid-column:1/-1;justify-self:center;font:400 italic clamp(26px,3.4vw,40px)/1.25 "Libre Caslon Text",serif;text-align:center;color:var(--sun);margin:10px auto;max-width:820px}
@media (max-width:900px){.am-strip{grid-template-columns:repeat(4,1fr)}.am-strip div:nth-child(4){border-right:0}.am-body{grid-template-columns:1fr}}
@media (max-width:480px){.am-strip{grid-template-columns:repeat(2,1fr)}.am-strip div:nth-child(2n){border-right:0}}
`,
  body: (ctx) => `<main id="story">
<header class="am-hero">
  <div class="am-k">The Americas &middot; A feature</div>
  <h1>One evening, <em>two continents</em></h1>
  <p>The Americas are stacked north to south, not spread east to west. That simple fact means Toronto and Buenos Aires, almost nine thousand kilometres apart, wind down for the night at nearly the same time.</p>
  <div class="am-strip" role="img" aria-label="Local times across eight cities at the same moment in July">
  ${CLOCK.map(([city, t, ap, note]) => `<div><b>${t}<small>${ap}</small></b><span>${city}</span><i>${note}</i></div>`).join('')}
  </div>
  <p class="am-cap">The same moment in July, when most of North America is on summer time and South America is not.</p>
</header>

<div class="am-body">
<h2>Why the clocks line up</h2>
<p class="am-lede">New York and São Paulo are about 7,700 kilometres apart, a longer flight than New York to London. Yet in the northern summer they are only one hour apart on the clock, and two hours apart in the northern winter. London is five hours from New York all year round, give or take a few weeks when the clock changes fall out of step.</p>
<p>The reason is that the continents run down the same band of longitude. Most of South America lies east of most of North America, but not by much, so the whole hemisphere shares something close to one long evening. When the US east coast is having dinner, Brazil and Argentina are settling in for the night, and the west coast of North America is still at work.</p>
<p>The clocks themselves keep shifting. Brazil abolished daylight saving time in 2019. Most of Mexico stopped changing its clocks in 2022, keeping only a few border areas in step with the United States. The US and Canada still change twice a year, which is why the gap between New York and São Paulo swings between one and two hours.</p>
<aside class="am-side"><h3>Four languages, one hemisphere</h3><dl>
<dt>English</dt><dd>The US and most of Canada. Learners worldwide seek it out.</dd>
<dt>Spanish</dt><dd>From Mexico to Argentina, and spoken at home by more than 40 million people in the United States.</dd>
<dt>Portuguese</dt><dd>Brazil alone has more Portuguese speakers than every other country combined.</dd>
<dt>French</dt><dd>Quebec, at the heart of Canada's official bilingualism since 1969.</dd>
</dl></aside>

<h2>The one-way bridge between Spanish and Portuguese</h2>
<p>Spanish and Portuguese share a great deal of vocabulary and grammar, and speakers of each can often follow the other. But the understanding is lopsided. Brazilians generally understand spoken Spanish more easily than Spanish speakers understand spoken Portuguese. Part of the reason is sound: Portuguese has nasal vowels and reduced, swallowed syllables that make it harder to parse for a listener expecting Spanish's clear, even vowels.</p>
<p>Written down, the two are closer than they sound. Spoken aloud, at speed, in a late-night conversation between strangers, the gap shows. Many conversations across that border settle into a mix that people jokingly call "portuñol", and it works better than it has any right to.</p>
<p class="am-quote">Spanish is not one accent. Argentina says "vos", and Mexico can hear it in a single sentence.</p>
<h2>What a single word tells you</h2>
<p>Argentina and Uruguay use "vos" instead of "tú" for "you", with its own verb forms: "vos sabés" rather than "tú sabes". Combined with a distinctive "sh" sound for the letters "ll" and "y", it makes Rioplatense Spanish recognisable in a sentence or two. Colombia's capital, Bogotá, has a reputation among learners for a clear, measured accent. Mexican Spanish is the variety many courses teach.</p>
<p>None of these is more correct than the others. But they are different enough that a learner who has only ever heard one can be thrown by another, which is exactly why conversation with real people from different places is so useful. Textbooks have one accent; a continent has dozens.</p>
<p>On TalkLive you can set country preferences to favour a particular place. They are preferences, not guarantees: country is estimated from a network connection and not verified, and matching broadens after a few seconds if nobody from your chosen countries is waiting.</p>
<p>Calling the United States? Our <a href="/countries/united-states">United States guide</a> explains when Americans are online across six time zones.</p>
<p>So here is a small question to take with you: when you learned your first words of another language, whose accent were they in, and have you ever heard them said any other way?</p>
</div>
${ctx.ad()}
${ctx.more}
</main>`,
};
