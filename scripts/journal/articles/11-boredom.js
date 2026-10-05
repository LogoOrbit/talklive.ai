'use strict';
// The waiting room. Pale institutional grey, Instrument Serif over Inter, a
// fifteen-minute clock running down the margin: the length of the empty-room
// study at the heart of the piece.
module.exports = {
  slug: 'why-am-i-so-bored',
  tag: 'Psychology',
  h1: 'Why Boredom Hurts So Much, and What It Is Trying to Tell You',
  title: 'Why Am I So Bored? The Psychology of Boredom and What Helps | TalkLive Journal',
  description: 'In one experiment, people chose to give themselves electric shocks rather than sit alone with their thoughts for fifteen minutes. What boredom really is, why scrolling rarely fixes it, and what does.',
  date: '2026-10-06',
  theme: '#ecebe7',
  preload: ['instrument-serif-latin-400-normal', 'inter-latin-400-normal'],
  faq: [
    { q: 'Why am I bored even though I have my phone?', a: 'Boredom is not a lack of stimulation; it is wanting to be engaged and not managing it. Scrolling supplies novelty without asking anything of you, so attention never settles and the restless feeling comes back as soon as you stop.' },
    { q: 'Is boredom bad for you?', a: 'Occasional boredom is normal and useful: it is a signal that what you are doing no longer satisfies you. Being bored very often is linked with low mood and impulsive choices, so it is worth treating as information rather than ignoring.' },
    { q: 'What should I do when I am bored at night?', a: 'Pick something that asks for a little effort and gives something back: a short conversation, a few pages of a book, a small task you can finish. Engagement beats stimulation, and talking to a real person is one of the quickest ways to get it.' },
    { q: 'Can boredom make you more creative?', a: 'Some studies suggest so. People given a dull task before a creative one sometimes produce more ideas, possibly because a bored mind starts to wander and look for something better to do.' },
  ],
  css: `
:root{--paper:#ecebe7;--ink:#1d1d1b;--rule:#cfccc4;--tick:#c2410c}
body{font-family:"Inter",system-ui,sans-serif}
.bd-wrap{max-width:1040px;margin:0 auto;padding:70px 20px 0;display:grid;grid-template-columns:160px minmax(0,680px);gap:46px}
.bd-clock{position:sticky;top:30px;align-self:start;font:400 54px/1 "Instrument Serif",serif;color:var(--tick);text-align:right}
.bd-clock small{display:block;font:500 11px/1.4 "Inter",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#7a776e;margin-top:8px}
.bd-k{font:500 12px/1 "Inter",sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#7a776e}
.bd-wrap h1{font:400 clamp(40px,6vw,76px)/1 "Instrument Serif",serif;margin:16px 0 22px;letter-spacing:-.01em}
.bd-wrap h1 em{color:var(--tick)}
.bd-dek{font-size:20px;line-height:1.55;color:#4b4943;margin:0 0 40px}
.bd-body{font-size:18px;line-height:1.75}
.bd-body p{margin:0 0 1.1em}
.bd-body h2{font:400 36px/1.1 "Instrument Serif",serif;margin:1.7em 0 .4em}
.bd-room{border:1px solid var(--ink);background:#f6f5f2;padding:26px;margin:28px 0;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;text-align:center}
.bd-room b{display:block;font:400 54px/1 "Instrument Serif",serif;color:var(--tick)}
.bd-room span{font-size:14px;line-height:1.4;color:#4b4943}
.bd-list{list-style:none;padding:0;margin:20px 0;counter-reset:b}
.bd-list li{counter-increment:b;border-top:1px solid var(--rule);padding:14px 0 14px 54px;position:relative}
.bd-list li::before{content:counter(b,decimal-leading-zero);position:absolute;left:0;top:12px;font:400 30px/1 "Instrument Serif",serif;color:var(--tick)}
.bd-list b{display:block}
.bd-src{font-size:13px;line-height:1.6;color:#7a776e;border-top:1px solid var(--rule);padding-top:14px;margin-top:2em}
@media (max-width:820px){.bd-wrap{grid-template-columns:1fr;gap:0;padding-top:40px}.bd-clock{position:static;text-align:left;font-size:40px;margin-bottom:18px}.bd-room{grid-template-columns:1fr}}
`,
  body: (ctx) => `<main id="story"><div class="bd-wrap">
<div class="bd-clock" aria-hidden="true">15:00<small>Time alone in an empty room</small></div>
<div>
<div class="bd-k">Psychology &middot; The Journal</div>
<h1>Why boredom hurts so much, and what it is <em>trying to tell you</em></h1>
<p class="bd-dek">Given the choice, a lot of people would rather hurt themselves than sit with nothing to do. That says less about laziness than about what boredom is for.</p>

<div class="bd-body">
<p>In 2014 a team led by the psychologist Timothy Wilson published a simple experiment in the journal <em>Science</em>. They asked people to put away their phones and everything else, sit alone in a plain room, and entertain themselves with their own thoughts for somewhere between six and fifteen minutes. Most found it unpleasant. Many could not keep their minds on anything.</p>
<p>In one version of the study, the room contained a button that delivered a mild electric shock. Earlier, everyone had felt the shock and most said they would pay money to avoid feeling it again. Left alone for fifteen minutes, two-thirds of the men and a quarter of the women pressed it anyway. One man pressed it 190 times.</p>
<div class="bd-room">
<div><b>15</b><span>minutes alone with nothing but your thoughts</span></div>
<div><b>67%</b><span>of men chose to shock themselves at least once</span></div>
<div><b>25%</b><span>of women did the same</span></div>
</div>
<p>The finding is often told as a joke about modern attention spans. It is better read as evidence of how strongly the mind wants something to engage with, and how uncomfortable it is when it cannot find it.</p>

<h2>What boredom actually is</h2>
<p>Boredom is easy to mistake for having nothing to do. Researchers define it differently. In an influential 2012 paper, John Eastwood and colleagues described it as "the unengaged mind": the unpleasant state of wanting to be absorbed in something satisfying and being unable to manage it. You can be bored with a full calendar, and perfectly content with an empty one.</p>
<p>That definition explains a lot. It is why a long meeting can be more boring than a quiet afternoon, and why the same task can feel engaging one day and unbearable the next. The trouble is not the amount of stimulation. It is the gap between the attention you want to spend and anything worth spending it on.</p>
<p>The philosophers and psychologists James Danckert and Andreas Elpidorou go a step further. In their 2020 book <em>Out of My Skull</em>, they argue that boredom is a signal, much like pain or hunger: a push to stop doing what you are doing and find something that matters more. Like any signal, it can be answered well or badly.</p>

<h2>Why scrolling rarely fixes it</h2>
<p>The most common answer to boredom now is the phone, and it is easy to see why. A feed never runs out. Every flick of the thumb brings something new. But novelty is not the same as engagement. Scrolling asks almost nothing of you: no effort, no choices that matter, nothing to build on. Attention skims instead of settling, and when you put the phone down the restless feeling is often still there, sometimes worse.</p>
<p>A useful test is to ask what the next ten minutes will leave behind. A feed leaves very little. A conversation, a finished task, or a page of something you chose to read leaves something, even if it is small.</p>

<h2>Boredom is worse alone</h2>
<p>When researchers have asked people about their boredom as they go about their day, a consistent pattern appears: people report being bored more often when they are on their own than when they are with someone. That fits the definition. Other people are unpredictable, responsive and demanding in small ways, which is exactly what an unengaged mind is missing. Even a short exchange asks you to listen, react and say something back.</p>
<p>It also fits a finding from elsewhere in this Journal: people consistently underestimate how much they will enjoy talking to someone new. Boredom and that prediction work together. You feel flat, you assume a conversation will be effort for little reward, and you reach for the phone instead.</p>

<h2>What actually helps</h2>
<p>If boredom is a signal that you want engagement, the fix is anything that offers a little challenge and a little meaning, and gives you some control. Some options that tend to work:</p>
<ol class="bd-list">
<li><b>Talk to someone.</b> A real conversation is the fastest route to engagement most of us have. It does not have to be long. Five minutes with a friend, or with a stranger, is enough to change the state you are in.</li>
<li><b>Finish something small.</b> Wash the cup, answer the email, fix the thing. Completion gives a small sense of control that a feed never does.</li>
<li><b>Raise the difficulty.</b> Boredom often means a task is too easy. Add a constraint: do it faster, do it in another language, do it better than last time.</li>
<li><b>Let your mind wander on purpose.</b> In one study by Sandi Mann and Rebekah Cadman, people who first did something dull, such as copying numbers out of a phone book, then came up with more ideas in a creative task. A walk without headphones can do the same job.</li>
<li><b>Notice the pattern.</b> If you are bored at the same time every day, that is information. Late evenings alone are the classic example, and they are worth planning for rather than drifting through.</li>
</ol>

<h2>When boredom is something more</h2>
<p>Feeling bored now and then is normal. Feeling that nothing is interesting any more, for weeks, is different. Losing interest in things you used to enjoy can be a sign of depression, and it is worth talking to a doctor about. That is not a failure of willpower; it is a health problem with good treatments.</p>
<p>For ordinary boredom, though, the experiment with the shock button has a hopeful reading. The mind would rather do almost anything than nothing. Give it something worth doing, and it will usually take it. So: what would you choose to do with the next fifteen minutes, if a feed were not an option?</p>

<p class="bd-src">Sources: Wilson, T. D. et al. (2014), "Just think: The challenges of the disengaged mind", <em>Science</em>; Eastwood, J. D. et al. (2012), "The unengaged mind: Defining boredom in terms of attention", <em>Perspectives on Psychological Science</em>; Danckert, J. &amp; Elpidorou, A. (2020), <em>Out of My Skull: The Psychology of Boredom</em>; Mann, S. &amp; Cadman, R. (2014), "Does being bored make us more creative?", <em>Creativity Research Journal</em>; Chin, A. et al. (2017), "Bored in the USA: Experience sampling and boredom in everyday life", <em>Emotion</em>.</p>
</div>
${ctx.faq('Questions about boredom')}
${ctx.cta({ title: 'Bored right now? Talk to someone new', sub: 'Five minutes with a real person beats fifty minutes of scrolling. One tap, matched in seconds.' })}
</div>
</div>
${ctx.ad()}
${ctx.more}
</main>`,
};
