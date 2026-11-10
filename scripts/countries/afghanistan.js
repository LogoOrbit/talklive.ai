'use strict';
// Afghanistan: "Chai and poetry". Deep lapis blue (the stone mined in
// Badakhshan for six thousand years) with saffron and pomegranate accents,
// tile-like bordered panels and Cormorant Garamond headings, for a country
// where a guest gets tea before a question. Source Serif to read.
const GREETINGS = [
  ['Salaam alaikum', 'Wa alaikum salaam', 'The greeting everyone uses, in every language of the country.'],
  ['Chetor asti?', 'Khob astam, tashakor', 'Dari: "How are you?" - "I am well, thank you."'],
  ['Sanga yee?', 'Kha yam, manana', 'Pashto: "How are you?" - "I am well, thank you."'],
  ['Khosh amadid', 'Zenda bashi', '"Welcome" - "May you live long", the warm reply to almost anything.'],
];

module.exports = {
  slug: 'afghanistan',
  name: 'Afghanistan',
  date: '2026-11-10',
  title: 'Talk to Strangers in Afghanistan - Free Voice Chat',
  description: 'Free voice and text chat with Afghans at home and abroad, in Dari, Pashto or English. No sign-up or camera. Greetings, topics and safety.',
  keywords: 'talk to strangers afghanistan, afghanistan chat, afghan voice chat, random chat afghanistan, chat with afghans, dari chat, pashto chat, kabul chat, online chat afghanistan, english speaking practice afghanistan',
  h1: 'Talk to Strangers in Afghanistan',
  theme: '#1b3a6b',
  preload: ['cormorant-garamond-latin-700-normal', 'source-serif-4-latin-400-normal'],
  css: `
:root{--paper:#f6f1e7;--ink:#1a1f2b;--rule:#d9cfbb;--lapis:#1b3a6b;--saffron:#e0a526;--anar:#a3182b;--mast:#fff}
body{font-family:"Source Serif 4",Georgia,serif;background:var(--paper);color:var(--ink)}
.c-bar{background:var(--lapis);color:var(--mast);max-width:none}
.af-hero{background:var(--lapis);color:#fff;padding:60px 20px 54px;border-bottom:8px solid var(--saffron)}
.af-hero div{max-width:820px;margin:0 auto}
.af-hero h1{font:700 clamp(42px,7vw,86px)/.98 "Cormorant Garamond",serif;margin:0 0 16px}
.af-hero p{font-size:20px;line-height:1.6;margin:0 0 26px;max-width:640px}
.af-main{max-width:760px;margin:0 auto;padding:0 20px}
.af-sec{padding-top:44px}
.af-sec h2{font:700 clamp(30px,4.4vw,46px)/1.05 "Cormorant Garamond",serif;color:var(--lapis);margin:0 0 12px}
.af-sec p{font-size:18.5px;line-height:1.75;margin:0 0 1em}
.af-sec a{color:var(--anar)}
.af-tiles{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:20px 0}
.af-tile{background:#fff;border:1px solid var(--lapis);outline:4px solid #fff;outline-offset:-9px;box-shadow:inset 0 0 0 10px rgba(27,58,107,.08);padding:26px 22px 22px}
.af-tile b{display:block;font:700 26px/1.1 "Cormorant Garamond",serif;color:var(--lapis)}
.af-tile em{display:block;font-style:normal;font-weight:600;color:var(--anar);margin:4px 0 8px}
.af-tile span{font-size:15.5px;line-height:1.45}
.af-verse{border-left:6px solid var(--saffron);padding:6px 0 6px 20px;margin:24px 0;font:500 24px/1.4 "Cormorant Garamond",serif;color:var(--lapis)}
.af-verse small{display:block;font:400 15px/1.5 "Source Serif 4",serif;color:var(--ink);margin-top:8px}
.af-help{border:1px solid var(--lapis);background:#fff;padding:16px 20px;font-size:16.5px;line-height:1.6}
.c-faq{max-width:760px;margin:44px auto 0;padding:0 20px}
.c-faq h2{font:700 38px/1.05 "Cormorant Garamond",serif;color:var(--lapis);margin:0 0 12px}
.c-faq summary{font:600 17.5px/1.45 "Source Serif 4",serif}
.c-faq p{font-size:16.5px;line-height:1.65}
.af-end{margin-top:60px;background:var(--anar);color:#fff;text-align:center;padding:56px 20px}
.af-end h2{font:700 clamp(38px,6vw,64px)/1 "Cormorant Garamond",serif;margin:0 0 10px}
.af-end p{font-size:18px;line-height:1.55;margin:0 auto 24px;max-width:540px}
.af-end .c-ctas{justify-content:center}
@media (max-width:640px){.af-tiles{grid-template-columns:1fr}}
`,
  faq: [
    { q: 'Is TalkLive free in Afghanistan?', a: 'Yes. Voice calls and text chat are free, with no account, no phone number and no camera. Choosing Afghanistan as a preferred country is free as well.' },
    { q: 'Can I talk in Dari or Pashto?', a: 'Yes. Speak any language you and your match share. People chat in Dari, Pashto, Uzbek and English, and many Afghans abroad also speak Urdu, German or Turkish.' },
    { q: 'Does it work on a slow connection?', a: 'A voice call needs far less data than video, about 0.3 to 0.5 MB a minute, and text chat works on almost any connection.' },
    { q: 'When are people from Afghanistan online?', a: 'TalkLive is busiest between 15:00 and 21:00 UTC, which is 7:30 in the evening to 1:30 at night in Kabul (UTC+4:30).' },
    { q: 'Is the call private?', a: 'Calls go directly between the two devices and are never recorded. You use a temporary name, and you choose what to share about yourself.' },
  ],
  body: (c) => `<main id="story">
<section class="af-hero"><div>
  <h1>Talk to strangers in Afghanistan</h1>
  <p>A free voice call or text chat with someone new, in Kabul, Herat or Mazar, or an Afghan living far from home. No sign-up, no number, no camera.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</div></section>

<div class="af-main">
  <section class="af-sec">
    <h2>Tea first, questions later</h2>
    <p>Hospitality in Afghanistan is not a courtesy, it is a rule: a guest is given tea and the best seat before anyone asks why they came. That carries over to conversation. Greetings are long and sincere, people ask after your family and your health, and they mean it.</p>
    <p>Millions of Afghans live abroad, in Iran, Pakistan, Germany, Turkey, the United States and elsewhere, so the voice that answers may be thousands of kilometres from Kabul and happy to speak Dari or Pashto for an evening.</p>
  </section>

  <section class="af-sec">
    <h2>How to say hello</h2>
    <div class="af-tiles">${GREETINGS.map(([q, a, note]) => `<div class="af-tile"><b>${q}</b><em>${a}</em><span>${note}</span></div>`).join('')}</div>
    <p><em>Tashakor</em> (Dari) and <em>manana</em> (Pashto) both mean thank you. <em>Jan</em> after a name means dear, and is used for friends of any age. <em>Inshallah</em> closes most plans.</p>
    <div class="af-verse">Come, come, whoever you are.<small>A line long attributed to Rumi, who was born in Balkh in 1207. Poetry is still quoted in ordinary conversation here, and a verse is a welcome answer.</small></div>
  </section>

  <section class="af-sec">
    <h2>What to talk about</h2>
    <p>Cricket above all: the national team and its spinners are a source of real joy, and everyone has an opinion. Kabuli pulao and who makes it properly, mantu, bolani and green tea with cardamom. Nowruz and the red tulips of Mazar-i-Sharif. Kite flying, the attan, music old and new, and the mountains. Ask about someone's home province and listen.</p>
    <p>Many people here are practising English for study or work. If that is you, add the English practice interest before you start.</p>
  </section>

  <section class="af-sec">
    <h2>Stay safe</h2>
    <p>Share only what you are comfortable sharing. Keep your full name, exact location, workplace and social accounts to yourself, and never send money, codes or photos to someone you have just met. End the call with anyone who pressures you or asks to move to another app straight away. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">scam guide</a> lists the usual tricks, and every call and chat has Report and Block.</p>
    <div class="af-help">Calls are not recorded and no account is needed. You can leave any conversation with one tap.</div>
  </section>
</div>

${c.faq('Questions people ask')}
<section class="af-end">
  <h2>Chetor asti?</h2>
  <p>Someone is online now and ready to answer. Start a call or a chat.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
