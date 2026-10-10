'use strict';
// /safety: "Safety Center". Plain, calm and scannable, like a good public
// information leaflet: white, signal green and a warning amber, five rules up
// front, then "if this happens, do this" cards. IBM Plex Serif for display,
// Inter to read.
const CASES = [
  ['Someone asks for money, gift cards, crypto or a code', 'It is a scam, whatever the story - an emergency, an investment, a prize, a "verification". Do not pay, do not share the code. Block, report, Next.'],
  ['Someone asks for photos or to move to another app', 'You never have to. People who push for either in the first minutes are rarely looking for conversation. Say no, or simply leave.'],
  ['Someone is sexual, threatening or cruel', 'End it immediately - you do not need to wait until a rule is "clearly" broken. Report it so the team can act, and Block so you are never matched again.'],
  ['Someone seems to be under 18', 'TalkLive is for adults only. End the conversation and report it, so it can be reviewed.'],
  ['Someone threatens to share something about you', 'Do not pay and do not negotiate. Stop replying, keep any evidence you can, report it here, and report it to the police where you live.'],
  ['You are struggling, or thinking about hurting yourself', 'Please talk to someone trained. Call or text 988 in the US, Samaritans on 116 123 in the UK and Ireland, Tele-MANAS on 14416 in India, or find a helpline at findahelpline.com.'],
];

module.exports = {
  slug: 'safety',
  name: 'Safety Center',
  date: '2026-10-05',
  about: { '@type': 'Thing', name: 'Safety on TalkLive' },
  title: 'TalkLive Safety Center - Privacy, Reporting and Blocking',
  description: 'How to stay safe on TalkLive: five rules, what to do if a conversation goes wrong, what TalkLive records and does not record, how reporting and blocking work, and where to get help.',
  keywords: 'talklive safety, is talklive safe, random chat safety, voice chat safety tips, report and block, online chat safety',
  h1: 'Safety Center',
  theme: '#ffffff',
  preload: ['ibm-plex-serif-latin-600-normal', 'inter-latin-400-normal'],
  css: `
:root{--paper:#ffffff;--ink:#14231c;--rule:#dfe6e2;--green:#0a7d4f;--amber:#b86e00;--tint:#eef7f2;--mast:#14231c}
body{font-family:"Inter",system-ui,sans-serif;background:var(--paper)}
.c-bar{border-bottom:1px solid var(--rule)}
.sf-hero{background:var(--tint);border-bottom:1px solid var(--rule)}
.sf-hero-in{max-width:1100px;margin:0 auto;padding:50px 20px 40px;display:grid;grid-template-columns:1.2fr 1fr;gap:40px;align-items:center}
.sf-badge{display:inline-flex;align-items:center;gap:8px;font:600 13px/1 "Inter",sans-serif;color:var(--green);background:#fff;border:1px solid #bfe0cf;border-radius:999px;padding:8px 14px}
.sf-hero h1{font:600 clamp(44px,7vw,84px)/1 "IBM Plex Serif",serif;margin:16px 0 16px;letter-spacing:-.02em}
.sf-hero p{font-size:19px;line-height:1.6;margin:0 0 22px}
.sf-rules{list-style:none;margin:0;padding:0;background:#fff;border:1px solid var(--rule);border-radius:14px;counter-reset:r}
.sf-rules li{counter-increment:r;display:grid;grid-template-columns:44px 1fr;gap:6px;padding:14px 18px;border-bottom:1px solid var(--rule);font-size:16px;line-height:1.45}
.sf-rules li:last-child{border-bottom:0}
.sf-rules li::before{content:counter(r);display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--green);color:#fff;font:600 15px/1 "Inter",sans-serif}
.sf-rules b{display:block}
.c-ctas a{font:600 15px/1 "Inter",sans-serif;padding:14px 20px;border-radius:8px}
.c-talk{background:var(--green);color:#fff}
.c-chat{background:#fff;color:var(--ink);border:1px solid var(--rule)}
.sf-main{max-width:1100px;margin:0 auto;padding:10px 20px 0}
.sf-sec{padding:42px 0;border-bottom:1px solid var(--rule)}
.sf-sec h2{font:600 clamp(28px,3.6vw,40px)/1.1 "IBM Plex Serif",serif;margin:0 0 14px;letter-spacing:-.01em}
.sf-sec>p{font-size:18px;line-height:1.7;margin:0 0 1em;max-width:760px}
.sf-sec a{color:var(--green)}
.sf-cases{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin:20px 0}
.sf-case{border:1px solid var(--rule);border-left:6px solid var(--amber);border-radius:10px;padding:16px 18px}
.sf-case h3{font:600 17px/1.35 "Inter",sans-serif;margin:0 0 6px}
.sf-case p{margin:0;font-size:15.5px;line-height:1.55;color:#33443b}
.sf-case:last-child{border-left-color:var(--green)}
.sf-table{width:100%;border-collapse:collapse;font-size:15.5px;margin:16px 0}
.sf-table th,.sf-table td{text-align:left;padding:12px 14px;border-bottom:1px solid var(--rule);vertical-align:top;line-height:1.5}
.sf-table thead th{background:var(--tint);font-weight:600}
.sf-table td:first-child{font-weight:600;width:220px}
.sf-scroll{overflow-x:auto}
.sf-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:18px 0}
.sf-steps div{background:var(--tint);border-radius:12px;padding:16px;font-size:15.5px;line-height:1.55}
.sf-steps b{font:600 19px/1.2 "IBM Plex Serif",serif;display:block;margin-bottom:6px}
.c-faq{max-width:1100px;margin:0 auto;padding:40px 20px 0}
.c-faq h2{font:600 34px/1.1 "IBM Plex Serif",serif;margin:0 0 12px}
.c-faq summary{font:600 17px/1.4 "Inter",sans-serif}
.c-faq p{font-size:16px;line-height:1.65;color:#33443b}
.sf-end{max-width:1100px;margin:46px auto 0;padding:0 20px}
.sf-end-in{background:var(--ink);color:#fff;border-radius:16px;padding:36px 30px;display:grid;grid-template-columns:1.3fr 1fr;gap:20px;align-items:center}
.sf-end h2{font:600 clamp(26px,3.6vw,38px)/1.15 "IBM Plex Serif",serif;margin:0}
.sf-end p{margin:8px 0 0;color:#b8cbc1}
.sf-end .c-chat{background:transparent;color:#fff;border-color:#4b5f55}
@media (max-width:860px){.sf-hero-in,.sf-end-in{grid-template-columns:1fr}.sf-cases,.sf-steps{grid-template-columns:1fr}.sf-table td:first-child{width:auto}}
`,
  faq: [
    { q: 'Is TalkLive safe?', a: 'No chat with strangers can be made completely safe. TalkLive removes video, needs no personal details, keeps adults only, and puts Report and Block on every screen. Your own choices - especially keeping personal details private - matter most.' },
    { q: 'Does TalkLive record calls?', a: 'No. Call audio is never recorded or stored. Automated safety checks run on your own microphone during a call and keep a short record only when abuse is detected. The other person could record on their own device.' },
    { q: 'What happens when I report someone?', a: 'The conversation ends, the report is reviewed by the TalkLive team, and depending on what happened the person may be warned or banned. Bans apply to the device and network.' },
    { q: 'What does blocking do?', a: 'It ends the conversation and stops that person being matched with you again.' },
    { q: 'How old do I have to be?', a: 'TalkLive is for adults aged 18 and over only.' },
    { q: 'Is TalkLive a crisis service?', a: 'No. If you are in danger or thinking about harming yourself, contact a crisis line such as 988 in the US or Samaritans on 116 123 in the UK and Ireland, or your local emergency number.' },
  ],
  body: (c) => `<main id="story">
<section class="sf-hero"><div class="sf-hero-in">
  <div>
    <span class="sf-badge">&#9679; Adults 18+ &middot; No camera &middot; Report and Block on every screen</span>
    <h1>Safety Center</h1>
    <p>No service that connects strangers can promise complete safety, and we will not pretend otherwise. What we can do is tell you exactly how TalkLive works, what it does and does not keep, and what to do the moment a conversation goes wrong. Read the five rules. They cover almost everything.</p>
    ${c.ctas('Start a voice chat', 'Start a text chat')}
  </div>
  <ol class="sf-rules" aria-label="Five rules">
    <li><span><b>Keep personal details private.</b>No surname, address, school, workplace, social handles or photos with someone you just met.</span></li>
    <li><span><b>Never send money or codes.</b>Not for an emergency, an investment or a "verification". Ever.</span></li>
    <li><span><b>Leave whenever you want.</b>You owe a stranger no explanation. Next is always one tap away.</span></li>
    <li><span><b>Report and Block freely.</b>You do not need proof that a rule was broken. If it feels wrong, act.</span></li>
    <li><span><b>Assume you could be recorded.</b>TalkLive does not record calls, but the other person controls their own device.</span></li>
  </ol>
</div></section>

<div class="sf-main">
  <section class="sf-sec">
    <h2>If this happens, do this</h2>
    <div class="sf-cases">${CASES.map(([h, p]) => `<div class="sf-case"><h3>${h}</h3><p>${p}</p></div>`).join('')}</div>
  </section>

  <section class="sf-sec">
    <h2>What TalkLive keeps, and what it doesn't</h2>
    <p>Privacy claims are only useful if they are specific. Here is the short version; the <a href="/privacy">Privacy Policy</a> is the full and authoritative one.</p>
    <div class="sf-scroll"><table class="sf-table">
      <thead><tr><th scope="col">What</th><th scope="col">What happens to it</th></tr></thead>
      <tbody>
        <tr><td>Call audio</td><td>Never recorded or stored. Calls are encrypted in transit by WebRTC and may pass through TalkLive's TURN relay, which carries encrypted packets without recording them.</td></tr>
        <tr><td>Automated safety checks</td><td>While a call is connected, checks run on your own microphone to detect abuse: a loudness check on every device, and speech-to-text on desktop browsers. Only a short record is kept, and only when a check is triggered.</td></tr>
        <tr><td>Typed messages</td><td>Delivered through TalkLive's servers and kept in a moderation log so reports can be reviewed; it holds the newest 5,000 messages across the site and deletes older ones as new ones arrive.</td></tr>
        <tr><td>Friend voice messages</td><td>Only between people who added each other: stored so they can be played back, with a transcript where supported, and may be reviewed for safety.</td></tr>
        <tr><td>Technical data</td><td>IP address and device information, used to run the service, estimate a country, count visits and enforce bans. Your match never sees your IP address.</td></tr>
        <tr><td>What your match sees</td><td>A display name, spirit animal, any interests you added, an estimated country and your local time. Not your name, email, number, IP address or city.</td></tr>
      </tbody>
    </table></div>
  </section>

  <section class="sf-sec">
    <h2>How reporting and blocking work</h2>
    <div class="sf-steps">
      <div><b>1. You report</b>Tap Report on the call or chat screen. The conversation ends at once, and the other person is not told who reported them.</div>
      <div><b>2. We review</b>Reports are reviewed by the TalkLive team alongside the context the report includes.</div>
      <div><b>3. We act</b>Depending on what happened: a warning, or a ban. Bans apply to the device and network, not a username that can be changed.</div>
    </div>
    <p>Blocking is separate and instant: it ends the conversation and stops that person being matched with you again. Use both freely. The <a href="/community-guidelines">Community Guidelines</a> and <a href="/terms">Terms</a> set out what is not allowed - but you never have to wait until a line is clearly crossed before you leave.</p>
  </section>

  <section class="sf-sec">
    <h2>Things no chat service can promise</h2>
    <p>TalkLive cannot verify who anyone is. The country shown for a match is estimated from their network and is not proof of where they live; a display name is not a real name; and an 18+ rule, while enforced through reports and bans, is not identity verification. Treat everyone you meet as exactly what they are - a stranger - until you have good reason not to.</p>
    <p>For the common scam scripts and how to spot them, read the Journal's <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">field guide to the scams that start with "Hi"</a>. For what anonymity does and does not cover, see <a href="/anonymous-chat">anonymous chat</a>; for the technical side, <a href="/how-it-works">how TalkLive works</a>. Local emergency and helpline numbers are listed in each of our <a href="/country-chat-guide">country guides</a>.</p>
  </section>
</div>

${c.faq('Safety questions')}
${c.ad()}
<section class="sf-end"><div class="sf-end-in">
  <div><h2>Ready when you are</h2><p>Know the five rules, and Report and Block are always one tap away.</p></div>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</div></section>
</main>`,
};
