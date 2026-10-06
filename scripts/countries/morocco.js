'use strict';
// Morocco: "Three Glasses". Mint tea poured from a height and Darija, the
// language that borrows from everyone, set on a zellige ground: cobalt and
// emerald star-tiles, saffron and terracotta, plaster white. Fraunces for
// display, Source Serif 4 to read.
module.exports = {
  slug: 'morocco',
  name: 'Morocco',
  date: '2026-10-06',
  title: 'Talk to Strangers in Morocco - Free Darija & French Voice Chat | TalkLive',
  description: 'Free voice and text chat with people in Morocco - in Darija, French, Arabic or English, no sign-up, no camera. Mint tea, the language that borrows from everyone, and when Morocco is online.',
  keywords: 'talk to strangers morocco, moroccan chat, darija voice chat, chat with moroccans, random chat morocco, chat maroc, tchat maroc, شات مغربي',
  h1: 'Talk to Strangers in Morocco',
  theme: '#12406b',
  preload: ['fraunces-latin-700-normal', 'source-serif-4-latin-400-normal'],
  css: `
:root{--paper:#fbf6ec;--ink:#24170f;--rule:#e6d6bb;--cobalt:#12406b;--emer:#0e6b55;--saff:#e3a21a;--terra:#b5532f;--mast:#fbf6ec}
body{font-family:"Source Serif 4",Georgia,serif;background:var(--paper);color:var(--ink)}
.c-bar{color:var(--mast);background:var(--cobalt);max-width:none}
.ma-zel{background:
 conic-gradient(from 45deg at 50% 50%,var(--saff) 0 25%,var(--cobalt) 0 50%,var(--saff) 0 75%,var(--cobalt) 0) 0 0/44px 44px;
 position:relative}
.ma-zel::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,var(--emer) 0 7px,transparent 8px) 0 0/22px 22px;opacity:.9}
.ma-hero{position:relative;padding:58px 20px 64px}
.ma-arch{position:relative;z-index:1;max-width:760px;margin:0 auto;background:var(--paper);border-radius:380px 380px 0 0;padding:130px 56px 46px;text-align:center;box-shadow:0 0 0 10px var(--terra)}
.ma-kicker{font:600 13px/1 "Source Serif 4",serif;letter-spacing:.3em;text-transform:uppercase;color:var(--terra)}
.ma-arch h1{font:700 clamp(34px,5.2vw,62px)/1.04 "Fraunces",serif;color:var(--cobalt);margin:16px 0 12px}
.ma-arch h1 em{font-style:italic;font-weight:400;color:var(--emer)}
.ma-ar{font:700 30px/1.5 "Noto Naskh Arabic","Amiri","Traditional Arabic",serif;color:var(--terra);margin:0 0 6px}
.ma-tif{font:400 22px/1.5 "Noto Sans Tifinagh","Ebrima",sans-serif;color:var(--emer);margin:0 0 16px;letter-spacing:.1em}
.ma-dek{font:400 19px/1.6 "Source Serif 4",serif;margin:0 auto 28px;max-width:560px}
.c-ctas{justify-content:center}
.ma-main{max-width:800px;margin:0 auto;padding:30px 20px 0}
.ma-glass{display:grid;grid-template-columns:90px 1fr;gap:26px;padding:40px 0 14px;border-bottom:1px solid var(--rule)}
.ma-g{width:70px;height:96px;margin-top:8px;border-radius:6px 6px 18px 18px;background:linear-gradient(180deg,transparent 0 22%,var(--fill) 22%);border:2px solid var(--saff);position:relative}
.ma-g::before{content:"";position:absolute;left:8px;right:8px;top:30%;height:2px;background:rgba(255,255,255,.55)}
.ma-glass h2{font:700 clamp(28px,4vw,42px)/1.1 "Fraunces",serif;color:var(--cobalt);margin:0 0 4px}
.ma-glass h2+i{display:block;font:400 italic 18px/1.4 "Fraunces",serif;color:var(--terra);margin-bottom:16px}
.ma-glass p{font:400 18.5px/1.75 "Source Serif 4",serif;margin:0 0 1em}
.ma-glass a{color:var(--emer)}
.ma-mix{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:20px 0}
.ma-mix div{padding:14px;text-align:center;color:#fff;font:400 15px/1.4 "Source Serif 4",serif}
.ma-mix b{display:block;font:700 22px/1.1 "Fraunces",serif;margin-bottom:4px}
.ma-mix div:nth-child(1){background:var(--emer)}.ma-mix div:nth-child(2){background:var(--cobalt)}.ma-mix div:nth-child(3){background:var(--terra)}.ma-mix div:nth-child(4){background:#7a5a10}
.ma-phr{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:18px 0}
.ma-phr div{background:#fff;border:1px solid var(--rule);border-radius:999px 999px 14px 14px;padding:18px 18px 14px;text-align:center;font:400 16px/1.45 "Source Serif 4",serif}
.ma-phr b{display:block;font:700 21px/1.2 "Fraunces",serif;color:var(--cobalt);margin-bottom:4px}
.ma-clock{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}
.ma-clock div{background:var(--cobalt);color:#fff;padding:16px;border-bottom:6px solid var(--saff)}
.ma-clock b{display:block;font:700 24px/1.1 "Fraunces",serif;margin-bottom:6px}
.ma-help{background:var(--emer);color:#fff;padding:18px 22px;font:400 17px/1.6 "Source Serif 4",serif}
.ma-help b{color:#ffe08a}.ma-help a{color:#fff}
.c-faq{max-width:800px;margin:36px auto 0;padding:0 20px}
.c-faq h2{font:700 38px/1.1 "Fraunces",serif;color:var(--cobalt);margin:0 0 14px}
.c-faq summary{font:700 18px/1.4 "Fraunces",serif}
.c-faq p{font:400 17px/1.65 "Source Serif 4",serif}
.ma-end{margin-top:60px;padding:50px 20px;position:relative}
.ma-end-in{position:relative;z-index:1;max-width:640px;margin:0 auto;background:var(--paper);padding:40px 30px;text-align:center;box-shadow:0 0 0 8px var(--terra)}
.ma-end h2{font:700 clamp(32px,5vw,52px)/1.05 "Fraunces",serif;color:var(--cobalt);margin:0 0 10px}
.ma-end p{font:400 18px/1.55 "Source Serif 4",serif;margin:0 0 22px}
@media (max-width:720px){.ma-arch{padding:120px 20px 36px;border-radius:200px 200px 0 0}.ma-kicker{letter-spacing:.16em;font-size:12px}.ma-glass{grid-template-columns:1fr}.ma-g{display:none}.ma-mix{grid-template-columns:1fr 1fr}.ma-phr,.ma-clock{grid-template-columns:1fr}}
`,
  faq: [
    { q: 'Can I chat in Darija or French on TalkLive?', a: 'Yes. Speak whichever language you and your match share - Darija, French, Arabic, Tamazight, Spanish or English. The interface is available in both Arabic (talklive.app/ar/) and French (talklive.app/fr/).' },
    { q: 'Is TalkLive free in Morocco?', a: 'Yes. Voice and text chat are free, need no account, and preferring Morocco in the country filter is free.' },
    { q: 'When is Morocco busiest on TalkLive?', a: 'In the late afternoon and evening, Moroccan time: roughly 4 pm to 10 pm. Morocco keeps GMT+1 for most of the year and moves to GMT during Ramadan.' },
    { q: 'Will I always be matched with someone in Morocco?', a: 'Not always. A country preference steers matching, but it depends on who is searching at that moment.' },
    { q: 'Can I practise Moroccan Arabic here?', a: 'Yes. Prefer Morocco in Filters and say you are learning Darija. Voice is the best way, because Darija is mostly spoken rather than written.' },
    { q: 'Does anyone see my phone number or face?', a: 'No. Calls run in the browser, no number is exchanged and there is no video.' },
  ],
  body: (c) => `<main id="story">
<section class="ma-hero ma-zel">
  <div class="ma-arch">
    <span class="ma-kicker">Country guide &middot; Al-Maghrib</span>
    <h1>Talk to strangers in <em>Morocco</em></h1>
    <p class="ma-ar" lang="ar" dir="rtl">سلام، لاباس؟</p>
    <p class="ma-tif" lang="zgh" aria-hidden="true">ⴰⵣⵓⵍ</p>
    <p class="ma-dek">In Morocco, a conversation comes with tea - poured from a height, sweet with mint, and never just one glass. Sit down for a few with someone new, by voice or by text, free, with no account, no number and no camera.</p>
    ${c.ctas('Tap to Talk', 'Tap to Chat')}
  </div>
</section>

<div class="ma-main">
  <section class="ma-glass">
    <div class="ma-g" style="--fill:#cfe3b0" aria-hidden="true"></div>
    <div>
      <h2>The first glass</h2>
      <i>Welcome</i>
      <p>Moroccan mint tea - green tea, a handful of fresh spearmint and a lot of sugar - is poured from a silver pot held high above small decorated glasses, so the tea froths and cools as it falls. A host pours, tastes, pours back into the pot and pours again until it is right. It is served to guests, at work, in the souk while you bargain, after every meal. Refusing it is a small rudeness; taking time over it is the point.</p>
      <p>There is a saying, told across the Sahara and well known in Morocco, that the first glass is gentle as life, the second strong as love, and the third bitter as death. You do not have to believe it to see the shape it describes: a conversation that deepens the longer you stay. That is a good way to think about a call with a stranger. The first few minutes are just the first glass.</p>
    </div>
  </section>

  <section class="ma-glass">
    <div class="ma-g" style="--fill:#a8cf7a" aria-hidden="true"></div>
    <div>
      <h2>The second glass</h2>
      <i>The language that borrows from everyone</i>
      <p>Moroccans speak <em>Darija</em>, Moroccan Arabic, and it is unlike any other Arabic you have heard. It is built on Arabic and the Amazigh (Berber) languages that were spoken in North Africa long before, and it borrows freely from French and Spanish - a Moroccan might say <em>tomobil</em> for car and <em>simana</em> for week in the same sentence as pure Arabic. Since the 2011 constitution, Tamazight has been an official language alongside Arabic, written in its own ancient script, Tifinagh, which you will see on road signs and government buildings. French is still the language of much business and higher education, and Spanish is common in the north.</p>
      <div class="ma-mix">
        <div><b>Darija</b>Everyday speech</div>
        <div><b>Tamazight</b>Official since 2011</div>
        <div><b>French</b>Business, university</div>
        <div><b>Spanish</b>Common in the north</div>
      </div>
      <p>The result is a people who switch languages without noticing, which makes Moroccans some of the easiest conversation partners on TalkLive. Start in French or English if you like; you will often get an answer in both. If you are learning Arabic, be warned that Darija sounds different from the Egyptian or Gulf Arabic of television - and Moroccans enjoy pointing out that they understand everyone else's dialect while nobody understands theirs.</p>
      <div class="ma-phr">
        <div><b>Salam, labas?</b>Hi, all good?</div>
        <div><b>Labas, hamdullah</b>All good, thank God</div>
        <div><b>Mnin nta? / nti?</b>Where are you from? (man / woman)</div>
        <div><b>Wakha &middot; Safi &middot; Bzzaf</b>OK &middot; enough, done &middot; a lot</div>
      </div>
    </div>
  </section>

  <section class="ma-glass">
    <div class="ma-g" style="--fill:#6f9e45" aria-hidden="true"></div>
    <div>
      <h2>The third glass</h2>
      <i>What to talk about, and when</i>
      <p>Football, first and always. In 2022 Morocco's national team, the Atlas Lions, became the first African and first Arab side to reach a World Cup semi-final, and the country is co-hosting the 2030 World Cup with Spain and Portugal. Raja and Wydad, the two great Casablanca clubs, divide families. Then food - couscous on Fridays, the tagine, which city does the best <em>msemen</em> - music from gnawa to rai to Moroccan rap, and the long, lively family life that runs through every story. Morocco is a young country of around 37 million people, and studies, work and the question of whether to stay or go abroad come up often. Let your match lead on religion and politics.</p>
      <p>TalkLive's busiest hours worldwide, measured from our own hourly match counts in late September and early October 2026, fall between 15:00 and 21:00 UTC. Morocco has kept GMT+1 since 2018, except during Ramadan, when the clocks go back an hour to GMT.</p>
      <div class="ma-clock">
        <div><b>4 pm - 10 pm</b>Busiest, most of the year</div>
        <div><b>3 pm - 9 pm</b>Busiest, during Ramadan</div>
        <div><b>3 am - 8 am</b>Quietest</div>
      </div>
      <p>That evening lines up with France and Spain, where many Moroccans have family, and with Egypt and the Gulf's evening - so a call from Casablanca may reach Paris, Madrid, Cairo or Riyadh.</p>
    </div>
  </section>

  <section class="ma-glass">
    <div class="ma-g" style="--fill:#e9d8a6" aria-hidden="true"></div>
    <div>
      <h2>Before you go</h2>
      <i>House rules</i>
      <p>Keep your full name, address, ID card number, workplace and social media accounts private in a first conversation. Never share a bank card number or one-time code, and be careful with anyone who promises a visa, a job abroad or a quick profit, asks for photos, or wants to move to another app at once. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">guide to chat scams</a> lists the common scripts. Every TalkLive call and chat has Report and Block. TalkLive is for adults 18 and over only.</p>
      <div class="ma-help"><b>In an emergency</b> in Morocco, call <b>19</b> for police in cities, <b>177</b> for the Gendarmerie outside them, or <b>15</b> for an ambulance or the fire service. If you are struggling, <a href="https://findahelpline.com" rel="noopener">findahelpline.com</a> lists free, confidential helplines.</div>
      <p style="margin-top:20px">The whole app is available in <a href="/ar/">Arabic</a> and <a href="/fr/">French</a>. For the wider region read the Journal's <a href="/regions/middle-east">Middle East and North Africa feature</a>, and our guide to <a href="/countries/egypt">Egypt</a>.</p>
    </div>
  </section>
</div>

${c.ad()}
${c.faq('Questions over tea')}
<section class="ma-end ma-zel"><div class="ma-end-in">
  <h2>Marhba bik</h2>
  <p>Casablanca, Rabat, Fes, Marrakech, Tangier - the tea is poured. Pull up a cushion.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</div></section>
</main>`,
};
