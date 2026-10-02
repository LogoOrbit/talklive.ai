'use strict';
// Technology explainer. Space Grotesk + JetBrains Mono, pale grid paper,
// spec-sheet sidebars and an inline SVG diagram.
module.exports = {
  slug: 'how-random-matchmaking-works',
  tag: 'Explainer',
  h1: 'What Actually Happens in the Two Seconds After You Press "Start"',
  title: 'How Random Chat Matchmaking Works: Queues, Filters and WebRTC | TalkLive Journal',
  description: 'A plain-English tour of a random voice match: the waiting queue, why filters make you wait, the handshake that connects two browsers, and the relay that carries the audio when a direct line is impossible.',
  date: '2026-10-02',
  theme: '#f4f5f0',
  preload: ['space-grotesk-latin-700-normal', 'space-grotesk-latin-400-normal'],
  css: `
:root{--paper:#f4f5f0;--ink:#101112;--rule:#c9ccc2;--hi:#ff4f1f}
body{font-family:"Space Grotesk",system-ui,sans-serif;background-image:linear-gradient(#e6e8e0 1px,transparent 1px),linear-gradient(90deg,#e6e8e0 1px,transparent 1px);background-size:28px 28px}
.t-wrap{max-width:1040px;margin:0 auto;padding:56px 20px 0}
.t-label{font:400 12px/1 "JetBrains Mono",monospace;text-transform:uppercase;letter-spacing:.12em;display:inline-block;background:var(--ink);color:var(--paper);padding:6px 8px}
.t-wrap h1{font:700 clamp(36px,6vw,72px)/.98 "Space Grotesk",sans-serif;letter-spacing:-.03em;margin:22px 0 22px;max-width:15ch}
.t-dek{font-size:21px;line-height:1.45;max-width:640px;margin:0 0 40px}
.t-grid{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:40px}
.t-body{font-size:18px;line-height:1.65;background:var(--paper);padding:4px 0}
.t-body p{margin:0 0 1.1em}
.t-body h2{font:700 28px/1.15 "Space Grotesk",sans-serif;letter-spacing:-.02em;margin:1.8em 0 .5em;display:flex;gap:12px;align-items:baseline}
.t-body h2 span{font:400 13px/1 "JetBrains Mono",monospace;color:var(--hi)}
.t-body code{font:400 .86em "JetBrains Mono",monospace;background:#e3e5dc;padding:1px 5px}
.t-fig{margin:1.6em 0;background:#fff;border:1px solid var(--ink);padding:16px}
.t-fig figcaption{font:400 12px/1.5 "JetBrains Mono",monospace;margin-top:10px;color:#4a4d48}
.t-side{position:sticky;top:20px;align-self:start}
.t-spec{background:#fff;border:1px solid var(--ink);margin-bottom:20px}
.t-spec h3{font:400 12px/1 "JetBrains Mono",monospace;letter-spacing:.1em;text-transform:uppercase;background:var(--ink);color:#fff;margin:0;padding:9px 12px}
.t-spec dl{margin:0;padding:6px 12px 10px}
.t-spec dt{font:400 11px/1 "JetBrains Mono",monospace;text-transform:uppercase;color:#6b6e68;margin-top:10px}
.t-spec dd{margin:4px 0 0;font-size:15px;line-height:1.4}
.t-call{border-left:4px solid var(--hi);padding:4px 0 4px 16px;font-size:20px;line-height:1.4;font-weight:700;margin:1.4em 0}
@media (max-width:860px){.t-grid{grid-template-columns:1fr}.t-side{position:static}}
`,
  body: (ctx) => `<main id="story" class="t-wrap">
<span class="t-label">Explainer / How it works</span>
<h1>What actually happens in the two seconds after you press "Start"</h1>
<p class="t-dek">Random chat looks like magic: one tap and a voice from another continent is in your ear. Underneath, it is a queue, a few rules, and a surprisingly old networking problem.</p>
<div class="t-grid">
<article class="t-body">
<h2><span>01</span>You join a line</h2>
<p>The moment you press the button, your browser tells a server, "I am here and I want a match." The server puts you in a waiting pool, a queue, along with a few facts about your request: text or voice, any country preferences you set, and when you arrived.</p>
<p>If someone compatible is already waiting, you are paired almost instantly. If not, you wait for the next person to arrive. That is the whole reason wait times vary: a random-chat service can only ever match the people who are online at that exact moment. At 3am in one time zone the pool is busy; at 3am in another it is thin.</p>

<h2><span>02</span>Filters are a trade, not a feature</h2>
<p>Every filter shrinks the pool you can be matched from. Ask for one country and you can only be paired with people from that country who are waiting right now. Ask for a country that is asleep, and you may wait a long time.</p>
<p class="t-call">The narrower your request, the smaller the crowd it can be answered from.</p>
<p>Most services handle this with a fallback. On TalkLive, if your country settings have not produced a match after about ten seconds, they are set aside and you are matched with whoever is available, rather than waiting indefinitely. Blocking a specific person is different: someone you have blocked stays blocked.</p>

<h2><span>03</span>The handshake</h2>
<p>Once two people are paired, the server's main job is nearly over. It introduces the two browsers to each other and passes a few short messages back and forth, a process called <em>signalling</em>. Each browser describes what it can do (which audio formats, for instance) and how it might be reached on the network. This is done with a standard built into every modern browser called <code>WebRTC</code>, short for Web Real-Time Communication.</p>

<figure class="t-fig">
<svg viewBox="0 0 640 210" role="img" aria-label="Diagram: two browsers exchange setup messages through a signalling server, then audio flows either directly or through a TURN relay">
<g font-family="JetBrains Mono, monospace" font-size="13" fill="#101112">
<rect x="10" y="80" width="130" height="56" fill="#fff" stroke="#101112" stroke-width="2"/><text x="75" y="113" text-anchor="middle">Your browser</text>
<rect x="500" y="80" width="130" height="56" fill="#fff" stroke="#101112" stroke-width="2"/><text x="565" y="113" text-anchor="middle">Their browser</text>
<rect x="255" y="10" width="130" height="44" fill="#101112"/><text x="320" y="37" text-anchor="middle" fill="#f4f5f0">Signalling</text>
<rect x="255" y="156" width="130" height="44" fill="#ff4f1f"/><text x="320" y="183" text-anchor="middle" fill="#fff">TURN relay</text>
<path d="M140 90 L255 40 M385 40 L500 90" stroke="#101112" stroke-width="2" stroke-dasharray="5 5" fill="none"/>
<path d="M140 108 L500 108" stroke="#101112" stroke-width="2" fill="none"/>
<path d="M140 126 L255 176 M385 176 L500 126" stroke="#ff4f1f" stroke-width="3" fill="none"/>
<text x="320" y="100" text-anchor="middle" font-size="11">direct, if the network allows</text>
<text x="170" y="56" font-size="11">setup only</text>
</g>
</svg>
<figcaption>Fig. 1 &mdash; Setup messages go through the server. The call itself takes the shortest path the network allows: direct, or via a relay.</figcaption>
</figure>

<h2><span>04</span>The thirty-year-old problem</h2>
<p>Ideally the two browsers would then talk directly. Usually they cannot, at least not easily. Most home and mobile connections sit behind a router doing <em>network address translation</em>, which lets many devices share one public address and, as a side effect, makes it hard for anyone outside to reach a specific device inside.</p>
<p>WebRTC tries several tricks to get around this. A small helper called a STUN server tells each browser what its public address looks like from the outside, and the browsers try connecting to each other's addresses at the same time, hoping to punch a hole through. Often it works. On some mobile networks and strict office or university networks, it does not.</p>
<p>For those cases there is a TURN server: a relay in the middle that both sides can reach. The audio goes to the relay and straight back out to the other person. It costs the service bandwidth, which is why some apps skimp on it, but without it a noticeable share of calls would silently fail to connect.</p>

<h2><span>05</span>What is encrypted, and what isn't</h2>
<p>WebRTC audio is encrypted by design; browsers do not allow an unencrypted call. Even when audio passes through a relay, the relay forwards encrypted packets. The service still sees things around the call: that two connections were matched, when, and roughly where from, because that is how matching and abuse reports work.</p>
<p>Encryption also says nothing about the other person. Whoever is on the other end hears everything you say and can record it with their own device. No protocol can prevent that.</p>

<h2><span>06</span>Why "random" is never quite random</h2>
<p>Pure randomness would be a bad experience. A good matcher quietly avoids pairing you with the person you just skipped, with someone you blocked, or with someone you were matched with seconds ago. It may consider language or region. Each rule makes the result less random and, in theory, better.</p>
<p>Which raises a question with no clean answer: how many rules can you add before random chat stops being about chance at all, and starts being about an algorithm deciding who you should meet?</p>
</article>
<aside class="t-side" aria-label="Glossary">
  <div class="t-spec"><h3>Glossary</h3><dl>
    <dt>Queue</dt><dd>The pool of people waiting for a match right now.</dd>
    <dt>Signalling</dt><dd>The short exchange that introduces two browsers.</dd>
    <dt>WebRTC</dt><dd>The browser standard for live audio and video.</dd>
    <dt>NAT</dt><dd>Router trick that hides devices behind one address.</dd>
    <dt>STUN</dt><dd>Tells your browser how it looks from outside.</dd>
    <dt>TURN</dt><dd>A relay for when a direct path is impossible.</dd>
  </dl></div>
  <div class="t-spec"><h3>Rule of thumb</h3><dl><dt>Short wait?</dt><dd>Fewer filters, busier hours.</dd><dt>Call won't connect?</dt><dd>Try another network; strict Wi-Fi often blocks direct paths.</dd></dl></div>
</aside>
</div>
${ctx.ad()}
${ctx.more}
</main>`,
};
