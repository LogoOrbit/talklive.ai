'use strict';
// Italy: "La Cartolina". A holiday postcard from the piazza: sun-faded terracotta
// and Mediterranean blue, a stamp, a postmark, and the back of the card holding
// the slang like a scribbled message. Fraunces for display, Inter to read. The
// meme is the eternal Italian mother asking if you have eaten.
const SLANG = [
  ['Raga', 'Guys. How every group chat message in Italy starts.'],
  ['Bella!', 'Hi, bye, nice, all in one word. Bella zio, bella frà.'],
  ['Boh', 'No idea. Comes with a shrug, always.'],
  ['Che ansia', 'This is stressing me out. Used for exams and unanswered texts.'],
  ['Ci sta', 'Fair enough, makes sense, I’m in.'],
  ['Che sbatti', 'What a hassle. The Monday morning word.'],
  ['Una figata', 'Something seriously cool.'],
  ['Top', 'Perfect. Yes, the English word, said very Italian.'],
];
const ORE = [['17:00', 'Fine lavoro'], ['19:00', 'Aperitivo'], ['21:00', 'Cena, finally'], ['22:30', 'Divano e telefono']];

module.exports = {
  slug: 'italy',
  name: 'Italy',
  date: '2026-10-12',
  title: 'Talk to Strangers in Italy: Chat Vocale Gratis con Sconosciuti | TalkLive',
  description: 'Chat con sconosciuti, gratis e senza registrazione. Free voice and text chat with people in Italy, in Italian or English. Slang, aperitivo hours and easy conversation starters.',
  keywords: 'chat con sconosciuti, chat vocale gratis, parlare con persone nuove, chat anonima, chat senza registrazione, chiamata casuale, conoscere gente online, talk to strangers italy, italian voice chat, chat with italians',
  h1: 'Talk to Strangers in Italy',
  theme: '#c0532b',
  preload: ['fraunces-latin-700-normal', 'inter-latin-400-normal', 'caveat-latin-500-normal'],
  css: `
:root{--paper:#fbf4e6;--ink:#2b211b;--rule:#e8d6b6;--terra:#c0532b;--mare:#1d5d8f;--verde:#009246;--rosso:#ce2b37;--mast:#fff}
body{font-family:Inter,system-ui,sans-serif;background:var(--paper);color:var(--ink)}
.c-bar{background:var(--terra);color:var(--mast);max-width:none}
.it-sky{background:linear-gradient(180deg,#f7c58a 0,#f2a66a 40%,var(--paper) 100%);padding:46px 16px 30px}
.it-card{max-width:1000px;margin:0 auto;display:grid;grid-template-columns:1.35fr 1fr;background:#fffaf0;border-radius:4px;box-shadow:0 22px 44px -26px rgba(80,40,10,.6);overflow:hidden}
.it-front{padding:40px 36px 34px;background:linear-gradient(160deg,#fff6e6,#f9e4c4)}
.it-front h1{font:700 clamp(40px,6.6vw,80px)/.95 Fraunces,serif;margin:0 0 14px;color:var(--terra)}
.it-front p{font-size:18.5px;line-height:1.6;margin:0 0 24px;max-width:46ch}
.it-saluti{font:700 13px/1 Inter,sans-serif;letter-spacing:.24em;text-transform:uppercase;color:var(--mare);display:block;margin-bottom:14px}
.it-back{position:relative;padding:34px 26px;border-left:2px dashed var(--rule);background:#fffdf8}
.it-stamp{position:absolute;right:18px;top:18px;width:86px;padding:6px;background:#fff;border:2px dashed #c9b28a}
.it-stamp svg{display:block;width:100%;height:auto}
.it-post{position:absolute;right:70px;top:74px;width:110px;height:110px;border:2px solid rgba(29,93,143,.5);border-radius:50%;display:grid;place-items:center;text-align:center;font:700 11px/1.2 Inter,sans-serif;color:rgba(29,93,143,.7);transform:rotate(-12deg)}
.it-msg{margin-top:120px;font:500 26px/1.2 Caveat,cursive;color:#3a3a6a}
.it-addr{margin:28px 0 0 auto;width:62%;font:500 24px/1 Caveat,cursive;color:#3a3a6a}
.it-addr span{display:block;border-bottom:1px solid var(--rule);padding:12px 0 6px}
.it-lines{margin-top:12px;border-top:1px solid var(--rule);padding-top:10px;font-size:14px;opacity:.7}
.it-main{max-width:760px;margin:0 auto;padding:10px 20px 0}
.it-sec{padding:38px 0 6px}
.it-sec h2{font:700 clamp(30px,4.4vw,44px)/1.05 Fraunces,serif;margin:0 0 14px;color:var(--mare)}
.it-sec p{font-size:18px;line-height:1.75;margin:0 0 1.05em}
.it-sec a{color:var(--terra)}
.it-ore{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}
.it-ore div{background:var(--mare);color:#fff;border-radius:999px 999px 8px 8px;padding:18px 10px 14px;text-align:center}
.it-ore b{display:block;font:700 24px/1 Fraunces,serif}
.it-ore span{font-size:13.5px;opacity:.9}
.it-slang{columns:2;column-gap:28px;margin:16px 0}
.it-slang p{break-inside:avoid;margin:0 0 14px;font-size:16px;line-height:1.5}
.it-slang b{font:700 22px/1.1 Fraunces,serif;color:var(--terra);display:block}
.it-meme{background:#fff;border:2px solid var(--ink);margin:24px 0;font:600 18px/1.4 Inter,sans-serif}
.it-meme p{margin:0;padding:12px 16px;border-bottom:1px solid var(--rule)}
.it-meme p:last-child{border-bottom:0}
.it-meme i{font-style:normal;opacity:.55;display:inline-block;width:150px}
.it-help{background:#fff;border:2px solid var(--verde);border-radius:8px;padding:16px 20px;font-size:16.5px;line-height:1.6}
.c-faq{max-width:760px;margin:36px auto 0;padding:0 20px}
.c-faq h2{font:700 36px/1.05 Fraunces,serif;margin:0 0 12px;color:var(--mare)}
.c-faq summary{font:600 17px/1.45 Inter,sans-serif}
.c-faq p{font-size:16.5px;line-height:1.65}
.it-end{margin-top:60px;background:linear-gradient(90deg,var(--verde) 0 33.3%,#fff 33.3% 66.6%,var(--rosso) 66.6%);padding:6px 0}
.it-end-in{background:var(--terra);color:#fff;text-align:center;padding:52px 20px}
.it-end h2{font:700 clamp(36px,6vw,62px)/1 Fraunces,serif;margin:0 0 10px}
.it-end p{font-size:18px;margin:0 auto 24px;max-width:520px;line-height:1.55}
.it-end .c-ctas{justify-content:center;margin:0 auto}
@media (max-width:780px){.it-card{grid-template-columns:1fr}.it-back{border-left:0;border-top:2px dashed var(--rule)}.it-ore{grid-template-columns:1fr 1fr}.it-slang{columns:1}.it-meme i{display:block;width:auto}}
`,
  faq: [
    { q: 'TalkLive è gratis in Italia?', a: 'Sì. Voice and text chat are free, no account, no phone number, no camera. Choosing Italy as a preferred country is free too.' },
    { q: 'Can I chat in Italian?', a: 'Of course. Talk in any language you share with your match, and switch the whole site to Italian at talklive.app/it/.' },
    { q: 'When is Italy busiest on TalkLive?', a: 'TalkLive peaks between 15:00 and 21:00 UTC, which is about 17:00 to 23:00 in Italy in summer and 16:00 to 22:00 in winter.' },
    { q: 'Do I need an app?', a: 'No. TalkLive works in the browser on Android, iPhone and computer. You can add it to your home screen.' },
    { q: 'What is the emergency number in Italy?', a: 'Call 112, the single European emergency number, free from any phone.' },
  ],
  body: (c) => `<main id="story">
<div class="it-sky"><div class="it-card">
  <section class="it-front">
    <span class="it-saluti">Saluti dall’Italia</span>
    <h1>Talk to strangers in Italy</h1>
    <p>Chat con sconosciuti, but make it chill. A voice call or a text chat with someone new from Milano to Palermo. Gratis, no sign-up, no camera.</p>
    ${c.ctas('Tap to Talk', 'Tap to Chat')}
  </section>
  <aside class="it-back" aria-label="Postcard back">
    <div class="it-stamp"><svg viewBox="0 0 3 2" role="img" aria-label="Flag of Italy"><rect width="1" height="2" fill="#009246"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ce2b37"/></svg></div>
    <div class="it-post" aria-hidden="true">TALKLIVE<br>ROMA &middot; MILANO<br>2026</div>
    <p class="it-msg">Raga, ho trovato un posto dove parlare con gente nuova. Ci sta! Bella \u{1F44B}</p>
    <p class="it-lines">"Guys, found a place to talk to new people. Worth it. Ciao!"</p>
    <div class="it-addr" aria-hidden="true"><span>A: qualcuno di nuovo</span><span>Piazza della Chiacchiera, 1</span><span>Tutta Italia</span></div>
  </aside>
</div></div>

<div class="it-main">
  <section class="it-sec">
    <h2>Italians invented the passeggiata</h2>
    <p>The evening walk through the piazza, seeing people, stopping to chat, having a gelato you swore you would not have. That is basically TalkLive, minus the gelato. You tap, you meet someone, you talk for as long as it feels good, then you move on.</p>
    <p>The busiest time is the classic Italian evening, after work and around aperitivo.</p>
    <div class="it-ore">${ORE.map(([t, w]) => `<div><b>${t}</b><span>${w}</span></div>`).join('')}</div>
  </section>

  <section class="it-sec">
    <h2>Parla come un italiano</h2>
    <p>The Italian you learn in school is lovely. The Italian people actually speak on a call is something else. Here is your survival kit.</p>
    <div class="it-slang">${SLANG.map(([w, m]) => `<p><b>${w}</b>${m}</p>`).join('')}</div>
    <p>Gen Z bonus: things that are a lot are <em>un botto</em>, being dramatic is <em>fare il drama</em>, and if you say <em>spoilerare</em> everyone knows exactly what you mean. And yes, hand gestures count even on a voice call. People can hear them.</p>
    <div class="it-meme" aria-label="Meme: the Italian mother">
      <p><i>Nessuno:</i></p>
      <p><i>Assolutamente nessuno:</i></p>
      <p><i>Mamma italiana:</i> "Hai mangiato? Sei sicuro? Ti faccio la pasta" \u{1F35D}</p>
    </div>
  </section>

  <section class="it-sec">
    <h2>What to talk about</h2>
    <p>Calcio is the easy door. Ask someone if they are Inter, Milan, Juve, Roma or Napoli and settle in. Food is the other one, but be careful: pineapple on pizza, cream in carbonara and breaking spaghetti are all fighting words. Sanremo, summer by the sea and which city has the best coffee will keep you going for hours.</p>
    <p>Learning Italian? Say so. People love helping, and a call fixes your pronunciation faster than any app. The site also works <a href="/it/">in italiano</a>.</p>
  </section>

  <section class="it-sec">
    <h2>Stay safe</h2>
    <p>Keep your full name, address, Instagram and workplace private at first. Never share bank codes or SMS codes, and say ciao to anyone asking for money, photos or a quick move to another app. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">scam guide</a> explains the classic tricks. Every call and chat has Report and Block, and TalkLive is 18+ only.</p>
    <div class="it-help"><b>Emergenza:</b> call <b>112</b>, free from any phone, anywhere in Italy.</div>
  </section>
</div>

${c.ad()}
${c.faq('Domande frequenti')}
<section class="it-end"><div class="it-end-in">
  <h2>Dai, facciamo due chiacchiere</h2>
  <p>Come on, let’s have a little chat. Someone in Italy is online and has nothing better to do. Bella.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</div></section>
</main>`,
};
