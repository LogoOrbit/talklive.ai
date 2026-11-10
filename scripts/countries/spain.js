'use strict';
// Spain: "Sobremesa". The long talk at the table after the meal is over. Set
// like a bar chalkboard menu on warm ochre, with a red and gold band, Abril
// Fatface headings and a slang list written as a carta. DM Sans to read.
const SLANG = [
  ['¿Qué tal?', 'How are you? The answer is "bien, ¿y tú?" every time.'],
  ['Vale', 'OK, sure, got it. You will hear it ten times a minute.'],
  ['Tío / tía', 'Mate, dude. Literally uncle and aunt.'],
  ['Guay', 'Cool. "Qué guay" covers most good news.'],
  ['Mola', 'I like it. "Mola mucho" means it is great.'],
  ['Venga', 'Come on, right then, bye. Ends every phone call.'],
  ['Madre mía', 'Oh my. Surprise, shock, or the electricity bill.'],
  ['No pasa nada', 'No worries. The national philosophy.'],
];

module.exports = {
  slug: 'spain',
  name: 'Spain',
  date: '2026-11-10',
  title: 'Talk to Strangers in Spain: Hablar con Desconocidos Gratis',
  description: 'Hablar con desconocidos gratis y sin registro. Free voice and text chat with people in Spain, in Spanish or English. Slang, hours and topics.',
  keywords: 'hablar con desconocidos, chat con desconocidos, chat de voz gratis, chatear sin registro, conocer gente nueva, chat aleatorio españa, hablar con gente, talk to strangers spain, random chat spain, practicar español hablando',
  h1: 'Talk to Strangers in Spain',
  theme: '#aa151b',
  preload: ['abril-fatface-latin-400-normal', 'dm-sans-latin-400-normal'],
  css: `
:root{--paper:#fbf3df;--ink:#25150d;--rule:#e4d3aa;--rojo:#aa151b;--oro:#f1bf00;--board:#23312b;--mast:#fff}
body{font-family:"DM Sans",system-ui,sans-serif;background:var(--paper);color:var(--ink)}
.c-bar{background:var(--rojo);color:var(--mast);max-width:none}
.es-band{height:30px;background:linear-gradient(var(--rojo) 0 25%,var(--oro) 25% 75%,var(--rojo) 75%)}
.es-hero{max-width:880px;margin:0 auto;padding:50px 20px 16px}
.es-hero h1{font:400 clamp(42px,7.4vw,90px)/.98 "Abril Fatface",serif;color:var(--rojo);margin:0 0 16px}
.es-hero p{font-size:20px;line-height:1.6;margin:0 0 24px;max-width:650px}
.es-main{max-width:780px;margin:0 auto;padding:0 20px}
.es-sec{padding-top:44px}
.es-sec h2{font:400 clamp(28px,4.2vw,44px)/1.05 "Abril Fatface",serif;margin:0 0 12px}
.es-sec p{font-size:18px;line-height:1.75;margin:0 0 1em}
.es-sec a{color:var(--rojo)}
.es-carta{background:var(--board);color:#f4efe2;padding:26px 26px 14px;margin:20px 0;border:8px solid #6b4a2b}
.es-carta h3{font:400 26px/1 "Abril Fatface",serif;color:var(--oro);margin:0 0 14px;text-align:center}
.es-carta dl{margin:0;display:grid;grid-template-columns:1fr 1fr;gap:0 28px}
.es-carta div{padding:10px 0;border-top:1px dashed rgba(244,239,226,.3)}
.es-carta dt{font-weight:700;font-size:18px;color:var(--oro)}
.es-carta dd{margin:2px 0 0;font-size:15px;line-height:1.4}
.es-tortilla{background:var(--oro);padding:20px 22px;margin:22px 0;font-size:17px;line-height:1.5}
.es-tortilla b{display:block;font:400 24px/1.15 "Abril Fatface",serif;margin-bottom:6px}
.es-help{border:2px solid var(--rojo);background:#fff;padding:16px 20px;font-size:16.5px;line-height:1.6}
.c-faq{max-width:780px;margin:44px auto 0;padding:0 20px}
.c-faq h2{font:400 36px/1.05 "Abril Fatface",serif;margin:0 0 12px}
.c-faq summary{font:700 17px/1.45 "DM Sans",sans-serif}
.c-faq p{font-size:16.5px;line-height:1.65}
.es-end{margin-top:60px;background:var(--rojo);color:#fff;text-align:center;padding:56px 20px}
.es-end h2{font:400 clamp(38px,6vw,64px)/1 "Abril Fatface",serif;color:var(--oro);margin:0 0 10px}
.es-end p{font-size:18px;line-height:1.55;margin:0 auto 24px;max-width:540px}
.es-end .c-ctas{justify-content:center}
@media (max-width:640px){.es-carta dl{grid-template-columns:1fr}}
`,
  faq: [
    { q: '¿TalkLive es gratis en España?', a: 'Sí. Voice calls and text chat are free, with no account, no phone number and no camera. Choosing Spain as a preferred country is free too.' },
    { q: 'Can I chat in Spanish?', a: 'Yes. Speak any language you and your match share. Most people from Spain chat in Spanish, and you will also meet Catalan, Galician and Basque speakers.' },
    { q: 'Can I practise my Spanish here?', a: 'Yes. Say you are learning at the start and ask your match to keep going in Spanish. A real conversation is the fastest way to stop translating in your head.' },
    { q: 'When is Spain online on TalkLive?', a: 'TalkLive is busiest between 15:00 and 21:00 UTC, which is 17:00 to 23:00 in Spain in summer and 16:00 to 22:00 in winter. Spain stays up late, so evenings run long.' },
    { q: 'What is the emergency number in Spain?', a: 'Call 112 for police, ambulance or fire, free from any phone. The Policía Nacional is 091.' },
  ],
  body: (c) => `<main id="story">
<div class="es-band" aria-hidden="true"></div>
<section class="es-hero">
  <h1>Talk to strangers in Spain</h1>
  <p>Hablar con desconocidos, gratis y sin registro. A voice call or text chat with someone new, from Madrid to Sevilla to Bilbao. No account, no camera, just conversation.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>

<div class="es-main">
  <section class="es-sec">
    <h2>The country that invented sobremesa</h2>
    <p>Spanish has a word for staying at the table long after the food is gone, just to keep talking: <em>sobremesa</em>. It can last longer than the meal. That tells you most of what you need to know about talking to people here. Conversation is not a way to pass the time, it is the plan.</p>
    <p>People talk fast, interrupt warmly and stay up late. Dinner is at nine or ten, so the best hours to find someone are from early evening until well past midnight.</p>
  </section>

  <section class="es-sec">
    <h2>Habla como alguien de aquí</h2>
    <div class="es-carta"><h3>Carta de palabras</h3><dl>${SLANG.map(([w, m]) => `<div><dt>${w}</dt><dd>${m}</dd></div>`).join('')}</dl></div>
    <p>Use <em>tú</em> with almost everyone; <em>usted</em> is for grandparents and paperwork. And remember that <em>ahora</em> means now, while <em>ahora mismo</em> means actually now.</p>
    <div class="es-tortilla"><b>Tortilla: con cebolla o sin cebolla</b>With onion or without. The country is split, families have fallen out, and it is the safest way to start an argument with a stranger. Pick a side before you call.</div>
  </section>

  <section class="es-sec">
    <h2>What to talk about</h2>
    <p>Football, and whether you are Madrid, Barça, Atleti or loyal to somewhere smaller. Local fiestas, because every town has one and swears it is the best. Where to eat, which region does it right, the heat in August and plans for the next puente. Ask someone about their pueblo and you will get a full tour.</p>
    <p>Spain has four official languages, so do not be surprised by a "bon dia", a "kaixo" or a "bos días".</p>
  </section>

  <section class="es-sec">
    <h2>Stay safe</h2>
    <p>Keep your full name, address, workplace and social accounts to yourself at first. Never share a Bizum request, bank code or verification code, and end the call with anyone asking for money, photos or to move to another app straight away. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">scam guide</a> lists the usual tricks, and every call and chat has Report and Block.</p>
    <div class="es-help"><b>Emergencias:</b> call <b>112</b> for police, ambulance or fire. Policía Nacional: <b>091</b>.</div>
  </section>
</div>

${c.faq('Preguntas frecuentes')}
<section class="es-end">
  <h2>¿Hablamos?</h2>
  <p>Shall we talk? Someone in Spain is online now, and it is never too late there.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
