'use strict';
// Field notebook. Literata on lined paper, Caveat margin notes, a dated
// four-week log down the side.
module.exports = {
  slug: 'how-to-practise-a-language-by-speaking',
  tag: 'Languages',
  h1: 'Why You Understand More Than You Can Say',
  title: 'How to Practise a Language by Speaking: Notes on the Output Gap | TalkLive Journal',
  description: 'Most learners can follow far more than they can say. A linguist called this out in 1985. Field notes on why speaking is its own skill, the fear that blocks it, and a four-week routine.',
  date: '2026-10-02',
  theme: '#fdfbf3',
  preload: ['literata-latin-400-normal', 'caveat-latin-500-normal'],
  css: `
:root{--paper:#fdfbf3;--ink:#1f2a33;--rule:#cfd9e0;--margin:#d9534f;--pencil:#2f5d8a}
body{font-family:"Literata",Georgia,serif}
.f-sheet{max-width:880px;margin:40px auto 0;padding:0 20px}
.f-page{background:var(--paper);background-image:linear-gradient(transparent 31px,#dbe5ec 32px);background-size:100% 32px;border:1px solid #e7e2cf;box-shadow:0 1px 0 #e7e2cf,0 8px 30px rgba(31,42,51,.08);padding:48px 48px 40px 96px;position:relative}
.f-page::before{content:"";position:absolute;left:72px;top:0;bottom:0;width:2px;background:var(--margin);opacity:.55}
.f-tab{font:500 26px/1 "Caveat",cursive;color:var(--pencil);transform:rotate(-2deg);display:inline-block;margin-bottom:6px}
.f-page h1{font:700 clamp(30px,4.8vw,46px)/1.15 "Literata",serif;margin:0 0 16px}
.f-dek{font:400 italic 19px/32px "Literata",serif;margin:0 0 32px;color:#3a4651}
.f-body{font-size:18px;line-height:32px}
.f-body p{margin:0 0 32px}
.f-body h2{font:700 21px/32px "Literata",serif;margin:0 0 0;text-transform:uppercase;letter-spacing:.08em}
.f-note{position:absolute;left:-92px;top:4px;width:70px;font:500 18px/1.05 "Caveat",cursive;color:var(--pencil);transform:rotate(-4deg);text-align:right}
.f-rel{position:relative}
.f-hand{font:500 24px/32px "Caveat",cursive;color:var(--pencil)}
.f-log{margin:0 0 32px;padding:0;list-style:none}
.f-log li{display:grid;grid-template-columns:96px 1fr;gap:12px}
.f-log b{font:500 22px/32px "Caveat",cursive;color:var(--margin)}
.f-box{border:2px solid var(--pencil);padding:0 16px;margin:0 0 32px;background:rgba(255,255,255,.6)}
.f-box p{margin:0}
@media (max-width:700px){.f-page{padding:36px 18px 30px 40px}.f-page::before{left:24px}.f-note{display:none}.f-log li{grid-template-columns:72px 1fr}}
`,
  body: (ctx) => `<main id="story" class="f-sheet">
<div class="f-page">
<span class="f-tab">notes &mdash; on speaking</span>
<h1>Why you understand more than you can say</h1>
<p class="f-dek">Almost every language learner hits the same wall: you can follow a film, read an article, even understand a joke, and then someone asks you a simple question and nothing comes out.</p>
<div class="f-body">
<p>This is so common that it barely registers as a puzzle. But it is a puzzle. If you know the words well enough to recognise them instantly, why can't you produce them? The answer is that understanding and speaking are not the same skill run in two directions. They are two different skills that happen to share a vocabulary.</p>

<h2>Note 1. Listening lets you cheat</h2>
<p class="f-rel"><span class="f-note">the key idea!</span>When you listen, context does half the work. You hear "...train... late... sorry..." and you fill in the rest. You can understand a sentence while missing a third of it. When you speak, there is nothing to fill in for you. You need every word, in the right form, in the right order, right now. Speaking exposes exactly the gaps that listening lets you skip over.</p>
<p>In 1985 the Canadian linguist Merrill Swain made a version of this argument, which became known as the output hypothesis. She had studied children in French immersion programmes who had years of rich listening and reading in French, and who understood it very well, but whose spoken and written French still had persistent errors. Her suggestion was that producing language forces you to notice what you do not know. Trying to say something, and finding the hole, is itself a kind of learning.</p>

<h2>Note 2. The real block is usually fear</h2>
<p>Ask learners why they don't speak more and few say "I don't know enough words." They say "I'm embarrassed," "I'll sound stupid," "I don't want to waste their time."</p>
<p>Researchers in language education have a name for the thing that varies here: <em>willingness to communicate</em>. Two learners with the same level of skill can differ hugely in how often they actually open their mouths, and the one who speaks more improves faster. Confidence is not a reward for being good. It is closer to a precondition for getting good.</p>
<div class="f-box"><p class="f-hand">Try this: say "I'm learning, so please be patient" in the first ten seconds. It almost always changes the whole conversation.</p></div>

<h2>Note 3. Mistakes are the material</h2>
<p>A conversation where you make no mistakes taught you very little. A conversation where you got stuck, reached for a word, made something up, and were gently corrected, that one rewired something. The goal is not to avoid errors. It is to make them out loud, where they can be noticed.</p>
<p>One useful habit: keep a small list of things you tried to say and couldn't. After each conversation, look up three of them. Those words will stick better than anything from a textbook, because you needed them.</p>

<h2>Note 4. A four-week routine</h2>
<ul class="f-log">
<li><b>Week 1</b><span>Shadowing, ten minutes a day. Play a short clip and speak along with it, a fraction behind, copying rhythm and melody rather than worrying about meaning.</span></li>
<li><b>Week 2</b><span>Talk to yourself. Narrate what you are doing while cooking or walking. Nobody is listening, so nobody can judge.</span></li>
<li><b>Week 3</b><span>Three short real conversations. Five minutes each is enough. Write down the gaps afterwards.</span></li>
<li><b>Week 4</b><span>One longer conversation on a topic you care about. Notice how much of week three's gap list you used without thinking.</span></li>
</ul>

<h2>Note 5. Who to practise with</h2>
<p>Not just teachers. A patient native speaker is great, but so is another learner, who will be slower and more forgiving. Strangers have a particular advantage: if the conversation goes badly, you never have to see them again. Plenty of learners find a five-minute chat with someone they will never meet less frightening than one with a classmate.</p>
<p>One caution: a random conversation partner is not a tutor. They may correct you wrongly, or not at all, and accents and slang vary enormously. Treat them as practice, not as an authority.</p>

<h2>Note 6. An open question</h2>
<p>Children learning their first language spend roughly a year listening before they say much at all, and nobody expects them to speak correctly. Adults give themselves weeks, then decide they are bad at languages. Is the difference really ability, or is it just that adults are far less willing to sound like beginners?</p>
<p class="f-hand">&rarr; next entry: the words I couldn't find this week.</p>
</div>
</div>
${ctx.ad()}
${ctx.more}
</main>`,
};
