'use strict';
// Japan: "The Last Train Has Gone". TalkLive's busiest hours fall after
// Japan's last trains, so the page is a station departure board at night: an
// amber LED board listing who is still awake around the world, the phrases as
// platform signs in the JR style, and an IC-card meme. JetBrains Mono for the
// board, Manrope to read; Japanese falls back to the system's Japanese face.
// Cities without daylight saving, so the times stay true all year.
const BOARD = [
  ['00:00', 'Mumbai', '20:30', 'Evening tea'],
  ['01:00', 'Karachi', '21:00', 'After dinner'],
  ['02:00', 'Riyadh', '20:00', 'Evening out'],
  ['03:00', 'Lagos', '19:00', 'Dinner'],
  ['05:00', 'São Paulo', '17:00', 'End of work'],
];
const PHRASES = [
  ['よろしく', 'Yoroshiku', 'Nice to meet you (and please be kind to me)'],
  ['なるほど', 'Naruhodo', 'I see - the most useful word in a conversation'],
  ['マジで？', 'Maji de?', 'Seriously?'],
  ['おつかれ', 'Otsukare', 'Good work today - a greeting at day\'s end'],
];
const JP = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic","Meiryo",sans-serif';

module.exports = {
  slug: 'japan',
  name: 'Japan',
  date: '2026-10-18',
  title: 'Talk to Strangers in Japan - Free Voice Chat | TalkLive',
  description: 'Free voice and text chat with people in Japan - in Japanese or English, no sign-up, no camera. Phrases, aizuchi, what to talk about, safety, and when Japan is online on JST.',
  keywords: 'talk to strangers japan, japan chat, japanese voice chat, chat with japanese people, random chat japan, tokyo chat, 知らない人と話す, 通話アプリ 知らない人, ランダム通話, 音声チャット 匿名',
  h1: 'Talk to Strangers in Japan',
  theme: '#14171f',
  preload: ['jetbrains-mono-latin-400-normal', 'manrope-latin-400-normal'],
  css: `
:root{--paper:#f5f3ee;--ink:#15181f;--rule:#d9d5cc;--night:#14171f;--led:#ffb000;--green:#2fbf71;--jr:#0f7a3d;--red:#bc002d;--mast:#f5f3ee}
body{font-family:Manrope,${JP};background:var(--paper);color:var(--ink)}
.c-bar{color:var(--mast);background:var(--night);max-width:none}
.jp-hero{background:linear-gradient(180deg,#0d0f15 0,var(--night) 70%,#1c2130 100%);color:#fff;padding:56px 20px 60px}
.jp-hero-in{max-width:1080px;margin:0 auto;display:grid;grid-template-columns:1.1fr 1fr;gap:40px;align-items:center}
.jp-kicker{font:400 13px/1 "JetBrains Mono",monospace;letter-spacing:.2em;text-transform:uppercase;color:var(--led)}
.jp-hero h1{font:700 clamp(42px,6.8vw,84px)/.98 Manrope,${JP};margin:14px 0 18px;letter-spacing:-.02em}
.jp-hero h1 span{display:block;font:400 .38em/1.4 ${JP};letter-spacing:.12em;color:#c9cfdc;margin-top:6px}
.jp-dek{font-size:18px;line-height:1.7;margin:0 0 26px;max-width:560px;color:#e3e6ee}
.jp-board{background:#07080b;border:3px solid #2b3040;border-radius:8px;padding:14px 14px 10px;font-family:"JetBrains Mono",monospace;box-shadow:0 10px 30px rgba(0,0,0,.45)}
.jp-board h2{margin:0 0 10px;display:flex;justify-content:space-between;font:400 13px/1 "JetBrains Mono",monospace;color:#9aa3b8;letter-spacing:.14em;text-transform:uppercase}
.jp-board h2 b{color:var(--led);font-weight:400}
.jp-row{display:grid;grid-template-columns:64px 1fr 64px;gap:10px;align-items:baseline;padding:8px 4px;border-top:1px dashed #262b38;color:var(--led);font-size:16px;text-shadow:0 0 6px rgba(255,176,0,.55)}
.jp-row small{grid-column:2/4;color:var(--green);font-size:12.5px;text-shadow:0 0 6px rgba(47,191,113,.45)}
.jp-row em{font-style:normal;text-align:right}
.jp-main{max-width:760px;margin:0 auto;padding:20px 20px 0}
.jp-sec{padding:40px 0 6px}
.jp-sec h2{font:700 clamp(28px,4.2vw,40px)/1.1 Manrope,${JP};margin:0 0 14px;letter-spacing:-.01em}
.jp-sec h2 i{font-style:normal;color:var(--red)}
.jp-sec p{font-size:17.5px;line-height:1.8;margin:0 0 1.05em}
.jp-sec a{color:var(--jr)}
.jp-clock{display:grid;grid-template-columns:auto 1fr;gap:22px;align-items:center;background:var(--night);color:#fff;border-radius:8px;padding:20px 22px;margin:22px 0}
.jp-clock b{font:400 40px/1 "JetBrains Mono",monospace;color:var(--led);white-space:nowrap;text-shadow:0 0 8px rgba(255,176,0,.5)}
.jp-clock span{font-size:16px;line-height:1.55}
.jp-signs{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:20px 0}
.jp-sign{background:#fff;border:1px solid var(--rule);border-radius:6px;overflow:hidden}
.jp-sign b{display:block;background:var(--jr);color:#fff;padding:10px 14px 8px;font:700 24px/1.2 ${JP};letter-spacing:.06em}
.jp-sign b small{display:block;font:400 13px/1.3 Manrope,sans-serif;letter-spacing:.04em;opacity:.9}
.jp-sign span{display:block;padding:10px 14px 12px;font-size:14.5px;line-height:1.5}
.jp-aizuchi{background:#fff;border-left:6px solid var(--red);padding:16px 20px;margin:20px 0;font-size:16.5px;line-height:1.65}
.jp-aizuchi b{font-family:${JP}}
.jp-help{background:#fff;border:2px solid var(--night);border-radius:8px;padding:18px 22px;font-size:16.5px;line-height:1.6}
.jp-help b{color:var(--red)}
.jp-meme{max-width:760px;margin:40px auto 0;padding:0 20px}
.jp-ic{background:linear-gradient(135deg,#1aa260 0,#0f7a3d 60%,#0b5c2e 100%);color:#fff;border-radius:16px;padding:22px 24px;box-shadow:0 8px 22px rgba(15,122,61,.3);font-size:17px;line-height:1.55}
.jp-ic b{display:block;font:400 13px/1 "JetBrains Mono",monospace;letter-spacing:.18em;text-transform:uppercase;margin-bottom:10px;opacity:.9}
.c-faq{max-width:760px;margin:36px auto 0;padding:0 20px}
.c-faq h2{font:700 34px/1.1 Manrope,${JP};margin:0 0 12px}
.c-faq summary{font-weight:700;font-size:17px;line-height:1.45}
.c-faq p{font-size:16px;line-height:1.7}
.jp-end{margin-top:60px;background:var(--night);color:#fff;padding:56px 20px;text-align:center}
.jp-end h2{font:400 clamp(30px,5vw,52px)/1.1 "JetBrains Mono",monospace;color:var(--led);margin:0 0 12px;text-shadow:0 0 10px rgba(255,176,0,.5)}
.jp-end p{font-size:18px;line-height:1.55;margin:0 auto 24px;max-width:520px;color:#e3e6ee}
.jp-end .c-ctas{justify-content:center;margin:0 auto}
@media (max-width:860px){.jp-hero-in{grid-template-columns:1fr}}
@media (max-width:560px){.jp-signs{grid-template-columns:1fr}.jp-clock{grid-template-columns:1fr}.jp-row{grid-template-columns:56px 1fr 56px;font-size:14.5px}}
`,
  faq: [
    { q: 'Can I talk in Japanese on TalkLive?', a: 'Yes. Speak whichever language you and your match share. The whole interface is available in Japanese at talklive.app/ja/, and choosing it makes you more likely to meet other people who use TalkLive in Japanese.' },
    { q: 'Is TalkLive free in Japan?', a: 'Yes. Voice and text chat are free, need no account, no app and no phone number, and preferring Japan in the country filter is free.' },
    { q: 'When is Japan busiest on TalkLive?', a: 'TalkLive is busiest worldwide between 15:00 and 21:00 UTC, which is midnight to 6 am in Japan (JST, UTC+9, all year). Japanese evenings, 7 pm to 11 pm, line up with the afternoon in India and late morning in Europe.' },
    { q: 'Can I use TalkLive to practise English?', a: 'Yes. Pick "English practice" as an interest and say in your first sentence that you are practising. Many people on TalkLive speak English as a second language too, so mistakes are normal and nobody minds.' },
    { q: 'Does anyone see my phone number, LINE ID or face?', a: 'No. Calls run in the browser, no number or ID is exchanged and there is no video. Use Add friend inside TalkLive instead of sharing your LINE ID.' },
    { q: 'Is there someone to talk to if I am in crisis in Japan?', a: 'Yes. Yorisoi Hotline answers free on 0120-279-338 at any hour, and TELL Lifeline offers support in English on 03-5774-0992. In an emergency, call 110 for the police or 119 for an ambulance.' },
  ],
  body: (c) => `<main id="story">
<section class="jp-hero"><div class="jp-hero-in">
  <div>
    <span class="jp-kicker">Country guide &middot; Japan</span>
    <h1>Talk to strangers in Japan<span>知らない誰かと、話してみよう</span></h1>
    <p class="jp-dek">The last train has left, the city has gone quiet, and you are still awake. On the other side of the world it is the middle of the afternoon. TalkLive connects you to a real person by voice or text in seconds - free, with no account, no number and no camera.</p>
    ${c.ctas('Tap to Talk', 'Tap to Chat')}
  </div>
  <aside class="jp-board" aria-label="Who is awake when it is late in Japan"><h2><span>Still awake</span><b>JST</b></h2>
${BOARD.map(([jst, city, local, note]) => `    <div class="jp-row"><span>${jst}</span><span>${city}</span><em>${local}</em><small>${note} there</small></div>`).join('\n')}
  </aside>
</div></section>

<div class="jp-main">
  <section class="jp-sec">
    <h2>After the <i>last train</i></h2>
    <p>Most Tokyo lines stop running a little after midnight, and that is exactly when TalkLive gets busy. Our peak, 15:00 to 21:00 UTC, is midnight to 6 am in Japan - the hours of convenience-store runs, late shifts and sleepless scrolling. If you are up then, the queue is at its fullest.</p>
    <div class="jp-clock"><b>00:00-06:00</b><span>TalkLive's busiest hours on Japan Standard Time (UTC+9, no daylight saving). The board above shows the local time where most of those people are.</span></div>
    <p>Not a night owl? A Japanese evening, 7 to 11 pm, is the afternoon in India and Pakistan and late morning in Europe, so there is always someone starting their day as you end yours.</p>
  </section>

  <section class="jp-sec">
    <h2>Japanese, English, <i>or both</i></h2>
    <p>Japan has about 124 million people, and almost all of them speak Japanese. Many studied English for years at school but rarely get to speak it, which makes a low-pressure call with a stranger ideal practice: nobody knows who you are, and if a call goes badly you simply move on. If you are learning Japanese, people in Japan are usually patient and delighted that you are trying.</p>
    <div class="jp-signs">
${PHRASES.map(([jp, ro, en]) => `      <div class="jp-sign"><b lang="ja">${jp}<small>${ro}</small></b><span>${en}</span></div>`).join('\n')}
    </div>
    <div class="jp-aizuchi"><b lang="ja">相槌</b> - <em>aizuchi</em>. Japanese listeners keep up a steady stream of small replies while the other person talks: <span lang="ja">はい</span> (hai), <span lang="ja">ええ</span> (ee), <span lang="ja">そうですね</span> (sou desu ne). On a voice call they matter even more, because there is no nod to see. Silence from you can sound like you are not listening, so a quick "hai" or "naruhodo" goes a long way.</div>
    <p>Prefer to read the interface in Japanese? <a href="/ja/">TalkLive in Japanese</a> has the whole app translated, and our <a href="/languages/#japanese">languages feature</a> covers practising Japanese with native speakers.</p>
  </section>

  <section class="jp-sec">
    <h2>What to <i>talk about</i></h2>
    <p>The safe openers work everywhere: where you are, what time it is there, what you ate. Then the things Japan loves to talk about - the seasons (cherry blossom in spring, autumn leaves in November), ramen and convenience-store food, baseball and Shohei Ohtani, anime, games and J-pop, and the trains, which visitors never stop being amazed by. Ask about someone's hometown: regional pride, from Osaka's humour to Hokkaido's winters, is a great way in.</p>
  </section>

  <section class="jp-sec">
    <h2>Privacy and <i>safety</i></h2>
    <p>Keep your full name, address, school or workplace and social accounts to yourself in a first conversation. Moving quickly to LINE is the first step of most romance and investment scams in Japan, so be wary of anyone who asks for your LINE ID within minutes, talks about money or crypto, or asks for photos. Use Add friend inside TalkLive if you want to talk again - nobody sees your number or ID. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">guide to chat scams</a> has more. Every call and chat has Report and Block, and TalkLive is for adults 18 and over only.</p>
    <div class="jp-help"><b>Need to talk?</b> Yorisoi Hotline answers free on <b>0120-279-338</b> at any hour, and TELL Lifeline offers support in English on <b>03-5774-0992</b>. In an emergency in Japan, call <b>110</b> (police) or <b>119</b> (ambulance).</div>
    <p style="margin-top:20px">Getting started: open TalkLive in your browser (no app, no sign-up), prefer Japan in Filters if you like (two preferred countries are free), and Tap to Talk or Tap to Chat. Nearby, the <a href="/countries/china">China</a>, <a href="/countries/philippines">Philippines</a> and <a href="/countries/indonesia">Indonesia</a> guides share your side of the clock.</p>
  </section>
</div>

<section class="jp-meme" aria-label="Meme: the IC card at 2 a.m.">
  <div class="jp-ic"><b>IC card balance: &yen;120</b>Missed the last train. Taxi costs more than the hotel. The conbini is open, the karaoke box is open, and somehow it is 3 a.m. and you are on a call with someone in Lagos who is just having dinner. <span lang="ja">まあ、いっか</span> - oh well.</div>
</section>

${c.faq('Questions people ask - よくある質問')}
<section class="jp-end">
  <h2>Next departure: now</h2>
  <p>Someone, somewhere, is awake and ready to talk.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
