'use strict';
// Europe: financial-paper data journalism. Salmon paper, Source Serif 4 body,
// Inter for charts and tables, a time-zone band chart and a data table.
const { COUNTRIES } = require('../../data/geo');

const ZONES = [
  { off: 'UTC+0', label: 'Western European', list: ['united-kingdom', 'ireland', 'portugal'] },
  { off: 'UTC+1', label: 'Central European', list: ['spain', 'france', 'netherlands', 'germany', 'italy', 'sweden', 'norway', 'poland'] },
  { off: 'UTC+2', label: 'Eastern European', list: ['greece', 'romania', 'ukraine'] },
  { off: 'UTC+3', label: 'Turkey & Moscow', list: ['turkey', 'russia'] },
];

module.exports = {
  slug: 'europe',
  path: '/regions/europe',
  tag: 'Region',
  h1: 'Europe Runs on Four Clocks and Argues About All of Them',
  title: 'Europe in Four Time Zones: Languages, Clocks and Peak Hours | TalkLive Journal',
  description: 'Spain keeps Berlin time for a reason dating to 1940. The EU voted to stop changing the clocks and never did. A data-led look at how sixteen European countries share one evening.',
  date: '2026-10-03',
  theme: '#fff1e5',
  preload: ['source-serif-4-latin-600-normal', 'inter-latin-600-normal'],
  css: `
:root{--paper:#fff1e5;--ink:#33302e;--rule:#e3cdb9;--claret:#990f3d;--teal:#0d7680;--slate:#262a33}
body{font-family:"Source Serif 4",Georgia,serif}
.eu-wrap{max-width:1000px;margin:0 auto;padding:48px 20px 0}
.eu-tag{font:600 13px/1 "Inter",sans-serif;color:var(--claret);text-transform:uppercase;letter-spacing:.06em}
.eu-wrap h1{font:600 clamp(32px,4.8vw,52px)/1.08 "Source Serif 4",serif;margin:14px 0 14px;color:var(--slate);max-width:20ch}
.eu-dek{font-size:21px;line-height:1.45;color:#66605c;margin:0 0 18px;max-width:720px}
.eu-by{font:400 13px/1 "Inter",sans-serif;color:#66605c;border-top:1px solid var(--rule);padding-top:12px;margin-bottom:36px}
.eu-body{max-width:680px;font-size:19px;line-height:1.65}
.eu-body p{margin:0 0 1.1em}
.eu-body h2{font:600 26px/1.2 "Source Serif 4",serif;color:var(--slate);margin:1.8em 0 .5em}
.eu-fig{margin:36px 0;font-family:"Inter",sans-serif}
.eu-fig h3{font:600 17px/1.3 "Inter",sans-serif;margin:0 0 4px;color:var(--slate)}
.eu-fig .eu-sub{font-size:14px;color:#66605c;margin:0 0 14px}
.eu-band{display:grid;grid-template-columns:90px 1fr;gap:12px;align-items:start;padding:10px 0;border-top:1px solid var(--rule)}
.eu-band b{font:600 15px/1.3 "Inter",sans-serif;color:var(--teal)}
.eu-band b small{display:block;font-weight:400;color:#66605c;font-size:12px}
.eu-chips{display:flex;flex-wrap:wrap;gap:6px}
.eu-chips span{background:#f2dfce;padding:4px 9px;font-size:14px;border-radius:2px}
.eu-src{font:400 12px/1.5 "Inter",sans-serif;color:#66605c;margin-top:8px}
.eu-num{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin:30px 0;font-family:"Inter",sans-serif}
.eu-num div{border-top:4px solid var(--claret);padding-top:10px}
.eu-num b{display:block;font:600 40px/1 "Inter",sans-serif;color:var(--slate)}
.eu-num span{font-size:14px;line-height:1.4;color:#66605c}
.eu-table{width:100%;border-collapse:collapse;font:400 15px/1.4 "Inter",sans-serif;margin-top:8px}
.eu-table th{text-align:left;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#66605c;border-bottom:2px solid var(--slate);padding:8px 10px 8px 0}
.eu-table td{padding:9px 10px 9px 0;border-bottom:1px solid var(--rule);vertical-align:top}
.eu-table td:first-child{font-weight:600;color:var(--slate)}
.eu-scroll{overflow-x:auto}
.eu-note{background:#f2dfce;padding:18px 20px;font-size:16px;line-height:1.55;margin:28px 0}
@media (max-width:640px){.eu-num{grid-template-columns:1fr}.eu-band{grid-template-columns:72px 1fr}}
`,
  body: (ctx) => {
    const by = new Map(COUNTRIES.map(c => [c.slug, c]));
    const rows = ZONES.flatMap(z => z.list.map(s => by.get(s)));
    return `<main id="story" class="eu-wrap">
<span class="eu-tag">Europe &middot; Data</span>
<h1>Europe runs on four clocks and argues about all of them</h1>
<p class="eu-dek">Sixteen countries, more than a dozen languages, and an evening that is shared almost everywhere at once. The reasons are partly geography and partly history, some of it surprisingly recent.</p>
<div class="eu-by">The TalkLive Journal &middot; Figures as of 2026</div>
${ctx.cta({ title: 'Talk to someone in Europe tonight', sub: 'Four clocks, one shared evening. One tap connects you with a real person, usually within seconds.' })}

<div class="eu-num">
  <div><b>4</b><span>time zones cover the sixteen countries in this piece, from Lisbon to Moscow</span></div>
  <div><b>24</b><span>official languages of the European Union alone</span></div>
  <div><b>11</b><span>time zones across Russia, the most of any single continuous country</span></div>
</div>

<div class="eu-body">
<p>Look at a map of Europe's time zones and something odd stands out. Spain sits almost entirely west of Greenwich, level with Britain and Portugal, yet its clocks match Berlin and Warsaw. Madrid is an hour "ahead" of where the sun says it should be, which is one reason Spanish evenings feel so long and Spanish dinners start so late.</p>
<p>The cause is a decision taken in 1940, when Spain moved its clocks forward to align with Germany and much of occupied Europe. The change was never reversed. Proposals to move back to Greenwich time surface in Spain every few years, and so far none has stuck.</p>
</div>

<figure class="eu-fig">
<h3>Where the sixteen countries sit</h3>
<p class="eu-sub">Standard time offset from UTC. Most of the continent adds an hour in summer; Turkey and Russia do not.</p>
${ZONES.map(z => `<div class="eu-band"><b>${z.off}<small>${z.label}</small></b><div class="eu-chips">${z.list.map(s => `<span>${ctx.esc(by.get(s).name)}</span>`).join('')}</div></div>`).join('')}
<p class="eu-src">Russia is shown at Moscow time; the country spans UTC+2 to UTC+12.</p>
</figure>

<div class="eu-body">
<h2>The clock change nobody managed to cancel</h2>
<p>Every spring and autumn most of Europe moves its clocks by an hour. In 2018 the European Commission asked the public what they thought; millions replied, a large majority in favour of stopping. In 2019 the European Parliament voted to end seasonal changes. Then the plan stalled, because member states could not agree whether to stay on summer or winter time, and nobody wanted neighbours on different clocks. The clocks still change.</p>
<p>Others went their own way. Russia abandoned seasonal changes in 2011 and settled on permanent standard time in 2014. Turkey stopped changing its clocks in 2016 and stayed on what had been its summer time. Small decisions, but they mean the gap between Istanbul and London is three hours in winter and two in summer, and anyone arranging a call across the continent has to think twice.</p>

<h2>One evening, three hours wide</h2>
<p>Despite all this, the practical effect is remarkable. From Dublin to Kyiv, almost everyone is within two hours of everyone else. A European evening, roughly 8pm to midnight local time, is close to a single shared block, which is why it is one of the busiest times for conversation anywhere. Turkey and Moscow sit one hour further east and simply start a little earlier.</p>
<p>Language does the rest. English works as the common second language for a large share of Europeans under forty, very widely so in the Netherlands, Scandinavia and Portugal. But a lot of people talk across borders precisely to practise something else: Spanish, German, French and Italian are all widely studied, and a conversation is the quickest way to find out whether you can actually use one.</p>
</div>

<figure class="eu-fig">
<h3>Country by country</h3>
<p class="eu-sub">Main languages, a common greeting, and when the local evening is busiest.</p>
<div class="eu-scroll"><table class="eu-table">
<thead><tr><th>Country</th><th>Languages</th><th>Hello</th><th>Busiest</th></tr></thead>
<tbody>${rows.map(c => `<tr><td>${ctx.esc(c.name)}</td><td>${ctx.esc(c.langs.map(l => l.name).join(', '))}</td><td>${ctx.esc(c.langs[0].hello)}</td><td>${ctx.esc(c.peak)}</td></tr>`).join('')}</tbody>
</table></div>
<p class="eu-src">Peak hours are approximate and based on when local evenings are busiest. Greetings are informal.</p>
</figure>

<div class="eu-body">
<div class="eu-note">On TalkLive you can set country preferences, but they are not guarantees: country is estimated from a network connection and not verified, and matching broadens after a few seconds if nobody from your chosen countries is waiting. For individual countries, see our <a href="/countries/united-kingdom">United Kingdom</a>, <a href="/countries/germany">Germany</a> and <a href="/countries/turkey">Turkey</a> guides.</div>
<p>Europe spent much of the last century redrawing borders and is still, in small ways, arguing about what time it is. Here is a question it has never settled: should clocks follow the sun, or the neighbours?</p>
</div>
${ctx.cta({ title: 'Your turn: say hello', sub: 'Hola, bonjour, hallo, ciao or privet. Someone is waiting to talk.' })}
${ctx.ad()}
${ctx.more}
</main>`;
  },
};
