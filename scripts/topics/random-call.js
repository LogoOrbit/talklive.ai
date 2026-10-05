'use strict';
// /random-call: "The Switchboard". How a call to a stranger is connected,
// from Emma Nutt's switchboard to WebRTC: Bakelite black, cream and brass,
// a jack panel and patch cords in the hero, numbered lines for sections.
// Unbounded for display, IBM Plex Sans (with Inter) to read.
module.exports = {
  slug: 'random-call',
  name: 'Random Call',
  date: '2026-10-05',
  about: { '@type': 'Thing', name: 'Random voice calls over the internet' },
  title: 'Random Call - Call a Random Person Online for Free | TalkLive',
  description: 'Make a free random call to another adult from your browser: no phone number, no app, no calling credit. How the call is connected, how much data it uses, and how to fix the usual problems.',
  keywords: 'random call, random call app, call random people, random phone call online, free random call, call a stranger online',
  h1: 'Random Call',
  theme: '#141414',
  preload: ['unbounded-latin-800-normal', 'inter-latin-400-normal'],
  css: `
:root{--paper:#efe6d2;--ink:#141414;--rule:#d3c6a6;--brass:#c49a45;--red:#c8372d;--green:#3f8a5a;--blue:#2e5c9a;--mast:#efe6d2}
body{font-family:"Inter",system-ui,sans-serif;background:var(--paper)}
.c-bar{background:var(--ink);color:var(--mast);max-width:none}
.rc-hero{background:var(--ink);color:var(--paper);padding:50px 20px 60px}
.rc-hero-in{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.rc-hero h1{font:800 clamp(52px,8.6vw,118px)/.9 "Unbounded",sans-serif;letter-spacing:-.04em;margin:0 0 20px}
.rc-hero h1 span{color:var(--brass)}
.rc-dek{font-size:20px;line-height:1.6;color:#cfc6b2;margin:0 0 26px}
.rc-board{background:#2a2420;border:6px solid #4a3b2c;border-radius:10px;padding:22px;position:relative;box-shadow:inset 0 0 30px rgba(0,0,0,.6)}
.rc-jacks{display:grid;grid-template-columns:repeat(8,1fr);gap:14px}
.rc-jacks i{aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#0c0c0c 0 32%,var(--brass) 34% 52%,#6d5326 54% 100%)}
.rc-board svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.rc-label{display:flex;justify-content:space-between;font:500 11px/1 "Unbounded",sans-serif;color:var(--brass);margin-top:14px;letter-spacing:.1em}
.c-ctas a{font:800 15px/1 "Unbounded",sans-serif;padding:17px 22px;border-radius:40px}
.c-talk{background:var(--brass);color:var(--ink)}
.c-chat{color:var(--paper);border:2px solid #5d5345}
.rc-main{max-width:1000px;margin:0 auto;padding:20px 20px 0}
.rc-line{padding:50px 0;border-bottom:2px solid var(--ink);display:grid;grid-template-columns:120px minmax(0,1fr);gap:30px}
.rc-num{font:800 14px/1.2 "Unbounded",sans-serif;letter-spacing:.06em;text-transform:uppercase}
.rc-num b{display:grid;place-items:center;width:84px;height:84px;border-radius:50%;background:var(--ink);color:var(--brass);font-size:30px;margin-bottom:10px;box-shadow:0 0 0 5px var(--brass)}
.rc-line h2{font:800 clamp(28px,3.6vw,42px)/1.06 "Unbounded",sans-serif;letter-spacing:-.03em;margin:0 0 16px}
.rc-line p{font-size:18.5px;line-height:1.72;margin:0 0 1.05em}
.rc-line a{color:var(--blue)}
.rc-quote{background:var(--ink);color:var(--paper);padding:26px 28px;margin:22px 0;border-left:10px solid var(--brass)}
.rc-quote p{font:500 clamp(20px,2.6vw,28px)/1.35 "Unbounded",sans-serif;margin:0;letter-spacing:-.01em}
.rc-quote cite{display:block;font:400 14px/1.5 "Inter",sans-serif;font-style:normal;margin-top:12px;color:#b8ae98}
.rc-path{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin:22px 0;counter-reset:p}
.rc-path div{padding:16px;border:2px solid var(--ink);margin-left:-2px;background:#f8f2e4;font-size:15.5px;line-height:1.5;position:relative}
.rc-path b{display:block;font:800 14px/1.2 "Unbounded",sans-serif;margin-bottom:6px}
.rc-path div:nth-child(1){border-top:8px solid var(--red)}.rc-path div:nth-child(2){border-top:8px solid var(--brass)}.rc-path div:nth-child(3){border-top:8px solid var(--green)}.rc-path div:nth-child(4){border-top:8px solid var(--blue)}
.rc-data{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:20px 0}
.rc-data div{background:#f8f2e4;border:1px solid var(--rule);padding:16px;border-radius:10px}
.rc-data b{display:block;font:800 22px/1.1 "Unbounded",sans-serif}
.rc-data span{font-size:15px;line-height:1.45;color:#4c4538}
.rc-fix{list-style:none;padding:0;margin:16px 0}
.rc-fix li{display:grid;grid-template-columns:220px 1fr;gap:16px;padding:14px 0;border-top:1px solid var(--rule);font-size:16.5px;line-height:1.55}
.rc-fix b{font:800 14px/1.35 "Unbounded",sans-serif}
.c-faq{max-width:1000px;margin:0 auto;padding:44px 20px 0}
.c-faq h2{font:800 38px/1 "Unbounded",sans-serif;letter-spacing:-.03em;margin:0 0 14px}
.c-faq summary{font:600 17.5px/1.4 "Inter",sans-serif}
.c-faq p{font-size:16.5px;line-height:1.65}
.rc-end{background:var(--ink);color:var(--paper);margin-top:60px;padding:56px 20px;text-align:center}
.rc-end h2{font:800 clamp(36px,6vw,74px)/.95 "Unbounded",sans-serif;letter-spacing:-.04em;margin:0 0 14px}
.rc-end p{color:#cfc6b2;font-size:18px;margin:0 auto 24px;max-width:540px}
.rc-end .c-ctas{justify-content:center}
@media (max-width:860px){.rc-hero-in{grid-template-columns:1fr}.rc-line{grid-template-columns:1fr;gap:10px}.rc-num b{width:62px;height:62px;font-size:22px}.rc-path,.rc-data{grid-template-columns:1fr 1fr}.rc-fix li{grid-template-columns:1fr;gap:4px}}
`,
  faq: [
    { q: 'Is a random call free?', a: 'Yes. Calls on TalkLive are free and use your internet connection, so there are no calling charges, international or otherwise. Normal mobile data rates apply if you are not on Wi-Fi.' },
    { q: 'Will the other person get my phone number?', a: 'No. Calls run inside the browser over WebRTC. No phone number is involved on either side.' },
    { q: 'Do I need to install an app?', a: 'No. TalkLive works in any modern browser on Android, iPhone, Windows, Mac and Linux. You can add it to your home screen if you want an app-like icon.' },
    { q: 'Are random calls recorded?', a: 'TalkLive does not record or store call audio. The other participant could record on their own device, so avoid sharing sensitive information.' },
    { q: 'Can I choose who I call?', a: 'Not for a random call - that is the point. You can set preferences such as country, and you can call friends you have added directly.' },
  ],
  body: (c) => `<main id="story">
<section class="rc-hero">
  <div class="rc-hero-in">
    <div>
      <h1>Random <span>call</span></h1>
      <p class="rc-dek">A phone call where you do not choose who picks up. It runs in your browser over Wi-Fi or mobile data, so there is no phone number to share, no calling credit to spend and no app to install. One tap, and somewhere in the world, another adult's line rings.</p>
      ${c.ctas('Place a random call', 'Text someone now')}
    </div>
    <div class="rc-board" aria-hidden="true">
      <div class="rc-jacks">${'<i></i>'.repeat(24)}</div>
      <svg viewBox="0 0 400 160" preserveAspectRatio="none"><path d="M30 20 C 80 150, 220 150, 300 70" stroke="#c8372d" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M130 70 C 170 170, 300 160, 370 20" stroke="#3f8a5a" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M80 120 C 140 60, 250 40, 330 120" stroke="#2e5c9a" stroke-width="5" fill="none" stroke-linecap="round"/></svg>
      <div class="rc-label"><span>LINE 1</span><span>EXCHANGE: WORLD</span><span>LINE 24</span></div>
    </div>
  </div>
</section>

<div class="rc-main">
  <section class="rc-line">
    <div class="rc-num"><b>1</b>Line one</div>
    <div>
      <h2>"Mr. Watson - come here"</h2>
      <p>The first telephone call is usually dated to 10 March 1876, when Alexander Graham Bell, in a Boston workshop, spoke into his transmitter and his assistant Thomas Watson heard him in the next room. Bell's preferred greeting for answering the new device was "Ahoy". It was Thomas Edison who pushed for "hello" instead, and Edison won - which is why, a century and a half later, almost every call in the world still begins with a word that was barely a greeting before the telephone.</p>
      <div class="rc-quote"><p>"Mr. Watson - come here - I want to see you."</p><cite>Alexander Graham Bell, as recorded in his laboratory notebook, 10 March 1876</cite></div>
      <p>For decades, every call was connected by hand. In 1878 Emma Nutt became the first woman hired as a telephone operator, in Boston, and for years switchboards like the one above were run by operators who plugged a cord into one jack and then another to join two strangers' lines. The automatic exchange came later: Almon Strowger, a Kansas City undertaker, patented his automatic switch in 1891 - according to the story he liked to tell, because he suspected a local operator of putting his customers through to a rival.</p>
    </div>
  </section>

  <section class="rc-line">
    <div class="rc-num"><b>2</b>Line two</div>
    <div>
      <h2>How a random call is connected today</h2>
      <p>TalkLive is a switchboard with the operator taken out and the phone numbers taken away. When you tap to talk, your browser joins a queue of people searching at the same moment. When another adult is available and your settings are compatible, TalkLive connects you - and then gets out of the way, letting your two browsers carry the conversation themselves.</p>
      <div class="rc-path">
        <div><b>Match</b>TalkLive's server pairs you with another person from the live queue.</div>
        <div><b>Handshake</b>Your browsers exchange the details they need to reach each other.</div>
        <div><b>Route</b>WebRTC finds a path: direct where it can, through a relay where it must.</div>
        <div><b>Talk</b>Audio flows, encrypted, between the two of you. Nothing is recorded.</div>
      </div>
      <p>The technology underneath is WebRTC, an open standard built into every modern browser. Many networks - mobile carriers, offices, university Wi-Fi - block direct connections between devices. When that happens, the call is relayed through TalkLive's TURN server instead. Either way, the audio is encrypted in transit and neither route records it. The Journal walks through the whole process in <a href="/blog/how-random-matchmaking-works">what happens in the two seconds after you press Start</a>.</p>
      <p>Because this is ordinary internet traffic, a call to someone across the world costs exactly the same as a call to someone across the street: nothing beyond your normal data.</p>
    </div>
  </section>

  <section class="rc-line">
    <div class="rc-num"><b>3</b>Line three</div>
    <div>
      <h2>How much data does a call use?</h2>
      <p>Voice is compressed with Opus, an open codec standardised in 2012 and designed for speech over unreliable networks. It adapts to your connection, squeezing harder when the signal is weak. In practice, a voice-only call is one of the lightest real-time things you can do online.</p>
      <div class="rc-data">
        <div><b>Voice call</b><span>Roughly tens of megabytes per hour, depending on your connection</span></div>
        <div><b>Video call</b><span>Many times more - which is one reason TalkLive has no camera</span></div>
        <div><b>Text chat</b><span>Tiny. The cheapest way to talk when your bundle is low</span></div>
      </div>
      <p>If you are on a limited mobile plan, voice is the cheapest way to have a live conversation online, and switching to text costs almost nothing.</p>
    </div>
  </section>

  <section class="rc-line">
    <div class="rc-num"><b>4</b>Line four</div>
    <div>
      <h2>When the line is bad</h2>
      <p>Most call problems are one of five things, and all five have quick fixes.</p>
      <ul class="rc-fix">
        <li><b>No microphone prompt, or "permission denied"</b><span>Open your browser's site settings for talklive.app, set Microphone to Allow and reload. On iPhone and iPad, also check Settings, then your browser, then Microphone.</span></li>
        <li><b>You hear them, they cannot hear you</b><span>Another app may be holding the microphone. Close other calling or recording apps, and check the right input is selected if you use a headset.</span></li>
        <li><b>Echo</b><span>Use headphones. Echo almost always means the other person's voice is coming out of your speaker and back into your microphone.</span></li>
        <li><b>Choppy or robotic sound</b><span>A weak connection. Move closer to the router, or switch between Wi-Fi and mobile data.</span></li>
        <li><b>Silence on both sides</b><span>Tap Next. Very restrictive networks occasionally block even relayed calls; changing network usually fixes it.</span></li>
      </ul>
    </div>
  </section>

  <section class="rc-line">
    <div class="rc-num"><b>5</b>Line five</div>
    <div>
      <h2>Answering a call you did not plan</h2>
      <p>A random call is spontaneous on both ends, so give the other person a second to settle - they may still be putting headphones in. Start with your hello (Edison would approve) and a quick "can you hear me okay?". Mute yourself if you need to step away rather than leaving someone listening to your television. If the call is not going anywhere, Next ends it for both of you and starts a new search; Hang Up stops calling altogether.</p>
      <p>Keep it a call between strangers: no surname, address, workplace or social handles in the first conversation, and never money or codes for anyone. Every call has Report and Block, and blocked people are never matched with you again. If calls make you nervous in general, you are in good company - <a href="/blog/phone-anxiety-how-to-get-comfortable-talking">why your heart races when the phone rings</a> is a gentle place to start. And if you would rather not use your voice at all, <a href="/random-text-chat">text chat</a> needs no microphone.</p>
    </div>
  </section>
</div>

${c.faq('Calls to the exchange')}
${c.ad()}
<section class="rc-end">
  <h2>Your line is open</h2>
  <p>No number to dial. No credit to buy. Just hello.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
