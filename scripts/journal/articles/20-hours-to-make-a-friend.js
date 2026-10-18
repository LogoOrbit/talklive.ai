'use strict';
// A timesheet. Manila card stock, Courier Prime for the punched hours, IBM Plex
// Serif for the story, and the three friendship thresholds drawn as a clock
// card that fills up as you read down it.
module.exports = {
  slug: 'how-many-hours-to-make-a-friend',
  tag: 'Research',
  h1: 'How Many Hours Does It Take to Make a Friend?',
  title: 'How Many Hours Does It Take to Make a Friend? What Research Says | TalkLive Journal',
  description: 'About 50 hours together turns an acquaintance into a casual friend, about 90 into a friend and more than 200 into a close friend, according to research by Jeffrey Hall. What counts, what does not, and how adults can make friends faster.',
  date: '2026-10-18',
  theme: '#efe2c4',
  preload: ['courier-prime-latin-700-normal', 'ibm-plex-serif-latin-400-normal'],
  faq: [
    { q: 'How many hours does it take to make a friend?', a: 'In research published in 2018 by Jeffrey Hall at the University of Kansas, people needed roughly 50 hours together to go from acquaintance to casual friend, around 90 hours to become friends, and more than 200 hours to become close friends.' },
    { q: 'Does time at work or school count towards friendship?', a: 'Less than you might expect. Hall found that time spent together in obligatory settings such as work did less to deepen a friendship than time spent hanging out by choice, joking around and catching up.' },
    { q: 'How many close friends can a person have?', a: 'Work associated with the anthropologist Robin Dunbar suggests most people have about five intimate relationships and about 15 close friends, inside a wider circle of roughly 150 meaningful contacts.' },
    { q: 'Why is it harder to make friends as an adult?', a: 'Mostly because adults have fewer settings that put them near the same people repeatedly and unplanned, which is what school and university provide. Friendship needs repeated contact, and adult life rarely schedules it for you.' },
    { q: 'Can you make real friends online?', a: 'Yes, as long as the contact repeats. A single good conversation is a start, but friendship grows from coming back to the same person again and again, which is why keeping in touch matters more than where you met.' },
  ],
  css: `
:root{--paper:#efe2c4;--card:#fbf5e6;--ink:#2a2318;--rule:#b9a57c;--red:#b2342a;--blue:#26507a}
body{font-family:"IBM Plex Serif",Georgia,serif}
.ts-head{max-width:1040px;margin:34px auto 0;padding:0 18px;display:grid;grid-template-columns:1.25fr .75fr;gap:34px;align-items:end}
.ts-kicker{font:700 13px/1 "Courier Prime",monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--red)}
.ts-head h1{font:700 clamp(40px,6.6vw,78px)/1 "Courier Prime",monospace;margin:14px 0 16px;letter-spacing:-.02em}
.ts-head p{font-size:20px;line-height:1.55;margin:0;max-width:46ch}
.ts-card{background:var(--card);border:2px solid var(--ink);padding:16px 16px 10px;font-family:"Courier Prime",monospace;box-shadow:5px 5px 0 var(--rule)}
.ts-card h2{font-size:14px;letter-spacing:.14em;text-transform:uppercase;margin:0 0 10px;border-bottom:2px solid var(--ink);padding-bottom:8px}
.ts-row{display:grid;grid-template-columns:56px 1fr;gap:10px;align-items:center;padding:8px 0;border-bottom:1px dashed var(--rule)}
.ts-row:last-child{border-bottom:0}
.ts-row b{font-size:24px;color:var(--red);text-align:right}
.ts-bar{height:12px;background:#e3d3ad;position:relative}
.ts-bar i{position:absolute;inset:0 auto 0 0;background:var(--ink);width:var(--w)}
.ts-row span{grid-column:2;font-size:13px}
.ts-body{max-width:680px;margin:0 auto;padding:46px 20px 0;font-size:18.5px;line-height:1.76}
.ts-body p{margin:0 0 1.1em}
.ts-body h2{font:700 30px/1.15 "Courier Prime",monospace;margin:1.7em 0 .5em}
.ts-note{background:var(--card);border-left:6px solid var(--blue);padding:16px 20px;margin:24px 0;font-size:17px}
.ts-note b{font-family:"Courier Prime",monospace;color:var(--blue)}
.ts-layers{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:22px 0;text-align:center;font-family:"Courier Prime",monospace}
.ts-layers div{border:2px solid var(--ink);background:var(--card);padding:12px 6px}
.ts-layers b{display:block;font-size:34px;color:var(--red)}
.ts-layers span{font-size:13px;line-height:1.35;display:block;margin-top:4px}
.ts-list{list-style:none;padding:0;margin:18px 0;counter-reset:t}
.ts-list li{counter-increment:t;padding:12px 0 12px 52px;border-top:1px solid var(--rule);position:relative}
.ts-list li::before{content:counter(t,decimal-leading-zero);position:absolute;left:0;top:11px;font:700 22px/1 "Courier Prime",monospace;color:var(--red)}
.ts-src{font-size:13px;line-height:1.6;border-top:2px solid var(--ink);padding-top:14px;margin-top:2em}
@media (max-width:820px){.ts-head{grid-template-columns:1fr}.ts-layers{grid-template-columns:1fr 1fr}}
`,
  body: (ctx) => `<main id="story">
<header class="ts-head">
  <div>
    <span class="ts-kicker">TalkLive Journal &middot; Research</span>
    <h1>How many hours does it take to make a friend?</h1>
    <p>A researcher asked hundreds of adults to count. The answer is surprisingly specific, and it explains why making friends after school feels so hard.</p>
  </div>
  <aside class="ts-card" aria-label="Hours together, by stage of friendship">
    <h2>Time card</h2>
    <div class="ts-row"><b>~50</b><div class="ts-bar"><i style="--w:22%"></i></div><span>acquaintance to casual friend</span></div>
    <div class="ts-row"><b>~90</b><div class="ts-bar"><i style="--w:40%"></i></div><span>casual friend to friend</span></div>
    <div class="ts-row"><b>200+</b><div class="ts-bar"><i style="--w:100%"></i></div><span>friend to close friend</span></div>
  </aside>
</header>

<div class="ts-body">
<p>Most of us think of friendship as chemistry. You meet someone, you click, and that is that. Chemistry helps, but research suggests friendship is also a matter of arithmetic. It takes time, a fairly predictable amount of it, and most adults never schedule that time on purpose.</p>

<h2>Counting the hours</h2>
<p>In 2018 the communication researcher Jeffrey Hall, at the University of Kansas, published a study in the <em>Journal of Social and Personal Relationships</em> with a blunt question in its title: how many hours does it take to make a friend?</p>
<p>He approached it in two ways. First he surveyed adults who had moved to a new city in the previous six months and were starting their social lives again, asking them about someone they had met since and how much time they had spent together. Then he followed first-year university students over their first weeks, checking in on new acquaintances as the relationships grew or faded.</p>
<p>The pattern was consistent. Roughly <strong>50 hours</strong> together moved someone from acquaintance to casual friend. Around <strong>90 hours</strong> made them a friend. Becoming a close friend took <strong>more than 200 hours</strong>.</p>
<p class="ts-note"><b>The maths:</b> 50 hours is an hour a day for seven weeks, or a long weekend afternoon every week for about three months. Two hundred hours is most evenings for half a year.</p>

<h2>Not all hours count the same</h2>
<p>Hall also found that what you do with the time matters. Hours spent together because you have to be there, such as working side by side, did less for a friendship than time spent by choice. The activities that moved people closer were the ordinary, unhurried ones: hanging out, joking around, and the kind of catching-up conversation where you tell each other what happened this week.</p>
<p>That fits a much older finding. In a 1950 study of a student housing estate at MIT, Leon Festinger, Stanley Schachter and Kurt Back found that residents were far more likely to become friends with the people living next door than with people a few doors away. Nobody chose their neighbours. They simply kept bumping into them, and the repeated, unplanned contact did the rest.</p>

<h2>Why it gets harder after school</h2>
<p>School and university quietly hand out those hours for free. You see the same faces every day, with plenty of loose time in between. Adult life rarely does that. Work hours count for less, and the remaining free time goes to partners, family, commuting and sleep. The number of hours needed stays the same; the supply of easy hours collapses.</p>
<p>There is a ceiling too. Research associated with the anthropologist Robin Dunbar suggests that human social circles come in layers of roughly similar size from person to person:</p>
<div class="ts-layers">
<div><b>5</b><span>intimate relationships</span></div>
<div><b>15</b><span>close friends</span></div>
<div><b>50</b><span>good friends</span></div>
<div><b>150</b><span>meaningful contacts</span></div>
</div>
<p>Those inner layers are expensive to keep, which is exactly what the 200-hour figure describes. Close friendship is not rationed by luck. It is rationed by time.</p>

<h2>We undersell ourselves in the first conversation</h2>
<p>One more finding helps explain why many friendships never reach hour two. In 2018 Erica Boothby and colleagues paired strangers for conversations and then asked each person how much they liked their partner, and how much they thought their partner liked them. People consistently underestimated how much they had been liked. The researchers called it the <em>liking gap</em>.</p>
<p>So the first conversation usually goes better than we think, and we then fail to follow it up because we assume the other person was not that interested. The hours never start adding up.</p>

<h2>How to bank the hours faster</h2>
<ul class="ts-list">
<li><strong>Repeat, do not just meet.</strong> Ten conversations with the same person beat ten first conversations with different people. Every friendship clock starts at zero.</li>
<li><strong>Follow up within a few days.</strong> Assume you were liked more than you think. A quick "that was fun, same time next week?" is how hour one becomes hour five.</li>
<li><strong>Choose voluntary time.</strong> Time you both chose counts for more than time you were obliged to share. A call at the end of the day is voluntary time.</li>
<li><strong>Keep the talk ordinary.</strong> Joking around and catching up are what moved people closer in Hall's study. You do not need deep questions every time.</li>
<li><strong>Make it a routine.</strong> A regular slot, the same evening each week, gives you the unplanned-feeling repetition that neighbours and classmates get for free.</li>
</ul>

<h2>Where TalkLive fits</h2>
<p>A random call with a stranger is hour one at most. On its own it will not make a friend. What it can do is find the person worth spending the next forty-nine hours with. When a call goes well, tap <strong>Add friend</strong> during it; you can then call or message that person again later without either of you sharing a phone number. Coming back to the same person is the part that counts.</p>
${ctx.cta({ title: 'Start hour one', sub: 'Meet someone new by voice or text. If you click, add them as a friend and keep talking.' })}
${ctx.faq()}
<p class="ts-src">Sources: J. A. Hall (2019, published online 2018), "How many hours does it take to make a friend?", <em>Journal of Social and Personal Relationships</em> 36(4). L. Festinger, S. Schachter and K. Back (1950), <em>Social Pressures in Informal Groups</em>. R. I. M. Dunbar (2018), "The anatomy of friendship", <em>Trends in Cognitive Sciences</em> 22(1). E. J. Boothby, G. Cooney, G. M. Sandstrom and M. S. Clark (2018), "The liking gap in conversations", <em>Psychological Science</em> 29(11). The figures are averages from survey research; any one friendship can grow faster or slower.</p>
${ctx.ad()}
${ctx.more}
</div>
</main>`,
};
