'use strict';
// Broadsheet newspaper feature. Old Standard TT headlines + Libre Caslon Text,
// newsprint grey, dateline, multi-column body, ruled timeline sidebar.
module.exports = {
  slug: 'what-happened-to-omegle',
  tag: 'Report',
  h1: 'The Rise and Fall of Omegle: Fourteen Years of Talking to Strangers',
  title: 'What Happened to Omegle? The Rise and Fall of the Stranger-Chat Site | TalkLive Journal',
  description: 'An 18-year-old built Omegle in his bedroom in 2009. It closed in November 2023 with a note about cost, misuse and a heart attack in his thirties. How it got there, and what it left behind.',
  date: '2026-10-02',
  theme: '#efece4',
  preload: ['old-standard-tt-latin-700-normal', 'libre-caslon-text-latin-400-normal'],
  css: `
:root{--paper:#efece4;--ink:#141414;--rule:#141414}
body{font-family:"Libre Caslon Text",Georgia,serif}
.n-wrap{max-width:1120px;margin:0 auto;padding:0 20px}
.n-flag{border-bottom:4px double var(--ink);padding:26px 0 10px;text-align:center}
.n-flag .n-sec{font:700 13px/1 "Old Standard TT",serif;letter-spacing:.3em;text-transform:uppercase}
.n-flag .n-date{display:flex;justify-content:space-between;font:400 italic 13px/1 "Libre Caslon Text",serif;margin-top:14px;border-top:1px solid var(--ink);padding-top:8px}
.n-head{padding:28px 0 18px;border-bottom:1px solid var(--ink)}
.n-head h1{font:700 clamp(36px,6vw,66px)/1.02 "Old Standard TT",Georgia,serif;margin:0 0 16px;text-align:center}
.n-dek{font:400 italic clamp(18px,2.1vw,22px)/1.45 "Libre Caslon Text",serif;text-align:center;max-width:780px;margin:0 auto}
.n-by{text-align:center;font:700 12px/1 "Libre Caslon Text",serif;letter-spacing:.14em;text-transform:uppercase;margin-top:18px}
.n-grid{display:grid;grid-template-columns:1fr 300px;gap:36px;padding-top:28px}
.n-body{column-count:2;column-gap:32px;column-rule:1px solid rgba(0,0,0,.25);font-size:17px;line-height:1.62;text-align:justify;hyphens:auto}
.n-body p{margin:0 0 .9em;text-indent:1.4em}
.n-body p.n-lead{text-indent:0}
.n-body p.n-lead::first-line{font-variant:small-caps;letter-spacing:.04em}
.n-body h2{column-span:all;font:700 26px/1.2 "Old Standard TT",serif;margin:1.1em 0 .6em;padding-top:.6em;border-top:1px solid var(--ink);text-align:left}
.n-quote{column-span:all;margin:1em 0 1.2em;padding:18px 0;border-top:3px solid var(--ink);border-bottom:1px solid var(--ink);font:400 italic clamp(22px,3vw,30px)/1.3 "Libre Caslon Text",serif;text-align:center}
.n-quote cite{display:block;font:700 12px/1 "Libre Caslon Text",serif;font-style:normal;letter-spacing:.14em;text-transform:uppercase;margin-top:12px}
.n-side{border-left:1px solid var(--ink);padding-left:24px}
.n-side h3{font:700 14px/1 "Old Standard TT",serif;letter-spacing:.2em;text-transform:uppercase;border-bottom:2px solid var(--ink);padding-bottom:8px;margin:0 0 14px}
.n-side ol{list-style:none;margin:0;padding:0}
.n-side li{padding:10px 0;border-bottom:1px dotted rgba(0,0,0,.45);font-size:15px;line-height:1.45}
.n-side b{display:block;font:700 18px/1.2 "Old Standard TT",serif}
.n-box{margin-top:28px;border:1px solid var(--ink);padding:14px 16px;font-size:14px;line-height:1.55}
.n-box strong{font-family:"Old Standard TT",serif;letter-spacing:.1em;text-transform:uppercase;font-size:12px;display:block;margin-bottom:6px}
@media (max-width:900px){.n-grid{grid-template-columns:1fr}.n-side{border-left:0;padding-left:0;border-top:2px solid var(--ink);padding-top:18px}}
@media (max-width:640px){.n-body{column-count:1;text-align:left}.n-flag .n-date{flex-direction:column;gap:6px;align-items:center}}
`,
  body: (ctx) => `<main id="story" class="n-wrap">
<div class="n-flag"><div class="n-sec">Internet &amp; Society &middot; The Long Read</div><div class="n-date"><span>Filed from the archive</span><span>Updated October 2026</span></div></div>
<header class="n-head">
  <h1>The Rise and Fall of Omegle: Fourteen Years of Talking to Strangers</h1>
  <p class="n-dek">A teenager put it online in 2009. Millions used it. It closed with a public letter about money, misuse and exhaustion. The story of Omegle is really a story about a question nobody has fully answered.</p>
  <div class="n-by">By the TalkLive Journal</div>
</header>
<div class="n-grid">
<article class="n-body">
<p class="n-lead">In March 2009, an 18-year-old in Brattleboro, Vermont, named Leif K-Brooks put a website online. It did one thing. You pressed a button and you were connected, by text, to a random person somewhere else in the world. The page called you "You" and called them "Stranger". There was no profile, no photo, no account, no history. When either of you left, it was gone.</p>
<p>That was the whole idea, and it spread almost immediately. Within weeks the site was being written about as a curiosity; within a year it had added video. Its slogan, "Talk to strangers!", turned out to describe a want that the polished social networks of the time had quietly designed away. Facebook was for people you already knew. Omegle was for everyone else.</p>
<p>Later in 2009, a 17-year-old in Moscow, Andrey Ternovskiy, launched Chatroulette, a video-first version of the same impulse. The two sites became a pair in the public imagination: the internet's random door, which could open onto anything.</p>

<h2>What people actually did there</h2>
<p>Much of it was ordinary and rather lovely. Students practised English with people in other countries. Bored teenagers argued about music. Lonely people at three in the morning found someone else who was awake. Musicians played to whoever appeared. The site added an "interests" feature so that people who typed the same keywords were more likely to be matched, and a "question" mode where a third person posed a question for two strangers to discuss.</p>
<p>The trouble was that the same design that made those moments possible also made abuse cheap. Anonymous, instant, and with a camera on, a random-video site attracted people who wanted to expose themselves to strangers, and it attracted people looking for children. The site said users had to be 18, or 13 with parental permission. There was no real way to check.</p>

<blockquote class="n-quote">"Frankly, I don't want to have a heart attack in my 30s."<cite>Leif K-Brooks, in the note that replaced Omegle's homepage, November 2023</cite></blockquote>

<h2>The pressure builds</h2>
<p>Usage grew sharply during the pandemic, when millions of people were at home and short of company, and with it came news investigations into what children were encountering on the site. Lawsuits followed. In one case brought in a federal court in Oregon, a woman said she had been matched on Omegle as an 11-year-old with a man who went on to abuse her for years. In 2022 the judge allowed key claims to proceed, rejecting the argument that the site was automatically shielded by the US law that usually protects platforms from liability for what their users do. The ruling treated the matching design itself as something the company could be responsible for.</p>
<p>Omegle did moderate. It used automated tools and human moderators, and it worked with law enforcement. But moderating live, anonymous, one-to-one video at that scale is extraordinarily hard: the harm happens in seconds, and the evidence leaves with the user.</p>

<h2>November 8, 2023</h2>
<p>On that day the homepage was replaced by a long letter. K-Brooks wrote that he had built Omegle to recreate the experience of meeting people by chance, and that it had done real good. He also wrote that the fight against misuse, and the attacks on the service, had become unsustainable, "financially nor psychologically". Beneath the text was an image of a gravestone. After fourteen years, the site that taught a generation the phrase "talk to strangers" was gone.</p>
<p>Within days, copycat sites were using the name. None of them were Omegle.</p>

<h2>What it leaves behind</h2>
<p>Omegle proved two things at once, and they are hard to hold together. It proved that huge numbers of people want, sometimes badly, to talk to someone outside their own circle. And it proved that a design built only around making that as frictionless as possible will be found and used by the worst people on the internet.</p>
<p>Everything built since sits somewhere on that line. Remove the camera and you remove a large share of the abuse, along with some of the magic. Require accounts and you can ban people for real, but you lose the anonymity that made strangers feel safe to talk to. Verify ages and you need personal data that people do not want to hand over. There is no free option. Every choice moves risk somewhere else.</p>
<p>The question Omegle leaves is not whether people should be able to talk to strangers online. They will, as they always have on trains and in bars. The question is how much friction is the right amount, and who decides.</p>
</article>
<aside class="n-side" aria-label="Timeline">
  <h3>Timeline</h3>
  <ol>
    <li><b>March 2009</b>Omegle launches as a text-only site built by an 18-year-old in Vermont.</li>
    <li><b>November 2009</b>Chatroulette launches in Moscow, video-first.</li>
    <li><b>Around 2010</b>Omegle adds video chat alongside text.</li>
    <li><b>2020&ndash;2021</b>Pandemic-era surge in use, followed by press investigations into child safety.</li>
    <li><b>2022</b>A federal judge in Oregon lets a product-liability case over the matching design go ahead.</li>
    <li><b>8 November 2023</b>Omegle shuts down. Its homepage becomes a farewell letter and a gravestone.</li>
  </ol>
  <div class="n-box"><strong>Worth knowing</strong>Sites using the Omegle name today have no connection to the original service. Treat any of them as an unknown website.</div>
</aside>
</div>
${ctx.ad()}
${ctx.more}
</main>`,
};
