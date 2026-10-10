'use strict';
// /how-it-works: "The Blueprint". The whole path of a TalkLive conversation,
// drawn as an engineering blueprint: Prussian blue, a white grid, a labelled
// SVG diagram and numbered callouts. Space Grotesk for display, JetBrains Mono
// for labels, Literata to read.
module.exports = {
  slug: 'how-it-works',
  name: 'How TalkLive Works',
  date: '2026-10-05',
  about: { '@type': 'Thing', name: 'How TalkLive matching and calls work' },
  title: 'How TalkLive Works - Matching, WebRTC Voice and Text Chat',
  description: 'How TalkLive connects two strangers: the live queues, how matching and preferences work, how WebRTC and the TURN relay carry encrypted audio, how text is delivered, and what "not recorded" does and does not mean.',
  keywords: 'how talklive works, random chat matching, webrtc voice chat, turn relay, how random voice chat works, talklive privacy',
  h1: 'How TalkLive Works',
  theme: '#123a6b',
  preload: ['space-grotesk-latin-700-normal', 'jetbrains-mono-latin-400-normal'],
  css: `
:root{--paper:#123a6b;--ink:#eaf2ff;--rule:rgba(234,242,255,.22);--line:#ffffff;--hi:#ffd166;--mast:#eaf2ff}
body{font-family:"Literata",Georgia,serif;color:var(--ink);background-color:var(--paper);background-image:linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px);background-size:24px 24px}
.bp-title{max-width:1100px;margin:0 auto;padding:46px 20px 20px}
.bp-stamp{display:inline-grid;grid-template-columns:auto auto;border:2px solid var(--line);font:400 12px/1.4 "JetBrains Mono",monospace;text-transform:uppercase}
.bp-stamp span{padding:6px 10px;border-right:1px solid var(--line)}.bp-stamp span:nth-child(even){border-right:0}
.bp-stamp span:nth-child(-n+2){border-bottom:1px solid var(--line)}
.bp-title h1{font:700 clamp(46px,8vw,100px)/.95 "Space Grotesk",sans-serif;letter-spacing:-.04em;margin:22px 0 16px}
.bp-title p{font-size:20px;line-height:1.6;max-width:720px;margin:0 0 24px;color:#cfe0fb}
.c-ctas a{font:400 14px/1 "JetBrains Mono",monospace;text-transform:uppercase;padding:15px 20px;border:2px solid var(--line)}
.c-talk{background:var(--hi);color:#0c2547;border-color:var(--hi)}
.c-chat{color:var(--ink)}
.bp-fig{max-width:1100px;margin:20px auto 0;padding:0 20px}
.bp-fig svg{width:100%;height:auto;border:2px solid var(--line);background:rgba(8,30,60,.35)}
.bp-fig figcaption{font:400 13px/1.5 "JetBrains Mono",monospace;color:#b9cdee;margin-top:8px}
.bp-main{max-width:860px;margin:0 auto;padding:20px 20px 0}
.bp-sec{padding:40px 0;border-bottom:1px dashed var(--rule)}
.bp-sec h2{font:700 clamp(26px,3.4vw,38px)/1.1 "Space Grotesk",sans-serif;letter-spacing:-.02em;margin:0 0 14px;display:flex;gap:14px;align-items:baseline}
.bp-sec h2 span{font:400 14px/1 "JetBrains Mono",monospace;color:var(--hi);border:1.5px solid var(--hi);border-radius:50%;width:34px;height:34px;display:inline-grid;place-items:center;flex:none}
.bp-sec p{font-size:18.5px;line-height:1.75;margin:0 0 1.05em;color:#dbe7fb}
.bp-sec a{color:var(--hi)}
.bp-note{border:1.5px dashed var(--hi);padding:14px 18px;margin:18px 0;font:400 14.5px/1.6 "JetBrains Mono",monospace;color:#f3e3b5}
.c-faq{max-width:860px;margin:0 auto;padding:40px 20px 0}
.c-faq h2{font:700 34px/1.05 "Space Grotesk",sans-serif;margin:0 0 12px}
.c-faq details{border-top-color:var(--rule)}
.c-faq summary{font:700 17px/1.4 "Space Grotesk",sans-serif}
.c-faq p{font-size:16.5px;line-height:1.65;color:#cfe0fb}
.bp-end{max-width:860px;margin:50px auto 0;padding:34px 20px;border:2px solid var(--line);text-align:center}
.bp-end h2{font:700 clamp(30px,4.6vw,50px)/1 "Space Grotesk",sans-serif;letter-spacing:-.03em;margin:0 0 14px}
.bp-end .c-ctas{justify-content:center}
.ad-card{border-top-color:var(--rule)}
.c-guides a,.j-foot a{color:var(--ink)}
`,
  faq: [
    { q: 'Does TalkLive record calls?', a: 'No. Call audio is never recorded or stored. Automated safety checks run on your own microphone during a call and keep a short record only when abuse is detected.' },
    { q: 'Is the audio encrypted?', a: 'Yes. WebRTC encrypts audio in transit between the two browsers, including when it passes through TalkLive\'s TURN relay.' },
    { q: 'Why does matching sometimes ignore my country preference?', a: 'If nobody from your preferred countries is searching, matching widens after a short wait rather than leaving you in the queue indefinitely.' },
    { q: 'Are voice and text users matched with each other?', a: 'No. Voice searches are matched with voice searches, and text with text.' },
    { q: 'Can the other person see my IP address?', a: 'Your match is never shown your IP address. Where calls go through TalkLive\'s TURN relay, the relay also keeps each person\'s network address from the other.' },
  ],
  body: (c) => `<main id="story">
<section class="bp-title">
  <div class="bp-stamp" aria-hidden="true"><span>Drawing</span><span>TL-01</span><span>Revision</span><span>Oct 2026</span></div>
  <h1>How TalkLive works</h1>
  <p>From the moment you press Tap to Talk to the moment you hear a stranger say hello, here is every step - what happens, where your audio and messages go, and what is kept along the way. No marketing, just the drawing.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>

<figure class="bp-fig">
  <svg viewBox="0 0 900 300" role="img" aria-label="Diagram: two browsers are introduced by TalkLive's matching server, then exchange encrypted audio directly or through the TURN relay">
    <g fill="none" stroke="#fff" stroke-width="2">
      <rect x="30" y="110" width="170" height="80" rx="6"/>
      <rect x="700" y="110" width="170" height="80" rx="6"/>
      <rect x="335" y="20" width="230" height="70" rx="6"/>
      <rect x="365" y="210" width="170" height="70" rx="6" stroke-dasharray="6 5"/>
      <path d="M200 130 C 280 90, 300 60, 365 55" stroke-dasharray="4 4"/>
      <path d="M700 130 C 620 90, 600 60, 535 55" stroke-dasharray="4 4"/>
      <path d="M200 170 C 280 210, 300 240, 365 245" stroke="#ffd166"/>
      <path d="M700 170 C 620 210, 600 240, 535 245" stroke="#ffd166"/>
      <path d="M200 150 L 700 150" stroke="#ffd166" stroke-dasharray="2 6"/>
    </g>
    <g font-family="JetBrains Mono, monospace" font-size="13" fill="#eaf2ff" text-anchor="middle">
      <text x="115" y="146">YOUR BROWSER</text><text x="115" y="166" fill="#b9cdee">mic / keyboard</text>
      <text x="785" y="146">THEIR BROWSER</text><text x="785" y="166" fill="#b9cdee">mic / keyboard</text>
      <text x="450" y="50">MATCHING SERVER</text><text x="450" y="70" fill="#b9cdee">queue + signalling + text</text>
      <text x="450" y="240">TURN RELAY</text><text x="450" y="260" fill="#b9cdee">when needed</text>
      <text x="450" y="142" fill="#ffd166">encrypted audio (direct)</text>
      <text x="280" y="95" fill="#b9cdee">1-2</text><text x="620" y="95" fill="#b9cdee">1-2</text>
      <text x="280" y="225" fill="#ffd166">3</text><text x="620" y="225" fill="#ffd166">3</text>
    </g>
  </svg>
  <figcaption>Fig. 1 - Dashed white: matching and signalling through TalkLive's server. Yellow: encrypted audio, directly between browsers or via the TURN relay.</figcaption>
</figure>

<div class="bp-main">
  <section class="bp-sec">
    <h2><span>1</span>You join a live queue</h2>
    <p>Pressing Tap to Talk or Tap to Chat puts you in a queue for that mode. There are separate queues: voice searches are matched with voice searches, and text with text, so nobody in a voice call is waiting for you to type, and nobody in a text chat is surprised by a voice. There are no lobbies or profiles to browse - only the people searching at the same moment as you.</p>
    <p>The matcher looks for another available person whose settings are compatible with yours. Optional preferences - preferred and avoided countries, interests - steer the search. If nobody suitable is searching, matching widens after a short wait instead of leaving you in the queue indefinitely. Blocks are never relaxed: someone you have blocked is never matched with you again.</p>
    <div class="bp-note">NOTE: a country preference cannot reserve a person. It depends on who is online. The country shown for a match is estimated from their network, not verified.</div>
  </section>

  <section class="bp-sec">
    <h2><span>2</span>The server introduces you</h2>
    <p>Once a pair is chosen, both browsers are told about the match, and TalkLive's server passes "signalling" messages between them - the technical details each browser needs to reach the other, such as which audio formats it supports and which network routes it might use. Signalling sets the call up; it does not carry the call. Your match is shown a display name, spirit animal, any interests you added, an estimated country and your local time - never your name, email, number, IP address or city.</p>
  </section>

  <section class="bp-sec">
    <h2><span>3</span>Audio flows, encrypted</h2>
    <p>For voice, the two browsers use WebRTC - the open standard built into every modern browser - to agree a route and start sending audio, compressed with the Opus codec. WebRTC encrypts that audio in transit. Many networks, including most mobile carriers and office or university Wi-Fi, block direct connections between devices, so TalkLive runs a TURN relay: a server that forwards the encrypted audio when a direct route is not possible. Forwarding encrypted packets is not the same as recording them. A relayed call also keeps each person's network address from the other.</p>
    <p>For text, messages travel through TalkLive's server to the other person. That is why typed messages can be kept in a moderation log - so that reports can be reviewed - while call audio is not.</p>
  </section>

  <section class="bp-sec">
    <h2><span>4</span>What "not recorded" means, exactly</h2>
    <p>TalkLive does not record or store call audio. While a call is connected, automated safety checks run on your own microphone to detect abuse - a loudness check on every device, and speech-to-text on desktop browsers - and only a short record is kept, only when a check is triggered. Those checks are the only processing of what is said in a call.</p>
    <p>"Not recorded by TalkLive" does not mean "cannot be recorded". The other person controls their own device, and once audio has been decrypted for playback, no protocol can stop a separate recorder. Speak as though what you say could be kept. The <a href="/safety">Safety Center</a> and <a href="/privacy">Privacy Policy</a> have the full detail.</p>
  </section>

  <section class="bp-sec">
    <h2><span>5</span>The conversation ends when you say so</h2>
    <p>A call or chat continues only while both of you stay. Next ends it for both of you and starts a new search; Hang Up stops searching altogether. Report ends it and sends the conversation's context to the TalkLive team for review; Block ends it and stops that person being matched with you again. If you both added each other as friends, you can message and call back later through your friends list, without exchanging numbers.</p>
    <p>For the story version of these few seconds, read the Journal's <a href="/blog/how-random-matchmaking-works">What Happens in the Two Seconds After You Press Start</a>. For data use and call troubleshooting, see <a href="/random-call">random call</a>.</p>
  </section>
</div>

${c.faq('Technical questions')}
${c.ad()}
<section class="bp-end">
  <h2>Now see it working</h2>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
