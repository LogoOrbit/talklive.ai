'use strict';
// United Arab Emirates: "Arrivals". A country where most residents were born
// somewhere else, told as an airport arrivals board: black split-flap panels,
// amber lettering, gate numbers for sections. JetBrains Mono for the board,
// IBM Plex Serif to read, IBM Plex Sans for labels.
const BOARD = [
  ['Kochi', 'Malayalam', 'LANDED'],
  ['Manila', 'Tagalog', 'LANDED'],
  ['Lahore', 'Urdu', 'LANDED'],
  ['Cairo', 'Arabic', 'LANDED'],
  ['London', 'English', 'LANDED'],
  ['You', 'Any', 'BOARDING'],
];

module.exports = {
  slug: 'united-arab-emirates',
  name: 'United Arab Emirates',
  date: '2026-10-06',
  title: 'Talk to Strangers in the UAE - Free Voice Chat in Dubai & Abu Dhabi | TalkLive',
  description: 'Free voice and text chat with people in the UAE - in English, Arabic, Hindi, Urdu, Tagalog or Malayalam, no sign-up, no camera. Who lives in Dubai and Abu Dhabi, and when the Emirates are online.',
  keywords: 'talk to strangers uae, dubai chat, uae voice chat, chat with people in dubai, random chat dubai, abu dhabi chat, dubai voice chat, شات الامارات',
  h1: 'Talk to Strangers in the UAE',
  theme: '#0b0b0c',
  preload: ['jetbrains-mono-latin-400-normal', 'ibm-plex-serif-latin-400-normal'],
  css: `
:root{--paper:#f3f1ec;--ink:#17171a;--rule:#d8d4ca;--board:#0b0b0c;--flap:#1c1c20;--amber:#ffb627;--teal:#007a78;--mast:#f3f1ec}
body{font-family:"IBM Plex Serif",Georgia,serif;background:var(--paper);color:var(--ink)}
.c-bar{color:var(--mast);background:var(--board);max-width:none}
.ae-hero{background:var(--board);color:#f3f1ec;padding:56px 20px 64px}
.ae-hero-in{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:44px;align-items:center}
.ae-kicker{font:500 13px/1 "IBM Plex Sans",sans-serif;letter-spacing:.24em;text-transform:uppercase;color:var(--amber)}
.ae-hero h1{font:400 clamp(38px,5.8vw,72px)/1.05 "JetBrains Mono",monospace;letter-spacing:-.03em;margin:16px 0 18px;text-transform:uppercase}
.ae-dek{font:400 19px/1.6 "IBM Plex Serif",serif;color:#d9d6cf;margin:0 0 28px}
.ae-board{background:#000;border:1px solid #333;border-radius:8px;padding:14px;font:400 15px/1 "JetBrains Mono",monospace}
.ae-board-h{display:grid;grid-template-columns:1.2fr 1fr .9fr;gap:8px;color:#8a8a8a;font-size:11px;letter-spacing:.18em;padding:0 8px 10px}
.ae-board-r{display:grid;grid-template-columns:1.2fr 1fr .9fr;gap:8px;margin-top:6px}
.ae-board-r span{background:var(--flap);color:var(--amber);padding:10px 8px;border-radius:3px;text-transform:uppercase;letter-spacing:.06em;position:relative;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.ae-board-r span::after{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:#000}
.ae-board-r:last-child span{color:#3ee08f}
.ae-main{max-width:820px;margin:0 auto;padding:20px 20px 0}
.ae-gate{padding:42px 0 8px}
.ae-gate-n{display:inline-block;font:400 13px/1 "JetBrains Mono",monospace;letter-spacing:.14em;background:var(--board);color:var(--amber);padding:8px 12px;border-radius:3px}
.ae-gate h2{font:600 clamp(28px,4vw,42px)/1.12 "IBM Plex Serif",serif;margin:14px 0 16px}
.ae-gate p{font:400 18.5px/1.75 "IBM Plex Serif",serif;margin:0 0 1.05em}
.ae-gate a{color:var(--teal)}
.ae-langs{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0}
.ae-langs span{font:500 14px/1 "IBM Plex Sans",sans-serif;border:1px solid var(--ink);padding:9px 12px;border-radius:999px}
.ae-langs span:first-child{background:var(--ink);color:var(--paper)}
.ae-week{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:18px 0;font:400 13px/1 "JetBrains Mono",monospace;text-align:center}
.ae-week div{background:#fff;border:1px solid var(--rule);padding:14px 2px}
.ae-week .half{background:linear-gradient(180deg,#fff 50%,var(--board) 50%);color:var(--teal)}
.ae-week .off{background:var(--board);color:var(--amber);border-color:var(--board)}
.ae-phr{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:20px 0}
.ae-phr div{background:#fff;border:1px solid var(--rule);border-top:4px solid var(--amber);padding:14px 16px;font:400 16px/1.5 "IBM Plex Serif",serif}
.ae-phr b{display:block;font:400 18px/1.2 "JetBrains Mono",monospace;margin-bottom:4px}
.ae-dep{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:20px 0}
.ae-dep div{background:var(--board);color:#f3f1ec;padding:16px;border-radius:4px}
.ae-dep b{display:block;font:400 22px/1.1 "JetBrains Mono",monospace;color:var(--amber);margin-bottom:6px}
.ae-dep span{font:500 14px/1.4 "IBM Plex Sans",sans-serif}
.ae-help{border-left:4px solid var(--teal);background:#fff;padding:18px 22px;font:400 17px/1.6 "IBM Plex Serif",serif}
.ae-help b{color:var(--teal)}
.c-faq{max-width:820px;margin:34px auto 0;padding:0 20px}
.c-faq h2{font:400 32px/1.1 "JetBrains Mono",monospace;text-transform:uppercase;margin:0 0 14px}
.c-faq summary{font:600 18px/1.4 "IBM Plex Serif",serif}
.c-faq p{font:400 17px/1.65 "IBM Plex Serif",serif}
.ae-end{background:var(--board);color:#f3f1ec;padding:56px 20px;margin-top:60px;text-align:center}
.ae-end h2{font:400 clamp(30px,5vw,56px)/1.05 "JetBrains Mono",monospace;text-transform:uppercase;margin:0 0 12px;color:var(--amber)}
.ae-end p{font:400 18px/1.55 "IBM Plex Serif",serif;color:#d9d6cf;margin:0 auto 24px;max-width:540px}
.ae-end .c-ctas{justify-content:center}
@media (max-width:860px){.ae-hero-in{grid-template-columns:1fr}}
@media (max-width:620px){.ae-phr,.ae-dep{grid-template-columns:1fr}.ae-board{font-size:12px}.ae-week{font-size:11px}}
`,
  faq: [
    { q: 'Which languages can I use on TalkLive in the UAE?', a: 'Any language you and your match share. English is the common language of the Emirates, and Arabic, Hindi, Urdu, Malayalam, Tagalog, Bengali and many more are spoken. The interface is available in 17 languages, including Arabic, Hindi and Urdu.' },
    { q: 'Is TalkLive free in the UAE?', a: 'Yes. Voice and text chat are free, need no account, and preferring the UAE in the country filter is free.' },
    { q: 'What if a voice call will not connect on my network?', a: 'Some networks limit internet calling. If a voice call does not connect for you, text chat works the same way: tap Tap to Chat instead.' },
    { q: 'When is the UAE busiest on TalkLive?', a: 'In the evening and late night, Gulf time: roughly 7 pm to 1 am. The UAE does not change its clocks.' },
    { q: 'Will I always be matched with someone in the UAE?', a: 'Not always. A country preference steers matching, but it depends on who is searching at that moment.' },
    { q: 'Does anyone see my phone number or face?', a: 'No. Calls run in the browser, no number is exchanged and there is no video.' },
  ],
  body: (c) => `<main id="story">
<section class="ae-hero">
  <div class="ae-hero-in">
    <div>
      <span class="ae-kicker">Country guide &middot; Dubai &middot; Abu Dhabi &middot; Sharjah</span>
      <h1>Talk to strangers in the UAE</h1>
      <p class="ae-dek">Nearly everyone in the Emirates arrived from somewhere. That makes it one of the easiest places in the world to talk to a stranger - and one of the most interesting. Start a conversation by voice or by text, free, with no account, no number and no camera.</p>
      ${c.ctas('Tap to Talk', 'Tap to Chat')}
    </div>
    <div class="ae-board" aria-label="Arrivals board: people in the UAE come from Kochi, Manila, Lahore, Cairo and London - and you">
      <div class="ae-board-h"><span>FROM</span><span>SPEAKS</span><span>STATUS</span></div>
      ${BOARD.map(([from, lang, st]) => `<div class="ae-board-r"><span>${from}</span><span>${lang}</span><span>${st}</span></div>`).join('')}
    </div>
  </div>
</section>

<div class="ae-main">
  <section class="ae-gate">
    <span class="ae-gate-n">GATE A1 &middot; WHO LIVES HERE</span>
    <h2>A country of arrivals</h2>
    <p>The UAE has around ten million residents, and by most estimates close to nine in ten of them are not Emirati citizens. People came to build, to nurse, to teach, to trade and to manage, from India, Pakistan, Bangladesh, the Philippines, Egypt, Europe and almost everywhere else. Dubai International has for years been the world's busiest airport for international passengers. A taxi ride across Dubai can involve a Keralan driver, a Filipina receptionist, a Pakistani shopkeeper and an Emirati official, all in English, each of them switching back to their own language on the phone home.</p>
    <p>That mix shapes conversations here. Almost everyone has a "where are you really from" story - a home town, a family elsewhere, a plan to go back or a decision to stay - and almost everyone is used to talking with people from other countries. It is an unusually good starting point for a call with a stranger: you already have something to ask.</p>
  </section>

  <section class="ae-gate">
    <span class="ae-gate-n">GATE A2 &middot; LANGUAGES</span>
    <h2>English first, then everything else</h2>
    <p>Arabic is the official language, but English is what most people use to talk across communities, and you will hear Gulf Arabic, Hindi and Urdu, Malayalam, Tagalog, Bengali, Tamil, Persian and Russian on the same street. On TalkLive, start in English if you are unsure, then ask what your match grew up speaking. The app's interface is available in <a href="/ar/">Arabic</a>, <a href="/hi/">Hindi</a>, <a href="/ur/">Urdu</a> and fourteen other languages.</p>
    <div class="ae-langs"><span>English</span><span>العربية</span><span>हिन्दी</span><span>اردو</span><span>മലയാളം</span><span>Tagalog</span><span>বাংলা</span><span>தமிழ்</span><span>فارسی</span></div>
    <p>Some words cross every community. You will hear them on every call:</p>
    <div class="ae-phr">
      <div><b>Yalla</b>Let's go / come on - used by everyone, in every language</div>
      <div><b>Khalas</b>Done, enough, that's it</div>
      <div><b>Inshallah</b>God willing - also "probably", depending on the tone</div>
      <div><b>Habibi / Habibti</b>My dear (to a man / to a woman) - friendly, everyday</div>
    </div>
  </section>

  <section class="ae-gate">
    <span class="ae-gate-n">GATE B1 &middot; THE WEEK</span>
    <h2>The weekend that moved</h2>
    <p>In January 2022 the UAE federal government switched to a Saturday-Sunday weekend, with Friday a half day - a four-and-a-half-day week that lines the Emirates up with Europe and the markets, while keeping Friday afternoon for prayers. Many private employers followed. Friday night, not Thursday, is now the big night out.</p>
    <div class="ae-week" aria-label="The UAE week: Friday a half day, Saturday and Sunday off">
      <div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div class="half">FRI</div><div class="off">SAT</div><div class="off">SUN</div>
    </div>
    <p>The seasons matter too. Winter, from about November to March, is the outdoor season: beaches, desert camping, evenings outside. In the summer heat, life moves indoors and late - which is when people are most likely to be on their phones, looking for someone to talk to.</p>
  </section>

  <section class="ae-gate">
    <span class="ae-gate-n">GATE B2 &middot; WHAT TO TALK ABOUT</span>
    <h2>Home, here, and the next trip</h2>
    <p>Ask where someone's family is, and what they miss. Ask what surprised them when they arrived. Food is endless ground - Dubai has some of the best South Asian, Arab and Filipino food outside those countries, and people have strong opinions about where. Cricket for South Asians, football for nearly everyone else, and the eternal subject of every expat city: rent, traffic and summer. Emiratis are a minority in their own country and often enjoy explaining it from the inside; let them lead.</p>
    <p>A word on loneliness: many workers in the UAE live thousands of kilometres from their families for years at a time, and a long shift followed by a quiet room is a common story. If that is you, you are far from alone, and a conversation in your own language can help more than you would think. Our Journal piece on <a href="/blog/lonely-after-moving-abroad">loneliness after moving abroad</a> is written for exactly this.</p>
  </section>

  <section class="ae-gate">
    <span class="ae-gate-n">GATE C1 &middot; DEPARTURES</span>
    <h2>When the Emirates are online</h2>
    <p>TalkLive's busiest hours worldwide, measured from our own hourly match counts in late September and early October 2026, fall between 15:00 and 21:00 UTC. The UAE is on Gulf Standard Time, UTC+4, all year.</p>
    <div class="ae-dep">
      <div><b>19:00 - 01:00</b><span>Busiest, all year</span></div>
      <div><b>FRI NIGHT</b><span>The big night of the week</span></div>
      <div><b>05:00 - 10:00</b><span>Quietest</span></div>
    </div>
    <p>A Dubai evening overlaps with Saudi Arabia and Egypt's evening, with India and Pakistan's late night, and with Europe's afternoon - which is often exactly where the people you are talking to have family.</p>
  </section>

  <section class="ae-gate">
    <span class="ae-gate-n">GATE C2 &middot; SECURITY</span>
    <h2>Keep it private</h2>
    <p>Do not share your full name, Emirates ID, passport details, employer, address or social media accounts in a first conversation. Never share a card number or one-time code, and be careful with anyone who offers a job, a visa or an investment, asks for photos, or wants to move to another app at once - our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">guide to chat scams</a> covers the common scripts. Keep conversations respectful: the UAE's laws on public decency and insults apply online too. Every call and chat has Report and Block. TalkLive is for adults 18 and over only.</p>
    <div class="ae-help"><b>In an emergency</b> in the UAE, call <b>999</b> for police or <b>998</b> for an ambulance. If you are struggling, <a href="https://findahelpline.com" rel="noopener">findahelpline.com</a> lists free, confidential helplines.</div>
    <p style="margin-top:20px">For the wider region, read the Journal's <a href="/regions/middle-east">Middle East feature</a> and our guide to <a href="/countries/saudi-arabia">Saudi Arabia</a>; for the countries many residents call home, see <a href="/countries/india">India</a>, <a href="/countries/pakistan">Pakistan</a> and <a href="/countries/philippines">the Philippines</a>.</p>
  </section>
</div>

${c.ad()}
${c.faq('Questions at the gate')}
<section class="ae-end">
  <h2>Now boarding: you</h2>
  <p>Dubai, Abu Dhabi, Sharjah, Al Ain - somebody from somewhere else is waiting to say hello.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
