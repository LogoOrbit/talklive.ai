'use strict';
// Nigeria: "How Far?". A Lagos danfo as a design: yellow and black stripes,
// stickers slapped on at angles, loud condensed headlines and a conductor
// calling the stops. Anton for display, Bricolage Grotesque to read.
module.exports = {
  slug: 'nigeria',
  name: 'Nigeria',
  date: '2026-10-05',
  title: 'Talk to Strangers in Nigeria - Free Nigerian Voice Chat | TalkLive',
  description: 'Free voice and text chat with people in Nigeria - English, Pidgin, Yoruba, Igbo or Hausa, no sign-up, no camera, light on data. Achebe on conversation, and when Nigeria is online (WAT).',
  keywords: 'talk to strangers nigeria, nigerian chat, nigeria voice chat, chat with nigerians, random chat nigeria, talk to someone nigeria, pidgin chat',
  h1: 'Talk to Strangers in Nigeria',
  theme: '#ffcc00',
  preload: ['anton-latin-400-normal', 'bricolage-grotesque-latin-400-normal'],
  css: `
:root{--paper:#fffdf5;--ink:#111;--rule:#111;--y:#ffcc00;--g:#008751;--mast:#111}
body{font-family:"Bricolage Grotesque",system-ui,sans-serif;background:var(--paper)}
.c-bar{background:var(--y);max-width:none;border-bottom:4px solid var(--ink)}
.ng-stripe{height:26px;background:repeating-linear-gradient(-45deg,var(--ink) 0 18px,var(--y) 18px 36px);border-bottom:4px solid var(--ink)}
.ng-hero{background:var(--y);padding:40px 20px 54px;border-bottom:4px solid var(--ink)}
.ng-hero-in{max-width:1180px;margin:0 auto;position:relative}
.ng-route{display:inline-block;background:var(--ink);color:var(--y);font:400 18px/1 "Anton",sans-serif;letter-spacing:.06em;padding:10px 14px;text-transform:uppercase}
.ng-hero h1{font:400 clamp(64px,13vw,190px)/.86 "Anton",sans-serif;text-transform:uppercase;margin:18px 0 22px;letter-spacing:-.01em}
.ng-hero h1 span{display:block;-webkit-text-stroke:3px var(--ink);color:transparent}
.ng-dek{font-size:22px;line-height:1.5;max-width:640px;margin:0 0 26px;font-weight:400}
.ng-sticker{position:absolute;right:0;top:20px;width:190px;height:190px;border-radius:50%;background:var(--g);color:#fff;display:grid;place-items:center;text-align:center;font:400 30px/1 "Anton",sans-serif;text-transform:uppercase;transform:rotate(12deg);border:4px solid var(--ink);box-shadow:6px 6px 0 var(--ink);padding:20px}
.ng-sticker small{display:block;font:700 13px/1.2 "Bricolage Grotesque",sans-serif;text-transform:none;margin-top:6px}
.c-ctas a{font:400 22px/1 "Anton",sans-serif;text-transform:uppercase;letter-spacing:.04em;padding:16px 24px;border:4px solid var(--ink);box-shadow:5px 5px 0 var(--ink)}
.c-ctas a:hover{transform:translate(2px,2px);box-shadow:3px 3px 0 var(--ink)}
.c-talk{background:var(--ink);color:var(--y)}
.c-chat{background:#fff;color:var(--ink)}
.ng-stops{max-width:1180px;margin:0 auto;padding:0 20px}
.ng-stop{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:40px;padding:50px 0;border-bottom:4px solid var(--ink)}
.ng-stop h2{font:400 clamp(40px,6vw,76px)/.92 "Anton",sans-serif;text-transform:uppercase;margin:0 0 18px}
.ng-call{display:inline-block;font:400 16px/1 "Anton",sans-serif;text-transform:uppercase;letter-spacing:.08em;background:var(--y);border:3px solid var(--ink);padding:8px 12px;transform:rotate(-2deg);margin-bottom:16px}
.ng-stop p{font-size:19px;line-height:1.68;margin:0 0 1.1em}
.ng-stop a{color:var(--g);font-weight:700}
.ng-card{align-self:start;background:#fff;border:4px solid var(--ink);box-shadow:8px 8px 0 var(--ink);padding:20px;transform:rotate(1.2deg)}
.ng-card.alt{background:var(--g);color:#fff;transform:rotate(-1.5deg)}
.ng-card.yel{background:var(--y);transform:rotate(-.8deg)}
.ng-card h3{font:400 26px/1 "Anton",sans-serif;text-transform:uppercase;margin:0 0 10px}
.ng-card p,.ng-card li{font-size:16px;line-height:1.55;margin:0 0 8px}
.ng-card ul{padding-left:18px;margin:0}
.ng-card b{font-weight:700}
.ng-quote{background:var(--ink);color:var(--y);padding:56px 20px;text-align:center}
.ng-quote p{font:400 clamp(28px,4.2vw,54px)/1.12 "Anton",sans-serif;text-transform:uppercase;max-width:1000px;margin:0 auto}
.ng-quote cite{display:block;font:700 15px/1.5 "Bricolage Grotesque",sans-serif;font-style:normal;color:#fff;margin-top:20px}
.ng-big{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:22px 0}
.ng-big div{border:4px solid var(--ink);padding:16px;background:#fff}
.ng-big b{display:block;font:400 44px/1 "Anton",sans-serif}
.ng-big span{font-size:15px;line-height:1.4}
.ng-big div:first-child{background:var(--y)}
.c-faq{max-width:1180px;margin:0 auto;padding:46px 20px 0}
.c-faq h2{font:400 60px/.95 "Anton",sans-serif;text-transform:uppercase;margin:0 0 16px}
.c-faq details{border-top:3px solid var(--ink)}
.c-faq summary{font:700 19px/1.4 "Bricolage Grotesque",sans-serif}
.c-faq p{font-size:17px;line-height:1.6}
.ng-end{background:var(--y);border-top:4px solid var(--ink);border-bottom:4px solid var(--ink);margin-top:56px;padding:56px 20px;text-align:center}
.ng-end h2{font:400 clamp(54px,10vw,130px)/.88 "Anton",sans-serif;text-transform:uppercase;margin:0 0 16px}
.ng-end p{font-size:20px;margin:0 auto 26px;max-width:560px}
.ng-end .c-ctas{justify-content:center}
.c-guides a{color:var(--g)}
@media (max-width:900px){.ng-stop{grid-template-columns:1fr}.ng-sticker{position:static;transform:rotate(4deg);margin-top:20px;width:150px;height:150px;font-size:24px}.ng-big{grid-template-columns:1fr}}
`,
  faq: [
    { q: 'Is TalkLive free in Nigeria?', a: 'Yes. Voice and text chat are free and need no account. Normal data charges apply on mobile data, and audio-only calls keep that low.' },
    { q: 'Can I chat in Pidgin, Yoruba, Igbo or Hausa?', a: 'Yes. Speak whichever language you and your match share - TalkLive does not limit what language you talk in.' },
    { q: 'When is Nigeria busiest on TalkLive?', a: 'Roughly 4 pm to 10 pm West Africa Time, which lines up with TalkLive\'s busiest hours worldwide. The quietest stretch is about 1 am to 6 am.' },
    { q: 'Will I always match with someone in Nigeria?', a: 'Not always. Preferring Nigeria in Filters steers matching, but it depends on who is searching at that moment.' },
    { q: 'How much data does a call use?', a: 'Far less than video. TalkLive is audio-only, and text chat uses less still, so it is the cheaper option when your bundle is low.' },
    { q: 'Does anyone see my phone number?', a: 'No. Calls run in the browser over the internet; no number is exchanged and there is no camera.' },
  ],
  body: (c) => `<main id="story">
<div class="ng-stripe" aria-hidden="true"></div>
<section class="ng-hero">
  <div class="ng-hero-in">
    <span class="ng-route">Route: Anywhere - Everywhere &middot; Wole, wole!</span>
    <h1>Talk to strangers <span>in Nigeria</span></h1>
    <p class="ng-dek">How far? Nigeria is Africa's most populous country, one of the youngest on earth, and very possibly the most talkative. Chat by voice or text in English, Pidgin, Yoruba, Igbo or Hausa - free, with no account, no number, no camera and very little data.</p>
    ${c.ctas('Tap to Talk', 'Tap to Chat')}
    <div class="ng-sticker" aria-hidden="true"><div>No wahala<small>Free. 18+. No sign-up.</small></div></div>
  </div>
</section>

<div class="ng-stops">
  <section class="ng-stop">
    <div>
      <span class="ng-call">First stop: the danfo</span>
      <h2>Everybody gets on, everybody talks</h2>
      <p>If you want to understand how Nigerians talk to strangers, take a danfo across Lagos. The yellow minibus with the black stripes is hot, crowded and usually late, and the conductor hangs out of the door shouting the stops - "Oshodi! Obalende! CMS! Wole, wole!" (get in, get in) - while inside, people who have never met argue about football, prices, politicians, preachers and whether the driver knows where he is going. Somebody will have an opinion about your phone. Somebody else will have an opinion about theirs. By the time you get down, you have been in three conversations and a small debate.</p>
      <p>That is the energy TalkLive was built for: no lobby, no profile, no small print - just get in, and you are talking to someone new. If the ride is boring, tap Next and catch another.</p>
    </div>
    <aside class="ng-card yel"><h3>Say it like you mean it</h3><ul><li><b>Pidgin:</b> How far? - I dey o.</li><li><b>Yoruba:</b> Bawo ni? - Mo wa daadaa.</li><li><b>Igbo:</b> Kedu? - O di mma.</li><li><b>Hausa:</b> Sannu! - Yauwa, sannu.</li></ul></aside>
  </section>
</div>

<section class="ng-quote">
  <p>"Among the Igbo the art of conversation is regarded very highly, and proverbs are the palm-oil with which words are eaten."</p>
  <cite>Chinua Achebe, Things Fall Apart (1958), chapter one</cite>
</section>

<div class="ng-stops">
  <section class="ng-stop">
    <div>
      <span class="ng-call">Second stop: Umuofia</span>
      <h2>A country that takes talk seriously</h2>
      <p>Achebe put that line near the start of the most widely read African novel ever written, and it is not decoration. In <em>Things Fall Apart</em>, how a man speaks - how patiently he circles a point, which proverb he reaches for - tells you who he is. Nigerian conversation still carries some of that. Yoruba has separate greetings for morning, afternoon and evening, and many more for particular situations; there are greetings for someone at work, someone who has just come back, someone who is eating. Greeting properly is not a formality. It is the first sign that you are worth talking to.</p>
      <p>Then there is Pidgin, the language that belongs to everybody. Nigerian Pidgin crosses every ethnic line and is spoken by tens of millions of people, often alongside English and a mother tongue. It is serious enough that the BBC launched a news service in Pidgin in 2017, and playful enough that a whole conversation can turn on a single "abeg". If your match slides into it and you are lost, ask. Most people love explaining.</p>
      <p>Nigeria has more than five hundred languages. Hausa in the north, Yoruba in the south-west and Igbo in the south-east are the largest, and English is the official language that most conversations on TalkLive start in. Where they end up is anybody's guess.</p>
    </div>
    <aside class="ng-card alt"><h3>Conversations end at the wrong time</h3><p>In 2021, Adam Mastroianni and colleagues asked hundreds of people when they had wanted their conversations to end. Almost none ended when both people wanted - and people were poor at guessing what their partner wanted (<em>PNAS</em>, 2021).</p><p><b>Lesson:</b> if you are enjoying it, say so. If you need to go, a quick "I dey go now o" beats vanishing.</p></aside>
  </section>

  <section class="ng-stop">
    <div>
      <span class="ng-call">Third stop: the playlist</span>
      <h2>What Naija talks about</h2>
      <p>Football is the universal opener - the Super Eagles, the Premier League, and the eternal argument about whose club is cursed. Music is a close second, and for good reason: Fela Kuti invented Afrobeat in Lagos in the 1970s, and the generation that followed turned Afrobeats into one of the world's biggest exports. Burna Boy won a Grammy in 2021; Tems won one in 2023; Rema's "Calm Down" was everywhere. Asking someone who the best Nigerian artist is right now is a guaranteed twenty minutes.</p>
      <p>Nollywood, one of the most prolific film industries in the world, is another safe bet. So are business ideas, side hustles, school, faith, family and NEPA - a power authority that was renamed years ago but whose name lives on every time somebody says the light has been "taken". Expect banter. Give it back.</p>
    </div>
    <aside class="ng-card"><h3>Data-light by design</h3><p>TalkLive is audio-only: no video stream eating your bundle. Text chat uses even less, so switch to it when data is running low. Nothing to install, either - it runs in the phone's browser.</p></aside>
  </section>

  <section class="ng-stop">
    <div>
      <span class="ng-call">Fourth stop: the timetable</span>
      <h2>When to catch a ride</h2>
      <p>TalkLive's busiest hours worldwide, measured from our own hourly match counts in late September and early October 2026, fall between 15:00 and 21:00 UTC. Nigeria keeps West Africa Time (UTC+1) all year with no daylight saving, so you are sitting right in the middle of it.</p>
      <div class="ng-big">
        <div><b>4 - 10 pm</b><span>WAT: busiest - the end of the work day and the evening</span></div>
        <div><b>1 - 6 am</b><span>WAT: the quietest hours</span></div>
        <div><b>8 pm Lagos</b><span>= 8 pm London (summer), past midnight in Delhi, 3 pm New York</span></div>
      </div>
      <p>That middle position is a gift: a Lagos evening overlaps with the British and European evening, South Asia's late night and the American afternoon all at once, so the people you meet could be from almost anywhere.</p>
    </div>
    <aside class="ng-card yel"><h3>Four steps</h3><ul><li>Open TalkLive in your browser.</li><li>Optional: prefer Nigeria in Filters (two countries free).</li><li>Tap to Talk or Tap to Chat.</li><li>Say "How far?" - Next any time.</li></ul></aside>
  </section>

  <section class="ng-stop">
    <div>
      <span class="ng-call">Last stop: mind your pocket</span>
      <h2>Talk free, keep your details</h2>
      <p>Your full name, address, BVN, NIN, bank details and one-time codes are not for anyone you meet in a chat - not in the first conversation, not in the tenth. Be careful with anyone who asks for photos, offers a "business opportunity" that needs money up front, or wants you on WhatsApp within five minutes. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">field guide to chat scams</a> lists the common scripts.</p>
      <p>Every TalkLive call and chat has Report and Block; blocked people are not matched with you again. TalkLive is for adults 18 and over only. In an emergency in Nigeria, call <strong>112</strong>. If you are struggling, <a href="https://findahelpline.com" rel="noopener">findahelpline.com</a> lists free, confidential helplines.</p>
      <p>More guides: <a href="/countries/egypt">Egypt</a>, <a href="/countries/united-kingdom">the United Kingdom</a>, and our <a href="/practice-english-speaking">English speaking practice</a> page for learners who want to keep up with Lagos English.</p>
    </div>
    <aside class="ng-card alt"><h3>No wahala, but no nonsense</h3><p>Harassment, threats, scams and sexual content without consent lead to bans. Report it and move on - you do not owe anyone your time.</p></aside>
  </section>
</div>

${c.faq('Wetin people dey ask')}
${c.ad()}
<section class="ng-end">
  <h2>Wole! Get in.</h2>
  <p>Lagos, Abuja, Ibadan, Kano, Port Harcourt - the bus is loading.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
<div class="ng-stripe" aria-hidden="true"></div>
</main>`,
};
