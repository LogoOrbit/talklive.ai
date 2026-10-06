'use strict';
// Saudi Arabia: "The Majlis". The sitting room where guests are received,
// coffee is poured and the night runs long, framed by a band of Sadu weaving.
// Deep night indigo, cardamom-coffee brown and Sadu red on cream. Literata for
// display and reading, Manrope for labels.
module.exports = {
  slug: 'saudi-arabia',
  name: 'Saudi Arabia',
  date: '2026-10-06',
  title: 'Talk to Strangers in Saudi Arabia - Free Arabic Voice Chat | TalkLive',
  description: 'Free voice and text chat with people in Saudi Arabia - in Arabic or English, no sign-up, no camera, with an Arabic interface. The majlis, Saudi coffee, Ramadan nights and when the Kingdom is online.',
  keywords: 'talk to strangers saudi arabia, saudi chat, arabic voice chat, chat with saudis, random chat saudi, voice chat riyadh, شات سعودي, دردشة سعودية',
  h1: 'Talk to Strangers in Saudi Arabia',
  theme: '#141a33',
  preload: ['literata-latin-700-normal', 'literata-latin-400-normal'],
  css: `
:root{--paper:#f6efe2;--ink:#231a14;--rule:#dfd0b8;--night:#141a33;--coffee:#6b4226;--sadu:#a3262a;--sand:#e8c98f;--mast:#f6efe2}
body{font-family:"Literata",Georgia,serif;background:var(--paper);color:var(--ink)}
.c-bar{color:var(--mast);background:var(--night);max-width:none}
.sa-sadu{height:34px;background:
 linear-gradient(135deg,transparent 33%,var(--sadu) 33% 50%,transparent 50% 83%,var(--sadu) 83%) 0 0/34px 34px,
 linear-gradient(45deg,transparent 33%,#111 33% 50%,transparent 50% 83%,#111 83%) 0 0/34px 34px,
 var(--paper)}
.sa-hero{background:radial-gradient(ellipse at 50% 120%,#2b3466 0,var(--night) 60%);color:#f6efe2;padding:70px 20px 76px;text-align:center}
.sa-moon{width:64px;height:64px;margin:0 auto 22px;border-radius:50%;box-shadow:-14px 6px 0 0 var(--sand);transform:rotate(-20deg)}
.sa-kicker{font:700 13px/1 "Manrope",sans-serif;letter-spacing:.3em;text-transform:uppercase;color:var(--sand)}
.sa-hero h1{font:700 clamp(42px,7vw,88px)/1 "Literata",serif;margin:16px auto 14px;max-width:15ch}
.sa-ar{font:700 32px/1.5 "Noto Naskh Arabic","Amiri","Traditional Arabic",serif;color:var(--sand);margin:0 0 14px}
.sa-dek{font:400 20px/1.6 "Literata",serif;max-width:660px;margin:0 auto 30px;color:#e9e0cf}
.c-ctas{justify-content:center}
.sa-main{max-width:820px;margin:0 auto;padding:20px 20px 0}
.sa-sec{padding:44px 0 10px}
.sa-sec h2{font:700 clamp(30px,4.4vw,46px)/1.1 "Literata",serif;color:var(--night);margin:0 0 6px}
.sa-sec h2+.sa-sub{font:700 13px/1.4 "Manrope",sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--sadu);margin:0 0 20px}
.sa-sec p{font:400 19px/1.75 "Literata",serif;margin:0 0 1.1em}
.sa-sec a{color:var(--sadu)}
.sa-cups{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:24px 0}
.sa-cup{background:#fff8ec;border:1px solid var(--rule);border-radius:0 0 40px 40px;padding:20px 18px 26px;text-align:center}
.sa-cup b{display:block;font:700 22px/1.2 "Literata",serif;color:var(--coffee);margin-bottom:6px}
.sa-cup span{font:400 15.5px/1.5 "Manrope",sans-serif}
.sa-week{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin:20px 0}
.sa-week div{text-align:center;padding:14px 4px;border:1px solid var(--rule);font:700 14px/1.2 "Manrope",sans-serif;background:#fff8ec}
.sa-week div.off{background:var(--night);color:var(--sand);border-color:var(--night)}
.sa-phr{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:22px 0}
.sa-phr div{padding:14px 16px;background:#fff8ec;border-right:4px solid var(--sadu);font:400 16.5px/1.5 "Manrope",sans-serif}
.sa-phr b{display:block;font:700 19px/1.3 "Literata",serif;color:var(--night)}
.sa-phr q{display:block;font:700 20px/1.6 "Noto Naskh Arabic","Amiri",serif;quotes:none;direction:rtl;text-align:right;color:var(--coffee)}
.sa-clock{display:flex;flex-wrap:wrap;gap:12px;margin:20px 0}
.sa-clock div{flex:1 1 200px;padding:18px;background:var(--night);color:#f6efe2}
.sa-clock b{display:block;font:700 26px/1.1 "Literata",serif;color:var(--sand);margin-bottom:4px}
.sa-clock span{font:400 15px/1.4 "Manrope",sans-serif}
.sa-help{border:2px solid var(--sadu);padding:18px 22px;background:#fff8ec;font:400 17px/1.6 "Manrope",sans-serif}
.sa-help b{color:var(--sadu)}
.c-faq{max-width:820px;margin:34px auto 0;padding:0 20px}
.c-faq h2{font:700 38px/1.1 "Literata",serif;color:var(--night);margin:0 0 14px}
.c-faq summary{font:700 18px/1.4 "Literata",serif}
.c-faq p{font:400 17px/1.65 "Manrope",sans-serif}
.sa-end{background:var(--night);color:#f6efe2;text-align:center;padding:60px 20px;margin-top:60px}
.sa-end h2{font:700 clamp(34px,5.4vw,60px)/1.05 "Literata",serif;margin:0 0 10px}
.sa-end p{font:400 19px/1.55 "Literata",serif;color:#e9e0cf;margin:0 auto 26px;max-width:540px}
@media (max-width:720px){.sa-cups,.sa-phr{grid-template-columns:1fr}.sa-week{gap:3px}.sa-week div{font-size:12px;padding:10px 2px}}
`,
  faq: [
    { q: 'Can I voice chat in Arabic on TalkLive?', a: 'Yes. Speak whichever language you and your match share - Gulf Arabic, Modern Standard Arabic or English - and use the Arabic interface at talklive.app/ar/ if you prefer.' },
    { q: 'Is TalkLive free in Saudi Arabia?', a: 'Yes. Voice and text chat are free, need no account, and preferring Saudi Arabia in the country filter is free.' },
    { q: 'Does TalkLive use the camera?', a: 'No. TalkLive is voice and text only. There is no video, and no photos are exchanged in a call.' },
    { q: 'When is Saudi Arabia busiest on TalkLive?', a: 'In the evening and late night, Riyadh time: roughly 6 pm to midnight, and later still during Ramadan. Saudi Arabia does not change its clocks.' },
    { q: 'Will I always be matched with someone in Saudi Arabia?', a: 'Not always. A country preference steers matching, but it depends on who is searching at that moment.' },
    { q: 'Does anyone see my phone number?', a: 'No. Calls run in the browser over the internet; no number is exchanged.' },
  ],
  body: (c) => `<main id="story">
<section class="sa-hero">
  <div class="sa-moon" aria-hidden="true"></div>
  <span class="sa-kicker">Country guide &middot; The Kingdom</span>
  <h1>Talk to strangers in Saudi Arabia</h1>
  <p class="sa-ar" lang="ar" dir="rtl">هلا والله، تفضّل</p>
  <p class="sa-dek">In Saudi Arabia, the best conversations happen in the majlis, late, over small cups of coffee. TalkLive is a majlis with one other guest: a voice or text conversation with someone new, free, with no account, no phone number and no camera.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
<div class="sa-sadu" aria-hidden="true"></div>

<div class="sa-main">
  <section class="sa-sec">
    <h2>The majlis</h2>
    <p class="sa-sub">Where guests are received</p>
    <p>Almost every Saudi home has a <em>majlis</em> - literally "a place of sitting" - a room kept for receiving guests, often lined with cushions along the walls. It is where visitors are welcomed, where news is exchanged, where neighbours, cousins and colleagues drop by in the evening and stay for hours. Many families hold a regular night when the door is open to anyone who knows them, and to anyone those people bring along.</p>
    <p>The rules of the majlis are the rules of hospitality: a guest is welcomed warmly, offered coffee and dates before anything else is discussed, asked after their family, and never hurried. It is a good model for a conversation with a stranger. Greet properly, ask how they are and mean it, and let the talk find its own way.</p>
  </section>

  <section class="sa-sec">
    <h2>Gahwa, three ways</h2>
    <p class="sa-sub">Coffee before conversation</p>
    <p>Saudi coffee, <em>gahwa</em>, is nothing like an espresso: lightly roasted beans, a generous amount of cardamom, sometimes saffron or clove, poured from a long-spouted <em>dallah</em> into small handle-less cups, a few sips at a time. The Ministry of Culture named 2022 the Year of Saudi Coffee, and its customs are a small etiquette of their own.</p>
    <div class="sa-cups">
      <div class="sa-cup"><b>Pour little</b><span>The cup is only ever partly filled, so it can be refilled - and the guest kept talking.</span></div>
      <div class="sa-cup"><b>Take it right</b><span>Traditionally the cup is offered and received with the right hand, and served to guests in turn.</span></div>
      <div class="sa-cup"><b>Shake to stop</b><span>A gentle shake of the empty cup tells the host "no more, thank you". Otherwise it keeps coming.</span></div>
    </div>
    <p>You cannot pour coffee down a phone line, but the spirit carries: on TalkLive, the conversation keeps going as long as both of you want another cup, and a tap of Leave is the polite shake of the cup.</p>
  </section>

  <section class="sa-sec">
    <h2>A young country that stays up late</h2>
    <p class="sa-sub">Riyadh after dark</p>
    <p>According to the 2022 census, the Kingdom has about 32 million residents, and close to two-thirds of Saudi citizens are under 30. Summer days are fiercely hot, so life moves into the evening: families go out after sunset, cafés fill late, and in Ramadan the whole rhythm of the day turns over - the fast breaks at sunset with <em>iftar</em>, and nights run until the pre-dawn meal, <em>suhoor</em>. TalkLive's Saudi conversations follow the same clock.</p>
    <p>The working week changed in 2013, when the weekend moved from Thursday-Friday to Friday-Saturday, bringing it a day closer to the rest of the world. Thursday night is still the big night out.</p>
    <div class="sa-week" aria-label="The Saudi week, with Friday and Saturday off">
      <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div class="off">Fri</div><div class="off">Sat</div>
    </div>
  </section>

  <section class="sa-sec">
    <h2>Gulf Arabic, and what to say</h2>
    <p class="sa-sub">From Najd to the Hejaz</p>
    <p>Saudis read and write Modern Standard Arabic, but speak their own dialects: Najdi in the centre around Riyadh, Hejazi along the Red Sea coast in Jeddah, Makkah and Madinah, and Gulf varieties in the Eastern Province. English is widely spoken, especially by younger people, so you never need Arabic to start. If you are learning, Saudis tend to be generous teachers - and will notice which dialect you picked up your Arabic from.</p>
    <div class="sa-phr">
      <div><q lang="ar">هلا والله</q><b>Hala walla</b>A warm "hello, welcome" - the classic Saudi greeting</div>
      <div><q lang="ar">وش أخبارك؟</q><b>Wesh akhbarak?</b>What's your news? (Najdi and Gulf)</div>
      <div><q lang="ar">إيش الأخبار؟</q><b>Eish al-akhbar?</b>The same question, Hejazi style</div>
      <div><q lang="ar">يعطيك العافية</q><b>Ya'teek al-afia</b>"May God give you strength" - thanks for someone's effort</div>
    </div>
    <p>Good subjects: football first (the Saudi Pro League now signs some of the world's best-known players, and the Al Hilal-Al Nassr rivalry is fierce), food and where to find the best <em>kabsa</em>, travel, gaming - the Kingdom has one of the region's biggest gaming communities - and the country's fast-growing entertainment scene, from concerts to the Riyadh Season festival. Let your match lead on religion and politics. The whole TalkLive app is <a href="/ar/">available in Arabic</a>, right to left.</p>
  </section>

  <section class="sa-sec">
    <h2>When the Kingdom is online</h2>
    <p class="sa-sub">Arabia Standard Time, UTC+3, all year</p>
    <p>TalkLive's busiest hours worldwide, measured from our own hourly match counts in late September and early October 2026, fall between 15:00 and 21:00 UTC. Saudi Arabia does not use daylight saving, so that is the same window in Riyadh every month of the year.</p>
    <div class="sa-clock">
      <div><b>6 pm - midnight</b><span>Busiest, all year</span></div>
      <div><b>Until suhoor</b><span>During Ramadan, the night runs late</span></div>
      <div><b>4 am - 9 am</b><span>Quietest</span></div>
    </div>
    <p>That evening matches Egypt's and the rest of the Gulf's, Europe's afternoon and early evening, and South Asia's late night - so a call from Riyadh may reach Cairo, Karachi, London or Dubai.</p>
  </section>

  <section class="sa-sec">
    <h2>Privacy and safety</h2>
    <p class="sa-sub">A guest's discretion</p>
    <p>TalkLive has no video, and nothing about your face, name or number is shared with your match - which is exactly why many people in the region prefer voice. Keep it that way: do not share your full name, family name, address, Iqama or ID number, workplace or social media accounts in a first conversation, never share a bank card number or one-time code, and be careful with anyone who asks for photos or wants to move to another app at once. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">guide to chat scams</a> lists the common scripts. Every call and chat has Report and Block. TalkLive is for adults 18 and over only.</p>
    <div class="sa-help"><b>In an emergency</b> in Saudi Arabia, call <b>911</b>, the unified emergency number; <b>999</b> (police) and <b>997</b> (ambulance) also connect. If you are struggling, <a href="https://findahelpline.com" rel="noopener">findahelpline.com</a> lists free, confidential helplines.</div>
    <p style="margin-top:20px">For the wider region - weekends, Arabic and Ramadan nights from Morocco to the Gulf - read the Journal's <a href="/regions/middle-east">Middle East feature</a>, and our guides to <a href="/countries/united-arab-emirates">the UAE</a> and <a href="/countries/egypt">Egypt</a>.</p>
  </section>
</div>

${c.ad()}
${c.faq('Questions from the majlis')}
<section class="sa-end">
  <h2>Ahlan wa sahlan</h2>
  <p>Riyadh, Jeddah, Dammam, Abha - someone is pouring another cup. Join them.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
