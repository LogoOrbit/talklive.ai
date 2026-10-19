'use strict';
// A risograph zine. Sunny yellow stock, Bricolage Grotesque set big and
// slightly off-register for the headline, Literata for the story, and the
// laughter numbers printed as oversized stamps.
module.exports = {
  slug: 'why-we-laugh-in-conversation',
  tag: 'Research',
  h1: 'Why We Laugh in Conversation (It Is Rarely the Jokes)',
  title: 'Why We Laugh in Conversation, According to Research | TalkLive Journal',
  description: 'Most laughter does not follow anything funny. Studies of real conversations show we laugh to connect, that speakers laugh more than listeners, and that people across the world can hear friendship in a laugh.',
  date: '2026-10-12',
  theme: '#ffe45c',
  preload: ['bricolage-grotesque-latin-700-normal', 'literata-latin-400-normal'],
  faq: [
    { q: 'Why do people laugh when nothing is funny?', a: 'Research on everyday conversation suggests most laughter is social rather than a reaction to humour. It signals friendliness, agreement and that the conversation is going well.' },
    { q: 'Do people laugh more when they are with others?', a: 'Much more. In diary research by Robert Provine and colleagues, people laughed around thirty times more often in company than when they were alone.' },
    { q: 'Can people tell real laughter from fake laughter?', a: 'Often, yes. Research led by Sophie Scott and others found that listeners can usually distinguish spontaneous laughter from posed laughter, and the two are produced differently.' },
    { q: 'How can I make a voice call feel warmer?', a: 'Let yourself laugh when something genuinely amuses you, even mildly. On a call there is no smile to see, so laughter and tone carry most of the warmth.' },
  ],
  css: `
:root{--paper:#ffe45c;--ink:#1d1a16;--rule:#1d1a16;--pink:#ff5a8a;--blue:#2d5bff}
body{font-family:Literata,Georgia,serif}
.zn-cover{max-width:1040px;margin:30px auto 0;padding:0 18px}
.zn-cover-in{border:3px solid var(--ink);padding:34px 30px 30px;position:relative;background:var(--paper)}
.zn-issue{display:flex;justify-content:space-between;font:700 13px/1 "Bricolage Grotesque",sans-serif;text-transform:uppercase;letter-spacing:.12em}
.zn-cover h1{font:700 clamp(46px,8.6vw,104px)/.92 "Bricolage Grotesque",sans-serif;margin:22px 0 18px;letter-spacing:-.03em;text-shadow:4px 3px 0 var(--pink)}
.zn-cover p{font-size:20px;line-height:1.55;max-width:44ch;margin:0}
.zn-ha{position:absolute;right:24px;top:70px;font:700 64px/1 "Bricolage Grotesque",sans-serif;color:var(--blue);transform:rotate(8deg);opacity:.9}
.zn-body{max-width:680px;margin:0 auto;padding:44px 20px 0;font-size:18.5px;line-height:1.78}
.zn-body p{margin:0 0 1.1em}
.zn-body h2{font:700 34px/1.08 "Bricolage Grotesque",sans-serif;margin:1.7em 0 .5em;letter-spacing:-.015em}
.zn-stamps{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:26px 0}
.zn-stamp{border:3px solid var(--ink);padding:14px 12px;text-align:center;background:#fff7c2;transform:rotate(var(--r,0deg))}
.zn-stamp b{display:block;font:700 46px/1 "Bricolage Grotesque",sans-serif;color:var(--pink)}
.zn-stamp span{display:block;font-size:14px;line-height:1.4;margin-top:6px}
.zn-quote{border:3px solid var(--ink);background:var(--blue);color:#fff;padding:20px 22px;margin:26px 0;font:700 26px/1.2 "Bricolage Grotesque",sans-serif;box-shadow:6px 6px 0 var(--ink)}
.zn-list{padding-left:0;list-style:none;margin:18px 0}
.zn-list li{border-top:2px dashed var(--ink);padding:12px 0 12px 34px;position:relative}
.zn-list li::before{content:"\\263A";position:absolute;left:2px;top:9px;font-size:22px}
.zn-src{font-size:13px;line-height:1.6;border-top:2px solid var(--ink);padding-top:14px;margin-top:2em}
@media (max-width:640px){.zn-stamps{grid-template-columns:1fr}.zn-ha{display:none}.zn-cover-in{padding:26px 20px}}
`,
  body: (ctx) => `<main id="story">
<div class="zn-cover"><div class="zn-cover-in">
  <div class="zn-issue"><span>TalkLive Journal</span><span>Issue: laughter</span></div>
  <span class="zn-ha" aria-hidden="true">ha!</span>
  <h1>Why we laugh in conversation</h1>
  <p>Think of the last time you laughed with someone. Was it actually a joke? Researchers who listened to thousands of real conversations found it usually is not.</p>
</div></div>

<div class="zn-body">
<p>We tend to think of laughter as the reaction to something funny: a joke is told, the punchline lands, people laugh. That happens. But when scientists stopped asking people about laughter and started listening to it in the wild, a very different picture appeared. Most of the time, we are not laughing at anything. We are laughing with someone.</p>

<h2>Eavesdropping on laughter</h2>
<p>The neuroscientist Robert Provine spent years studying laughter in ordinary life. With his students, he recorded around 1,200 natural "laugh episodes" overheard in public places such as shopping centres and university campuses, noting what was said just before each laugh.</p>
<p>Only a small minority of those comments, somewhere around 10 to 20 per cent, were remotely humorous. The rest were everyday remarks: greetings, plans, small observations. People were laughing to keep the conversation warm, not because anything was funny.</p>
<div class="zn-stamps">
<div class="zn-stamp" style="--r:-2deg"><b>10&ndash;20%</b><span>of comments before a laugh that were even slightly funny</span></div>
<div class="zn-stamp" style="--r:1.5deg"><b>30&times;</b><span>more laughter in company than alone</span></div>
<div class="zn-stamp" style="--r:-1deg"><b>24</b><span>societies where people could hear friendship in a laugh</span></div>
</div>
<p>Provine also found that speakers laugh more than their listeners, roughly half as much again. If laughter were mostly a reaction to humour, you would expect the audience to do most of it. Instead, the person talking punctuates their own sentences with it, a bit like a friendly comma that says "we are fine, keep going".</p>

<h2>A social signal, not a reflex</h2>
<p>In a separate diary study, Provine and Kenneth Fischer asked people to record when they laughed during the day. People laughed around thirty times more often when they were with others than when they were alone. Laughter, it seems, is built for company.</p>
<p>The neuroscientist Sophie Scott at University College London, who has spent much of her career on laughter, describes it as one of the main ways we show that we like and agree with each other. Her work with colleagues also suggests that listeners can usually tell spontaneous laughter from posed, polite laughter, and that the two are produced in different ways.</p>
<p class="zn-quote">Most laughter means: I am with you.</p>
<p>And this seems to be human, not cultural. In a 2016 study led by Gregory Bryant, listeners in 24 societies around the world heard brief clips of two people laughing together. From only a second or two of laughter, they could tell better than chance whether the two laughers were friends or strangers. A laugh carries information about a relationship, and people almost everywhere can read it.</p>

<h2>What this means on a call</h2>
<p>On a voice call you cannot see a smile or a nod. That makes laughter one of the few warmth signals that travels down the line, which may be part of why a call can feel more connected than a page of text. A few practical takeaways:</p>
<ul class="zn-list">
<li>You do not need to be funny. Most laughter follows ordinary remarks, so you only need to be friendly.</li>
<li>Let small laughs out. A light laugh at a mildly amusing moment tells the other person the conversation is going well.</li>
<li>Do not fake it. Forced laughter is easier to detect than we assume, and it can make things feel less genuine.</li>
<li>Notice when they laugh. If someone laughs as they talk, they are probably relaxed, and it is a good moment to ask a slightly more personal question.</li>
<li>Share the laugh. Two people laughing together is the version researchers find most bonding, and the one listeners worldwide recognise as friendship.</li>
</ul>
<p>The next time you find yourself laughing at something that is not funny at all, do not worry that you are being strange. You are doing exactly what laughter evolved to do. Who did you last laugh with, and what were you really saying?</p>

<p class="zn-src">Sources: Provine, R. R. (1993), "Laughter punctuates speech: Linguistic, social and gender contexts of laughter", <em>Ethology</em>; Provine, R. R. (1996), "Laughter", <em>American Scientist</em>; Provine, R. R. &amp; Fischer, K. R. (1989), "Laughing, smiling, and talking: Relation to sleeping and social context in humans", <em>Ethology</em>; Provine, R. R. (2000), <em>Laughter: A Scientific Investigation</em>; Scott, S. K., Lavan, N., Chen, S. &amp; McGettigan, C. (2014), "The social life of laughter", <em>Trends in Cognitive Sciences</em>; Bryant, G. A. et al. (2016), "Detecting affiliation in colaughter across 24 societies", <em>Proceedings of the National Academy of Sciences</em>.</p>
</div>
${ctx.faq('Questions about laughter')}
${ctx.cta({ title: 'Find someone to laugh with', sub: 'One tap connects you with a real person. You do not need jokes, just a friendly hello.' })}
${ctx.more}
</main>`,
};
