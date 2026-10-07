'use strict';
// Brazil: "Bate-papo". Brazilian Portuguese for a chat, literally a hit of
// talk. A loud, sunny page: flag green and yellow with a deep night blue,
// speech-bubble cards and Copacabana's wave pavement as a pattern. Bricolage
// Grotesque for display, DM Sans to read.
const SLANG = [
  ['Oi! Tudo bem?', 'Hi! All good? - the answer is "tudo", all good'],
  ['Beleza', 'Cool, OK, sounds good'],
  ['Valeu', 'Thanks - or bye'],
  ['Saudade', 'The ache of missing someone or somewhere'],
  ['Que legal!', 'How cool!'],
  ['Kkkkk', 'Laughing, in text'],
];

module.exports = {
  slug: 'brazil',
  name: 'Brazil',
  date: '2026-10-07',
  title: 'Talk to Strangers in Brazil - Free Voice Chat | TalkLive',
  description: 'Free voice and text chat with people in Brazil - bate-papo in Portuguese or English, no sign-up, no camera. Slang, football, music and when Brazil is online.',
  keywords: 'talk to strangers brazil, brazil chat, bate-papo, chat brasil, conversar com estranhos, random chat brazil, brazilian voice chat, chat de voz',
  h1: 'Talk to Strangers in Brazil',
  theme: '#009c3b',
  preload: ['bricolage-grotesque-latin-700-normal', 'dm-sans-latin-400-normal'],
  css: `
:root{--paper:#fffdf3;--ink:#0d1b2a;--rule:#e9e3c6;--green:#009c3b;--yellow:#ffdf00;--blue:#002776;--mast:#fff}
body{font-family:"DM Sans",system-ui,sans-serif;background:var(--paper);color:var(--ink)}
.c-bar{color:var(--mast);background:var(--green);max-width:none}
.br-wave{background-color:#fff;background-image:radial-gradient(circle at 50% 0,transparent 18px,#111 19px,#111 26px,transparent 27px),radial-gradient(circle at 50% 100%,transparent 18px,#111 19px,#111 26px,transparent 27px);background-size:52px 40px;background-position:0 0,26px 20px;height:40px;opacity:.9}
.br-hero{background:var(--yellow);padding:60px 20px 64px}
.br-hero-in{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1.3fr 1fr;gap:40px;align-items:center}
.br-kicker{display:inline-block;font:700 12px/1 "DM Sans",sans-serif;letter-spacing:.18em;text-transform:uppercase;background:var(--blue);color:#fff;padding:8px 12px;border-radius:999px}
.br-hero h1{font:700 clamp(42px,7vw,92px)/.92 "Bricolage Grotesque",sans-serif;letter-spacing:-.04em;margin:18px 0}
.br-hero h1 span{color:var(--green)}
.br-dek{font:400 19px/1.6 "DM Sans",sans-serif;margin:0 0 26px;max-width:600px}
.br-bubbles{display:flex;flex-direction:column;gap:12px}
.br-b{font:700 22px/1.2 "Bricolage Grotesque",sans-serif;padding:16px 20px;border-radius:22px;max-width:86%}
.br-b.l{background:#fff;border-bottom-left-radius:4px}
.br-b.r{background:var(--green);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
.br-b.n{background:var(--blue);color:#fff;border-bottom-left-radius:4px}
.br-main{max-width:780px;margin:0 auto;padding:20px 20px 0}
.br-sec{padding:40px 0 6px}
.br-sec h2{font:700 clamp(28px,4vw,44px)/1.04 "Bricolage Grotesque",sans-serif;letter-spacing:-.03em;margin:0 0 16px}
.br-sec h2 span{background:linear-gradient(transparent 60%,var(--yellow) 60%)}
.br-sec p{font:400 18px/1.75 "DM Sans",sans-serif;margin:0 0 1.05em}
.br-sec a{color:var(--blue);font-weight:500}
.br-slang{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0}
.br-slang div{background:#fff;border:2px solid var(--ink);border-radius:18px;padding:16px;box-shadow:5px 5px 0 var(--green)}
.br-slang b{display:block;font:700 21px/1.15 "Bricolage Grotesque",sans-serif;margin-bottom:6px}
.br-slang span{font:400 15px/1.45 "DM Sans",sans-serif}
.br-clock{display:grid;grid-template-columns:auto 1fr;gap:22px;align-items:center;background:var(--blue);color:#fff;border-radius:22px;padding:24px 26px;margin:22px 0}
.br-clock b{font:700 46px/1 "Bricolage Grotesque",sans-serif;color:var(--yellow);white-space:nowrap}
.br-clock span{font:400 17px/1.55 "DM Sans",sans-serif}
.br-help{border-radius:18px;background:#fff;border:2px solid var(--green);padding:18px 22px;font:400 16.5px/1.6 "DM Sans",sans-serif}
.br-help b{color:var(--green)}
.c-faq{max-width:780px;margin:36px auto 0;padding:0 20px}
.c-faq h2{font:700 34px/1.05 "Bricolage Grotesque",sans-serif;letter-spacing:-.03em;margin:0 0 12px}
.c-faq summary{font:700 17px/1.45 "DM Sans",sans-serif}
.c-faq p{font:400 16.5px/1.65 "DM Sans",sans-serif}
.br-end{margin-top:60px;background:var(--green);color:#fff;padding:60px 20px;text-align:center}
.br-end h2{font:700 clamp(36px,6vw,70px)/.95 "Bricolage Grotesque",sans-serif;letter-spacing:-.04em;margin:0 0 12px}
.br-end p{font:400 18px/1.55 "DM Sans",sans-serif;margin:0 auto 24px;max-width:520px}
.br-end .c-ctas{justify-content:center;margin:0 auto}
@media (max-width:860px){.br-hero-in{grid-template-columns:1fr}.br-slang{grid-template-columns:repeat(2,1fr)}}
@media (max-width:520px){.br-slang{grid-template-columns:1fr}.br-clock{grid-template-columns:1fr}}
`,
  faq: [
    { q: 'Can I chat in Portuguese on TalkLive?', a: 'Sim. Speak whichever language you and your match share, and switch the whole interface to Portuguese at talklive.app/pt/ if you prefer.' },
    { q: 'Is TalkLive free in Brazil?', a: 'Yes. Voice and text chat are free, need no account, and preferring Brazil in the country filter is free.' },
    { q: 'When is Brazil busiest on TalkLive?', a: 'TalkLive is busiest worldwide between 15:00 and 21:00 UTC - noon to 6 pm in Brasília time, which Brazil keeps all year since it dropped daylight saving in 2019. Brazilian evenings are quieter but often match you with Asia\'s morning.' },
    { q: 'Will I always be matched with someone in Brazil?', a: 'Not always. A country preference steers matching, but it depends on who is searching at that moment. Adding Portugal as a second preferred country keeps the conversation in Portuguese more often.' },
    { q: 'Does anyone see my phone number or face?', a: 'No. Calls run in the browser, no number is exchanged and there is no video.' },
    { q: 'Is there someone to talk to if I am in crisis in Brazil?', a: 'Yes. CVV, the Centro de Valorização da Vida, answers on 188, free and at any hour. In an emergency call SAMU on 192 or the police on 190.' },
  ],
  body: (c) => `<main id="story">
<section class="br-hero"><div class="br-hero-in">
  <div>
    <span class="br-kicker">Country guide &middot; Brazil &middot; Brasil</span>
    <h1>Talk to strangers in <span>Brazil</span></h1>
    <p class="br-dek">In Brazilian Portuguese a chat is a <em>bate-papo</em>, and Brazil is a country that loves one: with neighbours, with taxi drivers, with whoever is next to you in the queue. Start one by voice or text, free, with no account, no number and no camera.</p>
    ${c.ctas('Tap to Talk', 'Tap to Chat')}
  </div>
  <div class="br-bubbles" aria-hidden="true">
    <div class="br-b l">Oi! Tudo bem?</div>
    <div class="br-b r">Tudo! E você?</div>
    <div class="br-b n">De onde você é? 😄</div>
  </div>
</div></section>
<div class="br-wave" role="presentation"></div>

<div class="br-main">
  <section class="br-sec">
    <h2>The biggest <span>conversation</span> in Latin America</h2>
    <p>Brazil is home to about 203 million people, counted in the 2022 census, and it is the largest country in South America by a wide margin. It is the only Portuguese-speaking country in the Americas, which makes it the biggest Portuguese-speaking nation on earth. It spans four time zones, though most Brazilians live on Brasília time, three hours behind UTC.</p>
    <p>Brazilians are, by reputation and in practice, among the most sociable people anywhere. Messages tend to be voice notes, conversations tend to run long, and a stranger who asks a friendly question usually gets a warm answer. If you are lonely, bored or simply curious, there are few better places to start.</p>
    <div class="br-clock"><b>12-6 pm</b><span>TalkLive's busiest hours, 15:00-21:00 UTC, on Brasília time. Brazil dropped daylight saving time in 2019, so these hours hold all year.</span></div>
  </section>

  <section class="br-sec">
    <h2>Speak like a <span>carioca</span> (almost)</h2>
    <p>Plenty of Brazilians speak English, and many are keen to practise it, but even a few words of Portuguese will make your match smile. The whole TalkLive app is available <a href="/pt/">in Portuguese</a>.</p>
    <div class="br-slang">
${SLANG.map(([w, m]) => `      <div><b>${w}</b><span>${m}</span></div>`).join('\n')}
    </div>
    <p>If you are learning Portuguese, Brazilian Portuguese is a generous language to practise by voice: open vowels, music in every sentence, and speakers who are happy to slow down. Say you are learning in your first message. Our guide to <a href="/language-exchange">language exchange</a> explains how to make it a fair swap.</p>
  </section>

  <section class="br-sec">
    <h2>What to <span>talk about</span></h2>
    <p>Football is close to a shared religion: Brazil has won the men's World Cup five times, more than any other country, and everyone has a club - Flamengo, Corinthians, Palmeiras, São Paulo and dozens more - and an opinion on the national team. Music is next: samba, bossa nova, MPB, sertanejo and funk carioca each have their own world. Ask about Carnival, the best açaí, the novela everyone is watching, the beach versus the countryside, or what someone means by <em>saudade</em> - the word that famously has no exact translation.</p>
  </section>

  <section class="br-sec">
    <h2>Privacy and <span>safety</span></h2>
    <p>Keep your full name, address, CPF, workplace and social media to yourself in a first conversation. Never share a bank code, a Pix key you did not mean to give out, or a one-time password, and be careful with anyone who asks for money, gift cards or crypto, asks for photos, or pushes to move to WhatsApp straight away - our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">guide to chat scams</a> describes the usual scripts. Every call and chat has Report and Block, and TalkLive is for adults 18 and over only.</p>
    <div class="br-help"><b>Need to talk?</b> CVV answers on <b>188</b>, free and at any hour. In an emergency in Brazil, call SAMU on <b>192</b> or the police on <b>190</b>.</div>
    <p style="margin-top:20px">Getting started: open TalkLive in your browser (no app, no sign-up), prefer Brazil in Filters if you like (two preferred countries are free), and Tap to Talk or Tap to Chat. The Journal's <a href="/regions/americas">Americas feature</a> covers the rest of the hemisphere, and our <a href="/countries/mexico">Mexico guide</a> the other giant of Latin America.</p>
  </section>
</div>

${c.ad()}
${c.faq('Perguntas - questions people ask')}
<div class="br-wave" role="presentation"></div>
<section class="br-end">
  <h2>Bora bater um papo?</h2>
  <p>Shall we have a chat? Someone in São Paulo, Rio or Recife is up for one.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
