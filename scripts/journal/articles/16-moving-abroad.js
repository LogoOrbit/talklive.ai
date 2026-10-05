'use strict';
// A boarding pass. Ticket stock, Old Standard TT for the headline, Libre
// Caslon Text for the story, a perforated stub, and the culture-shock curve
// drawn as an inline SVG flight path.
module.exports = {
  slug: 'lonely-after-moving-abroad',
  tag: 'Feature',
  h1: 'New City, No One to Call: Loneliness After Moving Abroad',
  title: 'Lonely After Moving Abroad? Culture Shock and What Helps | TalkLive Journal',
  description: 'Around 280 million people live outside the country they were born in, and loneliness is one of the most common things they share. The real shape of culture shock, the two kinds of loneliness, and a practical plan for the first months.',
  date: '2026-10-06',
  theme: '#f3efe4',
  preload: ['old-standard-tt-latin-700-normal', 'libre-caslon-text-latin-400-normal'],
  faq: [
    { q: 'Is it normal to feel lonely after moving abroad?', a: 'Very. Studies of international students regularly find that a majority feel lonely or isolated at some point, and the same is true for many workers who move for a job. It is a common stage, not a sign that the move was a mistake.' },
    { q: 'How long does culture shock last?', a: 'It varies. The classic model describes a honeymoon, a dip and a recovery over months, but later research found many people struggle most at the very start. For most, things ease noticeably within the first year as routines and friendships form.' },
    { q: 'How do I make friends in a new country?', a: 'Repetition matters more than charm: go back to the same class, club, cafe or community group every week so faces become familiar. Combine that with a few conversations in your own language and some in the local one, and keep in regular touch with home.' },
    { q: 'Why do I feel lonely even though I talk to people at work?', a: 'Researchers distinguish social loneliness, missing a wider circle, from emotional loneliness, missing a close attachment. Colleagues can ease the first and leave the second untouched, which is why calls with people who really know you still matter.' },
  ],
  css: `
:root{--paper:#f3efe4;--ink:#1f2230;--rule:#cfc6b0;--air:#1e4f7a;--stamp:#b8432f}
body{font-family:"Libre Caslon Text",Georgia,serif}
.bp{max-width:980px;margin:40px auto 0;padding:0 16px}
.bp-ticket{display:grid;grid-template-columns:1fr 220px;background:#fffdf7;border:1px solid var(--rule);border-radius:16px;overflow:hidden;box-shadow:0 10px 30px -18px rgba(31,34,48,.5)}
.bp-main{padding:28px 30px}
.bp-stub{border-left:2px dashed var(--rule);padding:28px 22px;background:#f8f4ea;font:400 13px/1.5 "Libre Caslon Text",serif}
.bp-k{display:flex;justify-content:space-between;font:700 12px/1 "Libre Caslon Text",serif;letter-spacing:.2em;text-transform:uppercase;color:var(--air)}
.bp-route{display:flex;align-items:center;gap:14px;margin:18px 0 6px;font:700 46px/1 "Old Standard TT",serif;color:var(--air)}
.bp-route span{flex:1;height:2px;background:repeating-linear-gradient(90deg,var(--air) 0 8px,transparent 8px 14px)}
.bp-main h1{font:700 clamp(30px,4.6vw,50px)/1.08 "Old Standard TT",serif;margin:18px 0 12px}
.bp-main p{font-size:18px;line-height:1.55;margin:0;color:#4a4c58}
.bp-stub dt{font-weight:700;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--air);margin-top:10px}
.bp-stub dd{margin:2px 0 0;font-size:16px}
.mv-body{max-width:690px;margin:0 auto;padding:40px 20px 0;font-size:18.5px;line-height:1.78}
.mv-body p{margin:0 0 1.1em}
.mv-body h2{font:700 30px/1.15 "Old Standard TT",serif;margin:1.8em 0 .5em;color:var(--air)}
.mv-curve{margin:26px 0;background:#fffdf7;border:1px solid var(--rule);border-radius:12px;padding:16px}
.mv-curve svg{width:100%;height:auto;display:block}
.mv-cap{font-size:14px;color:#6e6a5d;margin:8px 0 0}
.mv-two{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:22px 0}
.mv-two div{border-top:3px solid var(--stamp);padding-top:10px;font-size:16px;line-height:1.55}
.mv-two b{display:block;font:700 21px/1.2 "Old Standard TT",serif;margin-bottom:4px}
.mv-plan{counter-reset:w;list-style:none;padding:0;margin:20px 0}
.mv-plan li{counter-increment:w;position:relative;padding:14px 0 14px 70px;border-top:1px solid var(--rule)}
.mv-plan li::before{content:"Wk " counter(w);position:absolute;left:0;top:14px;font:700 13px/1 "Libre Caslon Text",serif;color:#fff;background:var(--stamp);padding:6px 8px;border-radius:4px;transform:rotate(-4deg)}
.mv-src{font-size:13px;line-height:1.6;color:#6e6a5d;border-top:1px solid var(--rule);padding-top:14px;margin-top:2em}
@media (max-width:720px){.bp-ticket{grid-template-columns:1fr}.bp-stub{border-left:0;border-top:2px dashed var(--rule)}.bp-route{font-size:34px}.mv-two{grid-template-columns:1fr}}
`,
  body: (ctx) => `<main id="story">
<div class="bp"><div class="bp-ticket">
<div class="bp-main">
  <div class="bp-k"><span>Boarding pass</span><span>One way</span></div>
  <div class="bp-route" aria-hidden="true">HOME<span></span>NEW</div>
  <h1>New city, no one to call: loneliness after moving abroad</h1>
  <p>The flight is the easy part. Here is what the research says about the months after landing, and a plan for getting through them.</p>
</div>
<dl class="bp-stub">
  <dt>Passengers</dt><dd>About 280 million worldwide</dd>
  <dt>Most common baggage</dt><dd>Homesickness</dd>
  <dt>Gate closes</dt><dd>When you stop reaching out</dd>
</dl>
</div></div>

<div class="mv-body">
<p>According to the United Nations, about 281 million people were living outside the country of their birth in 2020. Students in Melbourne and Manchester, nurses in Dubai, engineers in Toronto, construction workers in Riyadh, families in Berlin. They come from everywhere and they move for every reason, but a great many of them share one experience in the first months: an evening in a new room, with a phone full of contacts in the wrong time zone, and nobody nearby to call.</p>
<p>If that is you right now, two things are worth knowing. It is extremely common. And it has a shape, which means it usually changes.</p>

<h2>The curve everyone draws, and what it gets wrong</h2>
<p>The term "culture shock" was popularised by the anthropologist Kalervo Oberg in the 1950s. He described a sequence that has since been repeated in countless orientation sessions: a honeymoon of excitement, then a crisis of frustration and homesickness, then gradual recovery and adjustment. Around the same time, the Norwegian sociologist Sverre Lysgaard had studied Norwegian scholars in the United States and noticed something similar: adjustment seemed to start well, dip, then climb again. It became known as the U-curve.</p>
<div class="mv-curve">
<svg viewBox="0 0 600 200" role="img" aria-label="Two curves of adjustment over the first year: the classic U-curve starts high, dips and recovers; later research often found the hardest point at the very start, followed by steady improvement">
<line x1="40" y1="170" x2="580" y2="170" stroke="#cfc6b0"/><line x1="40" y1="20" x2="40" y2="170" stroke="#cfc6b0"/>
<text x="44" y="190" font-size="12" fill="#6e6a5d">Arrival</text><text x="520" y="190" font-size="12" fill="#6e6a5d">One year</text>
<text x="0" y="28" font-size="11" fill="#6e6a5d" transform="rotate(-90 12 95)">How well you feel</text>
<path d="M40 50 C 140 40, 200 150, 300 140 S 470 60, 580 45" fill="none" stroke="#1e4f7a" stroke-width="3" stroke-dasharray="8 6"/>
<path d="M40 150 C 120 140, 220 110, 320 85 S 480 55, 580 48" fill="none" stroke="#b8432f" stroke-width="3"/>
<text x="330" y="160" font-size="13" fill="#1e4f7a">Classic U-curve</text>
<text x="330" y="75" font-size="13" fill="#b8432f">What many studies found</text>
</svg>
<p class="mv-cap">Illustrative shapes, not data. The dashed line is the honeymoon-then-dip story; the solid line is the pattern later research often found.</p>
</div>
<p>The trouble is that when researchers went looking for the U-curve, they often did not find it. In a 1998 study titled "The U-curve on trial", Colleen Ward and colleagues followed Japanese students in New Zealand from their arrival and found that difficulties were greatest at the very beginning and then eased, with no honeymoon at all. Many people do not get a glamorous first month. They get a hard one.</p>
<p>That matters, because people who expect a honeymoon can mistake a normal rough start for proof that the move was a mistake. It usually is not. It is just the start.</p>

<h2>Two kinds of loneliness</h2>
<p>In 1973 the sociologist Robert Weiss drew a distinction that explains a lot about life abroad. He separated two kinds of loneliness, which feel similar and need different things.</p>
<div class="mv-two">
<div><b>Social loneliness</b>Missing a wider circle: people to say hello to, a group to belong to, someone to eat with. A new job or course can ease it within weeks.</div>
<div><b>Emotional loneliness</b>Missing a close attachment: someone who really knows you. Colleagues do not touch it, which is why you can be busy all day and still feel alone at night.</div>
</div>
<p>International students are a well-studied example. In a 2008 study of 200 international students in Australia, Erlenawati Sawir and colleagues found that around two-thirds had experienced loneliness or isolation, and that many felt both kinds: cut off from family and partners at home, and without a network in their new country. The fix for one is not the fix for the other, so it helps to work on both.</p>

<h2>A plan for the first months</h2>
<p>Friendship grows mostly from repetition: seeing the same people again and again until a familiar face becomes a person you know. You cannot rush that, but you can set it up. One simple plan:</p>
<ol class="mv-plan">
<li><strong>Pick one weekly fixture.</strong> A class, a sports club, a religious or community group, a language exchange evening. Go every week, even when you do not feel like it. Familiarity does the work.</li>
<li><strong>Find a third place.</strong> The sociologist Ray Oldenburg used that phrase for spots that are neither home nor work, like a cafe, a park bench or a barber, where regulars gather. Become a regular somewhere.</li>
<li><strong>Book calls home on a schedule.</strong> Time zones make spontaneous calls hard. A fixed weekly call protects the emotional side while the social side grows.</li>
<li><strong>Talk to someone every day.</strong> Not a transaction, a conversation. Some days that will be a neighbour or a colleague. On the empty evenings, it can be a stranger online, in your own language or in the local one.</li>
<li><strong>Say yes early.</strong> The first invitations come in the first months. Accept them, even the slightly awkward ones. Later, people's circles close up again.</li>
</ol>
<p>And keep an eye on yourself. Homesickness is normal. Weeks of low mood, poor sleep or losing interest in everything are worth taking to a doctor or a student support service, which in most countries exist precisely for this.</p>
<p>You crossed a border to build something. The first months are often the loneliest part of that, and also the part that passes. Who is the one person, here or at home, you could talk to tonight?</p>

<p class="mv-src">Sources: United Nations, Department of Economic and Social Affairs, <em>International Migrant Stock 2020</em>; Oberg, K. (1960), "Cultural shock: Adjustment to new cultural environments", <em>Practical Anthropology</em>; Lysgaard, S. (1955), "Adjustment in a foreign society: Norwegian Fulbright grantees visiting the United States", <em>International Social Science Bulletin</em>; Ward, C., Okura, Y., Kennedy, A. &amp; Kojima, T. (1998), "The U-curve on trial: A longitudinal study of psychological and sociocultural adjustment during cross-cultural transition", <em>International Journal of Intercultural Relations</em>; Weiss, R. S. (1973), <em>Loneliness: The Experience of Emotional and Social Isolation</em>; Sawir, E. et al. (2008), "Loneliness and international students: An Australian study", <em>Journal of Studies in International Education</em>; Oldenburg, R. (1989), <em>The Great Good Place</em>.</p>
</div>
${ctx.faq('Questions about life abroad')}
${ctx.cta({ title: 'An empty evening abroad? Talk to someone', sub: 'In your own language or the local one. One tap connects you with a real person, usually within seconds.' })}
${ctx.ad()}
${ctx.more}
</main>`,
};
