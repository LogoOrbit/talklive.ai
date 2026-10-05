'use strict';
// /random-voice-chat: "The Case for the Voice". What a voice carries that
// text and video do not, argued from research. Deep ink-blue with a cyan
// waveform running through the hero and between sections. Space Grotesk for
// display, Literata to read.
function wave(n, seed) {
  let h = '';
  for (let i = 0; i < n; i++) {
    const v = Math.abs(Math.sin(i * 0.37 + seed) * Math.cos(i * 0.11 + seed * 2));
    h += `<i style="height:${Math.round(12 + v * 88)}%"></i>`;
  }
  return `<div class="vc-wave" aria-hidden="true">${h}</div>`;
}

module.exports = {
  slug: 'random-voice-chat',
  name: 'Random Voice Chat',
  date: '2026-10-05',
  about: { '@type': 'Thing', name: 'Random voice chat' },
  title: 'Random Voice Chat - Free, Audio Only, No Camera | TalkLive',
  description: 'Free random voice chat for adults: one tap to talk with someone new, audio only, no camera or account. Why a voice carries more than text or video, according to the research.',
  keywords: 'random voice chat, voice chat, live voice chat, free voice chat, voice chat with strangers, audio chat',
  h1: 'Random Voice Chat',
  theme: '#0d1b2e',
  preload: ['space-grotesk-latin-700-normal', 'literata-latin-400-normal'],
  css: `
:root{--paper:#0d1b2e;--ink:#e8eef6;--rule:#21385a;--cyan:#38e1d0;--soft:#9fb3cc;--mast:#e8eef6}
body{font-family:"Literata",Georgia,serif;background:var(--paper);color:var(--ink)}
.vc-hero{max-width:1180px;margin:0 auto;padding:56px 20px 20px}
.vc-kick{font:700 13px/1 "Space Grotesk",sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--cyan)}
.vc-hero h1{font:700 clamp(56px,10vw,150px)/.88 "Space Grotesk",sans-serif;letter-spacing:-.05em;margin:16px 0 22px}
.vc-hero-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:40px;align-items:end}
.vc-dek{font-size:21px;line-height:1.6;color:#c9d6e6;margin:0 0 26px}
.vc-specs{list-style:none;margin:0;padding:0;border-top:1px solid var(--rule)}
.vc-specs li{display:flex;justify-content:space-between;gap:20px;padding:12px 0;border-bottom:1px solid var(--rule);font:500 15px/1.3 "Space Grotesk",sans-serif}
.vc-specs li span:last-child{color:var(--cyan)}
.vc-wave{display:flex;align-items:center;gap:clamp(1px,.4vw,5px);overflow:hidden;height:110px;margin:40px auto 10px;max-width:1180px;padding:0 20px}
.vc-wave i{flex:1;background:linear-gradient(180deg,var(--cyan),#1e6d8f);border-radius:3px;min-width:1px}
.c-ctas a{font:700 16px/1 "Space Grotesk",sans-serif;padding:17px 24px;border-radius:6px}
.c-talk{background:var(--cyan);color:#06222a}
.c-chat{color:var(--ink);border:1px solid #3c5b84}
.vc-main{max-width:1180px;margin:0 auto;padding:0 20px}
.vc-sec{display:grid;grid-template-columns:300px minmax(0,1fr);gap:48px;padding:50px 0;border-top:1px solid var(--rule)}
.vc-sec h2{font:700 clamp(28px,3.4vw,40px)/1.05 "Space Grotesk",sans-serif;letter-spacing:-.03em;margin:0;position:sticky;top:20px}
.vc-sec h2 small{display:block;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:var(--cyan);margin-bottom:12px}
.vc-sec p{font-size:19px;line-height:1.75;margin:0 0 1.1em;color:#d6e0ec}
.vc-sec a{color:var(--cyan)}
.vc-find{background:#12263f;border-left:4px solid var(--cyan);padding:18px 22px;margin:22px 0;font-size:16.5px;line-height:1.6;color:#c9d6e6}
.vc-find b{font:700 13px/1 "Space Grotesk",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--cyan);display:block;margin-bottom:8px}
.vc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:20px 0}
.vc-grid div{border:1px solid var(--rule);border-radius:8px;padding:18px;font-size:16px;line-height:1.55;color:#c9d6e6}
.vc-grid b{display:block;font:700 19px/1.2 "Space Grotesk",sans-serif;color:var(--ink);margin-bottom:6px}
.c-faq{max-width:1180px;margin:0 auto;padding:46px 20px 0}
.c-faq h2{font:700 40px/1 "Space Grotesk",sans-serif;letter-spacing:-.03em;margin:0 0 14px}
.c-faq details{border-top-color:var(--rule)}
.c-faq summary{font:500 18px/1.4 "Space Grotesk",sans-serif}
.c-faq p{font-size:17px;line-height:1.65;color:#c9d6e6}
.vc-end{text-align:center;padding:30px 20px 10px}
.vc-end h2{font:700 clamp(40px,7vw,86px)/.92 "Space Grotesk",sans-serif;letter-spacing:-.05em;margin:0 0 16px}
.vc-end p{color:var(--soft);font-size:18px;margin:0 0 24px}
.vc-end .c-ctas{justify-content:center}
.ad-card{border-top-color:var(--rule)}
.c-guides a{color:var(--cyan)}
@media (max-width:900px){.vc-hero-grid,.vc-sec{grid-template-columns:1fr}.vc-sec{gap:14px}.vc-sec h2{position:static}.vc-grid{grid-template-columns:1fr}}
`,
  faq: [
    { q: 'Is TalkLive voice chat free?', a: 'Yes. Random voice matching is free and needs no account. Wait time depends on who is in the live queue and any filters you set.' },
    { q: 'Do I need headphones?', a: 'They are recommended because they prevent echo and improve sound, but they are not required.' },
    { q: 'Is there video?', a: 'No. TalkLive is intentionally audio-only: no camera, no face, far less data.' },
    { q: 'Are my calls recorded?', a: 'TalkLive does not record or store call audio. Automated safety checks run on your own microphone during a call and keep a short record only when abuse is detected. The other participant could record on their own device, so do not share sensitive information.' },
    { q: 'Can I use it on mobile data?', a: 'Yes. Voice-only chat uses little data and works on most mobile networks.' },
  ],
  body: (c) => `<main id="story">
<section class="vc-hero">
  <span class="vc-kick">Audio only &middot; one to one</span>
  <h1>Random voice chat</h1>
  <div class="vc-hero-grid">
    <div>
      <p class="vc-dek">Press one button and talk, voice to voice, with another adult somewhere in the world. No camera, no typing, no account. It sounds old-fashioned. It turns out to be the format that carries the most of a person, and this page makes the case.</p>
      ${c.ctas('Start a voice chat', 'Text someone now')}
    </div>
    <ul class="vc-specs">
      <li><span>Format</span><span>Live voice, one to one</span></li>
      <li><span>Camera</span><span>Never</span></li>
      <li><span>Sign-up</span><span>Not needed</span></li>
      <li><span>Price</span><span>Free</span></li>
      <li><span>Recording by TalkLive</span><span>None</span></li>
      <li><span>Ages</span><span>18+ only</span></li>
    </ul>
  </div>
</section>
${wave(64, 1)}

<div class="vc-main">
  <section class="vc-sec">
    <h2><small>Finding one</small>A voice makes you seem more human</h2>
    <div>
      <p>In 2017, Juliana Schroeder, Michael Kardas and Nicholas Epley ran an experiment with a simple twist. People heard or read the same words - recruiters evaluating job candidates, for instance, or people listening to someone explain their views on a contested topic. When they <em>heard</em> the person's voice, they judged them as more thoughtful, more competent and more intelligent than when they read the identical words as text. The paper's title says it plainly: "The Humanizing Voice: Speech Reveals, and Text Conceals, a More Thoughtful Mind" (<em>Psychological Science</em>, 2017).</p>
      <p>It is not hard to see why. Text strips out everything except the words. A voice carries hesitation, warmth, a laugh halfway through a sentence, the pause before something difficult. In text, a stranger is a username and a handful of lines. In a voice, they are obviously a person.</p>
      <div class="vc-find"><b>What this means for you</b>The person on the other end is far more likely to give you the benefit of the doubt when they can hear you. So are you. Strangers seem less strange out loud.</div>
    </div>
  </section>

  <section class="vc-sec">
    <h2><small>Finding two</small>Voice alone can beat voice plus video</h2>
    <div>
      <p>The obvious assumption is that more channels mean more understanding: voice is good, voice plus a face must be better. The psychologist Michael Kraus tested that in a series of studies published in <em>American Psychologist</em> in 2017. People interacted under different conditions and then tried to judge what their partner had been feeling. Those in voice-only conditions read other people's emotions more accurately than those who could both see and hear them.</p>
      <p>The likeliest explanation is attention. Without a face to watch - or to perform for - people concentrate on what they hear, and the voice is where a great deal of emotional information lives. Faces are also easier to control than voices. We can hold a smile; it is much harder to keep tiredness or delight out of how we sound.</p>
      <p>That is the main reason TalkLive has no camera. The other reasons are practical: no room to tidy, no appearance to be judged on, a fraction of the data, and no route for the kind of misuse that dogged random video chat. <a href="/voice-chat-vs-video-chat">Voice chat vs video chat</a> sets out the full comparison, including where video genuinely wins.</p>
    </div>
  </section>

  <section class="vc-sec">
    <h2><small>In practice</small>What a random voice chat is like</h2>
    <div>
      <p>You press Tap to Talk, allow the microphone once, and join the live queue. When another adult is searching and your settings are compatible, the call connects - usually within seconds at busy times, a little longer in the quiet hours. You hear each other immediately. There is no ringing, no profile to look at, just "hi".</p>
      <div class="vc-grid">
        <div><b>Next</b>Ends this call for both of you and starts a new search. Nobody is owed an explanation.</div>
        <div><b>Chat while you talk</b>Send a word, a name or a link by text without interrupting the call.</div>
        <div><b>Add a friend</b>If it clicks, add each other and call back another day - no numbers swapped.</div>
      </div>
      <p>Optional preferences - country, interests - can steer the search, but they depend on who is online, and nobody's identity, age or location is verified. Most people find that global matching gives the most interesting calls anyway. TalkLive is busiest between about 15:00 and 21:00 UTC, measured from our own match counts; if you would like the local version, the country guides for <a href="/countries/india">India</a>, <a href="/countries/united-kingdom">the UK</a> and <a href="/countries/united-states">the US</a> convert it.</p>
    </div>
  </section>

  <section class="vc-sec">
    <h2><small>The technology</small>Encrypted, relayed, never recorded</h2>
    <div>
      <p>Calls use WebRTC, the open standard behind most browser calling, with the Opus codec compressing speech so that it holds up on weak connections and costs little data. Where a direct route between the two browsers is blocked - common on mobile networks and office Wi-Fi - the audio is relayed through TalkLive's TURN server. Either way it is encrypted in transit. <a href="/how-it-works">How TalkLive works</a> draws the whole path.</p>
      <p>TalkLive does not record or store call audio. Automated safety checks run on your own microphone during a call - a loudness check on every device, speech-to-text on desktop browsers - and keep a short record only when abuse is detected. The other person can still record on their own device, so speak as though what you say could be kept: no surname, address, workplace or social handles with someone you have just met. Every call has Report and Block, and blocked people are never matched with you again.</p>
    </div>
  </section>
</div>
${wave(64, 4)}
${c.faq('Questions about voice chat')}
${c.ad()}
<section class="vc-end">
  <h2>Say hello out loud</h2>
  <p>Somebody is listening for a voice right now.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
