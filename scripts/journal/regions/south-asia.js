'use strict';
// South Asia: a night-clock feature. Fraunces + Literata on warm paper, a
// vertical 9pm-3am timeline down the left, terracotta and indigo.
module.exports = {
  slug: 'south-asia',
  path: '/regions/south-asia',
  tag: 'Region',
  h1: 'Why South Asia Talks After Midnight',
  title: 'Why South Asia Talks After Midnight: India, Pakistan and Bangladesh | TalkLive Journal',
  description: 'One time zone stretched across India, three scripts that are slow to type, and a shared spoken language split by a border. Why conversation in South Asia happens late, and out loud.',
  date: '2026-10-03',
  theme: '#f3ebdd',
  preload: ['fraunces-latin-700-normal', 'literata-latin-400-normal'],
  css: `
:root{--paper:#f3ebdd;--ink:#2a1f1a;--rule:#d9c9b0;--terra:#b5532a;--indigo:#2d2f6b}
body{font-family:"Literata",Georgia,serif}
.sa-hero{max-width:1120px;margin:0 auto;padding:70px 20px 30px;display:grid;grid-template-columns:1fr 280px;gap:40px;align-items:end}
.sa-hero h1{font:700 clamp(44px,7.4vw,96px)/.92 "Fraunces",serif;letter-spacing:-.03em;margin:0;color:var(--indigo)}
.sa-hero h1 span{color:var(--terra);font-style:italic;font-weight:400}
.sa-clock{border:2px solid var(--indigo);border-radius:50%;aspect-ratio:1;display:grid;place-items:center;text-align:center;font:400 13px/1.4 "Literata",serif;color:var(--indigo);padding:30px}
.sa-clock b{display:block;font:700 54px/1 "Fraunces",serif;color:var(--terra)}
.sa-dek{max-width:1120px;margin:0 auto;padding:0 20px 40px;font:400 italic 22px/1.5 "Literata",serif;border-bottom:1px solid var(--rule)}
.sa-dek p{max-width:720px;margin:0}
.sa-grid{max-width:1120px;margin:0 auto;padding:40px 20px 0;display:grid;grid-template-columns:150px minmax(0,680px);gap:40px}
.sa-time{position:relative;font:700 22px/1 "Fraunces",serif;color:var(--terra);text-align:right;padding-top:6px}
.sa-time::after{content:"";position:absolute;right:-21px;top:10px;width:10px;height:10px;border-radius:50%;background:var(--terra)}
.sa-time small{display:block;font:400 12px/1.4 "Literata",serif;color:#7a6a5a;margin-top:6px}
.sa-block{border-left:2px solid var(--rule);padding:0 0 40px 30px;margin-left:-41px;font-size:19px;line-height:1.72}
.sa-block h2{font:700 30px/1.15 "Fraunces",serif;color:var(--indigo);margin:0 0 14px}
.sa-block p{margin:0 0 1em}
.sa-voices{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin:18px 0}
.sa-voices div{background:#fbf6ec;border-top:3px solid var(--indigo);padding:12px 14px;font-size:16px;line-height:1.5}
.sa-voices b{font-family:"Fraunces",serif;display:block;font-size:18px;color:var(--indigo)}
.sa-box{background:var(--indigo);color:#f3ebdd;padding:22px 24px;font-size:17px;line-height:1.6;margin:10px 0 0}
.sa-box h3{font:700 20px/1.2 "Fraunces",serif;margin:0 0 8px;color:#f0b48f}
.sa-box p{margin:0 0 .7em}
@media (max-width:820px){.sa-hero{grid-template-columns:1fr}.sa-clock{width:200px}.sa-grid{grid-template-columns:1fr;gap:0}.sa-time{text-align:left;padding:0 0 10px}.sa-time::after{display:none}.sa-block{margin-left:0;padding-left:18px}.sa-voices{grid-template-columns:1fr}}
`,
  body: (ctx) => `<main id="story">
<header class="sa-hero">
  <h1>Why South Asia talks <span>after midnight</span></h1>
  <div class="sa-clock" aria-hidden="true"><div><b>1:00</b>a.m. in Lahore, and the evening is only halfway done</div></div>
</header>
<div class="sa-dek"><p>India, Pakistan and Bangladesh are home to roughly a quarter of humanity. Many of them do their talking late, and out loud rather than in text. There are reasons for both, and they are more interesting than "people stay up late".</p></div>

<div class="sa-grid">
<div class="sa-time">9 p.m.<small>Dinner ends. Phones come out.</small></div>
<section class="sa-block">
<h2>A clock that does not fit the country</h2>
<p>India runs on a single time zone, UTC+5:30, across a country roughly three thousand kilometres wide. The result is that the sun rises in the far northeast around two hours before it rises in the far west, but everyone's clocks say the same thing. In parts of the northeast it can be light before five in the morning and dark before five in the afternoon. People there have argued for decades for a second time zone; tea estates in Assam long kept their own informal "garden time", an hour ahead of the rest of the country.</p>
<p>Pakistan sits half an hour behind India, at UTC+5. Bangladesh sits half an hour ahead, at UTC+6. So in practice the three countries share one long evening, and it starts after the day's real business is done: after work, after the commute, after a dinner that is often eaten later than in Europe or North America.</p>
</section>

<div class="sa-time">11 p.m.<small>The house is quiet. The phone isn't.</small></div>
<section class="sa-block">
<h2>Why voice beats typing</h2>
<p>Hindi is written in Devanagari, Urdu in a flowing Perso-Arabic script called Nastaliq, Bengali in its own alphabet. All three are perfectly usable on a phone keyboard, and all three are slower to type than to say. That is why so many people in the region write their own languages in the Latin alphabet instead: "kya haal hai", "kemon acho". It works, but there is no standard spelling, and a long message in Roman Urdu can take longer to decode than to read.</p>
<p>Voice cuts through all of that. You speak the way you speak at home, switching between Hindi and English mid-sentence, or Punjabi and Urdu, and nobody needs a keyboard setting for it. It is no accident that voice notes became a habit across the region long before they were fashionable elsewhere.</p>
<div class="sa-voices">
<div><b>Lahore</b>Punjabi and Urdu switch mid-sentence and nobody comments on it.</div>
<div><b>Delhi</b>Hindi, Punjabi and English in one conversation is simply normal.</div>
<div><b>Chennai</b>Tamil first, with English borrowed freely for anything technical.</div>
<div><b>Dhaka</b>One of the densest cities on Earth, and talkative to match.</div>
</div>
</section>

<div class="sa-time">1 a.m.<small>Pakistan is still going.</small></div>
<section class="sa-block">
<h2>One spoken language, two written ones</h2>
<p>Here is a fact that surprises people outside the region. In everyday speech, Hindi and Urdu are largely the same language. Linguists sometimes call the shared spoken base Hindustani. Grammar is nearly identical; most common words are shared. The differences grow in formal registers, where Hindi borrows from Sanskrit and Urdu from Persian and Arabic, and they are total in writing, where the scripts have nothing in common.</p>
<p>So a man in Karachi and a woman in Lucknow, who could not read each other's newspapers, can talk for an hour without either switching to English. The same is true across the other border: Bengali is the language of both Bangladesh and the Indian state of West Bengal, and a Dhaka accent and a Kolkata accent are recognisably different but easily mutual.</p>
<p>Borders, in other words, cut through languages here rather than around them. A conversation between strangers can cross a line on a map that their governments find very hard to cross.</p>
</section>

<div class="sa-time">3 a.m.<small>The last of the night owls.</small></div>
<section class="sa-block">
<h2>What people actually talk about</h2>
<p>Cricket, inevitably, in all three countries. Exams and admissions, because the region has some of the most competitive entrance tests in the world. Work abroad, because millions of families have someone in the Gulf, Britain or North America, and the question of whether to follow is everywhere. Films, from Bollywood to Tamil, Telugu and Pakistani dramas. And, in a lot of late-night conversations, practising English with someone who is not a teacher and will not grade you.</p>
<p>If you are joining these conversations from somewhere else, the late hour is worth knowing. A South Asian midnight is early evening in London and early afternoon in New York, which means the people you meet may be winding down a long day while you are just getting into yours. A little patience with tiredness goes a long way.</p>
<div class="sa-box"><h3>How country matching works on TalkLive</h3><p>You can set country preferences, but they are preferences, not guarantees. Country is estimated from a person's network connection and is not verified. If nobody from your chosen countries is waiting, matching broadens after a few seconds rather than leaving you waiting.</p></div>
<p style="margin-top:1.4em">Which leaves a question worth sitting with: if two people can understand each other perfectly but cannot read each other's writing, are they speaking one language or two?</p>
</section>
</div>
${ctx.ad()}
${ctx.more}
</main>`,
};
