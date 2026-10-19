'use strict';
// Singapore: "Hawker Centre". A row of lit stall signboards with unit numbers,
// a tray-return sign, the Singlish glossary laid out as a stall menu with prices
// in "convo points", and a tissue packet choping the best seat. Syne for the
// signs, Nunito to read. Red and white from the flag, hawker yellow on top.
const STALLS = [
  ['#01-12', 'Lah', 'Ends a sentence. "Can lah." Adds confidence, removes stress.'],
  ['#01-15', 'Shiok', 'So good, so satisfying. Mostly about food.'],
  ['#01-18', 'Paiseh', 'Embarrassed, sorry. "Paiseh, late reply."'],
  ['#01-21', 'Sian', 'Bored, fed up. Monday morning MRT energy.'],
  ['#01-24', 'Bojio', 'You never invite me! The ultimate guilt trip.'],
  ['#01-27', 'Chope', 'Reserve. Done with a tissue packet on a table.'],
  ['#01-30', 'Atas', 'Fancy, high class. That cafe very atas one.'],
  ['#01-33', 'Kiasu', 'Scared to lose out. Queues first, asks later.'],
];

const FLAG = `<svg class="sg-flag" viewBox="0 0 90 60" role="img" aria-label="Flag of Singapore">
<rect width="90" height="30" fill="#ef3340"/><rect y="30" width="90" height="30" fill="#fff"/>
<circle cx="20" cy="15" r="11" fill="#fff"/><circle cx="24.6" cy="15" r="10.4" fill="#ef3340"/>
${[0, 1, 2, 3, 4].map((i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const cx = 30.5 + 5.8 * Math.cos(a), cy = 15 + 5.8 * Math.sin(a);
    const pts = [];
    for (let k = 0; k < 10; k += 1) {
      const r = k % 2 ? 0.95 : 2.4;
      const b = -Math.PI / 2 + (Math.PI / 5) * k;
      pts.push(`${(cx + r * Math.cos(b)).toFixed(2)},${(cy + r * Math.sin(b)).toFixed(2)}`);
    }
    return `<polygon points="${pts.join(' ')}" fill="#fff"/>`;
  }).join('')}
</svg>`;

module.exports = {
  slug: 'singapore',
  name: 'Singapore',
  date: '2026-10-12',
  title: 'Talk to Strangers in Singapore: Free Random Voice Chat, No Sign-Up | TalkLive',
  description: 'Free random voice and text chat for Singapore. No account, no camera, no app. Singlish you will hear on a call, the best hours to chat and how to stay safe.',
  keywords: 'talk to strangers singapore, random chat singapore, free voice chat singapore, anonymous chat singapore, chat with strangers no sign up, meet new people singapore, singlish chat, omegle alternative singapore, random call app, make friends online singapore',
  h1: 'Talk to Strangers in Singapore',
  theme: '#ef3340',
  preload: ['syne-latin-800-normal', 'nunito-latin-400-normal'],
  css: `
:root{--paper:#fbfaf6;--ink:#1c1c1c;--rule:#e6e1d6;--red:#ef3340;--sign:#ffcf33;--tile:#e9f2ee;--mast:#fff}
body{font-family:Nunito,system-ui,sans-serif;background:var(--paper);color:var(--ink)}
.c-bar{background:var(--red);color:var(--mast);max-width:none}
.sg-hero{background:repeating-linear-gradient(0deg,var(--tile) 0 38px,#dcebe4 38px 40px),var(--tile);padding:40px 18px 46px}
.sg-hero-in{max-width:1040px;margin:0 auto}
.sg-sign{background:var(--red);color:#fff;border:6px solid #1c1c1c;border-radius:10px;padding:30px 30px 26px;box-shadow:0 0 0 6px var(--sign),0 22px 40px -24px rgba(0,0,0,.6);display:grid;grid-template-columns:1fr 150px;gap:20px;align-items:center}
.sg-unit{font:800 13px/1 Syne,sans-serif;letter-spacing:.2em;color:var(--sign)}
.sg-sign h1{font:800 clamp(36px,6.4vw,76px)/.95 Syne,sans-serif;margin:12px 0 14px;letter-spacing:-.02em}
.sg-sign p{font-size:18.5px;line-height:1.55;margin:0 0 22px;max-width:560px}
.sg-flag{width:150px;height:100px;display:block;border:3px solid #fff;border-radius:4px}
.sg-tray{max-width:1040px;margin:18px auto 0;display:flex;gap:10px;flex-wrap:wrap;font:800 12px/1 Syne,sans-serif;letter-spacing:.12em;text-transform:uppercase}
.sg-tray span{background:#1c1c1c;color:#fff;padding:9px 12px;border-radius:6px}
.sg-main{max-width:800px;margin:0 auto;padding:10px 20px 0}
.sg-sec{padding:40px 0 6px}
.sg-sec h2{font:800 clamp(28px,4.2vw,42px)/1.02 Syne,sans-serif;margin:0 0 14px;letter-spacing:-.01em}
.sg-sec p{font-size:18px;line-height:1.75;margin:0 0 1.05em}
.sg-sec a{color:var(--red)}
.sg-stalls{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:22px 0}
.sg-stall{background:#fff;border:3px solid #1c1c1c;border-radius:8px;overflow:hidden}
.sg-stall header{background:var(--sign);padding:8px 10px;font:800 12px/1 Syne,sans-serif;letter-spacing:.1em;border-bottom:3px solid #1c1c1c}
.sg-stall b{display:block;font:800 26px/1 Syne,sans-serif;padding:12px 12px 6px;color:var(--red)}
.sg-stall p{margin:0;padding:0 12px 14px;font-size:14.5px;line-height:1.45}
.sg-meme{display:grid;grid-template-columns:1fr 1fr;gap:0;border:3px solid #1c1c1c;border-radius:10px;overflow:hidden;margin:24px 0}
.sg-meme div{padding:18px 16px;background:#fff;font-size:16px;line-height:1.5}
.sg-meme div:last-child{background:#1c1c1c;color:#fff}
.sg-meme b{display:block;font:800 18px/1.2 Syne,sans-serif;margin-bottom:6px}
.sg-meme .sg-big{font-size:46px;line-height:1;margin:8px 0}
.sg-help{background:#fff;border:3px solid var(--red);border-radius:10px;padding:16px 20px;font-size:16.5px;line-height:1.6}
.c-faq{max-width:800px;margin:36px auto 0;padding:0 20px}
.c-faq h2{font:800 34px/1.05 Syne,sans-serif;margin:0 0 12px}
.c-faq summary{font:800 17px/1.45 Nunito,sans-serif}
.c-faq p{font-size:16.5px;line-height:1.65}
.sg-end{margin-top:60px;background:var(--red);color:#fff;text-align:center;padding:56px 20px;border-top:8px solid var(--sign)}
.sg-end h2{font:800 clamp(36px,6vw,62px)/1 Syne,sans-serif;margin:0 0 10px}
.sg-end p{font-size:18px;line-height:1.55;margin:0 auto 24px;max-width:520px}
.sg-end .c-ctas{justify-content:center;margin:0 auto}
@media (max-width:800px){.sg-sign{grid-template-columns:1fr;padding:24px 20px}.sg-flag{width:120px;height:80px}.sg-stalls{grid-template-columns:1fr 1fr}.sg-meme{grid-template-columns:1fr}}
`,
  faq: [
    { q: 'Is TalkLive free in Singapore?', a: 'Yes. Voice and text chat are free, no account, no phone number, no camera. Choosing Singapore as a preferred country is free too.' },
    { q: 'Can I talk in Singlish, Mandarin, Malay or Tamil?', a: 'Sure. Talk in whatever language you and your match share. Most people will happily mix English with a bit of everything, just like at home.' },
    { q: 'What is the best time to chat from Singapore?', a: 'Evenings from about 7 pm to midnight are good, because they line up with evening in India and Pakistan and afternoon in Europe. TalkLive is busiest globally from 15:00 to 21:00 UTC, which is 11 pm to 5 am in Singapore.' },
    { q: 'Do I need to download an app?', a: 'No need. TalkLive runs in the browser on Android, iPhone and computer, and you can add it to your home screen.' },
    { q: 'What is the emergency number in Singapore?', a: 'Call 999 for police, or 995 for an ambulance or the fire service. Both are free from any phone.' },
  ],
  body: (c) => `<main id="story">
<section class="sg-hero"><div class="sg-hero-in">
  <div class="sg-sign">
    <div>
      <span class="sg-unit">STALL #01-01 &middot; OPEN 24 HOURS</span>
      <h1>Talk to strangers in Singapore</h1>
      <p>Random voice and text chat, no sign-up, no camera, no app to download. Got a few minutes on the MRT or a sian night at home? Can, one tap only.</p>
      ${c.ctas('Tap to Talk', 'Tap to Chat')}
    </div>
    ${FLAG}
  </div>
</div>
<div class="sg-tray" aria-hidden="true"><span>Self-service</span><span>No queue</span><span>Free one</span><span>Please return your tray</span></div>
</section>

<div class="sg-main">
  <section class="sg-sec">
    <h2>Like a hawker centre, but for conversation</h2>
    <p>Singapore’s hawker centres are the best kind of chaos. Everyone sits together, strangers share tables, and the food is always worth the queue. TalkLive is the same idea for talking. You sit down, you get matched with someone new, you chat as long as it is shiok, then you move to the next stall.</p>
    <p>Fun fact for your next call: Singapore’s hawker culture is on the UNESCO list of the world’s intangible cultural heritage. Yes, the chicken rice debate is officially heritage now.</p>
  </section>

  <section class="sg-sec">
    <h2>Singlish menu</h2>
    <p>Speaking to someone from overseas? Teach them a few of these. Speaking to a fellow Singaporean? You already know, just use them lah.</p>
    <div class="sg-stalls">${STALLS.map(([n, w, m]) => `<div class="sg-stall"><header>${n}</header><b>${w}</b><p>${m}</p></div>`).join('')}</div>
    <p>Gen Z bonus: when something hits, it is <em>steady</em>. When something is unbelievable, <em>die die must try</em>. And the only correct answer to "can or not?" is "can".</p>
    <div class="sg-meme" aria-label="Meme: choping a seat">
      <div><b>Tourists</b>Stand around holding their tray, looking lost<div class="sg-big" aria-hidden="true">\u{1F635}</div></div>
      <div><b>Singaporeans</b>One packet of tissue on the table. Seat secured. Legally binding.<div class="sg-big" aria-hidden="true">\u{1F9FB}\u{1F60E}</div></div>
    </div>
  </section>

  <section class="sg-sec">
    <h2>What to talk about</h2>
    <p>Food, obviously. Best chicken rice, best laksa, whether bubble tea is a meal. The weather, which is hot, or raining, or both. NS stories, uni life, the MRT at peak hour, the National Day Parade and the songs everyone secretly knows. People overseas are super curious about Singapore, so you will never run out of things to say.</p>
    <p>Multilingual? Show it off. A lot of people on TalkLive are practising English, Mandarin or Malay and would love a patient partner.</p>
  </section>

  <section class="sg-sec">
    <h2>Stay safe</h2>
    <p>Keep your full name, address, socials and workplace private at first. Never share your Singpass, bank OTP or verification code with anyone. If someone asks for money, gift cards, photos, or wants to move to another app quickly, it is a scam, so just leave. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">scam guide</a> covers the common ones. Every call and chat has Report and Block. TalkLive is for adults 18+.</p>
    <div class="sg-help"><b>Emergency:</b> <b>999</b> for police, <b>995</b> for ambulance or fire. Free from any phone.</div>
  </section>
</div>

${c.faq('Got questions ah?')}
<section class="sg-end">
  <h2>Jom, chat a bit?</h2>
  <p>Someone is online right now, also bored, also looking for a chat. Don’t bojio yourself.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
