'use strict';
// Research digest in the style of a science journal. IBM Plex Serif + Plex
// Sans, white page, abstract box, numbered findings, superscript citations.
module.exports = {
  slug: 'science-of-talking-to-strangers',
  tag: 'Research',
  h1: 'We Are Bad at Predicting How Talking to Strangers Will Feel',
  title: 'The Science of Talking to Strangers: What Studies Actually Found | TalkLive Journal',
  description: 'Commuters, coffee queues and first conversations: a decade of experiments shows people consistently underestimate how much they will enjoy talking to strangers. Six studies, and their limits.',
  date: '2026-10-02',
  theme: '#ffffff',
  preload: ['ibm-plex-serif-latin-400-normal', 'ibm-plex-serif-latin-600-normal'],
  css: `
:root{--paper:#fff;--ink:#16181d;--rule:#d9dce3;--blue:#0f4c81}
body{font-family:"IBM Plex Serif",Georgia,serif}
.r-wrap{max-width:760px;margin:0 auto;padding:56px 20px 0}
.r-meta{font:500 12px/1.4 "IBM Plex Sans",system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--blue);display:flex;gap:14px;flex-wrap:wrap}
.r-wrap h1{font:600 clamp(32px,4.8vw,48px)/1.12 "IBM Plex Serif",serif;margin:16px 0 18px;letter-spacing:-.01em}
.r-dek{font-size:20px;line-height:1.5;color:#3d4250;margin:0 0 30px}
.r-abs{background:#f3f5f9;border-top:3px solid var(--blue);padding:20px 22px;margin:0 0 36px;font-size:16px;line-height:1.6}
.r-abs h2{font:500 12px/1 "IBM Plex Sans",sans-serif;letter-spacing:.16em;text-transform:uppercase;margin:0 0 10px;color:var(--blue)}
.r-abs p{margin:0}
.r-body{font-size:18px;line-height:1.7}
.r-body p{margin:0 0 1.1em}
.r-body h2{font:600 24px/1.3 "IBM Plex Serif",serif;margin:2em 0 .6em}
.r-find{counter-reset:f;list-style:none;padding:0;margin:0}
.r-find>li{counter-increment:f;position:relative;padding:22px 0 22px 64px;border-top:1px solid var(--rule)}
.r-find>li::before{content:counter(f,decimal-leading-zero);position:absolute;left:0;top:20px;font:500 30px/1 "IBM Plex Sans",sans-serif;color:var(--blue)}
.r-find h3{font:600 19px/1.35 "IBM Plex Serif",serif;margin:0 0 8px}
.r-find p{margin:0 0 .6em;font-size:17px}
.r-study{font:500 12px/1.5 "IBM Plex Sans",sans-serif;color:#5b6170;letter-spacing:.03em}
sup a{font:500 11px/1 "IBM Plex Sans",sans-serif;color:var(--blue);text-decoration:none;padding-left:2px}
.r-limits{border:1px solid var(--rule);padding:18px 22px;margin:2em 0}
.r-limits h2{margin-top:0}
.r-refs{font-size:14px;line-height:1.55;color:#3d4250;border-top:2px solid var(--ink);margin-top:2.4em;padding-top:12px}
.r-refs h2{font:500 12px/1 "IBM Plex Sans",sans-serif;letter-spacing:.16em;text-transform:uppercase;margin:6px 0 12px}
.r-refs ol{padding-left:22px;margin:0}
.r-refs li{margin-bottom:8px}
`,
  body: (ctx) => `<main id="story" class="r-wrap">
<div class="r-meta"><span>Research digest</span><span>Social psychology</span><span>6 studies reviewed</span></div>
<h1>We Are Bad at Predicting How Talking to Strangers Will Feel</h1>
<p class="r-dek">Psychologists have spent more than a decade asking people to talk to strangers and then asking how it went. The results point the same way with unusual consistency.</p>
<section class="r-abs"><h2>In short</h2><p>Across commuter trains, coffee shops and lab conversations, people expected talking to a stranger to be awkward, unwelcome or shallow. When they actually did it, it was usually more pleasant than they predicted, the other person liked them more than they thought, and deeper topics went better than small talk. The catch: most of this research measures short-term mood in face-to-face settings, mostly in North America and Britain.</p></section>
<div class="r-body">
<p>There is a reason this research exists. Ask people whether they would rather sit quietly on their commute or strike up a conversation with the person next to them, and most will choose silence. That is a reasonable-sounding choice. The experiments below tested whether it is the right one.</p>

<h2>What the studies found</h2>
<ol class="r-find">
<li>
<h3>Commuters who talked had a better journey than those who kept to themselves</h3>
<p>In studies on Chicago-area trains and buses, Nicholas Epley and Juliana Schroeder asked some commuters to talk to a stranger, others to keep to themselves, and others to commute as normal. Those who talked reported a more positive journey. Before the experiment, people predicted the opposite.<sup><a href="#ref1">1</a></sup></p>
<p>The researchers also found a likely reason for the mistake: people assumed others would not want to talk to them. In fact, the strangers were generally receptive.</p>
<div class="r-study">Field experiments with commuters &middot; Journal of Experimental Psychology: General, 2014</div>
</li>
<li>
<h3>A real moment with a barista made people feel better than an efficient one</h3>
<p>Gillian Sandstrom and Elizabeth Dunn asked coffee-shop customers either to have a genuine, brief social interaction with the cashier, or to be as efficient as possible. The first group left in a better mood and with a greater sense of belonging.<sup><a href="#ref2">2</a></sup> The interaction cost a few seconds.</p>
<div class="r-study">Field experiment &middot; Social Psychological and Personality Science, 2014</div>
</li>
<li>
<h3>"Weak ties" count for more than we assume</h3>
<p>In a separate study, the same researchers found that on days when people had more interactions with acquaintances and casual contacts, the classmate you nod to or the neighbour you chat with, they tended to feel happier and more connected, over and above their interactions with close friends.<sup><a href="#ref3">3</a></sup></p>
<div class="r-study">Diary studies &middot; Personality and Social Psychology Bulletin, 2014</div>
</li>
<li>
<h3>After a first conversation, people underestimate how much they were liked</h3>
<p>Erica Boothby and colleagues had pairs of strangers talk, then asked each person how much they liked their partner and how much they thought their partner liked them. People consistently believed they were liked less than they actually were. The researchers called it the "liking gap".<sup><a href="#ref4">4</a></sup> We seem to replay our own awkward moments and miss the other person's warmth.</p>
<div class="r-study">Lab and field studies &middot; Psychological Science, 2018</div>
</li>
<li>
<h3>Deep questions go better than people expect</h3>
<p>Michael Kardas, Amit Kumar and Nicholas Epley asked strangers to discuss either shallow or deep questions, such as what they are most grateful for, or a time they cried in front of someone. People expected deep conversations to be more awkward and less connecting than they turned out to be. The researchers argue that this miscalibration keeps many conversations shallower than both people would like.<sup><a href="#ref5">5</a></sup></p>
<div class="r-study">Series of experiments &middot; Journal of Personality and Social Psychology, 2022</div>
</li>
<li>
<h3>Practice shrinks the fear</h3>
<p>In a week-long study, Sandstrom, Boothby and Gus Cooney had participants use an app that set them a "scavenger hunt" of strangers to talk to. Over the week, people's worries about being rejected or not knowing what to say went down, and their predictions about how conversations would go became more accurate.<sup><a href="#ref6">6</a></sup></p>
<div class="r-study">Intervention study &middot; Journal of Experimental Social Psychology, 2022</div>
</li>
</ol>

${ctx.ad()}

<h2>Why our predictions are wrong</h2>
<p>The common thread is not that strangers are wonderful. It is that our forecasts are skewed in a predictable direction. We overestimate how awkward the start will be, underestimate how interested the other person is, and assume everyone else prefers silence. Because we act on those forecasts, by staying quiet, we rarely collect the evidence that would correct them. It is a self-sealing mistake.</p>

<section class="r-limits">
<h2>What this research does not show</h2>
<p>It is worth being honest about the limits. Most of these studies measure mood minutes or hours after a conversation, not long-term wellbeing. Most were run in face-to-face settings, in the US, Canada and the UK, with participants who had agreed to take part in a study. None of them show that talking to strangers online produces the same effects, and none of them suggest that every stranger is safe to talk to.</p>
<p>What they do show is narrower and still useful: if your reason for avoiding a conversation is "they won't want to talk" or "it'll be awkward", the evidence says you are probably more pessimistic than you need to be.</p>
</section>

<p>Which leaves an interesting question. If our instincts about strangers are this reliably wrong, what other social predictions are we getting wrong in the same direction, and never finding out?</p>

<section class="r-refs" aria-label="References">
<h2>References</h2>
<ol>
<li id="ref1">Epley, N., &amp; Schroeder, J. (2014). Mistakenly seeking solitude. <em>Journal of Experimental Psychology: General</em>, 143(5).</li>
<li id="ref2">Sandstrom, G. M., &amp; Dunn, E. W. (2014). Is efficiency overrated? Minimal social interactions lead to belonging and positive affect. <em>Social Psychological and Personality Science</em>, 5(4).</li>
<li id="ref3">Sandstrom, G. M., &amp; Dunn, E. W. (2014). Social interactions and well-being: The surprising power of weak ties. <em>Personality and Social Psychology Bulletin</em>, 40(7).</li>
<li id="ref4">Boothby, E. J., Cooney, G., Sandstrom, G. M., &amp; Clark, M. S. (2018). The liking gap in conversations: Do people like us more than we think? <em>Psychological Science</em>, 29(11).</li>
<li id="ref5">Kardas, M., Kumar, A., &amp; Epley, N. (2022). Overly shallow?: Miscalibrated expectations create a barrier to deeper conversation. <em>Journal of Personality and Social Psychology</em>, 122(3).</li>
<li id="ref6">Sandstrom, G. M., Boothby, E. J., &amp; Cooney, G. (2022). Talking to strangers: A week-long intervention reduces psychological barriers to social connection. <em>Journal of Experimental Social Psychology</em>, 102.</li>
</ol>
</section>
</div>
${ctx.more}
</main>`,
};
