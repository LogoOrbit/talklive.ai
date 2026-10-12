'use strict';
// A greeting card. Blush card stock, DM Serif Display for the headline, Lora
// for the story and Caveat for the handwritten notes in the margins, with the
// expectation-versus-reality gap drawn as two bars.
module.exports = {
  slug: 'why-we-dont-give-compliments',
  tag: 'Research',
  h1: 'The Compliment You Didn’t Give',
  title: 'Why We Hold Back Compliments, and Why We Shouldn’t | TalkLive Journal',
  description: 'You notice something good about someone and say nothing, because it might be awkward. Experiments on compliments and thank-you letters show we badly underestimate how much they land, and why that keeps us quiet.',
  date: '2026-10-12',
  theme: '#f7ece8',
  preload: ['dm-serif-display-latin-400-normal', 'lora-latin-400-normal'],
  faq: [
    { q: 'Do people actually like receiving compliments from strangers?', a: 'In experiments where people complimented strangers, the recipients felt better and less uncomfortable than the people giving the compliment expected. The awkwardness people fear is mostly on the giver’s side.' },
    { q: 'Why do I feel awkward giving compliments?', a: 'Studies suggest givers focus on whether they will word it well, while recipients mostly notice the warmth behind it. Worrying about delivery makes the moment feel riskier than it is for the other person.' },
    { q: 'What makes a good compliment?', a: 'Be specific and honest, and point at something the person chose or did: a question they asked, an idea, the effort they put into a language. With people you have just met, especially online, leave appearance out of it.' },
    { q: 'Is thanking someone in a letter worth it?', a: 'In one set of experiments, people who wrote thank-you letters underestimated how surprised and happy the recipients would be, and overestimated how awkward they would feel. The letters took minutes to write.' },
  ],
  css: `
:root{--paper:#f7ece8;--ink:#2a1f22;--rule:#e2cfc8;--rose:#b4475b;--ink2:#5b4a4e}
body{font-family:Lora,Georgia,serif}
.cp-card{max-width:900px;margin:40px auto 0;padding:0 16px}
.cp-front{position:relative;background:#fffaf7;border:1px solid var(--rule);border-radius:6px;padding:46px 40px 40px;box-shadow:0 1px 0 #fff inset,0 18px 40px -26px rgba(90,40,50,.55)}
.cp-front::before{content:"";position:absolute;left:50%;top:0;bottom:0;width:1px;background:linear-gradient(var(--rule),transparent 30%,transparent 70%,var(--rule));opacity:.6}
.cp-kick{font:500 26px/1 Caveat,cursive;color:var(--rose);transform:rotate(-2deg);display:inline-block}
.cp-front h1{font:400 clamp(38px,6vw,68px)/1.02 "DM Serif Display",serif;margin:14px 0 16px;max-width:15ch;position:relative}
.cp-front p{font-size:19px;line-height:1.6;color:var(--ink2);max-width:46ch;margin:0;position:relative}
.cp-heart{position:absolute;right:34px;bottom:30px;width:120px;opacity:.9}
.cp-body{max-width:690px;margin:0 auto;padding:44px 20px 0;font-size:18.5px;line-height:1.78}
.cp-body p{margin:0 0 1.1em}
.cp-body h2{font:400 32px/1.15 "DM Serif Display",serif;margin:1.8em 0 .5em}
.cp-note{font:500 24px/1.25 Caveat,cursive;color:var(--rose);border-left:3px solid var(--rose);padding:4px 0 4px 16px;margin:22px 0}
.cp-gap{background:#fffaf7;border:1px solid var(--rule);border-radius:10px;padding:18px 20px;margin:24px 0}
.cp-gap h3{font:600 13px/1 Lora,serif;letter-spacing:.14em;text-transform:uppercase;margin:0 0 14px;color:var(--ink2)}
.cp-row{display:grid;grid-template-columns:150px 1fr;gap:12px;align-items:center;margin:10px 0;font-size:15px}
.cp-bar{height:16px;border-radius:999px;background:#ead9d3;overflow:hidden}
.cp-bar i{display:block;height:100%;border-radius:inherit;background:var(--rose)}
.cp-bar.cp-exp i{background:#c9a3ab}
.cp-cap{font-size:13.5px;color:#7a6a6d;margin:10px 0 0}
.cp-how{list-style:none;padding:0;margin:20px 0}
.cp-how li{padding:14px 0 14px 46px;border-top:1px solid var(--rule);position:relative}
.cp-how li::before{content:"\\2665";position:absolute;left:8px;top:12px;font-size:22px;color:var(--rose)}
.cp-how b{font-family:"DM Serif Display",serif;font-weight:400;font-size:21px}
.cp-src{font-size:13px;line-height:1.6;color:#7a6a6d;border-top:1px solid var(--rule);padding-top:14px;margin-top:2em}
@media (max-width:900px){.cp-front::before{display:none}}
@media (max-width:640px){.cp-front{padding:34px 22px 30px}.cp-heart{display:none}.cp-row{grid-template-columns:1fr;gap:4px}}
`,
  body: (ctx) => `<main id="story">
<div class="cp-card"><div class="cp-front">
  <span class="cp-kick">you thought it, so say it</span>
  <h1>The compliment you didn’t give</h1>
  <p>We notice good things about other people all day and keep almost all of them to ourselves. Experiments suggest that is a mistake, and explain why we keep making it.</p>
  <svg class="cp-heart" viewBox="0 0 120 110" aria-hidden="true"><path d="M60 102 C 20 72, 4 52, 8 30 C 12 10, 40 4, 60 28 C 80 4, 108 10, 112 30 C 116 52, 100 72, 60 102 Z" fill="none" stroke="#b4475b" stroke-width="3" stroke-dasharray="6 6"/></svg>
</div></div>

<div class="cp-body">
<p>It happens all the time. The person on the other end of a call asks a genuinely good question. Someone explains something clearly. A stranger practising English has clearly worked hard at it. You notice, you think "that was good", and you say nothing. It would be a bit odd, you tell yourself. They might not care. It might come out wrong.</p>
<p>Psychologists have now put that hesitation to the test, and the results are remarkably consistent: the person who stays quiet is usually wrong about how the compliment would have landed.</p>

<h2>What happens when you actually say it</h2>
<p>In a 2021 paper, the psychologists Erica Boothby and Vanessa Bohns asked people to approach a stranger and pay them a simple compliment. Before doing it, the complimenters predicted how the other person would feel. Afterwards, the recipients reported how they actually felt. The givers consistently underestimated how good the compliment made people feel, and overestimated how bothered or uncomfortable they would be.</p>
<p>The same year, Xuan Zhao and Nicholas Epley published a series of experiments with the blunt title "Insufficiently complimentary?". Again, people underestimated how positive recipients would feel and overestimated how awkward the moment would be. And crucially, those wrong expectations predicted behaviour: the more awkward people expected a compliment to be, the less likely they were to give one.</p>
<div class="cp-gap">
<h3>The gap, in shape</h3>
<div class="cp-row"><span>Giver expects</span><div class="cp-bar cp-exp"><i style="width:48%"></i></div></div>
<div class="cp-row"><span>Recipient feels</span><div class="cp-bar"><i style="width:82%"></i></div></div>
<p class="cp-cap">Illustrative, not data. Across these studies, recipients reported feeling noticeably better than givers predicted.</p>
</div>

<h2>The same mistake, with thank-you notes</h2>
<p>An earlier study by Amit Kumar and Nicholas Epley, published in 2018, looked at gratitude. Participants wrote a short letter thanking someone who had mattered to them, then predicted how the recipient would react. Recipients turned out to be more surprised and more pleased than the writers expected, and far less awkward. Writing the letters took most people only a few minutes.</p>
<p class="cp-note">The thing that stops us is not the other person. It is our forecast of them.</p>

<h2>Why our forecast is so far off</h2>
<p>One explanation that comes up in this research is a difference in focus. When we are about to compliment or thank someone, we worry about competence: will I word this well, will it sound strange, will I trip over it? The person receiving it pays much less attention to the wording. What they register is warmth: someone noticed, and bothered to say so.</p>
<p>That asymmetry makes the moment look riskier from the inside than it is from the outside. You are grading your own delivery; they are simply receiving something kind.</p>

<h2>How to give a good one</h2>
<ol class="cp-how">
<li><b>Be specific.</b> "That is a really good question" beats "you are nice". Specific praise shows you were actually listening.</li>
<li><b>Point at a choice, not a feature.</b> An idea, an effort, a joke, the way someone handled a hard topic. With people you have just met, especially online, leave looks out of it.</li>
<li><b>Mean it.</b> The research is about honest compliments. Flattery used to get something is a different thing, and people tend to sense it.</li>
<li><b>Say it once and move on.</b> No speech needed. A sentence, then back to the conversation.</li>
<li><b>Do not wait for the perfect moment.</b> The perfect moment is usually right after you noticed.</li>
</ol>
<p>On a call with a stranger this is easier than it sounds. You will probably never speak again, which removes most of the stakes, and a kind sentence is often the thing people remember about a conversation long after the topic has gone.</p>
<p>Somebody did something well near you today. What would it cost to tell them?</p>

<p class="cp-src">Sources: Boothby, E. J. &amp; Bohns, V. K. (2021), "Why a simple act of kindness is not as simple as it seems: Underestimating the positive impact of our compliments on others", <em>Personality and Social Psychology Bulletin</em>; Zhao, X. &amp; Epley, N. (2021), "Insufficiently complimentary?: Underestimating the positive impact of compliments creates a barrier to expressing them", <em>Journal of Personality and Social Psychology</em>; Kumar, A. &amp; Epley, N. (2018), "Undervaluing gratitude: Expressers misunderstand the consequences of showing appreciation", <em>Psychological Science</em>.</p>
</div>
${ctx.faq('Questions about compliments')}
${ctx.cta({ title: 'Make someone’s day, right now', sub: 'One tap connects you with a real person. Ask a good question, and if they give a good answer, tell them.' })}
${ctx.ad()}
${ctx.more}
</main>`,
};
