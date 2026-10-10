'use strict';
// /random-text-chat: "/join #strangers". Text chat as the internet's oldest
// way to meet someone new - IRC, SMS, the chat window. A terminal: black
// screen, phosphor green, a scrolling channel log as the hero, sections as
// commands. JetBrains Mono for display, Inter to read.
module.exports = {
  slug: 'random-text-chat',
  name: 'Random Text Chat',
  date: '2026-10-05',
  about: { '@type': 'Thing', name: 'Random text chat' },
  title: 'Random Text Chat with Strangers - Free, No Sign-Up | TalkLive',
  description: 'Free one-to-one text chat with people worldwide: tap to chat and get paired with someone new, no microphone and no sign-up, adults 18+. Why typing to a stranger works, from IRC to now.',
  keywords: 'random text chat, text chat, free text chat, chat without mic, online text chat, text chat with strangers',
  h1: 'Random Text Chat',
  theme: '#0a0f0b',
  preload: ['jetbrains-mono-latin-400-normal', 'inter-latin-400-normal'],
  css: `
:root{--paper:#0a0f0b;--ink:#d7e6da;--rule:#1f3324;--green:#39ff88;--dim:#7c9a83;--amber:#ffcf5c;--mast:#d7e6da}
body{font-family:"Inter",system-ui,sans-serif;background:var(--paper);color:var(--ink)}
.tx-hero{max-width:1180px;margin:0 auto;padding:48px 20px 30px;display:grid;grid-template-columns:1.05fr 1fr;gap:44px;align-items:start}
.tx-prompt{font:400 14px/1 "JetBrains Mono",monospace;color:var(--green)}
.tx-hero h1{font:400 clamp(44px,7vw,92px)/1 "JetBrains Mono",monospace;letter-spacing:-.04em;margin:16px 0 20px;color:#f1fff4}
.tx-hero h1::after{content:"_";color:var(--green);animation:blink 1.1s steps(1) infinite}
@keyframes blink{50%{opacity:0}}
@media (prefers-reduced-motion:reduce){.tx-hero h1::after{animation:none}}
.tx-dek{font-size:20px;line-height:1.6;color:#b9cdbd;margin:0 0 26px}
.tx-log{background:#050806;border:1px solid var(--rule);border-radius:8px;padding:18px;font:400 14px/1.75 "JetBrains Mono",monospace;color:var(--dim);box-shadow:0 0 40px rgba(57,255,136,.06)}
.tx-log .t{color:#4f6b56}
.tx-log .me{color:var(--green)}
.tx-log .them{color:var(--amber)}
.tx-log .sys{color:#6f8ea8}
.c-ctas a{font:400 15px/1 "JetBrains Mono",monospace;padding:16px 20px;border-radius:4px}
.c-talk{background:transparent;color:var(--ink);border:1px solid #3b5a42}
.c-chat{background:var(--green);color:#03140a;order:-1}
.tx-main{max-width:900px;margin:0 auto;padding:10px 20px 0}
.tx-sec{padding:46px 0;border-top:1px dashed var(--rule)}
.tx-cmd{font:400 14px/1 "JetBrains Mono",monospace;color:var(--green);margin:0 0 12px}
.tx-sec h2{font:400 clamp(26px,3.4vw,38px)/1.15 "JetBrains Mono",monospace;letter-spacing:-.03em;margin:0 0 18px;color:#f1fff4}
.tx-sec p{font-size:18.5px;line-height:1.75;margin:0 0 1.05em;color:#c4d6c8}
.tx-sec a{color:var(--green)}
.tx-box{border:1px solid var(--rule);border-radius:6px;padding:16px 18px;margin:20px 0;font-size:16.5px;line-height:1.6;color:#b9cdbd;background:#0d140f}
.tx-box b{font:400 13px/1 "JetBrains Mono",monospace;color:var(--amber);display:block;margin-bottom:8px}
.tx-when{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:18px 0}
.tx-when div{border:1px solid var(--rule);border-radius:6px;padding:14px 16px;font-size:16px;line-height:1.5;color:#c4d6c8}
.tx-when b{font:400 14px/1.3 "JetBrains Mono",monospace;color:var(--green);display:block;margin-bottom:4px}
.c-faq{max-width:900px;margin:0 auto;padding:40px 20px 0}
.c-faq h2{font:400 32px/1.1 "JetBrains Mono",monospace;margin:0 0 12px;color:#f1fff4}
.c-faq details{border-top-color:var(--rule)}
.c-faq summary{font:600 17px/1.4 "Inter",sans-serif}
.c-faq p{font-size:16.5px;line-height:1.65;color:#b9cdbd}
.tx-end{max-width:900px;margin:50px auto 0;padding:34px 20px;border:1px solid var(--rule);border-radius:8px;text-align:center}
.tx-end h2{font:400 clamp(28px,4.4vw,48px)/1.1 "JetBrains Mono",monospace;margin:0 0 10px;color:#f1fff4}
.tx-end p{color:var(--dim);margin:0 0 22px}
.tx-end .c-ctas{justify-content:center}
.ad-card{border-top-color:var(--rule)}
.c-guides a{color:var(--green)}
@media (max-width:860px){.tx-hero{grid-template-columns:1fr}.tx-when{grid-template-columns:1fr}}
`,
  faq: [
    { q: 'Is random text chat free?', a: 'Yes. Text chat on TalkLive is free and needs no account. You can be chatting within seconds at busy times.' },
    { q: 'Do I need a microphone?', a: 'No. Tap to Chat never asks for microphone permission. If you add each other as friends, you can call by voice another time.' },
    { q: 'Are text chats stored?', a: 'Typed messages are kept in a moderation log so reports can be reviewed; it holds the newest 5,000 messages across the site and deletes older ones as new ones arrive. The details are in the Privacy Policy.' },
    { q: 'Will the other person see who I am?', a: 'No. They see a display name, a spirit-animal avatar, any interests you added, an estimated country and your local time - not your name, email, number or IP address.' },
    { q: 'Is text chat suitable for under-18s?', a: 'No. TalkLive is for adults aged 18 and over only.' },
  ],
  body: (c) => `<main id="story">
<section class="tx-hero">
  <div>
    <p class="tx-prompt">talklive:~$ ./chat --random --no-mic</p>
    <h1>Random text chat</h1>
    <p class="tx-dek">Tap to Chat and TalkLive pairs you with someone new for a live, one-to-one text conversation. No microphone, no sign-up, no camera - just a stranger, a cursor and whatever you both decide to type.</p>
    ${c.ctas('Tap to Talk instead', 'Start a text chat')}
  </div>
  <div class="tx-log" aria-label="An example text chat">
    <div class="sys">* An example chat. Connected to Quiet Otter.</div>
    <div><span class="t">[23:41]</span> <span class="me">&lt;you&gt;</span> hi! where are you typing from?</div>
    <div><span class="t">[23:41]</span> <span class="them">&lt;Quiet Otter&gt;</span> lisbon. it's 11:41 and i can't sleep</div>
    <div><span class="t">[23:42]</span> <span class="me">&lt;you&gt;</span> same here, different city. what's keeping you up?</div>
    <div><span class="t">[23:42]</span> <span class="them">&lt;Quiet Otter&gt;</span> honestly? a job interview tomorrow</div>
    <div><span class="t">[23:43]</span> <span class="me">&lt;you&gt;</span> ok, practice round. tell me about yourself 😄</div>
    <div class="sys">* Quiet Otter is typing...</div>
  </div>
</section>

<div class="tx-main">
  <section class="tx-sec">
    <p class="tx-cmd">$ history | head</p>
    <h2>The internet has always met strangers in text</h2>
    <p>Long before video calls, people met strangers by typing. In August 1988 a Finnish student named Jarkko Oikarinen wrote Internet Relay Chat at the University of Oulu, and within a few years thousands of people were typing into channels named after cities, hobbies and nothing in particular, talking all night with people they would never see. On 3 December 1992, an engineer named Neil Papworth sent the first text message to a mobile phone - "Merry Christmas" - to Vodafone's Richard Jarvis, who could read it but not reply. Within a decade, the whole world was texting.</p>
    <p>Text has survived every newer, richer format because it does something they cannot: it lets you talk without making a sound, at your own pace, from anywhere. TalkLive's text chat is the same old idea with the useful parts kept - one stranger at a time, a Next button, and Block when you need it.</p>
  </section>

  <section class="tx-sec">
    <p class="tx-cmd">$ man hyperpersonal</p>
    <h2>Why people can get close surprisingly fast in text</h2>
    <p>In 1996 the communication researcher Joseph Walther published a paper in <em>Communication Research</em> describing what he called "hyperpersonal" communication. Text, he argued, is not simply a poorer version of talking face to face. Because people can take a moment to choose their words, and because the reader fills the gaps in with their imagination, text conversations can become more intimate than equivalent conversations in person - sometimes surprisingly quickly.</p>
    <p>That cuts both ways, and it is worth knowing. It is part of why a midnight text chat with a stranger can feel unexpectedly honest. It is also why people can seem more appealing in text than they are, and why scammers love the format. Enjoy the closeness; keep your details to yourself until you are sure.</p>
    <div class="tx-box"><b>// rule of thumb</b>If someone you have just met in text asks for photos, money, gift cards, codes or to move to another app straight away, that is the whole story. Block, report, and Next.</div>
  </section>

  <section class="tx-sec">
    <p class="tx-cmd">$ when --text-beats-voice</p>
    <h2>When typing is the better choice</h2>
    <div class="tx-when">
      <div><b>Shared room, late night</b>Someone is asleep next to you, or the walls are thin. Text makes no sound.</div>
      <div><b>On the move</b>A bus, a queue, a waiting room. Type between stops.</div>
      <div><b>Thinking in another language</b>Text gives you time to build a sentence - and to look a word up.</div>
      <div><b>Low data or an old phone</b>Text chat is tiny. It runs on entry-level phones and weak connections.</div>
      <div><b>Not ready to be heard</b>Some people want to be anonymous right down to their voice. Text needs no microphone at all.</div>
      <div><b>Want to hear them later?</b>If the conversation is good, add each other as friends - then you can call back by voice another time.</div>
    </div>
    <p>Tap to Chat has its own matching pool, so everyone you meet there wants to type too - nobody is waiting for you to unmute.</p>
  </section>

  <section class="tx-sec">
    <p class="tx-cmd">$ cat privacy.txt</p>
    <h2>What happens to what you type</h2>
    <p>Your match sees your display name, spirit animal, any interests you added, a country estimated from your network and your local time. They do not see your name, email, phone number, IP address or city. Typed messages are delivered through TalkLive's servers and kept in a moderation log so that reports can be reviewed - it holds the newest 5,000 messages across the site and deletes older ones as new ones arrive; the <a href="/privacy">Privacy Policy</a> has the details. The other person can always screenshot, so type as though what you send could be kept.</p>
    <p>TalkLive is for adults 18 and over. Harassment, threats, scams and sexual content without consent lead to bans, and every chat has Report and Block. If you would like to know exactly what anonymity does and does not cover, our <a href="/anonymous-chat">anonymous chat</a> page opens the file.</p>
  </section>
</div>

${c.faq('Frequently typed questions')}
${c.ad()}
<section class="tx-end">
  <h2>$ say hello</h2>
  <p>Someone is staring at a blinking cursor, waiting for a first message.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
