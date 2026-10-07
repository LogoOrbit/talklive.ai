'use strict';
// Turkey: "The Tea Garden". A conversation over a tulip glass of çay: deep
// tea-amber and Turkish red on cream, with a row of glasses that fill through
// TalkLive's busiest evening hours. Cormorant Garamond for display, Manrope to
// read.
const GLASSES = [
  ['18:00', 'Work ends, the first glass'],
  ['19:00', 'Dinner, then more tea'],
  ['20:00', 'The dizi starts'],
  ['21:00', 'The match kicks off'],
  ['22:00', 'Balconies and phones'],
  ['23:00', 'Last glass, long talks'],
];

module.exports = {
  slug: 'turkey',
  name: 'Turkey',
  date: '2026-10-07',
  title: 'Talk to Strangers in Turkey - Free Voice Chat | TalkLive',
  description: 'Free voice and text chat with people in Turkey - in Turkish or English, no sign-up, no camera. Tea, football, dizi, two continents and when Turkey is online.',
  keywords: 'talk to strangers turkey, turkey chat, turkish voice chat, chat with turkish people, random chat turkey, istanbul chat, yabancılarla sohbet, sesli sohbet',
  h1: 'Talk to Strangers in Turkey',
  theme: '#7a1d12',
  preload: ['cormorant-garamond-latin-700-normal', 'manrope-latin-400-normal'],
  css: `
:root{--paper:#fbf5ea;--ink:#2a1610;--rule:#e6d6bd;--red:#c8102e;--tea:#a4471b;--deep:#7a1d12;--gold:#e0a43a;--mast:#fbf5ea}
body{font-family:"Manrope",system-ui,sans-serif;background:var(--paper);color:var(--ink)}
.c-bar{color:var(--mast);background:var(--deep);max-width:none}
.tr-hero{background:radial-gradient(circle at 80% 20%,#b23a1a 0,var(--deep) 55%,#4a0f08 100%);color:var(--paper);padding:64px 20px 56px}
.tr-hero-in{max-width:1000px;margin:0 auto}
.tr-kicker{font:700 12px/1 "Manrope",sans-serif;letter-spacing:.22em;text-transform:uppercase;color:var(--gold)}
.tr-hero h1{font:700 clamp(44px,7.6vw,96px)/.92 "Cormorant Garamond",serif;letter-spacing:-.02em;margin:18px 0 20px}
.tr-hero h1 em{font-style:normal;color:var(--gold)}
.tr-dek{font:400 19px/1.65 "Manrope",sans-serif;max-width:640px;margin:0 0 28px;opacity:.95}
.tr-glasses{max-width:1000px;margin:0 auto;padding:34px 20px 0;display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
.tr-glass{text-align:center}
.tr-glass i{display:block;width:44px;height:64px;margin:0 auto 10px;border:2px solid var(--ink);border-radius:8px 8px 14px 14px;clip-path:polygon(0 0,100% 0,82% 50%,100% 100%,0 100%,18% 50%);background:linear-gradient(to top,var(--tea) var(--f),transparent var(--f))}
.tr-glass b{display:block;font:700 22px/1 "Cormorant Garamond",serif}
.tr-glass span{font:500 13px/1.35 "Manrope",sans-serif;opacity:.8}
.tr-gcap{max-width:1000px;margin:12px auto 0;padding:0 20px;font:400 14.5px/1.55 "Manrope",sans-serif;opacity:.75;text-align:center}
.tr-main{max-width:760px;margin:0 auto;padding:16px 20px 0}
.tr-sec{padding:40px 0 4px;border-bottom:1px solid var(--rule)}
.tr-sec h2{font:700 clamp(30px,4.4vw,46px)/1.02 "Cormorant Garamond",serif;margin:0 0 16px}
.tr-sec h2 em{color:var(--red);font-style:italic}
.tr-sec p{font:400 18px/1.75 "Manrope",sans-serif;margin:0 0 1.05em}
.tr-sec a{color:var(--red)}
.tr-words{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:20px 0 24px}
.tr-words div{background:#fff;border:1px solid var(--rule);border-left:5px solid var(--red);padding:14px 16px}
.tr-words b{display:block;font:700 24px/1.1 "Cormorant Garamond",serif;margin-bottom:4px}
.tr-words span{font:400 15px/1.5 "Manrope",sans-serif}
.tr-pull{margin:24px 0;padding:24px 26px;background:var(--deep);color:var(--paper);font:700 italic 28px/1.25 "Cormorant Garamond",serif}
.tr-help{border:2px solid var(--red);background:#fff;padding:18px 22px;font:400 16.5px/1.6 "Manrope",sans-serif}
.tr-help b{color:var(--red)}
.c-faq{max-width:760px;margin:36px auto 0;padding:0 20px}
.c-faq h2{font:700 38px/1.05 "Cormorant Garamond",serif;margin:0 0 12px}
.c-faq summary{font:700 17px/1.45 "Manrope",sans-serif}
.c-faq p{font:400 16.5px/1.65 "Manrope",sans-serif}
.tr-end{margin-top:60px;background:var(--deep);color:var(--paper);padding:60px 20px;text-align:center}
.tr-end h2{font:700 clamp(36px,6vw,64px)/1 "Cormorant Garamond",serif;margin:0 0 10px}
.tr-end p{font:400 18px/1.55 "Manrope",sans-serif;margin:0 auto 24px;max-width:520px}
.tr-end .c-ctas{justify-content:center;margin:0 auto}
@media (max-width:760px){.tr-glasses{grid-template-columns:repeat(3,1fr);row-gap:22px}.tr-words{grid-template-columns:1fr}}
`,
  faq: [
    { q: 'Can I chat in Turkish on TalkLive?', a: 'Yes. Speak whichever language you and your match share, and switch the whole interface to Turkish at talklive.app/tr/ if you prefer.' },
    { q: 'Is TalkLive free in Turkey?', a: 'Yes. Voice and text chat are free, need no account, and preferring Turkey in the country filter is free.' },
    { q: 'When is Turkey busiest on TalkLive?', a: 'TalkLive is busiest worldwide between 15:00 and 21:00 UTC, which is 6 pm to midnight in Turkey. Turkey stays on UTC+3 all year, so the hours do not move with the seasons.' },
    { q: 'Will I always be matched with someone in Turkey?', a: 'Not always. A country preference steers matching, but it depends on who is searching at that moment. Global matching is usually the fastest.' },
    { q: 'Do I need to download an app?', a: 'No. TalkLive runs in the browser on Android, iPhone and desktop. You can add it to your home screen if you want an icon.' },
    { q: 'Who can I call in an emergency in Turkey?', a: 'Call 112, the single emergency number for police, ambulance and fire, free from any phone.' },
  ],
  body: (c) => `<main id="story">
<section class="tr-hero"><div class="tr-hero-in">
  <span class="tr-kicker">Country guide &middot; Turkey &middot; Türkiye</span>
  <h1>Talk to strangers in Turkey, <em>over a glass of çay</em></h1>
  <p class="tr-dek">Nowhere on earth drinks more tea per person, and almost every glass comes with a conversation. Bring that habit online: a voice call or a text chat with someone new, free, with no account, no phone number and no camera.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</div></section>

<div class="tr-glasses" aria-label="TalkLive's busiest hours in Turkish time">
${GLASSES.map(([t, what], i) => `<div class="tr-glass"><i style="--f:${30 + i * 12}%"></i><b>${t}</b><span>${what}</span></div>`).join('\n')}
</div>
<p class="tr-gcap">TalkLive's busiest hours, 15:00-21:00 UTC, are 18:00 to midnight in Turkey, which keeps UTC+3 all year.</p>

<div class="tr-main">
  <section class="tr-sec">
    <h2>A country on <em>two continents</em></h2>
    <p>Turkey is home to about 85 million people and sits on both sides of the Bosphorus, the strait that splits Istanbul between Europe and Asia. It shares borders with eight countries, faces three seas, and has spent centuries as the place where trade routes, empires and languages crossed. That shows in conversation: Turks are used to strangers, curious about where you are from, and quick to offer hospitality - usually in the form of another glass of tea.</p>
    <p>Çay is served strong, in small tulip-shaped glasses, all day long: at work, in the market, in the waiting room, after dinner. Saying no to the first glass is allowed. Saying no to every glass is suspicious.</p>
  </section>

  <section class="tr-sec">
    <h2>A few words <em>that open doors</em></h2>
    <p>Most people you meet from Turkey will be happy to talk in English, especially younger people in the cities. A few words of Turkish still go a long way, and Turkish is a satisfying language to try: it is written exactly as it sounds. The whole app also works <a href="/tr/">in Turkish</a>.</p>
    <div class="tr-words">
      <div><b>Merhaba</b><span>Hello - the all-purpose greeting.</span></div>
      <div><b>Nasılsın?</b><span>How are you? Answer <em>iyiyim</em>, I'm fine.</span></div>
      <div><b>Kolay gelsin</b><span>"May it come easy" - said to anyone who is working.</span></div>
      <div><b>Afiyet olsun</b><span>Enjoy your meal - and, often, your tea.</span></div>
    </div>
    <p>If you are learning Turkish, say so at the start. It is one of the most rewarding languages to practise by voice, because the vowel harmony and suffixes that look hard on paper make sense once you hear them.</p>
  </section>

  <section class="tr-sec">
    <h2>What to <em>talk about</em></h2>
    <p>Football first. The big Istanbul clubs - Galatasaray, Fenerbahçe and Beşiktaş - inspire loyalty that lasts a lifetime, and asking which one someone supports is the fastest way into a long conversation (unless you pick the wrong one). Then food: breakfast is a national art, and everyone has an opinion on the best kebab, the right way to make menemen and whether it should contain onions.</p>
    <div class="tr-pull">"Ask about a Turkish breakfast and you will be talking for twenty minutes."</div>
    <p>Turkish television dramas, the <em>dizi</em>, are watched from Latin America to South Asia, so if you have seen one, mention it. Music, holidays on the Aegean coast, the cost of living, university entrance exams and family are all common ground. Politics and religion can wait until you know each other.</p>
  </section>

  <section class="tr-sec">
    <h2>Privacy and <em>safety</em></h2>
    <p>Keep your full name, address, ID number, workplace and social media accounts to yourself in a first conversation. Never share a bank code or one-time password, and be wary of anyone who asks for money, gift cards or crypto, asks for photos, or wants you to move to another app straight away - our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">guide to chat scams</a> describes the usual scripts. Every TalkLive call and chat has Report and Block, and TalkLive is for adults 18 and over only.</p>
    <div class="tr-help"><b>In an emergency</b> in Turkey, call <b>112</b> - police, ambulance and fire - free from any phone.</div>
    <p style="margin-top:20px">Getting started: open TalkLive in your browser (no app, no sign-up), prefer Turkey in Filters if you like (two preferred countries are free), and Tap to Talk or Tap to Chat. For neighbours and context, read our <a href="/countries/germany">Germany guide</a> - home to the largest Turkish community outside Turkey - and the Journal's <a href="/regions/europe">Europe feature</a>.</p>
  </section>
</div>

${c.ad()}
${c.faq('Sorular - questions people ask')}
<section class="tr-end">
  <h2>Bir çay daha?</h2>
  <p>One more glass of tea, one more conversation. Someone in Istanbul, Ankara or Izmir is up for a chat.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
