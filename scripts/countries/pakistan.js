'use strict';
// Pakistan: "Bol". Built around Faiz Ahmed Faiz's poem - speak, your tongue is
// still your own. Midnight green, gold and cream, framed with bands borrowed
// from Pakistani truck art. Abril Fatface for display, Lora to read.
module.exports = {
  slug: 'pakistan',
  name: 'Pakistan',
  date: '2026-10-05',
  title: 'Talk to Strangers in Pakistan - Free Urdu and English Voice Chat | TalkLive',
  description: 'Free voice and text chat with people in Pakistan - Urdu, Punjabi or English, no sign-up, no camera, with an Urdu interface. Why Pakistan talks late, and when it is online (PKT).',
  keywords: 'talk to strangers pakistan, pakistani chat, pakistan voice chat, urdu voice chat, chat with pakistanis, random chat pakistan, urdu chat room',
  h1: 'Talk to Strangers in Pakistan',
  theme: '#0a241d',
  preload: ['abril-fatface-latin-400-normal', 'lora-latin-400-normal'],
  css: `
:root{--paper:#0a241d;--ink:#f3ead6;--rule:#24493d;--gold:#e7b54a;--rose:#e2577a;--teal:#2fb3a5;--red:#d8432f;--mast:#f3ead6}
body{font-family:"Lora",Georgia,serif;background:var(--paper);color:var(--ink)}
.c-bar{color:var(--ink)}
.pk-band{height:22px;background:
 linear-gradient(135deg,var(--paper) 25%,transparent 25%) 0 0/22px 22px,
 linear-gradient(225deg,var(--paper) 25%,transparent 25%) 0 0/22px 22px,
 repeating-linear-gradient(90deg,var(--red) 0 44px,var(--gold) 44px 88px,var(--teal) 88px 132px,var(--rose) 132px 176px)}
.pk-hero{text-align:center;padding:64px 20px 56px;max-width:980px;margin:0 auto}
.pk-urdu{font:700 clamp(84px,16vw,180px)/1 "Noto Nastaliq Urdu","Jameel Noori Nastaleeq","Urdu Typesetting","Noto Naskh Arabic",serif;color:var(--gold);margin:0}
.pk-tr{font:400 italic 22px/1.5 "Lora",serif;color:#cfe3d9;margin:10px 0 0}
.pk-hero h1{font:400 clamp(44px,7vw,92px)/.98 "Abril Fatface",serif;margin:28px 0 20px;letter-spacing:.005em}
.pk-hero h1 em{font-style:normal;color:var(--rose)}
.pk-dek{font-size:21px;line-height:1.6;color:#d9e6df;max-width:720px;margin:0 auto 30px}
.c-ctas{justify-content:center}
.c-ctas a{font:700 17px/1 "Lora",serif;padding:16px 26px;border-radius:999px}
.c-talk{background:var(--gold);color:#0a241d;box-shadow:0 0 0 4px rgba(231,181,74,.25)}
.c-chat{color:var(--ink);border:2px solid var(--teal)}
.pk-poem{max-width:820px;margin:0 auto;padding:46px 20px;text-align:center;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.pk-poem p{font:400 italic clamp(22px,3vw,30px)/1.5 "Lora",serif;margin:0 0 8px}
.pk-poem cite{display:block;font:400 14px/1.5 "Lora",serif;font-style:normal;color:var(--gold);letter-spacing:.06em;margin-top:16px}
.pk-grid{max-width:1180px;margin:0 auto;padding:40px 20px 0}
.pk-panel{display:grid;grid-template-columns:200px minmax(0,720px);gap:40px;padding:48px 0;border-bottom:1px solid var(--rule)}
.pk-num{font:400 120px/.8 "Abril Fatface",serif;color:transparent;-webkit-text-stroke:2px var(--gold);text-align:right}
.pk-panel h2{font:400 clamp(30px,4vw,46px)/1.05 "Abril Fatface",serif;margin:0 0 18px;color:#fff6e3}
.pk-panel p{font-size:19px;line-height:1.75;margin:0 0 1.1em;color:#e6eee9}
.pk-panel a{color:var(--gold)}
.pk-frame{border:10px solid transparent;border-image:repeating-linear-gradient(45deg,var(--red) 0 10px,var(--gold) 10px 20px,var(--teal) 20px 30px,var(--rose) 30px 40px) 10;padding:22px 24px;background:#0e2e25;margin:24px 0}
.pk-frame h3{font:400 24px/1.2 "Abril Fatface",serif;color:var(--gold);margin:0 0 10px}
.pk-frame p{margin:0 0 .6em;font-size:17px}
.pk-times{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin:20px 0}
.pk-times div{background:#0e2e25;border-top:4px solid var(--teal);padding:16px}
.pk-times b{display:block;font:400 30px/1.1 "Abril Fatface",serif;color:#fff6e3}
.pk-times span{font-size:15px;color:#bcd2c7}
.pk-times div:first-child{border-top-color:var(--gold)}
.pk-steps{list-style:none;margin:20px 0;padding:0;display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
.pk-steps li{border:1px solid var(--rule);border-radius:14px;padding:18px;font-size:17px;line-height:1.55}
.pk-steps b{display:block;font:400 22px/1.1 "Abril Fatface",serif;color:var(--rose);margin-bottom:6px}
.c-faq{max-width:820px;margin:56px auto 0;padding:0 20px}
.c-faq h2{font:400 40px/1.05 "Abril Fatface",serif;margin:0 0 14px;text-align:center}
.c-faq summary{font:700 18px/1.4 "Lora",serif}
.c-faq p{color:#d9e6df;font-size:17px;line-height:1.65}
.pk-end{text-align:center;padding:64px 20px;margin-top:56px;background:#071a15}
.pk-end h2{font:400 clamp(38px,6vw,70px)/1 "Abril Fatface",serif;margin:0 0 14px}
.pk-end p{font-size:19px;color:#cfe3d9;margin:0 auto 26px;max-width:560px;line-height:1.6}
.ad-card{border-top-color:var(--rule)}
.c-guides a{color:var(--gold)}
@media (max-width:820px){.pk-panel{grid-template-columns:1fr;gap:6px;padding:36px 0}.pk-num{text-align:left;font-size:80px}.pk-times,.pk-steps{grid-template-columns:1fr}}
`,
  faq: [
    { q: 'Is there a free Pakistani chat site with voice calls?', a: 'Yes. TalkLive is free for voice and text, needs no account, and lets you prefer Pakistan in the country filter at no cost.' },
    { q: 'Can I use TalkLive in Urdu?', a: 'Yes. The whole interface is available in Urdu, right to left, at talklive.app/ur/. You can speak Urdu, Punjabi, English or any language you and your match share.' },
    { q: 'When is Pakistan busiest on TalkLive?', a: 'From about 8 pm to 2 am Pakistan time (PKT), and Pakistani users often stay later. The quietest stretch is about 5 to 10 am.' },
    { q: 'Will I always be matched with someone in Pakistan?', a: 'Not always. A country preference steers matching, but it depends on who is searching at that moment, and it widens after a short wait.' },
    { q: 'Will anyone see my phone number or CNIC?', a: 'No. Calls run in the browser over the internet, nothing identifying is needed, and you appear under a generated name.' },
    { q: 'Is TalkLive for under-18s?', a: 'No. TalkLive is for adults aged 18 and over only.' },
  ],
  body: (c) => `<main id="story">
<div class="pk-band" aria-hidden="true"></div>
<section class="pk-hero">
  <p class="pk-urdu" lang="ur" dir="rtl">بول</p>
  <p class="pk-tr">Bol - speak.</p>
  <h1>Talk to strangers in <em>Pakistan</em></h1>
  <p class="pk-dek">Pakistan is one of TalkLive's largest audiences, and a famously late-night one. At one in the morning in Lahore the evening is only halfway done. Join it - in Urdu, Punjabi, English or all three in one sentence - by voice or by text, with no account, no number and no camera.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
<div class="pk-band" aria-hidden="true"></div>

<section class="pk-poem" aria-label="From Faiz Ahmed Faiz">
  <p lang="ur-Latn">Bol, ke lab azad hain tere,<br/>bol, zaban ab tak teri hai.</p>
  <p>Speak, for your lips are free;<br/>speak, your tongue is still your own.</p>
  <cite>Faiz Ahmed Faiz, "Bol", from Naqsh-e-Faryadi (1941)</cite>
</section>

<div class="pk-grid">
  <section class="pk-panel">
    <div class="pk-num" aria-hidden="true">1</div>
    <div>
      <h2>A country that does its talking late</h2>
      <p>Faiz wrote "Bol" as a call to speak while you still can, and generations of Pakistanis have recited it, sung it, and quoted it back at whoever was trying to keep them quiet. It is a fitting poem for a country that loves to talk - over chai at a roadside dhaba, on a rooftop on a summer night, on a phone call with a cousin in Manchester that runs well past one in the morning.</p>
      <p>Ask anyone who has lived there. Pakistan's evening starts late, after work, after the commute, after a dinner that is often eaten at an hour Europeans would call supper, and it keeps going. Faisalabad at one o'clock is not winding down. Karachi, which does not really sleep, is just getting comfortable.</p>
      <p>The appeal of talking to a stranger at that hour is easy to understand. Nobody you know is listening. Nobody will mention it at the next family wedding. You can say what you actually think about your degree, your job, your city or your cricket team to someone who has no stake in any of it, and then say goodbye.</p>
    </div>
  </section>

  <section class="pk-panel">
    <div class="pk-num" aria-hidden="true">2</div>
    <div>
      <h2>Urdu: everybody's second language</h2>
      <p>Urdu is Pakistan's national language and the language most conversations on TalkLive end up in - and yet it is the mother tongue of only a minority of Pakistanis. Punjabi is the most widely spoken first language; Pashto, Sindhi, Saraiki and Balochi follow; English is an official language and turns up in a large share of conversations, especially among students. In practice, Urdu is the bridge everyone shares, which is why two strangers from Peshawar and Hyderabad can find common ground within a sentence.</p>
      <p>It is also why voice beats typing here. Written Urdu flows in Nastaliq, a beautiful script that phone keyboards handle slowly, so most people type "Roman Urdu" instead - <em>kya haal hai</em>, <em>kahan se ho</em> - with no agreed spelling and plenty of room for misreading. Say it out loud and none of that matters.</p>
      <p>One more thing that surprises people from outside the region: spoken Urdu and spoken Hindi are close enough that a Lahori and a Lucknowi can talk for an hour without switching to English, though neither can read the other's newspaper. Some of the warmest conversations on TalkLive cross that border.</p>
    </div>
  </section>

  <section class="pk-panel">
    <div class="pk-num" aria-hidden="true">3</div>
    <div>
      <h2>They liked you more than you think</h2>
      <p>If you have ever put the phone down after a conversation with a stranger and replayed every awkward pause, there is research for you. In 2018 the psychologists Erica Boothby, Gus Cooney, Gillian Sandstrom and Margaret Clark paired strangers for conversations and then asked each person how much they liked their partner, and how much they thought their partner liked them. Over and over, people underestimated how much they were liked. The authors called it "the liking gap" (<em>Psychological Science</em>, 2018).</p>
      <p>The practical lesson is simple: the conversation probably went better than it felt. Say <em>Assalam-o-Alaikum</em>, ask one real question, and give it more than thirty seconds before you decide it is not working.</p>
      <div class="pk-frame">
        <h3>Things Pakistan will happily talk about</h3>
        <p>Cricket, first and always - and the next match against India, if you are brave. University admissions and entry tests. Freelancing and remote work for clients overseas. Food, with fierce loyalty between Karachi biryani and Lahori everything. Dramas, which have audiences far beyond Pakistan: when India's Zindagi channel began airing Pakistani serials in 2014, plenty of Indian viewers discovered them for the first time. And music - Coke Studio Pakistan has been making old songs new since 2008, and "Pasoori" made Ali Sethi and Shae Gill famous far beyond Pakistan in 2022.</p>
      </div>
    </div>
  </section>

  <section class="pk-panel">
    <div class="pk-num" aria-hidden="true">4</div>
    <div>
      <h2>When Pakistan is online</h2>
      <p>TalkLive's busiest hours worldwide - measured from our own hourly match counts in late September and early October 2026 - fall between 15:00 and 21:00 UTC. Pakistan keeps Pakistan Standard Time (UTC+5) all year, with no daylight saving.</p>
      <div class="pk-times">
        <div><b>8 pm - 2 am</b><span>PKT: the busiest stretch, and Pakistan stays later still</span></div>
        <div><b>5 am - 10 am</b><span>PKT: the quietest hours on TalkLive</span></div>
        <div><b>6 pm in London</b><span>is 10 pm in Karachi in summer (5 pm in winter)</span></div>
        <div><b>9 pm in Dubai</b><span>is 10 pm in Lahore, and about 1 pm in New York</span></div>
      </div>
      <p>That overlap with the Gulf and Britain is why so many matches here are between people at home and Pakistanis abroad - which can be its own kind of comfort on a long night far from family.</p>
    </div>
  </section>

  <section class="pk-panel">
    <div class="pk-num" aria-hidden="true">5</div>
    <div>
      <h2>Speak freely, keep your details</h2>
      <p>Faiz's lips were free; your CNIC number should stay private. Never share it, a bank or mobile-wallet PIN (JazzCash, Easypaisa or any other), or a one-time code with anyone you meet in a chat, whatever reason they give. Prize and lottery messages, "verification" requests and jobs that need a fee up front are the common scripts. Be just as careful with anyone who asks for photos or wants you on WhatsApp within five minutes.</p>
      <p>On TalkLive, every call and chat has Report and Block. Blocked people are not matched with you again. Online harassment and fraud in Pakistan can be reported to the National Cyber Crime Investigation Agency, which took over cybercrime cases from the FIA. In an emergency, call <strong>15</strong> for police or <strong>1122</strong> for rescue services. If you are struggling, <a href="https://findahelpline.com" rel="noopener">findahelpline.com</a> lists free, confidential helplines.</p>
      <ol class="pk-steps">
        <li><b>Open TalkLive</b>No app, no sign-up. It works in any phone browser.</li>
        <li><b>Prefer Pakistan</b>Add it in Filters - two preferred and two avoided countries are free.</li>
        <li><b>Tap to Talk or Chat</b>Voice asks for the microphone once; text needs nothing.</li>
        <li><b>Say salam</b>Then ask where they are from. Tap Next whenever you like.</li>
      </ol>
      <p>Prefer reading in Urdu? The whole app is <a href="/ur/">available in Urdu</a>. For the bigger picture, read <a href="/regions/south-asia">Why South Asia Talks After Midnight</a>, or see our guides to <a href="/countries/india">India</a> and <a href="/countries/bangladesh">Bangladesh</a>.</p>
    </div>
  </section>
</div>

${c.faq('Sawal jawab - questions')}
${c.ad()}
<div class="pk-band" aria-hidden="true"></div>
<section class="pk-end">
  <h2>Bol. Someone is listening.</h2>
  <p>Karachi, Lahore, Islamabad, Peshawar - and Pakistanis everywhere else - are a tap away.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
