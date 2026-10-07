'use strict';
// Middle East & North Africa: a week-planner feature. Night blue and lamp
// gold, Cormorant Garamond display over DM Sans, and a seven-day strip
// per country showing where the weekend falls.
const D = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Index into D of each country's days off. "half" marks a shortened day.
const WEEKS = [
  { name: 'Saudi Arabia', off: [4, 5], note: 'Fri-Sat since 2013' },
  { name: 'Egypt', off: [4, 5] },
  { name: 'Jordan', off: [4, 5] },
  { name: 'Kuwait', off: [4, 5] },
  { name: 'Qatar', off: [4, 5] },
  { name: 'United Arab Emirates', off: [5, 6], half: [4], note: 'Sat-Sun since 2022' },
  { name: 'Morocco', off: [5, 6] },
  { name: 'Tunisia', off: [5, 6] },
  { name: 'Lebanon', off: [5, 6] },
  { name: 'Turkey', off: [5, 6] },
  { name: 'Iran', off: [4], half: [3], note: 'Saturday is a working day' },
];

module.exports = {
  slug: 'middle-east',
  path: '/regions/middle-east',
  tag: 'Region',
  h1: 'Where the Weekend Moved: Talking Across the Middle East',
  title: 'Talking Across the Middle East and North Africa: Weekends, Arabic and Ramadan Nights | TalkLive Journal',
  description: 'Saudi Arabia moved its weekend in 2013, the UAE in 2022. Arabic is one written language and many spoken ones. Why the Middle East and North Africa talk on a different week, and late into the night.',
  date: '2026-10-05',
  theme: '#101a33',
  preload: ['cormorant-garamond-latin-700-normal', 'dm-sans-latin-400-normal'],
  css: `
:root{--paper:#f6f1e7;--ink:#1b2236;--rule:#ddd2bd;--night:#101a33;--gold:#c99a2e;--sand:#efe5d0;--mast:#1b2236}
body{font-family:"DM Sans",system-ui,sans-serif}
.me-hero{background:var(--night);color:#f3ead6;padding:58px 20px 46px;position:relative;overflow:hidden}
.me-hero::after{content:"";position:absolute;right:-60px;top:-60px;width:260px;height:260px;border-radius:50%;box-shadow:inset -38px 18px 0 0 var(--gold);opacity:.9}
.me-in{max-width:1000px;margin:0 auto;position:relative;z-index:1}
.me-k{font:500 12px/1 "DM Sans",sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--gold)}
.me-hero h1{font:700 clamp(40px,6.6vw,78px)/.98 "Cormorant Garamond",serif;margin:16px 0 18px;max-width:15ch}
.me-hero h1 em{font-style:italic;font-weight:500;color:var(--gold)}
.me-hero p{font:400 19px/1.55 "DM Sans",sans-serif;max-width:640px;color:#cfc6b2;margin:0}
.me-body{max-width:700px;margin:0 auto;padding:30px 20px 0;font:400 18px/1.7 "DM Sans",sans-serif}
.me-body h2{font:700 34px/1.1 "Cormorant Garamond",serif;color:var(--night);margin:1.6em 0 .45em}
.me-body p{margin:0 0 1.05em}
.me-week{max-width:860px;margin:30px auto;padding:0 20px;font-family:"DM Sans",sans-serif}
.me-week h3{font:700 24px/1.2 "Cormorant Garamond",serif;margin:0 0 4px;color:var(--night)}
.me-week .me-sub{font-size:14px;color:#5d6273;margin:0 0 14px}
.me-row{display:grid;grid-template-columns:170px repeat(7,1fr);gap:4px;align-items:center;margin-bottom:4px;font-size:13px}
.me-row b{font-weight:500;font-size:14px}
.me-row b small{display:block;font-weight:400;font-size:11px;color:#7a7f8e}
.me-row span{text-align:center;padding:7px 0;border-radius:4px;background:var(--sand);color:#7a7f8e}
.me-row span.off{background:var(--night);color:var(--gold);font-weight:500}
.me-row span.half{background:linear-gradient(90deg,var(--night) 50%,var(--sand) 50%);color:#fff}
.me-row.me-head span{background:none;color:var(--ink);font-weight:500}
.me-dia{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0}
.me-dia div{border-top:3px solid var(--gold);padding-top:10px;font-size:15px;line-height:1.5}
.me-dia b{display:block;font:700 22px/1.2 "Cormorant Garamond",serif;color:var(--night)}
.me-num{font:700 30px/1 "DM Sans",monospace;color:var(--gold)}
.me-box{background:var(--night);color:#e9e1cc;padding:22px 24px;font-size:16px;line-height:1.6;margin:26px 0}
.me-box h3{font:700 22px/1.2 "Cormorant Garamond",serif;margin:0 0 8px;color:var(--gold)}
.me-box p{margin:0 0 .7em}
.me-box a{color:var(--gold)}
@media (max-width:700px){.me-row{grid-template-columns:96px repeat(7,1fr);font-size:11px}.me-row b{font-size:12px}.me-row b small{display:none}.me-dia{grid-template-columns:1fr}.me-hero::after{width:160px;height:160px;right:-50px;top:-50px}}
`,
  body: (ctx) => `<main id="story">
<header class="me-hero"><div class="me-in">
  <div class="me-k">Middle East &amp; North Africa &middot; A feature</div>
  <h1>Where the <em>weekend</em> moved</h1>
  <p>From Casablanca to Tehran, the region shares a language family, a calendar of holidays and a love of late evenings. What it does not share is a weekend.</p>
</div></header>
${ctx.cta({ title: 'Talk to someone in the Middle East tonight', sub: 'Arabic, Persian, Turkish, English, or a mix of all of them. One tap connects you with a real person, usually within seconds.' })}

<div class="me-body">
<h2>A week that starts on different days</h2>
<p>In 2013 Saudi Arabia moved its weekend from Thursday and Friday to Friday and Saturday. The argument was economic: with Thursday off, Saudi businesses had only three working days in common with the rest of the world. Several Gulf neighbours made the same change around the same time.</p>
<p>In January 2022 the United Arab Emirates went further and adopted a Saturday-Sunday weekend, with Friday a shortened working day for the public sector so people can attend Friday prayers. Morocco, Tunisia, Lebanon and Turkey already rested on Saturday and Sunday. Iran rests on Friday, and for many people Thursday is a half day or a day off too, which makes Saturday the start of the Iranian working week.</p>
</div>

<section class="me-week" aria-label="Days off by country">
<h3>Whose day off is it?</h3>
<p class="me-sub">Days off for most office workers. Dark means a day off; half-dark means a shortened day for many.</p>
<div class="me-row me-head" aria-hidden="true"><b></b>${D.map(d => `<span>${d}</span>`).join('')}</div>
${WEEKS.map(w => `<div class="me-row"><b>${ctx.esc(w.name)}${w.note ? `<small>${ctx.esc(w.note)}</small>` : ''}</b>${D.map((d, i) => {
    const cls = w.off.includes(i) ? 'off' : (w.half || []).includes(i) ? 'half' : '';
    return `<span${cls ? ` class="${cls}"` : ''} aria-label="${d}${cls === 'off' ? ' off' : cls === 'half' ? ' short day' : ''}">${d[0]}</span>`;
  }).join('')}</div>`).join('\n')}
</section>

<div class="me-body">
<p>The practical result is that the big night out falls on different evenings. Across much of the Gulf and in Egypt, Thursday night is the start of the weekend and the busiest night of the week. In Dubai, Istanbul or Casablanca it is Friday night. Monday to Wednesday are the only days when almost the whole region is at work at once, and almost nowhere outside Iran is Saturday a working day.</p>

<h2>One written language, many spoken ones</h2>
<p>Arabic is the clearest example in the world of what linguists call diglossia: two forms of a language used side by side for different purposes. Modern Standard Arabic is the language of newspapers, news broadcasts and formal speeches, and it is broadly the same from Morocco to Oman. Nobody speaks it at home. At home people speak their own dialect, and the dialects can be very far apart.</p>
<div class="me-dia">
<div><b>Egyptian</b>The most widely understood dialect, largely because Cairo's film and television industry has been exported across the Arab world for most of a century.</div>
<div><b>Levantine</b>Spoken in Syria, Lebanon, Jordan and Palestine, and familiar to many viewers from television drama.</div>
<div><b>Maghrebi</b>Moroccan and Algerian Darija mix in Berber and French, and are often the hardest for speakers from further east to follow.</div>
</div>
<p>So a conversation between a Moroccan and an Iraqi might start in dialect, drift towards the standard language for anything tricky, and end up borrowing from English or French. That is normal, not a failure, and anyone learning Arabic will hear it constantly.</p>
<p>Typing adds its own twist. Before Arabic keyboards were common on phones, people wrote their dialects in Latin letters, using numerals for sounds English does not have: <span class="me-num">3</span> for the letter &lsquo;ayn, <span class="me-num">7</span> for a breathy h, <span class="me-num">2</span> for a glottal stop. The style, often called Arabizi, is still everywhere in casual messages. It is quick to type and slow for an outsider to read, which is one more reason many people in the region would rather just talk.</p>

<h2>Ramadan, when the night becomes the day</h2>
<p>For one month a year the shape of the day changes entirely. During Ramadan, people who are fasting eat nothing from dawn to sunset, and the evening meal that breaks the fast, iftar, becomes the social centre of the day. After it come visits, tea, family television and long conversations that can run until suhoor, the meal eaten before dawn. Arab television channels launch their biggest drama series for Ramadan, and cafés stay open far later than usual.</p>
<p>Because the Islamic calendar is lunar, Ramadan moves about eleven days earlier each year, so over a lifetime it passes through every season. Late-night activity across the region rises noticeably while it lasts.</p>

<h2>Next door: Persian and Turkish</h2>
<p>Not everyone in the region speaks Arabic. Iran's language is Persian, an Indo-European language written in a modified Arabic script, with its own long tradition of formal politeness, ta'arof, in which offers are refused before they are accepted. Turkish is unrelated to both and has been written in the Latin alphabet since 1928. Iran also keeps one of the world's few half-hour time offsets, UTC+3:30. Morocco has stayed on UTC+1 all year since 2018, apart from Ramadan, when it moves back an hour.</p>

<div class="me-box"><h3>How country matching works on TalkLive</h3><p>Country preferences are preferences, not guarantees. Country is estimated from a person's network connection and is not verified, and if nobody from your chosen countries is waiting, matching broadens after a few seconds.</p><p>For local times, safety advice and helplines, see the <a href="/countries/egypt">Egypt</a>, <a href="/countries/saudi-arabia">Saudi Arabia</a>, <a href="/countries/united-arab-emirates">UAE</a> and <a href="/countries/turkey">Turkey</a> guides, and <a href="/languages/#arabic">Arabic</a>, <a href="/languages/#persian">Persian</a> and <a href="/languages/#turkish">Turkish</a> in the languages feature.</p></div>
<p>Which raises a question worth asking anyone you meet from the region: when you say "the weekend", which two days do you mean?</p>
</div>
${ctx.cta({ title: 'Your turn: say marhaba', sub: 'Marhaba, salam or merhaba. Someone is up and waiting to talk.' })}
${ctx.ad()}
${ctx.more}
</main>`,
};
