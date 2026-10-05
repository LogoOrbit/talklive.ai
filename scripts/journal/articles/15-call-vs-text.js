'use strict';
// Split screen: a column of grey message bubbles against a live waveform,
// Unbounded headlines over IBM Plex Serif, and a four-rung "bonding ladder".
module.exports = {
  slug: 'why-a-call-beats-texting',
  tag: 'Research',
  h1: 'Why One Phone Call Beats Fifty Texts',
  title: 'Calling vs Texting: Why a Voice Builds Closer Connection | TalkLive Journal',
  description: 'People pick texting because they expect calls to be awkward. Experiments say they are wrong: a voice builds more connection, carries tone that text loses, and even changes stress hormones. What the research shows, and the myth it replaces.',
  date: '2026-10-06',
  theme: '#0f1720',
  preload: ['unbounded-latin-800-normal', 'ibm-plex-serif-latin-400-normal'],
  faq: [
    { q: 'Is calling better than texting?', a: 'For feeling close to someone, usually yes. Experiments find that people feel more connected after talking by voice than after exchanging the same content in text, and that calls are not as awkward as people expect. Text is still better for logistics and for anything people need to read at their own pace.' },
    { q: 'Why do people prefer texting to calling?', a: 'Mostly because they predict a call will be more awkward. Research by Amit Kumar and Nicholas Epley found that prediction is wrong: calls were not more awkward, and they created a noticeably stronger sense of connection.' },
    { q: 'Is it true that 93% of communication is non-verbal?', a: 'No. That figure comes from 1960s experiments by Albert Mehrabian about how people judge feelings when words and tone contradict each other. It was never meant to describe communication in general.' },
    { q: 'Why does texting cause misunderstandings?', a: 'Without voice, tone has to be guessed. In one study, people sending sarcastic or serious messages by email expected to be understood almost 80 percent of the time; readers got it right only about 56 percent of the time, barely better than chance.' },
  ],
  css: `
:root{--paper:#0f1720;--ink:#e7edf3;--rule:#26333f;--mast:#c6d0da;--wave:#3ee08f;--bub:#2a3642;--amber:#ffc65c}
body{font-family:"IBM Plex Serif",Georgia,serif}
.cv-hero{display:grid;grid-template-columns:1fr 1fr;min-height:320px;border-bottom:1px solid var(--rule)}
.cv-side{padding:40px 24px;display:flex;flex-direction:column;justify-content:center;gap:10px;overflow:hidden}
.cv-side.t{align-items:flex-end;background:#121c26}
.cv-side.t span{background:var(--bub);color:#c6d0da;border-radius:16px 16px 4px 16px;padding:8px 12px;font:400 14px/1.3 "IBM Plex Serif",serif;max-width:80%}
.cv-side.t span:nth-child(odd){align-self:flex-start;border-radius:16px 16px 16px 4px;background:#1b2833}
.cv-side.v{align-items:center;background:#0b1a14}
.cv-wave{display:flex;align-items:center;gap:4px;height:120px}
.cv-wave i{width:6px;border-radius:3px;background:var(--wave);animation:cvW 1.2s ease-in-out infinite}
@keyframes cvW{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
.cv-lab{font:800 13px/1 "Unbounded",sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#7f8c99}
.cv-wrap{max-width:720px;margin:0 auto;padding:44px 20px 0}
.cv-wrap h1{font:800 clamp(32px,5.4vw,58px)/1.02 "Unbounded",sans-serif;margin:0 0 18px;letter-spacing:-.02em}
.cv-wrap h1 em{font-style:normal;color:var(--wave)}
.cv-dek{font-size:20px;line-height:1.55;color:#aab6c2;margin:0 0 34px}
.cv-body{font-size:18px;line-height:1.75}
.cv-body p{margin:0 0 1.1em}
.cv-body h2{font:800 24px/1.2 "Unbounded",sans-serif;margin:1.8em 0 .55em;color:#fff}
.cv-ladder{margin:24px 0;display:grid;gap:8px}
.cv-ladder div{display:grid;grid-template-columns:120px 1fr;gap:12px;align-items:center;font-size:15px}
.cv-ladder i{display:block;height:22px;border-radius:6px;background:linear-gradient(90deg,var(--wave),#2bb673)}
.cv-myth{border:2px solid var(--amber);border-radius:12px;padding:18px 20px;margin:26px 0;font-size:17px;line-height:1.6}
.cv-myth b{display:block;font:800 14px/1 "Unbounded",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin-bottom:8px}
.cv-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:22px 0}
.cv-pair div{background:#16222d;border-radius:12px;padding:16px;text-align:center}
.cv-pair b{display:block;font:800 40px/1 "Unbounded",sans-serif;color:var(--wave)}
.cv-pair span{font-size:14px;color:#aab6c2}
.cv-src{font-size:13px;line-height:1.6;color:#7f8c99;border-top:1px solid var(--rule);padding-top:14px;margin-top:2em}
@media (max-width:640px){.cv-side.t span:nth-child(n+6){display:none}.cv-hero{grid-template-columns:1fr;min-height:0}.cv-side{padding:24px 18px}.cv-wave{height:70px}.cv-pair{grid-template-columns:1fr}}
`,
  body: (ctx) => {
    const bubbles = ['hey', 'hey! how was it?', 'fine lol', 'fine good or fine bad?', 'idk just fine', 'ok...', 'are you mad?', 'no?? why'];
    const bars = Array.from({ length: 28 }, (_, i) => `<i style="height:${30 + Math.round(70 * Math.abs(Math.sin(i * 0.7)))}%;animation-delay:${(i % 7) * 0.12}s"></i>`).join('');
    return `<main id="story">
<header class="cv-hero" aria-hidden="true">
  <div class="cv-side t"><span class="cv-lab" style="background:none;padding:0">Fifty texts</span>${bubbles.map(b => `<span>${ctx.esc(b)}</span>`).join('')}</div>
  <div class="cv-side v"><span class="cv-lab">One call</span><div class="cv-wave">${bars}</div></div>
</header>
<div class="cv-wrap">
<h1>Why one phone call beats <em>fifty texts</em></h1>
<p class="cv-dek">We text because we think calls will be awkward. The research says we have that backwards, and it explains why a voice can do in five minutes what a thread cannot do in a day.</p>

<div class="cv-body">
<p>Most people now send far more messages than they make calls, and many dread the phone ringing. The usual explanation is convenience. Text is quiet, asynchronous and easy to fit around other things. All true. But there is a second reason, and it turns out to be a mistake.</p>

<h2>We expect calls to be awkward. They are not.</h2>
<p>In 2021 the psychologists Amit Kumar and Nicholas Epley published a set of experiments with a title that gives away the ending: "It's surprisingly nice to hear you". They asked people to reconnect with an old friend, or to talk with a stranger, either by voice or by text, and before they did, to predict how it would go.</p>
<p>People expected voice to feel more awkward, and they did not expect it to make them feel much closer than text. When they actually did it, voice created a noticeably stronger sense of connection, and it was not more awkward. Yet when asked how they would prefer to get in touch, most still chose text. The fear of awkwardness steered them away from the option that would have made them feel better.</p>

<h2>A ladder of closeness</h2>
<p>A 2013 study by Lauren Sherman, Minas Michikyan and Patricia Greenfield compared four ways for pairs of close friends to talk: in person, by video chat, by voice and by instant message. Afterwards, each person rated how bonded they felt. Bonding was highest in person and lowest by instant message, and the clearest gap was between the ways of talking that include a voice and the one that does not.</p>
<div class="cv-ladder" role="img" aria-label="Bonding from highest to lowest: in person, video, voice, text">
<div><span>In person</span><i style="width:100%"></i></div>
<div><span>Video</span><i style="width:84%"></i></div>
<div><span>Voice</span><i style="width:76%"></i></div>
<div><span>Text</span><i style="width:44%;opacity:.55"></i></div>
</div>
<p>The bars show the ranking, not the study's exact scores. The point is the shape: voice holds on to most of what makes talking feel close, and text loses a lot of it.</p>

<h2>Text loses the tone</h2>
<p>Part of the reason is simple. Tone of voice carries how you mean something, and text has to guess. In a 2005 study, Justin Kruger, Nicholas Epley and colleagues asked people to write short messages that were either sarcastic or serious, and to predict whether readers would tell which was which.</p>
<div class="cv-pair">
<div><b>~78%</b><span>how often senders expected to be understood</span></div>
<div><b>~56%</b><span>how often readers actually got the tone right, close to a coin toss</span></div>
</div>
<p>When the same messages were spoken aloud, listeners did much better. We hear our own tone in our heads while we type, so we assume the reader will too. They do not. That gap is behind a great many "are you mad at me?" texts, including the one at the top of this page.</p>

<h2>A voice can calm the body</h2>
<p>The most striking evidence comes from a 2012 study by Leslie Seltzer and colleagues at the University of Wisconsin. Girls aged 7 to 12 were put through a stressful public-speaking and maths task, and then contacted their mothers in different ways. Those who heard their mother's voice showed a rise in oxytocin, a hormone associated with bonding, and a fall in the stress hormone cortisol. Those who exchanged instant messages with their mother did not show the same pattern; on these measures they looked much like the girls who had no contact at all.</p>
<p>It is one study, with children and parents, and it should not be stretched too far. But it fits everything else: something about hearing a voice reaches people in a way that the same words on a screen do not.</p>

<div class="cv-myth"><b>The 93% myth</b>You may have heard that 93 percent of communication is non-verbal, split between tone of voice and body language. That number comes from experiments by Albert Mehrabian in the 1960s, which looked at how people judged a speaker's feelings when their single words and their tone contradicted each other. Mehrabian himself has said it does not apply to communication in general. Words matter enormously. What text removes is not the meaning; it is the warmth and the tone around it.</div>

<h2>When text is still the right choice</h2>
<p>None of this makes texting bad. It is better for logistics, for anything someone needs to read twice, for people who find speaking hard, and for the first careful steps with someone new. Plenty of good conversations start in text and move to voice when both people are ready.</p>
<p>The research simply suggests a nudge. When you want to feel close to someone, not just inform them, the awkwardness you are bracing for is mostly imaginary, and the connection is real. Who have you been texting for weeks that you have not actually heard?</p>

<p class="cv-src">Sources: Kumar, A. &amp; Epley, N. (2021), "It's surprisingly nice to hear you: Misunderstanding the impact of communication media can lead to suboptimal choices of how to connect with others", <em>Journal of Experimental Psychology: General</em>; Sherman, L. E., Michikyan, M. &amp; Greenfield, P. M. (2013), "The effects of text, audio, video, and in-person communication on bonding between friends", <em>Cyberpsychology: Journal of Psychosocial Research on Cyberspace</em>; Kruger, J., Epley, N., Parker, J. &amp; Ng, Z.-W. (2005), "Egocentrism over e-mail: Can we communicate as well as we think?", <em>Journal of Personality and Social Psychology</em>; Seltzer, L. J., Prososki, A. R., Ziegler, T. E. &amp; Pollak, S. D. (2012), "Instant messages vs. speech: Hormones and why we still need to hear each other", <em>Evolution and Human Behavior</em>; Mehrabian, A. (1971), <em>Silent Messages</em>.</p>
</div>
</div>
${ctx.faq('Questions about calling and texting')}
${ctx.cta({ title: 'Hear a real voice in the next minute', sub: 'No number, no account, no camera. Just a voice on the other end, usually within seconds.' })}
${ctx.ad()}
${ctx.more}
</main>`;
  },
};
