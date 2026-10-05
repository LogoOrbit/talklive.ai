'use strict';
// Southeast Asia: a night-market feature. Warm dark ground under a string of
// lights, Bricolage Grotesque display over DM Sans, a sunrise table showing
// how far the clocks sit from the sun, and chips for the region's particles.
const SUN = [
  // city, UTC offset, approximate sunrise on the March equinox (local clock)
  ['Bangkok', 'UTC+7', '6:20'],
  ['Ho Chi Minh City', 'UTC+7', '6:05'],
  ['Jakarta', 'UTC+7', '6:00'],
  ['Manila', 'UTC+8', '6:05'],
  ['Kuala Lumpur', 'UTC+8', '7:15'],
  ['Singapore', 'UTC+8', '7:05'],
];

module.exports = {
  slug: 'southeast-asia',
  path: '/regions/southeast-asia',
  tag: 'Region',
  h1: 'Southeast Asia Runs an Hour Ahead of the Sun',
  title: 'Talking Across Southeast Asia: Indonesia, the Philippines, Malaysia, Vietnam and Thailand | TalkLive Journal',
  description: 'Malaysia and Singapore moved their clocks in 1982 and never moved back. Indonesia spans three time zones. The Philippines once sent more text messages than almost anywhere. How Southeast Asia talks, and when.',
  date: '2026-10-05',
  theme: '#1c1410',
  preload: ['bricolage-grotesque-latin-700-normal', 'dm-sans-latin-400-normal'],
  css: `
:root{--paper:#fbf5ec;--ink:#241a14;--rule:#e8d9c4;--dusk:#1c1410;--lamp:#ffb547;--chili:#d9472b;--leaf:#2f8f5b;--mast:#241a14}
body{font-family:"DM Sans",system-ui,sans-serif}
.sx-hero{background:radial-gradient(120% 90% at 50% 0%,#3a2516 0%,var(--dusk) 70%);color:#fdf1dc;padding:26px 20px 44px;text-align:center}
.sx-lights{display:flex;justify-content:center;gap:clamp(10px,3vw,26px);margin:0 0 26px}
.sx-lights i{width:12px;height:12px;border-radius:50%;background:var(--lamp);box-shadow:0 0 14px 4px rgba(255,181,71,.55)}
.sx-lights i:nth-child(3n+2){background:#ff7a59;box-shadow:0 0 14px 4px rgba(255,122,89,.5)}
.sx-lights i:nth-child(4n){background:#8fe3b0;box-shadow:0 0 14px 4px rgba(143,227,176,.45)}
.sx-k{font:500 12px/1 "DM Sans",sans-serif;letter-spacing:.22em;text-transform:uppercase;color:var(--lamp)}
.sx-hero h1{font:700 clamp(38px,6.4vw,74px)/1 "Bricolage Grotesque",sans-serif;letter-spacing:-.02em;margin:14px auto 16px;max-width:16ch}
.sx-hero h1 em{font-style:normal;color:var(--lamp)}
.sx-hero p{font-size:19px;line-height:1.55;max-width:620px;margin:0 auto;color:#e6d3b8}
.sx-body{max-width:700px;margin:0 auto;padding:30px 20px 0;font-size:18px;line-height:1.7}
.sx-body h2{font:700 30px/1.15 "Bricolage Grotesque",sans-serif;margin:1.6em 0 .45em;color:var(--chili)}
.sx-body p{margin:0 0 1.05em}
.sx-sun{width:100%;border-collapse:collapse;margin:20px 0 6px;font-size:16px}
.sx-sun th{text-align:left;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#7b6a5c;border-bottom:2px solid var(--ink);padding:6px 8px 6px 0}
.sx-sun td{padding:9px 8px 9px 0;border-bottom:1px solid var(--rule)}
.sx-sun td:last-child{font:700 18px/1 "Bricolage Grotesque",sans-serif}
.sx-sun tr.late td:last-child{color:var(--chili)}
.sx-cap{font-size:13px;color:#7b6a5c;margin:0 0 1.4em}
.sx-chips{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0 22px}
.sx-chips div{background:#fff;border:1px solid var(--rule);border-radius:16px;padding:12px 14px;font-size:15px;line-height:1.45;flex:1 1 190px}
.sx-chips b{display:block;font:700 22px/1.1 "Bricolage Grotesque",sans-serif;color:var(--leaf);margin-bottom:4px}
.sx-box{background:var(--dusk);color:#f3e3c8;border-radius:18px;padding:22px 24px;font-size:16px;line-height:1.6;margin:26px 0}
.sx-box h3{font:700 21px/1.2 "Bricolage Grotesque",sans-serif;margin:0 0 8px;color:var(--lamp)}
.sx-box p{margin:0 0 .7em}
.sx-box a{color:var(--lamp)}
`,
  body: (ctx) => `<main id="story">
<header class="sx-hero">
  <div class="sx-lights" aria-hidden="true">${'<i></i>'.repeat(11)}</div>
  <div class="sx-k">Southeast Asia &middot; A feature</div>
  <h1>Southeast Asia runs an hour <em>ahead of the sun</em></h1>
  <p>Nearly seven hundred million people, eleven countries, hundreds of languages, and clocks that were set as much by politics as by the sky.</p>
</header>
${ctx.cta({ title: 'Talk to someone in Southeast Asia tonight', sub: 'English, Tagalog, Indonesian, Malay, Vietnamese, Thai or a mix. One tap connects you with a real person, usually within seconds.' })}

<div class="sx-body">
<h2>The clock change that stuck</h2>
<p>On 1 January 1982, Peninsular Malaysia moved its clocks forward by half an hour so that the whole country, including Sabah and Sarawak on Borneo, would share one time. Singapore followed on the same day. Both now sit on UTC+8, the same as Beijing and Perth, even though Kuala Lumpur and Singapore sit at almost the same longitude as Bangkok, which keeps UTC+7.</p>
<p>The result is that the sun runs late. On the March equinox it rises in Singapore and Kuala Lumpur after seven in the morning and sets after seven in the evening. Evenings feel long and light, and life is pushed later: a dinner at eight is not a late dinner here.</p>
<table class="sx-sun"><thead><tr><th>City</th><th>Clock</th><th>Sunrise, March equinox</th></tr></thead>
<tbody>${SUN.map(([c, z, t]) => `<tr${parseInt(t, 10) >= 7 ? ' class="late"' : ''}><td>${ctx.esc(c)}</td><td>${z}</td><td>${t} a.m.</td></tr>`).join('')}</tbody></table>
<p class="sx-cap">Approximate local sunrise times, rounded. The two cities whose clocks moved in 1982 stand out.</p>

<h2>One country, three time zones</h2>
<p>Indonesia stretches across more than seventeen thousand islands and about five thousand kilometres from west to east, roughly the width of the continental United States. It uses three time zones: Western Indonesia Time (UTC+7) for Sumatra, Java and western Borneo; Central (UTC+8) for Bali, Sulawesi and the rest of Borneo; and Eastern (UTC+9) for Maluku and Papua. When it is ten at night in Jakarta, it is already midnight in Jayapura.</p>
<p>It also has one of the most remarkable language stories anywhere. More than seven hundred languages are spoken in Indonesia, and in 1928 a youth congress declared that the shared language of the future nation would be Malay, renamed Indonesian. It was a trading language rather than the language of the largest ethnic group, which was Javanese, and that was precisely the point: choosing it favoured no one. Today almost everyone speaks Indonesian, and for most people it is a second language alongside a regional one.</p>

<h2>The texting capital of the world</h2>
<p>In the early 2000s the Philippines became famous as the "text capital of the world". Prepaid phones and cheap text messages meant Filipinos sent SMS in volumes few other countries matched, and texting became a culture of its own, with abbreviations, chain messages and greetings sent to everyone in a phone book. The habit carried straight into social media, where the Philippines regularly appears near the top of global rankings for time spent online each day.</p>
<p>Filipino conversation also code-switches constantly. Taglish, a fluid blend of Tagalog and English, is how a great many people talk to friends, and it is not slang: it is how bilingual people naturally speak. Politeness rides on small words too. Adding <em>po</em> to a sentence makes it respectful, and <em>opo</em> is a polite "yes".</p>

<h2>Small words that do big work</h2>
<p>Across the region, much of the warmth of a conversation is carried by short particles that do not translate neatly.</p>
<div class="sx-chips">
<div><b>lah</b>Singapore and Malaysia. Softens, stresses or simply finishes a sentence: "OK lah."</div>
<div><b>po</b>The Philippines. Turns any sentence respectful, especially towards someone older.</div>
<div><b>sanuk</b>Thailand. Fun, enjoyment. A conversation, a job or a meal is supposed to be sanuk.</div>
<div><b>mai pen rai</b>Thailand. "Never mind", "no problem": the easygoing reply to almost anything.</div>
</div>
<p>Two of the region's big languages are tonal, which matters if you are learning by speaking. Thai has five tones; northern Vietnamese has six. The same syllable said with a different pitch is a different word, which is why reading a phrasebook gets a learner only so far and talking to a real person gets them much further.</p>

<div class="sx-box"><h3>How country matching works on TalkLive</h3><p>Country preferences are preferences, not guarantees. Country is estimated from a person's network connection and is not verified, and if nobody from your chosen countries is waiting, matching broadens after a few seconds.</p><p>For local times, busy hours and safety advice, see the <a href="/countries/indonesia">Indonesia guide</a>, and <a href="/languages/#indonesian">Indonesian</a> in the languages feature.</p></div>
<p>So if you meet someone from Kuala Lumpur at what feels like dusk, check the clock before you say good evening. Is it still daytime there?</p>
</div>
${ctx.cta({ title: 'Your turn: say hello', sub: 'Halo, kumusta, xin chào or sawasdee. Someone is waiting to talk.' })}
${ctx.ad()}
${ctx.more}
</main>`,
};
