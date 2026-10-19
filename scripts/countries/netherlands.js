'use strict';
// Netherlands: "Delfts Blauw". Every section is a hand-painted Delft tile:
// cobalt on glazed white, corner ornaments, and a tile panel of the slang.
// The end band turns orange for Koningsdag. Space Grotesk for display, Lora
// to read. The meme is the Dutch cyclist versus the weather.
const TILES = [
  ['Gezellig', 'Cosy, fun, warm, nice. Untranslatable and used every day.'],
  ['Lekker', 'Tasty, but also good, nice, comfy. Lekker bezig = doing great.'],
  ['Chill', 'Same as English, said with a hard Dutch "ch".'],
  ['Wollah', 'I swear, for real. Big in Amsterdam and Rotterdam slang.'],
  ['Mattie', 'Mate, bro. Your mattie always has your back.'],
  ['Doekoe', 'Money. As in: geen doekoe, no cash.'],
  ['Skeer', 'Broke. Usually right before payday.'],
  ['Kapot', 'Broken, or super. Kapot lekker = insanely good.'],
];

function tileCorners() {
  return '<i class="nl-c nl-c1"></i><i class="nl-c nl-c2"></i><i class="nl-c nl-c3"></i><i class="nl-c nl-c4"></i>';
}

module.exports = {
  slug: 'netherlands',
  name: 'Netherlands',
  date: '2026-10-12',
  title: 'Talk to Strangers in the Netherlands: Gratis Chatten met Vreemden | TalkLive',
  description: 'Chatten met vreemden, gratis en zonder account. Free voice and text chat with people in the Netherlands, in Dutch or English. Slang, best hours and gezellige conversation starters.',
  keywords: 'chatten met vreemden, gratis voice chat, anoniem chatten, nieuwe mensen leren kennen, praten met onbekenden, random chat nederland, chatten zonder account, talk to strangers netherlands, dutch voice chat, chat with dutch people',
  h1: 'Talk to Strangers in the Netherlands',
  theme: '#1d3f8f',
  preload: ['space-grotesk-latin-700-normal', 'lora-latin-400-normal'],
  css: `
:root{--paper:#f7f8fb;--ink:#0f1d3d;--rule:#c9d3ea;--delft:#1d3f8f;--glaze:#fdfdfb;--oranje:#ff7a00;--mast:#fff}
body{font-family:Lora,Georgia,serif;background:var(--paper);color:var(--ink)}
.c-bar{background:var(--delft);color:var(--mast);max-width:none}
.nl-wrap{max-width:1040px;margin:0 auto;padding:0 18px}
.nl-tile{position:relative;background:var(--glaze);border:2px solid var(--delft);border-radius:4px;box-shadow:inset 0 0 0 6px #fff,inset 0 0 0 8px rgba(29,63,143,.25)}
.nl-c{position:absolute;width:26px;height:26px;border:3px solid var(--delft);border-radius:50%;border-color:var(--delft) transparent transparent transparent}
.nl-c1{left:8px;top:8px;transform:rotate(-45deg)}.nl-c2{right:8px;top:8px;transform:rotate(45deg)}
.nl-c3{left:8px;bottom:8px;transform:rotate(-135deg)}.nl-c4{right:8px;bottom:8px;transform:rotate(135deg)}
.nl-hero{margin-top:34px;padding:56px 44px 44px;display:grid;grid-template-columns:1fr 200px;gap:30px;align-items:center}
.nl-hero h1{font:700 clamp(38px,6.4vw,76px)/.98 "Space Grotesk",sans-serif;margin:0 0 16px;color:var(--delft);letter-spacing:-.02em}
.nl-hero p{font-size:19px;line-height:1.6;margin:0 0 24px}
.nl-mill svg{width:100%;height:auto;display:block}
.nl-mill svg.nl-flag{width:90px;height:60px}
.nl-flag{width:90px;height:60px;display:block;margin:0 auto 14px;border:2px solid var(--delft)}
.nl-main{max-width:780px;margin:0 auto;padding:14px 18px 0}
.nl-sec{padding:40px 0 4px}
.nl-sec h2{font:700 clamp(28px,4vw,40px)/1.05 "Space Grotesk",sans-serif;color:var(--delft);margin:0 0 14px}
.nl-sec p{font-size:18px;line-height:1.75;margin:0 0 1.05em}
.nl-sec a{color:var(--delft)}
.nl-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:20px 0}
.nl-grid .nl-tile{padding:24px 14px 20px;text-align:center;min-height:170px}
.nl-grid b{display:block;font:700 21px/1.1 "Space Grotesk",sans-serif;color:var(--delft);margin-bottom:8px}
.nl-grid span{font-size:14.5px;line-height:1.45}
.nl-meme{padding:30px 26px 26px;margin:24px 0;display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:center}
.nl-meme .nl-emo{font-size:58px;line-height:1}
.nl-meme b{font:700 22px/1.25 "Space Grotesk",sans-serif;color:var(--delft);display:block;margin-bottom:6px}
.nl-meme span{font-size:16px;line-height:1.5}
.nl-help{border:2px solid var(--delft);background:#fff;padding:16px 20px;font-size:16.5px;line-height:1.6;border-radius:4px}
.c-faq{max-width:780px;margin:36px auto 0;padding:0 18px}
.c-faq h2{font:700 34px/1.05 "Space Grotesk",sans-serif;color:var(--delft);margin:0 0 12px}
.c-faq summary{font:700 17px/1.45 Lora,serif}
.c-faq p{font-size:16.5px;line-height:1.65}
.nl-end{margin-top:60px;background:var(--oranje);color:#1a0d00;text-align:center;padding:56px 20px}
.nl-end h2{font:700 clamp(36px,6vw,60px)/1 "Space Grotesk",sans-serif;margin:0 0 10px}
.nl-end p{font-size:18px;line-height:1.55;margin:0 auto 24px;max-width:540px}
.nl-end .c-ctas{justify-content:center;margin:0 auto}
@media (max-width:800px){.nl-hero{grid-template-columns:1fr;padding:44px 24px 34px}.nl-mill{max-width:150px;margin:0 auto}.nl-grid{grid-template-columns:1fr 1fr}}
`,
  faq: [
    { q: 'Is TalkLive gratis in Nederland?', a: 'Ja. Voice and text chat are free, with no account, no phone number and no camera. Picking the Netherlands as a preferred country is free too.' },
    { q: 'Can I chat in Dutch?', a: 'Yes. Talk in any language you and your match share. Plenty of people chat in Dutch, and almost everyone switches to English easily.' },
    { q: 'When is the Netherlands busiest on TalkLive?', a: 'TalkLive peaks between 15:00 and 21:00 UTC, which is about 17:00 to 23:00 Dutch time in summer and 16:00 to 22:00 in winter.' },
    { q: 'Do I need to download an app?', a: 'Nee. TalkLive runs in the browser on Android, iPhone and computer, and you can pin it to your home screen.' },
    { q: 'What is the emergency number in the Netherlands?', a: 'Call 112 for police, ambulance or fire. For non-urgent police matters, the number is 0900-8844.' },
  ],
  body: (c) => `<main id="story">
<div class="nl-wrap"><section class="nl-tile nl-hero">${tileCorners()}
  <div>
    <h1>Talk to strangers in the Netherlands</h1>
    <p>Chatten met vreemden, but make it gezellig. A voice call or text chat with someone new, from Amsterdam to Groningen, gratis and without an account. No camera, no awkward profile, just talking.</p>
    ${c.ctas('Tap to Talk', 'Tap to Chat')}
  </div>
  <div class="nl-mill">
    <svg class="nl-flag" viewBox="0 0 9 6" role="img" aria-label="Flag of the Netherlands"><rect width="9" height="2" fill="#ae1c28"/><rect y="2" width="9" height="2" fill="#fff"/><rect y="4" width="9" height="2" fill="#21468b"/></svg>
    <svg viewBox="0 0 200 200" aria-hidden="true"><g fill="none" stroke="#1d3f8f" stroke-width="4"><path d="M80 190 L90 90 L110 90 L120 190 Z" fill="#e7ecf7"/><circle cx="100" cy="88" r="6" fill="#1d3f8f"/><g stroke-width="6" stroke-linecap="round"><line x1="100" y1="88" x2="40" y2="28"/><line x1="100" y1="88" x2="160" y2="28"/><line x1="100" y1="88" x2="40" y2="148"/><line x1="100" y1="88" x2="160" y2="148"/></g><path d="M20 190 Q100 170 180 190"/></g></svg>
  </div>
</section></div>

<div class="nl-main">
  <section class="nl-sec">
    <h2>Direct, friendly and always up for a chat</h2>
    <p>Dutch people are famous for being direct. Ask a question and you get a real answer, no fluff. That makes for honestly great conversations with strangers. Add the national obsession with <em>gezelligheid</em>, that warm, cosy, everyone-together feeling, and you get people who are easy to talk to and fun to listen to.</p>
    <p>The best time to find someone is after dinner, roughly 17:00 to 23:00, when TalkLive is busiest everywhere.</p>
  </section>

  <section class="nl-sec">
    <h2>Praat als een local</h2>
    <p>A few words that will make any Dutch person go "haha, nice":</p>
    <div class="nl-grid">${TILES.map(([w, m]) => `<div class="nl-tile">${tileCorners()}<b>${w}</b><span>${m}</span></div>`).join('')}</div>
    <p>Bonus: <em>doei</em> means bye, <em>dat is echt ziek</em> means that’s really cool (not sick), and if someone says <em>het is wat het is</em>, the conversation about the weather is officially over.</p>
    <div class="nl-tile nl-meme" aria-label="Meme: the Dutch cyclist">${tileCorners()}
      <div class="nl-emo" aria-hidden="true">\u{1F6B2}\u{1F327}</div>
      <div><b>POV: storm, sideways rain, 8 graden</b><span>Every Dutch person: "Ik fiets wel even." Still arrives on time. Still complains about the wind. Still says it was lekker.</span></div>
    </div>
  </section>

  <section class="nl-sec">
    <h2>What to talk about</h2>
    <p>Koningsdag, when the whole country turns orange. Oranje football and every heartbreaking tournament. Borrel plans, stroopwafels versus every other cookie, and how anyone can be expected to cycle in that wind. Ask someone about their city and they will tell you, honestly, what is good and what is not.</p>
    <p>Learning Dutch? Say it at the start, and ask your match to keep going in Dutch even when they want to switch to English. They will want to. Hold your ground.</p>
  </section>

  <section class="nl-sec">
    <h2>Stay safe</h2>
    <p>Keep your full name, address, socials and workplace to yourself at first. Never share a bank code or verification code, and skip anyone asking for money, Tikkies, photos or to move to another app right away. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">scam guide</a> lists the usual tricks. Every call and chat has Report and Block. TalkLive is for adults 18+.</p>
    <div class="nl-help"><b>Noodgeval:</b> call <b>112</b> for police, ambulance or fire. Non-urgent police: <b>0900-8844</b>.</div>
  </section>
</div>

${c.faq('Veelgestelde vragen')}
<section class="nl-end">
  <h2>Even bellen?</h2>
  <p>Quick call? Someone in the Netherlands is online right now and probably procrastinating. Lekker.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
