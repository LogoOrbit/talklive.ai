'use strict';
/*
 * /languages/ - one long research feature that replaces the 17 templated
 * per-language pages. Each language keeps an anchor (#english, #urdu ...) so
 * the old /languages/<slug> URLs can 301 to the right section.
 *
 * Fraunces display, Source Serif 4 text, JetBrains Mono for data labels.
 */
const { SUPPORTED_LANGUAGES } = require('../data/languages');
const { LANGUAGES: CONTENT } = require('../data/geo');

// Facts that are stable and checkable. FSI weeks are the US Foreign Service
// Institute's published estimates for an English speaker to reach
// professional working proficiency; English itself is the baseline.
const FACTS = {
  english: { script: 'Latin', order: 'SVO', fsi: null, note: 'Spoken by more people as a second language than as a first: non-native speakers outnumber native ones by roughly three to one.' },
  spanish: { script: 'Latin', order: 'SVO', fsi: 24, note: 'Spoken natively in about twenty countries, with accents that differ as much as Scottish and Texan English.' },
  portuguese: { script: 'Latin', order: 'SVO', fsi: 24, note: 'Roughly four in five speakers live in Brazil, which is why the Brazilian accent is the one most learners actually meet.' },
  french: { script: 'Latin', order: 'SVO', fsi: 30, note: 'More French speakers now live in Africa than in Europe, a shift that keeps growing.' },
  german: { script: 'Latin', order: 'V2 / SOV', fsi: 36, note: 'Puts the verb second in main clauses and sends it to the very end in subordinate ones, so listeners often wait for the meaning.' },
  russian: { script: 'Cyrillic', order: 'SVO, flexible', fsi: 44, note: 'Its six grammatical cases let word order move around for emphasis without changing who did what to whom.' },
  turkish: { script: 'Latin (since 1928)', order: 'SOV', fsi: 44, note: 'Switched from Arabic to Latin script in 1928 in a single sweeping reform. Builds long words by stacking suffixes onto a root.' },
  arabic: { script: 'Arabic', order: 'VSO / SVO', fsi: 88, note: 'Lives in two registers: Modern Standard Arabic for news and writing, and local dialects for everything else. Learners often need both.' },
  persian: { script: 'Perso-Arabic', order: 'SOV', fsi: 44, note: 'Known as Farsi in Iran, Dari in Afghanistan and Tajik in Tajikistan, where it is written in Cyrillic.' },
  hindi: { script: 'Devanagari', order: 'SOV', fsi: 44, note: 'In everyday speech it is largely mutually intelligible with Urdu. The two diverge most in formal vocabulary and in writing.' },
  bengali: { script: 'Bengali', order: 'SOV', fsi: 44, note: 'A 1952 movement to defend it is the reason UNESCO marks 21 February as International Mother Language Day.' },
  urdu: { script: 'Perso-Arabic (Nastaliq)', order: 'SOV', fsi: 44, note: 'Pakistan’s national language and a native language for only a minority there; it is the shared second language of a country of many.' },
  indonesian: { script: 'Latin', order: 'SVO', fsi: 36, note: 'Chosen as a unifying national language in 1928. For most of its speakers it is a second language alongside a regional one.' },
  italian: { script: 'Latin', order: 'SVO', fsi: 24, note: 'Standard Italian is younger as a common spoken language than most people assume; many Italians grew up speaking a regional language at home.' },
  japanese: { script: 'Kanji + hiragana + katakana', order: 'SOV', fsi: 88, note: 'Writes with three systems at once and changes its verbs depending on who you are talking to.' },
  korean: { script: 'Hangul', order: 'SOV', fsi: 88, note: 'Its alphabet was designed on purpose, under King Sejong in the 15th century, so that ordinary people could learn to read quickly.' },
  chinese: { script: 'Chinese characters', order: 'SVO', fsi: 88, note: 'Mandarin uses four tones plus a neutral one, so the same syllable can carry several unrelated meanings.' },
};

function langs() {
  return SUPPORTED_LANGUAGES.map((s) => {
    const c = CONTENT.find(x => x.slug === s.slug);
    const f = FACTS[s.slug];
    if (!c || !f) throw new Error(`languages feature: missing data for ${s.slug}`);
    return { ...s, ...c, ...f };
  });
}

const meta = {
  slug: 'languages',
  path: '/languages/',
  crumb: 'Languages',
  tag: 'Feature',
  h1: 'Seventeen Ways to Say Hello',
  title: 'Seventeen Ways to Say Hello: What It Takes to Speak 17 Languages | TalkLive Journal',
  description: 'A research feature on the 17 languages people use on TalkLive: scripts, word order, how many hours each takes an English speaker to learn, and the stubborn gap between understanding a language and speaking it.',
  date: '2026-10-02',
  theme: '#0f1416',
  preload: ['fraunces-latin-700-normal', 'source-serif-4-latin-400-normal'],
};

const css = `
:root{--paper:#f5f1ea;--ink:#16191b;--rule:#d6cfc3;--mast:#16191b;--night:#0f1416;--acc:#c8553d;--teal:#2a6f6b}
html{scroll-behavior:smooth}
body{font-family:"Source Serif 4",Georgia,serif}
.v-hero{background:var(--night);color:#efe9df;padding:80px 20px 70px;overflow:hidden}
.v-hero-in{max-width:1180px;margin:0 auto}
.v-eye{font:400 12px/1 "JetBrains Mono",monospace;letter-spacing:.18em;text-transform:uppercase;color:#e9a48f}
.v-hero h1{font:700 clamp(46px,9vw,120px)/.92 "Fraunces",Georgia,serif;letter-spacing:-.035em;margin:20px 0 26px;max-width:11ch}
.v-hero h1 em{font-weight:400;font-style:italic;color:#e9a48f}
.v-dek{font:400 clamp(19px,2.2vw,24px)/1.5 "Source Serif 4",serif;max-width:660px;color:#cfc8bc;margin:0}
.v-wall{display:flex;flex-wrap:wrap;gap:10px 26px;margin-top:56px;font:400 clamp(22px,3.2vw,40px)/1.15 "Fraunces",serif;color:#efe9df}
.v-wall a{text-decoration:none;opacity:.88;transition:opacity .2s,color .2s}
.v-wall a:hover{opacity:1;color:#e9a48f}
.v-wall span{font-family:system-ui,sans-serif}
.v-by{margin-top:40px;font:400 12px/1.6 "JetBrains Mono",monospace;color:#9c968c;letter-spacing:.06em}
.v-wrap{max-width:1180px;margin:0 auto;padding:0 20px}
.v-stats{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--ink)}
.v-stats div{padding:26px 18px 22px;border-right:1px solid var(--rule)}
.v-stats div:last-child{border-right:0}
.v-stats b{display:block;font:700 clamp(36px,5vw,58px)/1 "Fraunces",serif;color:var(--acc)}
.v-stats span{font:400 12px/1.4 "JetBrains Mono",monospace;text-transform:uppercase;letter-spacing:.08em}
.v-prose{max-width:700px;margin:0 auto;font-size:20px;line-height:1.7;padding-top:56px}
.v-prose p{margin:0 0 1.1em}
.v-prose>p:first-child::first-letter{font:700 4.4em/.8 "Fraunces",serif;float:left;margin:.08em .1em 0 0;color:var(--acc)}
.v-h2{font:700 clamp(30px,4vw,46px)/1.05 "Fraunces",serif;letter-spacing:-.02em;margin:80px 0 18px}
.v-h2 small{display:block;font:400 12px/1 "JetBrains Mono",monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--teal);margin-bottom:14px}
.v-chart{margin:28px 0 10px;border-top:2px solid var(--ink)}
.v-row{display:grid;grid-template-columns:150px 1fr 58px;gap:14px;align-items:center;padding:7px 0;border-bottom:1px solid var(--rule);font-size:16px}
.v-bar{height:14px;background:var(--teal);border-radius:0 2px 2px 0}
.v-bar.v-iv{background:var(--acc)}
.v-row code{font:400 13px "JetBrains Mono",monospace;text-align:right}
.v-cap{font:400 12.5px/1.6 "JetBrains Mono",monospace;color:#5d5a54;margin:8px 0 0}
.v-table{width:100%;border-collapse:collapse;margin-top:24px;font-size:16px}
.v-table th{font:400 11px/1.3 "JetBrains Mono",monospace;letter-spacing:.1em;text-transform:uppercase;text-align:left;border-bottom:2px solid var(--ink);padding:8px 10px 8px 0}
.v-table td{padding:10px 10px 10px 0;border-bottom:1px solid var(--rule);vertical-align:top}
.v-table td:first-child{font:700 17px/1.2 "Fraunces",serif}
.v-scroll{overflow-x:auto}
.v-cards{columns:3 300px;column-gap:28px;margin-top:30px}
.v-card{break-inside:avoid;border-top:3px solid var(--ink);padding:16px 0 26px;margin:0}
.v-card:target{border-top-color:var(--acc)}
.v-card .v-native{font:400 34px/1.1 "Fraunces",serif;margin:0}
.v-card .v-native span{font-family:system-ui,sans-serif}
.v-card h3{font:400 12px/1 "JetBrains Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--teal);margin:10px 0 12px}
.v-card p{font-size:16.5px;line-height:1.6;margin:0 0 .7em}
.v-card .v-hard{border-left:2px solid var(--acc);padding-left:12px;font-style:italic}
.v-card .v-data{font:400 12px/1.6 "JetBrains Mono",monospace;color:#5d5a54}
.v-quote{font:400 italic clamp(26px,3.6vw,42px)/1.22 "Fraunces",serif;max-width:900px;margin:70px auto;text-align:center;color:var(--teal)}
.v-src{max-width:700px;margin:40px auto 0;font-size:14px;line-height:1.6;color:#5d5a54;border-top:1px solid var(--rule);padding-top:14px}
@media (max-width:760px){.v-stats{grid-template-columns:repeat(2,1fr)}.v-stats div:nth-child(2){border-right:0}.v-row{grid-template-columns:100px 1fr 50px;font-size:14px}}
`;

function body(ctx) {
  const L = langs();
  const rtl = L.filter(l => l.dir === 'rtl').map(l => l.english);
  const ranked = L.filter(l => l.fsi).sort((a, b) => a.fsi - b.fsi || a.english.localeCompare(b.english));
  // Only text outside the Latin range gets the system font (the display
  // fonts are Latin-only); transliterated greetings stay in Fraunces.
  const nonLatin = (t) => /[^\u0000-\u024f]/.test(t);
  const greet = (l) => nonLatin(l.hello) ? `<span lang="${l.code}"${l.dir === 'rtl' ? ' dir="rtl"' : ''}>${ctx.esc(l.hello)}</span>` : ctx.esc(l.hello);
  return `<main id="story">
<header class="v-hero"><div class="v-hero-in">
  <div class="v-eye">TalkLive Journal &middot; Feature &middot; Languages</div>
  <h1>Seventeen ways to say <em>hello</em></h1>
  <p class="v-dek">Every language on this page is spoken by someone on TalkLive. Some take an English speaker six months to learn, some take nearly two years, and all of them share the same strange problem: understanding comes long before speaking.</p>
  <nav class="v-wall" aria-label="Jump to a language">${L.map(l => `<a href="#${l.slug}" title="${ctx.esc(l.english)}">${greet(l)}</a>`).join('')}</nav>
  <div class="v-by">By the TalkLive Journal &middot; Sources listed at the end</div>
</div></header>

<div class="v-wrap">
<section class="v-stats" aria-label="At a glance">
  <div><b>${L.length}</b><span>Languages in the app</span></div>
  <div><b>8</b><span>Writing systems</span></div>
  <div><b>${rtl.length}</b><span>Written right to left</span></div>
  <div><b>24&ndash;88</b><span>Weeks of study, per FSI</span></div>
</section>

<div class="v-prose">
<p>Choose any two people on Earth and there is a good chance they cannot talk to each other. That is still true in a world of translation apps, and it is the oldest friction in human contact. This feature is about the seventeen languages the TalkLive interface is translated into, what makes each of them distinct, and what the research says about learning to actually speak one.</p>
<p>They are an unusual set. Counting second-language speakers, a majority of the world's population speaks at least one of them. They are written in eight different systems, from the Latin alphabet you are reading now to Korean Hangul, an alphabet designed deliberately in the 15th century, to Japanese, which uses three scripts at once. ${ctx.list(rtl)} run right to left. Some put the verb in the middle of a sentence, some at the end, some at the beginning.</p>
<p>And they have one thing in common. For nearly every learner, in every one of them, the ability to understand races ahead of the ability to speak. People call it the speaking gap, and it is the reason this page exists.</p>
</div>

<h2 class="v-h2"><small>Chart 1</small>How long does it take?</h2>
<div class="v-prose" style="padding-top:0"><p>The US Foreign Service Institute, which trains American diplomats, publishes rough estimates of how long its students need to reach professional working proficiency in a language. Its students study full time, in small classes, with experienced teachers, so these are best-case numbers. But the ranking is revealing: distance from English, not difficulty in some absolute sense, is what drives the hours.</p></div>
<div class="v-chart" role="img" aria-label="Bar chart of FSI study weeks by language">
${ranked.map(l => `<div class="v-row"><span>${ctx.esc(l.english)}</span><div class="v-bar${l.fsi >= 88 ? ' v-iv' : ''}" style="width:${Math.round(l.fsi / 88 * 100)}%"></div><code>${l.fsi} wk</code></div>`).join('\n')}
</div>
<p class="v-cap">Full-time class weeks for a native English speaker to reach professional working proficiency. Source: US Foreign Service Institute. Red: the FSI's hardest category. The FSI flags Japanese as harder still within it.</p>

${ctx.ad()}

<h2 class="v-h2"><small>Table 1</small>The shape of each language</h2>
<div class="v-scroll"><table class="v-table">
<thead><tr><th>Language</th><th>Native name</th><th>Script</th><th>Basic order</th><th>Speakers (approx.)</th></tr></thead>
<tbody>${L.map(l => `<tr><td><a href="#${l.slug}">${ctx.esc(l.english)}</a></td><td>${nonLatin(l.native) ? `<span lang="${l.code}"${l.dir === 'rtl' ? ' dir="rtl"' : ''}>${ctx.esc(l.native)}</span>` : ctx.esc(l.native)}</td><td>${ctx.esc(l.script)}</td><td>${ctx.esc(l.order)}</td><td>${ctx.esc(l.speakers)}</td></tr>`).join('')}</tbody>
</table></div>
<p class="v-cap">S = subject, V = verb, O = object. "I eat rice" is SVO; Japanese, Korean, Turkish, Hindi and others say the equivalent of "I rice eat". Speaker counts are rounded estimates and vary widely between sources.</p>

<p class="v-quote">Every learner hears more than they can say. The difference between learners is how long they let that gap stay open.</p>

<h2 class="v-h2"><small>Seventeen dispatches</small>What each one is like to learn</h2>
<div class="v-prose" style="padding-top:0"><p>Below, each language gets a short portrait: why people want to speak it, what tends to trip learners up, and one piece of practical advice that comes up again and again.</p></div>
<div class="v-cards">
${L.map(l => `<article class="v-card" id="${l.slug}">
  <p class="v-native">${nonLatin(l.native) ? `<span lang="${l.code}"${l.dir === 'rtl' ? ' dir="rtl"' : ''}>${ctx.esc(l.native)}</span>` : ctx.esc(l.native)}</p>
  <h3>${ctx.esc(l.english)} &middot; ${ctx.esc(l.script)}</h3>
  <p>${ctx.esc(l.note)}</p>
  <p>${ctx.esc(l.why)}</p>
  <p class="v-hard">${ctx.esc(l.hard)}</p>
  <p><strong>Advice that keeps coming up:</strong> ${ctx.esc(l.tip)}</p>
  <p class="v-data">Hello: ${greet(l)} &middot; ${ctx.esc(l.speakers)}${l.fsi ? ` &middot; FSI ${l.fsi} weeks` : ' &middot; FSI baseline'}</p>
</article>`).join('\n')}
</div>

<h2 class="v-h2"><small>Analysis</small>What the numbers leave out</h2>
<div class="v-prose" style="padding-top:0">
<p>Charts of difficulty make language learning look like a distance to be covered. In practice, the biggest variable is not the language. It is how often the learner actually speaks it.</p>
<p>Researchers in second-language acquisition have argued for decades about the balance between input, which is listening and reading, and output, which is speaking and writing. One influential idea, from the Canadian linguist Merrill Swain, is that speaking forces learners to notice the gaps they can skate over while listening. Another body of work focuses on "willingness to communicate": two learners with the same knowledge can differ enormously in how often they open their mouths, and the more willing one improves faster.</p>
<p>That leaves an awkward conclusion. The hardest language on this page is not Japanese, or Arabic, or Mandarin. It is whichever one you understand well and still have not said a full sentence in. Which one is that for you?</p>
</div>

<p class="v-src">Sources: US Department of State, Foreign Service Institute language difficulty rankings; speaker estimates rounded from commonly cited figures such as Ethnologue; Swain (1985) on comprehensible output; MacIntyre et al. (1998) on willingness to communicate. Historical notes: the Turkish alphabet reform (1928), the Indonesian Youth Pledge (1928), the promulgation of Hangul (1446), and UNESCO's International Mother Language Day (proclaimed 1999).</p>
</div>
${ctx.more}
</main>`;
}

module.exports = { meta, css, body };
