'use strict';
// Germany: "Feierabend". The end of the working day, the regulars' table and
// the Sunday that belongs to nobody's boss, set as a Bauhaus poster: primary
// red, yellow and blue blocks on off-white, black rules, a circle, a square
// and a triangle. Syne for display, Space Grotesk to read.
module.exports = {
  slug: 'germany',
  name: 'Germany',
  date: '2026-10-06',
  title: 'Talk to Strangers in Germany - Free German Voice Chat | TalkLive',
  description: 'Free voice and text chat with people in Germany - in German or English, no sign-up, no camera, with a German interface. Feierabend, du or Sie, and when Germany is online in German time.',
  keywords: 'talk to strangers germany, german chat, german voice chat, chat with germans, random chat germany, practice german speaking, mit fremden chatten, chat mit fremden',
  h1: 'Talk to Strangers in Germany',
  theme: '#d62718',
  preload: ['syne-latin-800-normal', 'space-grotesk-latin-400-normal'],
  css: `
:root{--paper:#f4f0e6;--ink:#111;--rule:#111;--red:#d62718;--yel:#f2c230;--blu:#1f4fa3;--mast:#111}
body{font-family:"Space Grotesk",system-ui,sans-serif;background:var(--paper);color:var(--ink)}
.c-bar{border-bottom:3px solid var(--ink);max-width:none}
.de-hero{max-width:1180px;margin:0 auto;padding:40px 20px 0;display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:0;border-bottom:3px solid var(--ink)}
.de-hero-txt{padding:30px 34px 40px 0;border-right:3px solid var(--ink)}
.de-kicker{font:700 13px/1 "Space Grotesk",sans-serif;letter-spacing:.24em;text-transform:uppercase}
.de-hero h1{font:800 clamp(28px,4.4vw,56px)/.92 "Syne",sans-serif;letter-spacing:-.03em;margin:18px 0 22px;text-transform:uppercase}
.de-hero h1 span{color:var(--red)}
.de-dek{font:400 20px/1.55 "Space Grotesk",sans-serif;max-width:560px;margin:0 0 28px}
.de-shapes{position:relative;min-height:380px;background:var(--yel);overflow:hidden}
.de-shapes i{position:absolute;display:block}
.de-c{width:62%;aspect-ratio:1;border-radius:50%;background:var(--red);left:8%;top:10%}
.de-s{width:38%;aspect-ratio:1;background:var(--blu);right:6%;bottom:8%}
.de-t{width:0;height:0;border-left:70px solid transparent;border-right:70px solid transparent;border-bottom:120px solid var(--ink);left:14%;bottom:6%}
.de-shapes b{position:absolute;right:16px;top:14px;font:800 15px/1 "Syne",sans-serif;letter-spacing:.2em;text-transform:uppercase}
.de-main{max-width:1180px;margin:0 auto;padding:0 20px}
.de-row{display:grid;grid-template-columns:220px minmax(0,1fr);border-bottom:3px solid var(--ink)}
.de-num{padding:26px 20px 26px 0;border-right:3px solid var(--ink);font:800 86px/1 "Syne",sans-serif}
.de-row:nth-child(3n+1) .de-num{color:var(--red)}
.de-row:nth-child(3n+2) .de-num{color:var(--blu)}
.de-row:nth-child(3n) .de-num{color:#b88a00}
.de-num small{display:block;font:700 12px/1.3 "Space Grotesk",sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--ink);margin-top:12px}
.de-body{padding:30px 0 30px 34px;max-width:780px}
.de-body h2{font:800 clamp(28px,3.8vw,42px)/1.05 "Syne",sans-serif;letter-spacing:-.02em;margin:0 0 16px}
.de-body p{font:400 18px/1.7 "Space Grotesk",sans-serif;margin:0 0 1em}
.de-body a{color:var(--blu);font-weight:700}
.de-pair{display:grid;grid-template-columns:1fr 1fr;border:3px solid var(--ink);margin:20px 0}
.de-pair div{padding:18px}
.de-pair div:first-child{background:var(--blu);color:#fff;border-right:3px solid var(--ink)}
.de-pair b{display:block;font:800 30px/1 "Syne",sans-serif;margin-bottom:8px}
.de-pair span{font:400 16px/1.5 "Space Grotesk",sans-serif}
.de-phr{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:3px solid var(--ink);margin:20px 0}
.de-phr div{padding:14px;border-right:3px solid var(--ink);font:400 15px/1.45 "Space Grotesk",sans-serif}
.de-phr div:last-child{border-right:0}
.de-phr b{display:block;font:800 20px/1.1 "Syne",sans-serif;margin-bottom:6px}
.de-clock{display:grid;grid-template-columns:repeat(3,1fr);border:3px solid var(--ink);margin:20px 0}
.de-clock div{padding:18px;border-right:3px solid var(--ink)}
.de-clock div:last-child{border-right:0}
.de-clock div:first-child{background:var(--red);color:#fff}
.de-clock b{display:block;font:800 28px/1.05 "Syne",sans-serif;margin-bottom:6px}
.de-help{background:var(--ink);color:#fff;padding:20px 22px;font:400 17px/1.6 "Space Grotesk",sans-serif}
.de-help b{color:var(--yel)}
.de-help a{color:#fff}
.c-faq{max-width:900px;margin:40px auto 0;padding:0 20px}
.c-faq h2{font:800 clamp(26px,6vw,40px)/1 "Syne",sans-serif;text-transform:uppercase;overflow-wrap:anywhere;margin:0 0 14px}
.c-faq details{border-top:3px solid var(--ink)}
.c-faq summary{font:700 18px/1.4 "Space Grotesk",sans-serif}
.c-faq p{font:400 17px/1.65 "Space Grotesk",sans-serif}
.de-end{max-width:1180px;margin:56px auto 0;padding:0 20px}
.de-end-in{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center;background:var(--blu);color:#fff;padding:40px;border:3px solid var(--ink)}
.de-end h2{font:800 clamp(24px,5vw,60px)/.95 "Syne",sans-serif;overflow-wrap:anywhere;text-transform:uppercase;margin:0}
@media (max-width:860px){.de-hero{grid-template-columns:1fr}.de-hero-txt{border-right:0;padding-right:0}.de-shapes{min-height:240px}.de-row{grid-template-columns:1fr}.de-num{border-right:0;border-bottom:3px solid var(--ink);font-size:60px}.de-body{padding-left:0}.de-phr{grid-template-columns:1fr 1fr}.de-phr div:nth-child(2){border-right:0}.de-phr div:nth-child(-n+2){border-bottom:3px solid var(--ink)}.de-end-in{grid-template-columns:minmax(0,1fr);padding:28px 18px}}
@media (max-width:560px){.de-pair,.de-clock{grid-template-columns:1fr}.de-pair div:first-child,.de-clock div{border-right:0;border-bottom:3px solid var(--ink)}.de-clock div:last-child{border-bottom:0}}
`,
  faq: [
    { q: 'Can I voice chat in German on TalkLive?', a: 'Yes. Speak whichever language you and your match share, and switch the whole interface to German at talklive.app/de/ if you prefer.' },
    { q: 'Is TalkLive free in Germany?', a: 'Yes. Voice and text chat are free, need no account, and preferring Germany in the country filter is free.' },
    { q: 'Should I say du or Sie to a stranger on TalkLive?', a: 'Online, du is normal between people of a similar age, and almost everyone on a casual chat uses it. If you are unsure, ask - "Duzen wir uns?" - nobody minds.' },
    { q: 'When is Germany busiest on TalkLive?', a: 'In the late afternoon and evening: roughly 5 pm to 11 pm German time in summer and 4 pm to 10 pm in winter. Early mornings are quietest.' },
    { q: 'Can I practise German here?', a: 'Yes. Prefer Germany in Filters and say you are learning in your first sentence. Many Germans are glad to help, and many will want to practise their English in return.' },
    { q: 'Does anyone see my phone number or face?', a: 'No. Calls run in the browser, no number is exchanged and there is no video at all.' },
  ],
  body: (c) => `<main id="story">
<section class="de-hero">
  <div class="de-hero-txt">
    <span class="de-kicker">Country guide &middot; Deutschland</span>
    <h1>Talk to strangers in <span>Germany</span></h1>
    <p class="de-dek">There is a German word for the moment work ends and your own time begins: <em>Feierabend</em>. It is when Germany comes online. Spend some of it talking to someone new - in German or in English, by voice or by text, free, with no account, no number and no camera.</p>
    ${c.ctas('Tap to Talk', 'Tap to Chat')}
  </div>
  <div class="de-shapes" aria-hidden="true"><i class="de-c"></i><i class="de-s"></i><i class="de-t"></i><b>Feierabend</b></div>
</section>

<div class="de-main">
  <section class="de-row">
    <div class="de-num">01<small>Form follows function</small></div>
    <div class="de-body">
      <h2>A country that likes things to work</h2>
      <p>In 1919 Walter Gropius opened the Bauhaus in Weimar, a school that set out to join art, craft and industry. It moved to Dessau in 1925 and to Berlin in 1932, and closed under pressure from the Nazis in 1933 - fourteen years in all. Its circles, squares and primary colours still turn up everywhere from kitchens to typefaces, and so does its idea: a thing should be honest about what it is for.</p>
      <p>The same instinct shapes how a lot of Germans talk. Directness is a courtesy, not a rudeness: if a German says your plan has a problem, they are trying to help, and if they say they will call at eight, they will call at eight. On a random call that is a gift. You rarely have to guess what someone means. It also means the first question can be a real one - what do you do, what do you think about it - rather than five minutes of polite circling.</p>
    </div>
  </section>

  <section class="de-row">
    <div class="de-num">02<small>The regulars' table</small></div>
    <div class="de-body">
      <h2>Feierabend and the Stammtisch</h2>
      <p>Many German pubs keep a <em>Stammtisch</em>: a table reserved for regulars who meet on the same evening every week, sometimes for decades, to argue about football and the town council. A sign on the table says so, and strangers know not to sit there uninvited. Germany has also kept its Sundays quiet: under shop-closing laws that vary by state, most shops stay shut, and the day goes to walks, family, cake in the afternoon - <em>Kaffee und Kuchen</em> - and, for millions, the <em>Tatort</em> crime drama, which has been broadcast on Sunday evenings since 1970.</p>
      <p>Put those together and you have a picture of how Germans often socialise: in fixed, trusted circles, with clear times. That can make it hard to meet new people as an adult - newcomers to German cities say so constantly - and it is part of why a random conversation can feel refreshing here. It is a table anyone can sit at.</p>
    </div>
  </section>

  <section class="de-row">
    <div class="de-num">03<small>Du or Sie</small></div>
    <div class="de-body">
      <h2>Two words for "you"</h2>
      <p>German has a formal <em>Sie</em> and an informal <em>du</em>, and choosing between them is one of the first things learners worry about. Online, relax: between people of roughly the same age on a casual app, <em>du</em> is normal from the first second. If in doubt, ask - <em>Duzen wir uns?</em> - and you will have started a conversation about conversation, which Germans enjoy.</p>
      <div class="de-pair">
        <div><b>du</b><span>Friends, family, children, most people online and most people under about 30</span></div>
        <div><b>Sie</b><span>Strangers in shops and offices, older people, work until you are invited to switch</span></div>
      </div>
      <p>The standard language, <em>Hochdeutsch</em>, is what you will hear on almost every call, but listen for the regions behind it: Bavarian and Swabian in the south, Saxon in the east, the flat vowels of Berlin, Low German near the North Sea. A Berliner's all-purpose greeting is just <em>Na?</em> - and the answer is <em>Na?</em> too.</p>
      <div class="de-phr">
        <div><b>Na, wie geht's?</b>So, how's it going?</div>
        <div><b>Woher kommst du?</b>Where are you from?</div>
        <div><b>Alles klar</b>All good / got it</div>
        <div><b>Tschüss!</b>Bye - friendly, not formal</div>
      </div>
      <p>Many Germans speak excellent English and are happy to use it, so you never need German to start. If you are learning, though, say so first: plenty of Germans will slow down, correct you kindly and ask for some English practice in return - a ready-made <a href="/language-exchange">language exchange</a>. The whole app is <a href="/de/">available in German</a>.</p>
    </div>
  </section>

  <section class="de-row">
    <div class="de-num">04<small>Safe ground</small></div>
    <div class="de-body">
      <h2>What to talk about</h2>
      <p>Football is a reliable opener - the Bundesliga, whether anyone can stop Bayern Munich, the local club everyone in a town supports regardless. Travel is another: Germans are famous travellers and will happily compare holidays. Bread is a surprisingly good topic (Germany takes it very seriously), as are the quirks newcomers notice first: the bottle deposit, <em>Pfand</em>, recycling with four bins, everything shut on Sunday. Ask what someone does at Feierabend. Leave the history lessons to them; people will go there if they want to.</p>
    </div>
  </section>

  <section class="de-row">
    <div class="de-num">05<small>Timetable</small></div>
    <div class="de-body">
      <h2>When Germany is online</h2>
      <p>TalkLive's busiest hours worldwide, measured from our own hourly match counts in late September and early October 2026, fall between 15:00 and 21:00 UTC. Germany is on Central European Summer Time (UTC+2) from the last Sunday of March to the last Sunday of October, and Central European Time (UTC+1) the rest of the year.</p>
      <div class="de-clock">
        <div><b>5 pm - 11 pm</b>Busiest, summer time</div>
        <div><b>4 pm - 10 pm</b>Busiest, winter</div>
        <div><b>3 am - 8 am</b>Quietest</div>
      </div>
      <p>That evening overlaps with the rest of Europe, with the Gulf's late evening and South Asia's late night, and with the American morning - so a call from Hamburg may reach Vienna, Dubai, Lahore or Chicago.</p>
    </div>
  </section>

  <section class="de-row">
    <div class="de-num">06<small>House rules</small></div>
    <div class="de-body">
      <h2>Stay private, stay safe</h2>
      <p>Germans are famously careful with personal data, and the instinct is a good one here. Keep your full name, address, workplace, social media accounts and bank details to yourself, never share a one-time code or TAN, and be wary of anyone who asks for photos or wants to move to another app at once. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">guide to chat scams</a> lists the usual scripts. Every TalkLive call and chat has Report and Block, and blocked people are never matched with you again. TalkLive is for adults 18 and over only.</p>
      <div class="de-help"><b>In an emergency</b> in Germany, call <b>112</b> for an ambulance or the fire service, or <b>110</b> for the police. <b>TelefonSeelsorge</b> listens day and night, free and anonymously, on <b>0800 111 0 111</b> or <b>0800 111 0 222</b>.</div>
      <p style="margin-top:20px">Getting started: open TalkLive in your browser (no app, no sign-up), optionally prefer Germany in Filters (two preferred countries are free), then Tap to Talk or Tap to Chat. For the rest of the continent, read the Journal's <a href="/regions/europe">Europe feature</a>; our <a href="/countries/united-kingdom">United Kingdom guide</a> covers the neighbours across the water.</p>
    </div>
  </section>
</div>

${c.ad()}
${c.faq('Fragen? Questions')}
<section class="de-end"><div class="de-end-in">
  <h2>Schönen Feierabend</h2>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</div></section>
</main>`,
};
