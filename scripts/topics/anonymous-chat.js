'use strict';
// /anonymous-chat: "The File". What is and is not known about you, set out as
// a dossier: manila stock, typed exhibits, redaction bars over what nobody
// sees, a red stamp for what TalkLive does keep. Space Grotesk for display,
// Inter to read.
module.exports = {
  slug: 'anonymous-chat',
  name: 'Anonymous Chat',
  date: '2026-10-05',
  about: { '@type': 'Thing', name: 'Anonymous online chat' },
  title: 'Anonymous Chat with Strangers - Free, No Account or Camera | TalkLive',
  description: 'Free anonymous chat with strangers by voice or text - no account, phone number or camera. Exactly what the other person sees, what they never see, and what TalkLive keeps, item by item.',
  keywords: 'anonymous chat, anonymous voice chat, anonymous text chat, chat anonymously, anonymous chat without registration, private chat online',
  h1: 'Anonymous Chat',
  theme: '#e8d6ae',
  preload: ['space-grotesk-latin-700-normal', 'inter-latin-400-normal'],
  css: `
:root{--paper:#d9c69c;--sheet:#f3e7cb;--ink:#1b1a17;--rule:#c9b48a;--stamp:#b3261e;--mast:#1b1a17}
body{font-family:"Inter",system-ui,sans-serif;background:var(--paper) repeating-linear-gradient(0deg,transparent 0 3px,rgba(0,0,0,.015) 3px 4px)}
.an-sheet{max-width:980px;margin:34px auto 0;background:var(--sheet);box-shadow:0 2px 0 var(--rule),0 18px 40px rgba(60,40,10,.18);padding:56px 64px 40px;position:relative}
.an-tab{position:absolute;top:-22px;left:64px;background:var(--sheet);padding:6px 18px;font:700 12px/1 "Space Grotesk",sans-serif;letter-spacing:.16em;text-transform:uppercase;border-radius:6px 6px 0 0}
.an-head{display:flex;justify-content:space-between;gap:20px;font:700 12px/1.6 "Space Grotesk",sans-serif;letter-spacing:.14em;text-transform:uppercase;border-bottom:2px solid var(--ink);padding-bottom:12px}
.an-sheet h1{font:700 clamp(54px,9vw,112px)/.9 "Space Grotesk",sans-serif;letter-spacing:-.04em;margin:30px 0 18px}
.an-stamp{display:inline-block;border:4px solid var(--stamp);color:var(--stamp);font:700 20px/1 "Space Grotesk",sans-serif;letter-spacing:.14em;text-transform:uppercase;padding:6px 12px;transform:rotate(-6deg);position:absolute;right:56px;top:62px;opacity:.85;font-size:15px}
.an-dek{font-size:20px;line-height:1.6;max-width:640px;margin:0 0 26px}
.r{background:var(--ink);color:transparent;border-radius:2px;padding:0 .2em;user-select:none}
.c-ctas a{font:700 16px/1 "Space Grotesk",sans-serif;padding:16px 22px;border-radius:2px}
.c-talk{background:var(--ink);color:var(--sheet)}
.c-chat{color:var(--ink);border:2px solid var(--ink)}
.an-ex{padding:42px 0 6px;border-top:1px dashed var(--rule);margin-top:40px}
.an-ex-label{font:700 13px/1 "Space Grotesk",sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--stamp)}
.an-ex h2{font:700 clamp(28px,3.8vw,42px)/1.05 "Space Grotesk",sans-serif;letter-spacing:-.02em;margin:10px 0 16px}
.an-ex p{font-size:18px;line-height:1.72;margin:0 0 1.05em;max-width:720px}
.an-ex a{color:var(--ink);text-decoration-color:var(--stamp);text-decoration-thickness:2px}
.an-two{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:22px 0}
.an-two h3{font:700 15px/1 "Space Grotesk",sans-serif;letter-spacing:.14em;text-transform:uppercase;margin:0 0 12px}
.an-two ul{list-style:none;padding:0;margin:0}
.an-two li{padding:9px 0;border-bottom:1px solid var(--rule);font-size:16.5px;line-height:1.45}
.an-seen li::before{content:"\\25CF  ";color:var(--ink)}
.an-hidden li{color:#6b6252}
.an-hidden li span{display:inline-block;background:var(--ink);height:.9em;vertical-align:middle;margin-right:8px;border-radius:1px}
.an-kept{border:3px solid var(--stamp);padding:20px 22px;margin:22px 0;position:relative}
.an-kept h3{font:700 15px/1 "Space Grotesk",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--stamp);margin:0 0 10px}
.an-kept dl{display:grid;grid-template-columns:200px 1fr;gap:10px 18px;margin:0;font-size:16px;line-height:1.5}
.an-kept dt{font-weight:600}
.an-kept dd{margin:0}
.an-quote{margin:26px 0;padding:22px 0;border-top:2px solid var(--ink);border-bottom:2px solid var(--ink);font:700 clamp(24px,3vw,34px)/1.2 "Space Grotesk",sans-serif;letter-spacing:-.01em}
.an-quote cite{display:block;font:400 14px/1.5 "Inter",sans-serif;font-style:normal;margin-top:10px;color:#5a5244}
.c-faq{margin-top:40px;border-top:1px dashed var(--rule);padding-top:36px}
.c-faq h2{font:700 36px/1 "Space Grotesk",sans-serif;letter-spacing:-.02em;margin:0 0 12px}
.c-faq details{border-top-color:var(--rule)}
.c-faq summary{font:600 17px/1.4 "Inter",sans-serif}
.c-faq p{font-size:16.5px;line-height:1.65;color:#3e3a31}
.an-end{text-align:center;padding:40px 0 10px;margin-top:40px;border-top:2px solid var(--ink)}
.an-end h2{font:700 clamp(36px,6vw,64px)/1 "Space Grotesk",sans-serif;letter-spacing:-.03em;margin:0 0 12px}
.an-end p{font-size:18px;margin:0 0 22px}
.an-end .c-ctas{justify-content:center}
.c-bar,.c-guides,.j-foot{color:var(--ink)}
@media (max-width:760px){.an-sheet{padding:44px 20px 30px;margin:30px 10px 0}.an-tab{left:20px}.an-stamp{position:static;margin-bottom:10px;font-size:15px}.an-two{grid-template-columns:1fr}.an-kept dl{grid-template-columns:1fr;gap:2px}.an-kept dd{margin-bottom:10px}.an-head{flex-direction:column;gap:4px}}
`,
  faq: [
    { q: 'Is TalkLive really anonymous?', a: 'Other users cannot see your name, email, phone number, IP address or city, and no account is needed. TalkLive itself processes technical data such as your IP address to run the service and enforce bans, as described in the Privacy Policy.' },
    { q: 'Are anonymous chats recorded?', a: 'Call audio is never recorded or stored by TalkLive. Automated safety checks run on your own microphone during a call and keep a short record only when abuse is detected. Typed messages are kept in a moderation log that holds the newest 5,000 messages across the site, with older ones deleted as new ones arrive. The other participant could still record or screenshot on their own device.' },
    { q: 'Can someone find out who I am?', a: 'Not from TalkLive. The other person only sees your display name, spirit animal, any interests you added, an estimated country and your local time - plus anything you choose to tell them.' },
    { q: 'Can I chat anonymously without a microphone?', a: 'Yes. Tap to Chat starts a text conversation and never asks for microphone permission, so your voice is never part of it.' },
    { q: 'Does anonymous mean anything goes?', a: 'No. TalkLive is for adults 18+ and has community guidelines. Harassment, threats, scams and sexual content without consent lead to bans.' },
  ],
  body: (c) => `<main id="story">
<article class="an-sheet">
  <span class="an-tab">File: you</span>
  <div class="an-head"><span>Subject: a TalkLive user</span><span>Status: anonymous</span><span>Reviewed: October 2026</span></div>
  <span class="an-stamp" aria-hidden="true">No name on file</span>
  <h1>Anonymous chat</h1>
  <p class="an-dek">You can talk or text with someone new without giving TalkLive a name, an email address or a phone number, and without a camera. But "anonymous" is a word that deserves its small print, so this page opens the file and shows you, line by line, what the other person sees, what they never see, and what TalkLive itself keeps.</p>
  ${c.ctas('Start an anonymous call', 'Start an anonymous chat')}

  <section class="an-ex">
    <span class="an-ex-label">Exhibit A</span>
    <h2>A long and respectable tradition</h2>
    <p>Speaking without your name attached is not a trick of the internet. In 1787 and 1788, the essays that argued for the new United States Constitution - now known as the Federalist Papers - were published in New York newspapers under a single pen name, "Publius". Their real authors, Alexander Hamilton, James Madison and John Jay, wanted the arguments judged on their merits rather than on who was making them. Pamphleteers, letter-writers and agony-aunt correspondents have been doing the same for centuries.</p>
    <p>In July 1993, just as ordinary people were getting online, <em>The New Yorker</em> ran a Peter Steiner cartoon of a dog at a computer telling another dog: "On the Internet, nobody knows you're a dog." It became the most reproduced cartoon in the magazine's history, because it captured the promise exactly. Online, you could be judged by what you said rather than by what you looked like, where you came from or who you knew.</p>
    <p>TalkLive is built on that promise - and on taking seriously the ways it can go wrong.</p>
  </section>

  <section class="an-ex">
    <span class="an-ex-label">Exhibit B</span>
    <h2>What the other person can and cannot see</h2>
    <div class="an-two">
      <div class="an-seen"><h3>Shown to your match</h3><ul>
        <li>A display name (generated for you unless you change it)</li>
        <li>Your spirit-animal avatar</li>
        <li>Any interests you chose to add</li>
        <li>A country, estimated from your network - not verified</li>
        <li>Your local time, so they know if it is 3 am for you</li>
        <li>Your voice (voice calls) or your messages (text chat)</li>
      </ul></div>
      <div class="an-hidden"><h3>Never shown</h3><ul>
        <li><span style="width:90px"></span>Your real name</li>
        <li><span style="width:120px"></span>Email address</li>
        <li><span style="width:100px"></span>Phone number</li>
        <li><span style="width:80px"></span>IP address</li>
        <li><span style="width:70px"></span>City</li>
        <li><span style="width:110px"></span>Face, room or camera</li>
      </ul></div>
    </div>
    <p>There is no profile page to visit after the conversation, nothing to follow and nothing to search for. When you tap Next or close the tab, the other person has nowhere to find you - unless you both chose to add each other as friends.</p>
    <p>Your voice is the one thing anonymity cannot hide in a call. If being recognised by voice worries you, use <a href="/random-text-chat">text chat</a> instead: it never asks for your microphone at all.</p>
  </section>

  <section class="an-ex">
    <span class="an-ex-label">Exhibit C</span>
    <h2>What TalkLive itself keeps, and why</h2>
    <p>Being anonymous to the person you are talking to is not the same as a service knowing nothing at all. Running a chat service - and keeping people who abuse it out - means processing some data. Here it is, without euphemism:</p>
    <div class="an-kept"><h3>On file</h3><dl>
      <dt>IP address and device info</dt><dd>Received when you connect, as on almost every website. Used to route the conversation, count visits, estimate a country and enforce bans so a banned person cannot simply reload.</dd>
      <dt>Typed messages</dt><dd>Kept in a moderation log so reports can be reviewed; it holds the newest 5,000 messages across the site and deletes older ones as new ones arrive.</dd>
      <dt>Call audio</dt><dd>Never recorded, stored or archived. When a call ends, nothing of it is left on TalkLive's servers.</dd>
      <dt>Automated safety checks</dt><dd>While a call is connected, checks run on your own microphone to detect abuse - a loudness check on every device, and speech-to-text on desktop browsers. A short record is kept only when a check is triggered.</dd>
      <dt>Voice messages to friends</dt><dd>Only between people who added each other as friends: stored so they can be played back, with a transcript where the browser supports it, and may be reviewed for safety.</dd>
      <dt>Optional account</dt><dd>Only if you create one: what you give it, such as your friends list, so it works next time.</dd>
    </dl></div>
    <p>This is a summary. The full detail, including your rights over your data, is in the <a href="/privacy">Privacy Policy</a>.</p>
  </section>

  <section class="an-ex">
    <span class="an-ex-label">Exhibit D</span>
    <h2>Why anonymity needs a Block button</h2>
    <p>In 2004 the psychologist John Suler described what he called the <em>online disinhibition effect</em> (<em>CyberPsychology &amp; Behavior</em>). Without names, faces and consequences, people say things online they would never say in person. Sometimes that is wonderful: Suler called it "benign disinhibition", the shy person who finally opens up, the stranger who admits what they have never told anyone. Sometimes it is not: "toxic disinhibition" is the rudeness, cruelty and harassment that anonymity also makes easier.</p>
    <p class="an-quote">Anonymity is a tool. It protects people who want to talk freely, and it shields people who want to cause harm.<cite>Our reading of Suler's research, and the principle TalkLive is built around</cite></p>
    <p>So TalkLive keeps the first and fights the second. Every call and chat screen has Report and Block. Blocked people are not matched with you again. Reports are reviewed by the TalkLive team, and a ban applies to the device and network rather than to a name - because there is no name to ban. Private by default, accountable when someone causes harm: services that dropped the second half did not last.</p>
  </section>

  <section class="an-ex">
    <span class="an-ex-label">Exhibit E</span>
    <h2>How people actually lose their anonymity</h2>
    <p>Not usually through hacking. Usually by giving it away, one friendly detail at a time: a surname, an Instagram handle, a photo with a recognisable street behind it, the name of a school. A good conversation makes this feel natural. Wait. If the connection is real it will survive a few more conversations, and TalkLive's friends feature lets you keep talking without exchanging any contact details at all.</p>
    <p>Be especially careful with anyone who moves quickly towards money, gift cards, crypto or "verification" codes. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">field guide to chat scams</a> lists the common scripts.</p>
  </section>

  ${c.faq('Questions for the file')}
  <section class="an-end">
    <h2>No name required</h2>
    <p>Say what you think. Keep who you are.</p>
    ${c.ctas('Tap to Talk', 'Tap to Chat')}
  </section>
</article>
${c.ad()}
</main>`,
};
