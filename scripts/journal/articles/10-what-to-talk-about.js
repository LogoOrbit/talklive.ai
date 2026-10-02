'use strict';
// Swiss-style list. Inter only, strict grid, oversized red numerals,
// three tiers of questions in columns.
module.exports = {
  slug: 'what-to-talk-about-with-a-stranger',
  tag: 'Conversation',
  h1: '30 Questions That Get Past Small Talk',
  title: 'What to Talk About With a Stranger: 30 Questions Beyond Small Talk | TalkLive Journal',
  description: 'In 1997 a psychologist made strangers feel close in 45 minutes with a list of questions that slowly got deeper. The idea behind it, why "what do you do?" stalls, and thirty questions in three tiers.',
  date: '2026-10-02',
  theme: '#ffffff',
  preload: ['inter-latin-600-normal', 'inter-latin-400-normal'],
  css: `
:root{--paper:#fff;--ink:#0d0d0d;--rule:#0d0d0d;--red:#e10600}
body{font-family:"Inter",Helvetica,Arial,sans-serif}
.s-wrap{max-width:1180px;margin:0 auto;padding:40px 20px 0}
.s-top{display:grid;grid-template-columns:repeat(12,1fr);gap:20px;border-top:12px solid var(--ink);padding-top:22px}
.s-num{grid-column:1/6;font:600 clamp(120px,20vw,250px)/.8 "Inter",sans-serif;color:var(--red);letter-spacing:-.06em}
.s-ttl{grid-column:6/13}
.s-ttl h1{font:600 clamp(34px,5vw,64px)/1 "Inter",sans-serif;letter-spacing:-.035em;margin:0 0 20px}
.s-ttl p{font-size:19px;line-height:1.5;margin:0;max-width:540px}
.s-kick{font:600 12px/1 "Inter",sans-serif;letter-spacing:.14em;text-transform:uppercase;margin-bottom:18px;display:block}
.s-txt{display:grid;grid-template-columns:repeat(12,1fr);gap:20px;margin-top:56px;border-top:1px solid var(--rule);padding-top:20px}
.s-txt h2{grid-column:1/4;font:600 15px/1.3 "Inter",sans-serif;letter-spacing:.02em;margin:0;text-transform:uppercase}
.s-txt div{grid-column:4/11;font-size:18px;line-height:1.65}
.s-txt p{margin:0 0 1em}
.s-tiers{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:56px}
.s-tier{border-top:6px solid var(--ink);padding-top:14px}
.s-tier h3{font:600 26px/1.05 "Inter",sans-serif;letter-spacing:-.02em;margin:0 0 6px}
.s-tier .s-sub{font-size:14px;line-height:1.45;margin:0 0 16px;color:#555}
.s-tier ol{list-style:none;margin:0;padding:0;counter-reset:q var(--start)}
.s-tier li{counter-increment:q;display:grid;grid-template-columns:42px 1fr;padding:11px 0;border-top:1px solid #d7d7d7;font-size:16.5px;line-height:1.4}
.s-tier li::before{content:counter(q,decimal-leading-zero);font:600 14px/1.6 "Inter",sans-serif;color:var(--red)}
.s-end{margin-top:56px;background:var(--ink);color:#fff;padding:34px 30px;display:grid;grid-template-columns:repeat(12,1fr);gap:20px}
.s-end h2{grid-column:1/5;font:600 30px/1.05 "Inter",sans-serif;letter-spacing:-.02em;margin:0;color:var(--red)}
.s-end p{grid-column:5/13;font-size:18px;line-height:1.6;margin:0}
@media (max-width:900px){.s-top,.s-txt,.s-end{grid-template-columns:1fr}.s-num,.s-ttl,.s-txt h2,.s-txt div,.s-end h2,.s-end p{grid-column:auto}.s-tiers{grid-template-columns:1fr}}
`,
  body: (ctx) => `<main id="story" class="s-wrap">
<header class="s-top">
  <div class="s-num" aria-hidden="true">30</div>
  <div class="s-ttl"><span class="s-kick">Conversation / A working list</span><h1>Questions that get past small talk</h1><p>"So, what do you do?" is the most asked and least interesting question in the world. Here is why it stalls, and what to ask instead.</p></div>
</header>

<section class="s-txt"><h2>The 45-minute experiment</h2><div>
<p>In 1997 the psychologist Arthur Aron and colleagues published a study that has since become famous. Pairs of strangers took turns asking each other a set of 36 questions, in a fixed order, for about 45 minutes. The questions started light and became gradually more personal. Afterwards, the pairs reported feeling markedly closer than pairs who spent the same time on small talk.</p>
<p>The magic was not in any single question. It was in the structure: both people disclosed, in turn, and the depth rose slowly enough that it never felt like a leap. Each answer earned the next question.</p>
</div></section>

<section class="s-txt"><h2>Why "what do you do" stalls</h2><div>
<p>Job questions invite a label, not a story. "I'm an accountant." Then what? Good questions have three qualities: they can't be answered in one word, they ask for a preference or a memory rather than a fact, and they give the other person a choice about how deep to go. "What's something you've changed your mind about recently?" can be answered with a film or with a worldview. The other person decides.</p>
<p>Two rules make any list work better. First, answer your own question too; a conversation where only one person discloses is an interview. Second, follow up. The list is a starting point. The best question is almost always a follow-up to the last answer.</p>
</div></section>

<div class="s-tiers">
<section class="s-tier" style="--start:0"><h3>Tier one: warm up</h3><p class="s-sub">Light, easy, low risk. Good for the first few minutes.</p><ol>
<li>What did your day look like before this?</li>
<li>What's something small that made you happy this week?</li>
<li>What's the view from where you are right now?</li>
<li>What were you obsessed with as a kid?</li>
<li>What's a food you'd defend against anyone?</li>
<li>What's a skill you'd learn instantly if you could?</li>
<li>What's the best thing you've watched or read lately?</li>
<li>Where would you go tomorrow if money didn't matter?</li>
<li>What's a weirdly specific thing you're good at?</li>
<li>Morning person or night person, honestly?</li>
</ol></section>
<section class="s-tier" style="--start:10"><h3>Tier two: open up</h3><p class="s-sub">Opinions and stories. Use once there is some rhythm.</p><ol>
<li>What's something you've changed your mind about?</li>
<li>What did you want to be at 15, and what happened?</li>
<li>What's a place that feels like home that isn't your house?</li>
<li>Who taught you something important without meaning to?</li>
<li>What's a decision you're glad you made?</li>
<li>What's a popular opinion you don't share?</li>
<li>What would a perfect ordinary day look like for you?</li>
<li>What do people often get wrong about you?</li>
<li>What's something you're quietly proud of?</li>
<li>What's the best advice you ignored?</li>
</ol></section>
<section class="s-tier" style="--start:20"><h3>Tier three: go deep</h3><p class="s-sub">Only if the moment invites it. Always offer an easy out.</p><ol>
<li>What are you most grateful for right now?</li>
<li>When did you last feel really understood?</li>
<li>What's something you've never told most people?</li>
<li>What would you do differently if no one were watching?</li>
<li>What are you still trying to figure out?</li>
<li>What scares you that you rarely admit?</li>
<li>Who would you call first with great news, and why them?</li>
<li>What does a good life look like to you?</li>
<li>What's a memory you go back to when things are hard?</li>
<li>What do you hope people say about you when you're not there?</li>
</ol></section>
</div>

${ctx.ad()}

<section class="s-end"><h2>Use with care</h2><p>Deep questions are an invitation, not an obligation. If someone answers briefly, take the hint and step back a tier. And notice something odd about the Aron study: the strangers who felt closest were not the ones who were charming. They were simply the ones who took turns being honest. Which makes you wonder how many of the people you have made small talk with for years you have never actually met.</p></section>
${ctx.more}
</main>`,
};
