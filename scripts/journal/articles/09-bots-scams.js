'use strict';
// Field guide. Archivo Black + Archivo, charcoal page, hazard-yellow labels,
// a grid of numbered "specimen" cards.
module.exports = {
  slug: 'how-to-spot-a-bot-or-scam-in-random-chat',
  tag: 'Safety',
  h1: 'A Field Guide to the Scams That Start With "Hi"',
  title: 'How to Spot a Bot or Scam in Random Chat: A Field Guide | TalkLive Journal',
  description: 'Romance-to-crypto schemes, image blackmail, the "send me the code" trick and the bots that never answer a question. Seven common specimens, how to recognise each, and the one rule that defeats nearly all of them.',
  date: '2026-10-02',
  theme: '#17181a',
  preload: ['archivo-black-latin-400-normal', 'archivo-latin-400-normal'],
  css: `
:root{--paper:#17181a;--ink:#ecebe6;--rule:#3a3c40;--mast:#bdbcb6;--y:#ffd23f}
body{font-family:"Archivo",system-ui,sans-serif}
.g-wrap{max-width:1120px;margin:0 auto;padding:56px 20px 0}
.g-tape{display:inline-block;background:var(--y);color:#17181a;font:400 13px/1 "Archivo Black",sans-serif;letter-spacing:.12em;text-transform:uppercase;padding:8px 10px}
.g-wrap h1{font:400 clamp(40px,7vw,88px)/.95 "Archivo Black",sans-serif;text-transform:uppercase;letter-spacing:-.01em;margin:22px 0 24px;max-width:14ch}
.g-dek{font-size:21px;line-height:1.45;max-width:700px;color:#cfcec8;margin:0 0 44px}
.g-intro{max-width:720px;font-size:18px;line-height:1.7;color:#dedcd5}
.g-intro p{margin:0 0 1.1em}
.g-rule{background:var(--y);color:#17181a;padding:26px 28px;margin:40px 0;font:400 clamp(22px,3vw,32px)/1.2 "Archivo Black",sans-serif;text-transform:uppercase}
.g-rule small{display:block;font:600 15px/1.5 "Archivo",sans-serif;text-transform:none;margin-top:10px}
.g-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px;margin:28px 0}
.g-card{border:1px solid var(--rule);padding:22px 22px 18px;background:#1e2023}
.g-card .g-no{font:400 13px/1 "Archivo Black",sans-serif;color:var(--y);letter-spacing:.14em}
.g-card h2{font:400 24px/1.1 "Archivo Black",sans-serif;text-transform:uppercase;margin:10px 0 14px}
.g-card dl{margin:0;font-size:15.5px;line-height:1.55}
.g-card dt{font:600 11px/1 "Archivo",sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--y);margin-top:12px}
.g-card dd{margin:5px 0 0;color:#dedcd5}
.g-sec h2{font:400 30px/1.1 "Archivo Black",sans-serif;text-transform:uppercase;margin:56px 0 16px}
.g-sec{max-width:720px;font-size:18px;line-height:1.7;color:#dedcd5}
.g-sec p{margin:0 0 1.1em}
.g-sec ul{padding-left:20px}
.g-sec li{margin-bottom:8px}
.g-src{font-size:13px;color:#8f8e88;border-top:1px solid var(--rule);padding-top:14px;margin-top:40px}
.ad-card .ad-card-label{color:#bdbcb6}
`,
  body: (ctx) => `<main id="story" class="g-wrap">
<span class="g-tape">Field guide &middot; Safety</span>
<h1>The scams that start with "hi"</h1>
<p class="g-dek">Most online scams are not clever. They are patient, scripted and repeated thousands of times a day. Once you know the shapes, they are surprisingly easy to spot.</p>
<div class="g-intro">
<p>Anywhere strangers can message each other, someone is running a script. Some are automated bots fishing for clicks. Some are people working through a playbook, sometimes in large organised operations. The good news is that almost all of them need you to do one of a very small number of things, and you can refuse every one of them.</p>
<p>In the United States alone, people reported losing over a billion dollars to romance scams in 2023, according to the Federal Trade Commission, and the real figure is certainly higher because many victims never report it. These are not rare events happening to unusually gullible people. They are an industry.</p>
</div>

<div class="g-rule">The rule that defeats nearly all of them: never move somewhere else, never send money, never send a code.<small>If a stranger needs you to do any of those three things, the conversation has stopped being a conversation.</small></div>

<div class="g-cards">
<section class="g-card"><span class="g-no">Specimen 01</span><h2>The link dropper</h2><dl>
<dt>How it appears</dt><dd>A message within seconds of matching, often with a link: "check out my pics", "join me here".</dd>
<dt>The tell</dt><dd>It does not respond to anything you say. Ask a simple question, like what colour the sky is where they are, and you get the link again.</dd>
<dt>What to do</dt><dd>Don't click. Skip. Report if you can.</dd></dl></section>

<section class="g-card"><span class="g-no">Specimen 02</span><h2>The platform hopper</h2><dl>
<dt>How it appears</dt><dd>A warm, normal-seeming chat that quickly turns to "add me on Telegram / WhatsApp / Snapchat, this app is glitchy".</dd>
<dt>The tell</dt><dd>Urgency to leave, early. Moving you off a platform removes its reporting tools and gives them your real account or number.</dd>
<dt>What to do</dt><dd>Stay where you are. Anyone genuine will understand.</dd></dl></section>

<section class="g-card"><span class="g-no">Specimen 03</span><h2>The slow romance</h2><dl>
<dt>How it appears</dt><dd>Weeks of attentive, affectionate messages. Then a sudden emergency, a medical bill, a frozen account, a ticket to visit you.</dd>
<dt>The tell</dt><dd>They always have a reason they can't video call or meet. The money request comes after trust, never before.</dd>
<dt>What to do</dt><dd>Never send money to someone you have not met in person. Tell a friend; scams are much easier to see from outside.</dd></dl></section>

<section class="g-card"><span class="g-no">Specimen 04</span><h2>The investment friend</h2><dl>
<dt>How it appears</dt><dd>A friendly contact who casually mentions how well they're doing trading crypto, and offers to show you their platform.</dd>
<dt>The tell</dt><dd>The site shows your "profits" growing, but withdrawing requires a fee, then a tax, then another fee. Investigators call this pattern "pig butchering": the victim is fattened with trust before the slaughter.</dd>
<dt>What to do</dt><dd>Never invest through a platform a stranger introduced you to. Ever.</dd></dl></section>

<section class="g-card"><span class="g-no">Specimen 05</span><h2>The code collector</h2><dl>
<dt>How it appears</dt><dd>"I'm sending you a code to check you're real, just tell me what it says."</dd>
<dt>The tell</dt><dd>That code is a login or verification code for <em>your</em> account somewhere, or for an account they are creating in your name. Reading it out hands over the key.</dd>
<dt>What to do</dt><dd>Never share a code sent to your phone or email. No legitimate person ever needs it.</dd></dl></section>

<section class="g-card"><span class="g-no">Specimen 06</span><h2>The blackmailer</h2><dl>
<dt>How it appears</dt><dd>Attention that escalates fast, pressure to share private photos, then a threat: pay, or the images go to your contacts.</dd>
<dt>The tell</dt><dd>Speed and pressure. Real interest does not need a photo in the first ten minutes.</dd>
<dt>What to do</dt><dd>If it happens: stop replying, do not pay (paying usually leads to more demands), keep the evidence, report it. The FBI and similar agencies have warned that this targets young men and teenagers in particular. It is a crime against you, not your fault.</dd></dl></section>

<section class="g-card"><span class="g-no">Specimen 07</span><h2>The script reader</h2><dl>
<dt>How it appears</dt><dd>Grammatically perfect but oddly generic messages, the same compliments, the same story.</dd>
<dt>The tell</dt><dd>Ask something only a present human would answer: "What did you just hear outside?" or a joke that needs context. Scripts and bots stumble.</dd>
<dt>What to do</dt><dd>Move on. Your time is the thing they are farming.</dd></dl></section>
</div>

${ctx.ad()}

<section class="g-sec">
<h2>Why smart people fall for this</h2>
<p>Scams don't target intelligence. They target situations: loneliness, a stressful week, being new in a country, wanting to believe someone really likes you. They are built to feel normal for as long as possible, and to make the dangerous step feel like a small favour. Being alert is not about being suspicious of everyone. It is about recognising the handful of moments where the request changes.</p>
<h2>If it has already happened</h2>
<ul>
<li>Stop contact and don't send anything more, even if they threaten.</li>
<li>Screenshot the conversation, usernames and any payment details.</li>
<li>Report it to the platform, your bank if money moved, and your national fraud or police reporting service.</li>
<li>Talk to someone you trust. Shame is what scammers rely on to keep victims quiet.</li>
</ul>
<p>The uncomfortable question this leaves: if a script can sound this human, how sure are you that every friendly message you have ever received was written by a person?</p>
<p class="g-src">Sources: US Federal Trade Commission, consumer fraud reports for 2023; FBI public warnings on financially motivated sextortion (2023&ndash;2024).</p>
</section>
${ctx.more}
</main>`,
};
