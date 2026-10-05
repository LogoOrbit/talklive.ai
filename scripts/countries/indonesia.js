'use strict';
// Indonesia: "Sudah Makan?". Basa-basi - Indonesian small talk - as the
// structure: every section opens with a chat-bubble exchange, set over a
// kawung batik pattern in indigo and soga brown. Instrument Serif for display,
// Nunito to read.
module.exports = {
  slug: 'indonesia',
  name: 'Indonesia',
  date: '2026-10-05',
  title: 'Talk to Strangers in Indonesia - Free Indonesian Voice Chat | TalkLive',
  description: 'Free voice and text chat with people in Indonesia - Bahasa Indonesia or English, no sign-up, no app to install, no camera, with an Indonesian interface. Basa-basi, nongkrong, and when Indonesia is online (WIB).',
  keywords: 'talk to strangers indonesia, indonesian chat, ngobrol dengan orang asing, chat indonesia, indonesian voice chat, random chat indonesia, teman ngobrol online',
  h1: 'Talk to Strangers in Indonesia',
  theme: '#1f3a5f',
  preload: ['instrument-serif-latin-400-normal', 'nunito-latin-400-normal'],
  css: `
:root{--paper:#fbf6ee;--ink:#1d2433;--rule:#e3d6c2;--indigo:#1f3a5f;--soga:#8a5a2b;--coral:#e46b4c;--mast:#fbf6ee}
body{font-family:"Nunito",system-ui,sans-serif;background:var(--paper)}
.c-bar{background:var(--indigo);color:var(--mast);max-width:none}
.id-batik{background-color:var(--indigo);background-image:radial-gradient(ellipse 18px 30px at 50% 0,#2c4d78 98%,transparent 100%),radial-gradient(ellipse 18px 30px at 50% 100%,#2c4d78 98%,transparent 100%),radial-gradient(ellipse 30px 18px at 0 50%,#2c4d78 98%,transparent 100%),radial-gradient(ellipse 30px 18px at 100% 50%,#2c4d78 98%,transparent 100%),radial-gradient(circle 5px at 50% 50%,#c99a5b 98%,transparent 100%);background-size:60px 60px}
.id-hero{color:#fbf6ee;padding:56px 20px 64px}
.id-hero-in{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center}
.id-hero h1{font:400 clamp(52px,8vw,104px)/.95 "Instrument Serif",serif;margin:0 0 18px}
.id-hero h1 i{color:#f2c48d}
.id-dek{font-size:20px;line-height:1.6;margin:0 0 26px;background:rgba(17,32,54,.72);padding:14px 16px;border-radius:14px}
.id-phone{background:#fbf6ee;color:var(--ink);border-radius:30px;padding:22px 18px;box-shadow:0 20px 50px rgba(0,0,0,.35);max-width:360px;justify-self:center;width:100%}
.id-phone-top{font:800 13px/1 "Nunito",sans-serif;color:#8b8172;text-align:center;margin-bottom:14px;letter-spacing:.04em}
.id-b{width:fit-content;max-width:82%;padding:10px 14px;border-radius:18px;margin:8px 0;font-size:16px;line-height:1.45}
.id-b small{display:block;font-size:12.5px;opacity:.7;margin-top:3px}
.id-b.l{background:#ece2d3;border-bottom-left-radius:4px}
.id-b.r{background:var(--indigo);color:#fff;margin-left:auto;border-bottom-right-radius:4px}
.c-ctas a{font:800 17px/1 "Nunito",sans-serif;padding:16px 24px;border-radius:999px}
.c-talk{background:var(--coral);color:#fff}
.c-chat{background:#fbf6ee;color:var(--indigo)}
.id-main{max-width:820px;margin:0 auto;padding:30px 20px 0}
.id-sec{padding:40px 0 10px}
.id-thread{margin:0 0 22px}
.id-thread .id-b{max-width:70%;width:fit-content}
.id-sec h2{font:400 clamp(36px,5vw,54px)/1.02 "Instrument Serif",serif;color:var(--indigo);margin:0 0 14px}
.id-sec p{font-size:18.5px;line-height:1.75;margin:0 0 1.1em}
.id-sec a{color:var(--soga);font-weight:800}
.id-card{background:#fff;border:1px solid var(--rule);border-radius:22px;padding:22px 24px;margin:22px 0}
.id-card h3{font:400 28px/1.1 "Instrument Serif",serif;color:var(--soga);margin:0 0 8px}
.id-card p{font-size:17px;margin:0 0 .6em}
.id-quote{background:var(--soga);color:#fbf1e2;border-radius:26px;padding:30px 30px;margin:30px 0}
.id-quote p{font:400 italic clamp(22px,2.8vw,30px)/1.35 "Instrument Serif",serif;margin:0 0 10px}
.id-quote p.en{font:400 17px/1.6 "Nunito",sans-serif;font-style:normal;opacity:.9}
.id-quote cite{font:800 13px/1.4 "Nunito",sans-serif;font-style:normal;letter-spacing:.06em;text-transform:uppercase;color:#f2c48d}
.id-zones{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0}
.id-zones div{border-radius:20px;padding:16px;background:#fff;border:1px solid var(--rule);text-align:center}
.id-zones b{display:block;font:400 34px/1 "Instrument Serif",serif;color:var(--indigo)}
.id-zones span{font-size:14.5px;line-height:1.4;color:#5d5648}
.id-zones div.hot{background:var(--indigo);border-color:var(--indigo)}.id-zones div.hot b,.id-zones div.hot span{color:#fff}
.id-steps{list-style:none;padding:0;margin:18px 0;display:grid;gap:10px}
.id-steps li{background:#fff;border:1px solid var(--rule);border-radius:999px;padding:12px 20px 12px 56px;position:relative;font-size:16.5px}
.id-steps li span{position:absolute;left:10px;top:50%;transform:translateY(-50%);width:34px;height:34px;border-radius:50%;background:var(--coral);color:#fff;display:grid;place-items:center;font-weight:800}
.id-help{background:var(--indigo);color:#fbf6ee;border-radius:22px;padding:20px 24px;font-size:17px;line-height:1.6}
.id-help b{color:#f2c48d}
.id-help a{color:#f2c48d}
.c-faq{max-width:820px;margin:20px auto 0;padding:0 20px}
.c-faq h2{font:400 46px/1 "Instrument Serif",serif;color:var(--indigo);margin:0 0 14px}
.c-faq details{background:#fff;border:1px solid var(--rule);border-radius:16px;padding:14px 18px;margin-bottom:10px}
.c-faq summary{font:800 17px/1.4 "Nunito",sans-serif}
.c-faq p{font-size:16.5px;line-height:1.65}
.id-end{margin-top:60px;padding:60px 20px;text-align:center;color:#fbf6ee}
.id-end h2{font:400 clamp(44px,7vw,84px)/1 "Instrument Serif",serif;margin:0 0 12px}
.id-end p{font-size:19px;margin:0 auto 26px;max-width:560px;background:rgba(17,32,54,.72);padding:10px 14px;border-radius:12px}
.id-end .c-ctas{justify-content:center}
.c-guides a{color:var(--soga)}
@media (max-width:860px){.id-hero-in{grid-template-columns:1fr}.id-zones{grid-template-columns:1fr}.id-thread .id-b{max-width:88%}}
`,
  faq: [
    { q: 'Is TalkLive free in Indonesia?', a: 'Yes. Voice and text chat are free and need no account and no app. Normal data charges apply on mobile data.' },
    { q: 'Can I use TalkLive in Bahasa Indonesia?', a: 'Yes. The whole interface is available in Indonesian at talklive.app/id/, and you can talk in any language you and your match share.' },
    { q: 'Do I need to download an app?', a: 'No. TalkLive runs in the browser on Android and iPhone. You can add it to your home screen if you want an icon.' },
    { q: 'When is the best time to find someone?', a: 'TalkLive as a whole is busiest from about 10 pm to 4 am WIB; other Indonesians are often online in the early evening too. If a search takes a while, try text chat.' },
    { q: 'Will I always be matched with someone in Indonesia?', a: 'Not always. Preferring Indonesia in Filters steers matching, but it depends on who is searching at that moment.' },
    { q: 'Does anyone see my WhatsApp or phone number?', a: 'No. Calls run in the browser over the internet, so no number or messaging account is shared, and there is no camera.' },
  ],
  body: (c) => `<main id="story">
<section class="id-hero id-batik">
  <div class="id-hero-in">
    <div>
      <h1>Talk to strangers in <i>Indonesia</i></h1>
      <p class="id-dek">From Aceh to Papua, seventeen thousand islands share one language for talking to people you have never met - and a whole ritual of small talk to go with it. Join in by voice or by text, free, right in your browser: no app to install, no account and no camera.</p>
      ${c.ctas('Tap to Talk', 'Tap to Chat')}
    </div>
    <div class="id-phone" aria-label="An example of basa-basi">
      <div class="id-phone-top">Basa-basi, the Indonesian way</div>
      <div class="id-b l">Halo! Apa kabar?<small>Hi! How are you?</small></div>
      <div class="id-b r">Baik! Kamu dari mana?<small>Good! Where are you from?</small></div>
      <div class="id-b l">Bandung. Sudah makan?<small>Bandung. Have you eaten?</small></div>
      <div class="id-b r">Sudah, tadi nasi goreng 😄<small>Yes, fried rice earlier</small></div>
    </div>
  </div>
</section>

<div class="id-main">
  <section class="id-sec">
    <div class="id-thread"><div class="id-b l">Mau ke mana?<small>Where are you off to?</small></div><div class="id-b r">Jalan-jalan aja.<small>Oh, just out and about.</small></div></div>
    <h2>The questions that are not really questions</h2>
    <p>Walk past a neighbour in almost any Indonesian kampung and you will be asked where you are going. Nobody wants your itinerary. "Mau ke mana?" is a greeting, and "jalan-jalan" - just wandering - is a perfectly complete answer. "Sudah makan?" - have you eaten? - works the same way: it is care, expressed as a question. This is <em>basa-basi</em>, the small talk that smooths every encounter, and foreigners who dismiss it as empty are missing the point entirely.</p>
    <p>The anthropologist Bronisław Malinowski gave this kind of talk a name a century ago. In a 1923 essay he described "phatic communion": speech whose job is not to pass on information but to create a bond - to say, in effect, I see you, and we are on good terms. Basa-basi is phatic communion raised to an art. It is also, as it happens, the perfect way to start a conversation with a stranger on TalkLive. "Dari mana?" (where are you from?) and "lagi ngapain?" (what are you up to?) have opened more good conversations than any clever line ever written.</p>
  </section>

  <section class="id-sec">
    <div class="id-thread"><div class="id-b r">Nongkrong yuk?<small>Want to hang out?</small></div><div class="id-b l">Di angkringan biasa ya.<small>At the usual street stall, yeah.</small></div></div>
    <h2>A nation of nongkrong</h2>
    <p>If basa-basi is how Indonesians start a conversation, <em>nongkrong</em> is how they keep it going. The word means something like "hanging out", and it happens everywhere: at the warung kopi with its glasses of sweet coffee, at the angkringan carts of Yogyakarta that sell rice parcels and tea late into the night, on a motorbike parked by the roadside with three friends sitting on it. Hours go by. Strangers drift in and out of the circle. Nothing in particular is decided and everybody goes home happier.</p>
    <p>For a lot of people, though, the circle is not always there. Students who have moved to another island for university, workers on night shifts, anyone who has just arrived in Jakarta and knows nobody - they know the feeling of an evening with no one to nongkrong with. A random call is not an angkringan. But at eleven at night, with your kuota still healthy, it is not a bad substitute.</p>
  </section>

  <figure class="id-quote">
    <p lang="id">"Orang boleh pandai setinggi langit, tapi selama ia tidak menulis, ia akan hilang di dalam masyarakat dan dari sejarah."</p>
    <p class="en">"You may be as clever as the sky is high, but as long as you do not write, you will vanish from society and from history."</p>
    <cite>Pramoedya Ananta Toer, Rumah Kaca (House of Glass)</cite>
  </figure>

  <section class="id-sec">
    <div class="id-thread"><div class="id-b l">Ceritain dong.<small>Go on, tell me the story.</small></div></div>
    <h2>Stories told out loud first</h2>
    <p>Pramoedya Ananta Toer, Indonesia's greatest novelist, believed in writing as a way to outlast power - but his most famous books began as talk. Imprisoned on Buru Island without trial, and for years denied paper and pen, he composed the novels that became the Buru Quartet in his head and told them aloud to his fellow prisoners, who kept the story alive between them until he could finally set it down. Writing is for eternity, as he said. Conversation is for tonight. Both have their place, and the second is a lot easier to start.</p>
  </section>

  <section class="id-sec">
    <div class="id-thread"><div class="id-b r">Kamu ngomong bahasa apa di rumah?<small>What language do you speak at home?</small></div><div class="id-b l">Jawa, tapi sama kamu bahasa Indonesia aja 😄<small>Javanese - but with you, Indonesian.</small></div></div>
    <h2>One language of unity, seven hundred others</h2>
    <p>On 28 October 1928, young nationalists from across the Dutch East Indies met in Batavia and swore the Sumpah Pemuda, the Youth Pledge: one motherland, one nation, and one language of unity. They chose Indonesian - built on Malay, the old trading language of the archipelago - rather than Javanese, the language of the largest group. It was an act of generosity that worked. Today Bahasa Indonesia is shared from Sabang to Merauke, while most Indonesians also grow up with one of the country's roughly seven hundred regional languages: Javanese, Sundanese, Madurese, Minangkabau, Balinese, Bugis and many more.</p>
    <div class="id-card"><h3>Learning Indonesian?</h3><p>It is often called one of the friendlier Asian languages to start with: no tones, the Latin alphabet, and verbs that do not change for tense. Real conversation is the fastest way to get comfortable, and most Indonesians are delighted - and very patient - when a foreigner tries. Tell your match you are learning, and our <a href="/language-exchange">language exchange</a> guide explains how to trade ten minutes of Indonesian for ten of English.</p></div>
    <p>As for topics: badminton is a point of national pride - Indonesia has won the Thomas Cup more times than any other country - and football inspires even more passion. Music runs from dangdut to Indonesian pop and huge K-pop fandoms. Food is bottomless: every region claims the best rendang, sambal or bakso. Studying or working abroad comes up often, and religion and family matter to many people - let your match lead on those.</p>
  </section>

  <section class="id-sec">
    <div class="id-thread"><div class="id-b l">Rame jam berapa sih?<small>When does it get busy?</small></div></div>
    <h2>When to find someone</h2>
    <p>Indonesia has three time zones and no daylight saving: WIB (UTC+7) for Java and Sumatra, WITA (UTC+8) for Bali, Nusa Tenggara, Sulawesi and parts of Kalimantan, and WIT (UTC+9) for Maluku and Papua. TalkLive's busiest hours worldwide, measured from our own hourly match counts in late September and early October 2026, fall between 15:00 and 21:00 UTC - which in Indonesia is late at night, because it lines up with the South Asian and European evening.</p>
    <div class="id-zones">
      <div class="hot"><b>10 pm - 4 am</b><span>WIB: TalkLive's busiest hours worldwide</span></div>
      <div><b>7 pm - 10 pm</b><span>WIB: the Indonesian evening, steadily busy</span></div>
      <div><b>7 am - noon</b><span>WIB: the quietest hours</span></div>
    </div>
    <p>In practice that gives you two good windows: the early evening, when other Indonesians are most likely to be online, and late night, when the worldwide queue is at its fullest. Add an hour for WITA and two for WIT.</p>
  </section>

  <section class="id-sec">
    <div class="id-thread"><div class="id-b r">Kirim kode OTP-nya dong.<small>Send me the OTP code, would you?</small></div><div class="id-b l">Nggak. 🙂<small>No.</small></div></div>
    <h2>Basa-basi yes, data pribadi no</h2>
    <p>Keep personal details private: your full name, address, NIK, bank or e-wallet details (GoPay, OVO, DANA or any other) and one-time codes should never be shared with someone you meet online. Be wary of online "jobs" that pay you for liking videos or simple tasks but ask for a deposit first, of anyone asking for photos, and of anyone who wants to move to WhatsApp or Telegram straight away. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">field guide to chat scams</a> lists the common scripts.</p>
    <p>Every TalkLive call and chat has Report and Block, and blocked people are not matched with you again. TalkLive is for adults 18 and over only.</p>
    <div class="id-help"><b>Emergency in Indonesia: 112</b> (police: 110). If you are struggling, <a href="https://findahelpline.com" rel="noopener">findahelpline.com</a> lists free, confidential helplines.</div>
    <ol class="id-steps">
      <li><span>1</span>Open TalkLive in your phone's browser - no app, no sign-up. It is also <a href="/id/">in Bahasa Indonesia</a>.</li>
      <li><span>2</span>Optional: prefer Indonesia in Filters - two preferred countries are free.</li>
      <li><span>3</span>Tap to Talk for voice, or Tap to Chat to type.</li>
      <li><span>4</span>"Halo, dari mana?" - and tap Next whenever you like.</li>
    </ol>
    <p>See also our guides to <a href="/countries/india">India</a> and <a href="/countries/pakistan">Pakistan</a>, two of the places you are most likely to be matched with late at night.</p>
  </section>
</div>

${c.faq('Tanya jawab')}
${c.ad()}
<section class="id-end id-batik">
  <h2>Ayo ngobrol.</h2>
  <p>Someone in Surabaya, Makassar or Medan just asked if you have eaten yet.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
