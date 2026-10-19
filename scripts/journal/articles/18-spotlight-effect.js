'use strict';
// A stage. Near-black curtain, a soft spotlight pooled behind the headline in
// Bebas Neue, Source Serif 4 for the story, and the T-shirt study drawn as an
// audience of dots, most of whom are not looking.
module.exports = {
  slug: 'spotlight-effect-nobody-noticed',
  tag: 'Research',
  h1: 'Nobody Noticed: The Spotlight Effect',
  title: 'The Spotlight Effect: Why You Feel More Awkward Than You Look | TalkLive Journal',
  description: 'You stumble over a word on a call and feel it echo for an hour. Classic experiments show other people notice our slips, nerves and accents far less than we think, and knowing that can make you calmer.',
  date: '2026-10-12',
  theme: '#121014',
  preload: ['bebas-neue-latin-400-normal', 'source-serif-4-latin-400-normal'],
  faq: [
    { q: 'What is the spotlight effect?', a: 'It is the tendency to overestimate how much other people notice our appearance and behaviour. The name comes from a 2000 study by Thomas Gilovich, Victoria Medvec and Kenneth Savitsky.' },
    { q: 'Can people tell when I am nervous?', a: 'Less than you think. Research on the illusion of transparency found that people overestimate how clearly their nerves and feelings show. Observers usually see someone who looks far calmer than they feel.' },
    { q: 'Does knowing about the spotlight effect help?', a: 'It can. In one experiment, speakers who were told that their nerves were less visible than they felt gave talks that observers rated as better, and they felt more relaxed.' },
    { q: 'How do I stop overthinking a conversation afterwards?', a: 'Remember that the other person was mostly thinking about themselves. Instead of replaying your slips, ask what you learned about them. If you cannot remember, that is a good thing to be more curious about next time.' },
  ],
  css: `
:root{--paper:#121014;--ink:#ece6dc;--rule:#2c2730;--lamp:#f3d27a;--mute:#a59c90;--mast:#cfc6b8}
body{font-family:"Source Serif 4",Georgia,serif}
.sp-stage{position:relative;overflow:hidden;padding:80px 20px 70px;text-align:center;background:radial-gradient(ellipse 46% 70% at 50% 0%,rgba(243,210,122,.28),rgba(243,210,122,.06) 55%,transparent 75%)}
.sp-stage::after{content:"";position:absolute;left:0;right:0;bottom:0;height:26px;background:repeating-linear-gradient(90deg,#1c181f 0 18px,#161319 18px 36px);border-top:1px solid var(--rule)}
.sp-kick{font:400 17px/1 "Bebas Neue",sans-serif;letter-spacing:.32em;color:var(--lamp)}
.sp-stage h1{font:400 clamp(54px,11vw,128px)/.9 "Bebas Neue",sans-serif;margin:16px auto 18px;letter-spacing:.01em;max-width:11ch}
.sp-stage p{max-width:560px;margin:0 auto;font-size:19px;line-height:1.6;color:var(--mute)}
.sp-body{max-width:680px;margin:0 auto;padding:46px 20px 0;font-size:18.5px;line-height:1.78}
.sp-body p{margin:0 0 1.1em}
.sp-body h2{font:400 40px/1 "Bebas Neue",sans-serif;letter-spacing:.02em;margin:1.7em 0 .45em;color:var(--lamp)}
.sp-crowd{border:1px solid var(--rule);border-radius:12px;padding:18px;margin:26px 0;background:#18151b}
.sp-crowd svg{width:100%;height:auto;display:block}
.sp-cap{font-size:14px;color:var(--mute);margin:10px 0 0}
.sp-pull{font:400 34px/1.1 "Bebas Neue",sans-serif;letter-spacing:.02em;text-align:center;margin:30px 0;padding:22px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.sp-tips{list-style:none;padding:0;margin:20px 0;display:grid;gap:12px}
.sp-tips li{background:#18151b;border:1px solid var(--rule);border-left:4px solid var(--lamp);border-radius:8px;padding:14px 16px;font-size:17px;line-height:1.6}
.sp-tips b{color:var(--lamp);font-weight:600}
.sp-src{font-size:13px;line-height:1.6;color:var(--mute);border-top:1px solid var(--rule);padding-top:14px;margin-top:2em}
.sp-body a{color:var(--lamp)}
`,
  body: (ctx) => {
    // 40 seats; about a quarter of them turned towards the stage.
    const seats = Array.from({ length: 40 }, (_, i) => {
      const x = 30 + (i % 10) * 58, y = 40 + Math.floor(i / 10) * 40;
      const looking = [2, 6, 11, 15, 18, 23, 27, 31, 34, 38].includes(i);
      return `<circle cx="${x}" cy="${y}" r="11" fill="${looking ? '#f3d27a' : '#3a3440'}"/>`;
    }).join('');
    return `<main id="story">
<header class="sp-stage">
  <div class="sp-kick">Under the lights</div>
  <h1>Nobody noticed</h1>
  <p>You lost your words for a second on a call, and you are still thinking about it. The other person has probably forgotten. Here is the research on why.</p>
</header>

<div class="sp-body">
<p>Almost everyone knows the feeling. Your voice cracks on the first sentence. You forget a simple word in a language you are learning. You laugh at the wrong moment. For the rest of the conversation, and sometimes for the rest of the evening, the moment replays in your head as if everyone saw it in slow motion.</p>
<p>Psychologists have a name for the mismatch between that feeling and reality. It is called the spotlight effect, and the experiment that named it involved a very unfashionable T-shirt.</p>

<h2>The Barry Manilow experiment</h2>
<p>In a study published in 2000, Thomas Gilovich, Victoria Medvec and Kenneth Savitsky at Cornell University asked students to put on a T-shirt with a large picture of the singer Barry Manilow, chosen because students at the time found it embarrassing to be seen in, and walk into a room where other students were sitting. Afterwards, each wearer estimated how many people in the room had noticed the shirt.</p>
<p>The wearers guessed that about half of the room had noticed. In fact only around a quarter could say what was on the shirt. The wearers felt as if they were standing in a spotlight; most of the room had barely looked up.</p>
<div class="sp-crowd">
<svg viewBox="0 0 600 190" role="img" aria-label="An audience of forty dots; ten of them, about a quarter, are highlighted as having noticed">${seats}</svg>
<p class="sp-cap">Illustration: in a room of forty, roughly ten notice. The wearer guessed closer to twenty.</p>
</div>
<p>The researchers found the same pattern with things that were not embarrassing at all, and with people's estimates of how much others noticed their contributions to a group discussion. We are the main character of our own experience, so we assume we are in everyone else's too.</p>

<h2>Your nerves are less visible than they feel</h2>
<p>A related finding is called the illusion of transparency. In a 1998 paper, Gilovich, Savitsky and Medvec showed that people overestimate how much their inner states leak out to others. People telling lies thought their lies were easier to spot than they were. People hiding disgust thought it showed on their faces more than it did.</p>
<p>Nervousness works the same way. Your heart is racing, your mouth is dry, and you are sure it is obvious. To the person listening, you mostly sound like someone talking.</p>
<p class="sp-pull">You feel the spotlight. They see a person.</p>

<h2>Knowing this actually helps</h2>
<p>The most useful study in this line of research came in 2003. Kenneth Savitsky and Thomas Gilovich asked students to give a short talk in front of others. Some speakers were told about the illusion of transparency: that their nervousness was much less visible than they feel it to be. Those speakers felt more relaxed, and the observers rated their talks as better than the talks of speakers who had not been told.</p>
<p>In other words, simply understanding that people cannot see inside you takes some of the pressure off, and less pressure makes you better at the very thing you were nervous about.</p>

<h2>Using it on your next call</h2>
<ol class="sp-tips">
<li><b>Name it.</b> When the replay starts, say to yourself: this is the spotlight effect. The other person noticed far less than I did.</li>
<li><b>Turn the light outward.</b> Attention is limited. The more of it you spend on the other person, their story, their accent, their question, the less is left for watching yourself.</li>
<li><b>Treat slips as normal speech.</b> Everyone pauses, restarts sentences and searches for words. Listeners are used to it; they do it too.</li>
<li><b>Do not apologise for nerves you think are showing.</b> Usually they are not. If you want to mention them, a light "sorry, I am a bit nervous" often makes the other person warmer, not cooler.</li>
<li><b>Review the conversation by what you learned, not how you looked.</b> What did you find out about them? That is the part worth remembering.</li>
</ol>
<p>This connects to another well-studied gap, covered in our piece on <a href="/blog/science-of-talking-to-strangers">the science of talking to strangers</a>: after a conversation, people tend to underestimate how much the other person liked them. You are probably judging yourself more harshly than anyone else in the conversation is.</p>
<p>So the next time a word escapes you mid-sentence, let it go. The spotlight is mostly in your head. Who else could you talk to if you stopped worrying about being watched?</p>

<p class="sp-src">Sources: Gilovich, T., Medvec, V. H. &amp; Savitsky, K. (2000), "The spotlight effect in social judgment: An egocentric bias in estimates of the salience of one's own actions and appearance", <em>Journal of Personality and Social Psychology</em>; Gilovich, T., Savitsky, K. &amp; Medvec, V. H. (1998), "The illusion of transparency: Biased assessments of others' ability to read one's emotional states", <em>Journal of Personality and Social Psychology</em>; Savitsky, K. &amp; Gilovich, T. (2003), "The illusion of transparency and the alleviation of speech anxiety", <em>Journal of Experimental Social Psychology</em>.</p>
</div>
${ctx.faq('Questions about the spotlight effect')}
${ctx.cta({ title: 'Nobody is watching. Just talk.', sub: 'One tap connects you with a real person for a voice call or a text chat. No camera, no profile, no audience.' })}
${ctx.more}
</main>`;
  },
};
