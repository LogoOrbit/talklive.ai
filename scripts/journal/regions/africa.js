'use strict';
// Africa: a prepaid-airtime feature. Scratch-card panels in signal yellow and
// ink, Archivo Black headlines over Archivo text, a "flash" call diagram and
// a four-clock band showing how narrow the continent's evening is.
const CLOCKS = [
  ['Accra', 'UTC+0', '8:00'],
  ['Lagos', 'UTC+1', '9:00'],
  ['Johannesburg', 'UTC+2', '10:00'],
  ['Nairobi', 'UTC+3', '11:00'],
];

module.exports = {
  slug: 'africa',
  path: '/regions/africa',
  tag: 'Region',
  h1: 'Africa Reinvented the Phone Call',
  title: 'Talking Across Africa: Nigeria, Kenya, Ghana and South Africa | TalkLive Journal',
  description: 'The missed call that means "call me back", money sent by text message, Swahili and Pidgin spoken by tens of millions, and the youngest population on Earth. How Africa talks, and why voice comes first.',
  date: '2026-10-05',
  theme: '#ffd23f',
  preload: ['archivo-black-latin-400-normal', 'archivo-latin-400-normal'],
  css: `
:root{--paper:#fffaf0;--ink:#151515;--rule:#e6dcc4;--sig:#ffd23f;--green:#0f7b4a;--clay:#c2522d;--mast:#151515}
body{font-family:"Archivo",system-ui,sans-serif}
.af-hero{background:var(--sig);padding:46px 20px 40px;border-bottom:6px solid var(--ink)}
.af-in{max-width:1000px;margin:0 auto}
.af-k{display:inline-block;background:var(--ink);color:var(--sig);font:600 12px/1 "Archivo",sans-serif;letter-spacing:.18em;text-transform:uppercase;padding:7px 10px}
.af-hero h1{font:400 clamp(40px,7vw,86px)/.95 "Archivo Black",sans-serif;letter-spacing:-.02em;margin:18px 0 16px;max-width:13ch;text-transform:uppercase}
.af-hero p{font-size:20px;line-height:1.5;max-width:620px;margin:0}
.af-body{max-width:700px;margin:0 auto;padding:30px 20px 0;font-size:18px;line-height:1.7}
.af-body h2{font:400 28px/1.15 "Archivo Black",sans-serif;text-transform:uppercase;margin:1.7em 0 .45em}
.af-body h2 span{background:linear-gradient(transparent 60%,var(--sig) 60%)}
.af-body p{margin:0 0 1.05em}
.af-flash{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:22px 0}
.af-flash div{border:2px solid var(--ink);padding:14px;font-size:15px;line-height:1.45;background:#fff;position:relative}
.af-flash div::before{content:attr(data-n);display:block;font:400 34px/1 "Archivo Black",sans-serif;color:var(--clay);margin-bottom:6px}
.af-clocks{display:grid;grid-template-columns:repeat(4,1fr);border:2px solid var(--ink);margin:22px 0 8px}
.af-clocks div{padding:14px 10px;text-align:center;border-right:2px solid var(--ink);background:#fff}
.af-clocks div:last-child{border-right:0}
.af-clocks b{display:block;font:400 30px/1 "Archivo Black",sans-serif}
.af-clocks span{display:block;font-size:14px;margin-top:6px}
.af-clocks small{display:block;font-size:12px;color:#6b665c}
.af-cap{font-size:13px;color:#6b665c;margin:0 0 1.3em}
.af-stat{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0}
.af-stat div{background:var(--ink);color:#fff;padding:16px 14px;font-size:14px;line-height:1.4}
.af-stat b{display:block;font:400 34px/1 "Archivo Black",sans-serif;color:var(--sig);margin-bottom:6px}
.af-box{border:3px solid var(--ink);background:var(--sig);padding:22px 24px;font-size:16px;line-height:1.6;margin:26px 0}
.af-box h3{font:400 20px/1.2 "Archivo Black",sans-serif;text-transform:uppercase;margin:0 0 8px}
.af-box p{margin:0 0 .7em}
@media (max-width:640px){.af-flash,.af-stat{grid-template-columns:1fr}.af-clocks{grid-template-columns:repeat(2,1fr)}.af-clocks div:nth-child(2){border-right:0}.af-clocks div:nth-child(-n+2){border-bottom:2px solid var(--ink)}}
`,
  body: (ctx) => `<main id="story">
<header class="af-hero"><div class="af-in">
  <span class="af-k">Africa &middot; A feature</span>
  <h1>Africa reinvented the phone call</h1>
  <p>A continent of more than a billion people, around two thousand languages and the youngest population on Earth skipped the landline almost entirely. What it built instead says a lot about how people here talk.</p>
</div></header>
${ctx.cta({ title: 'Talk to someone in Africa tonight', sub: 'English, French, Swahili, Pidgin or a mix. One tap connects you with a real person, usually within seconds.' })}

<div class="af-body">
<h2><span>The call you are not meant to answer</span></h2>
<p>In much of Africa, a phone that rings once and stops is not a mistake. It is a message. The practice is called flashing in Nigeria and Ghana and beeping in Kenya and elsewhere, and researchers who studied it in the 2000s found it was used everywhere, with a shared, unwritten grammar.</p>
<div class="af-flash">
<div data-n="1">You ring a friend and hang up before they can answer. It cost you nothing.</div>
<div data-n="2">They see the missed call and know what it means: "call me back", "I'm outside", or simply "thinking of you".</div>
<div data-n="3">Whoever has more airtime, or is understood to be better off, makes the paid call.</div>
</div>
<p>It grew out of prepaid credit: when every minute is paid for in advance, a free signal is worth a lot. The etiquette that developed around it, about who is expected to call back and who is not, is a small window into how relationships work, and the habit has survived into the age of cheap data and voice notes.</p>

<h2><span>Money by text message</span></h2>
<p>In 2007 Safaricom launched M-Pesa in Kenya, a service for sending money by text message from one basic phone to another. It spread with astonishing speed, and mobile money is now ordinary across East Africa and well beyond: rent, school fees and a taxi ride paid from a phone, often one without a smartphone's screen. When the phone is your bank, your radio and your post office, it is not surprising that talking on it comes naturally too.</p>

<h2><span>Two thousand languages, a few that connect them</span></h2>
<p>Roughly a third of the world's languages are spoken in Africa. Most people grow up speaking several, and the languages that carry conversation between groups matter as much as the ones spoken at home.</p>
<p>Swahili is the great connector of East Africa. It is a first language for comparatively few people and a second language for tens of millions more in Kenya, Tanzania, Uganda and beyond, and it is one of the official languages of the East African Community. UNESCO marks 7 July as World Kiswahili Language Day. In West Africa, Nigerian Pidgin plays a similar role: estimates of its speakers run to tens of millions, the BBC has broadcast in it since 2017, and it is the easiest way to talk to almost anyone in Lagos, whatever their first language. "How far?" is a greeting, and the right answer is usually "I dey".</p>
<p>South Africa shows the same variety from another angle. It has twelve official languages since South African Sign Language was added in 2023, and a single conversation in Johannesburg can move between English, isiZulu and Afrikaans without anyone remarking on it.</p>

<h2><span>The youngest continent</span></h2>
<div class="af-stat">
<div><b>~19</b>Africa's median age, roughly half that of Europe</div>
<div><b>~2,000</b>languages spoken on the continent, about a third of the world's total</div>
<div><b>3 hrs</b>separate most of Sub-Saharan Africa's big cities on the clock</div>
</div>
<p>A young population is a talkative one online. And because the continent stretches north to south rather than east to west, most of its big cities share one evening. When it is nine in Lagos it is eleven in Nairobi, and almost none of these countries change their clocks for summer.</p>
<div class="af-clocks" role="img" aria-label="Local time in four cities at the same moment">
${CLOCKS.map(([c, z, t]) => `<div><b>${t}</b><span>${ctx.esc(c)}</span><small>${z}</small></div>`).join('')}
</div>
<p class="af-cap">The same moment, p.m., in four cities. No daylight saving in any of them.</p>
<p>Greetings deserve their own note. In many African cultures, launching straight into business without asking after someone's health, family and day is rude, not efficient. If a conversation starts with several rounds of "how are you" before anything else, that is the conversation working as intended.</p>

<div class="af-box"><h3>How country matching works on TalkLive</h3><p>Country preferences are preferences, not guarantees. Country is estimated from a person's network connection and is not verified, and if nobody from your chosen countries is waiting, matching broadens after a few seconds.</p><p>For local busy hours, safety advice and helplines, see the <a href="/countries/nigeria">Nigeria</a>, <a href="/countries/kenya">Kenya</a>, <a href="/countries/south-africa">South Africa</a> and <a href="/countries/egypt">Egypt</a> guides.</p></div>
<p>So when you meet someone from Accra or Nairobi, try asking the obvious question nobody asks: do you still flash people?</p>
</div>
${ctx.cta({ title: 'Your turn: say hello', sub: 'How far, habari or sawubona. Someone is waiting to talk.' })}
${ctx.ad()}
${ctx.more}
</main>`,
};
