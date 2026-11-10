'use strict';
// Vietnam: "Cà phê sữa đá". A street-side coffee stall: deep coffee brown and
// condensed-milk cream with the red and gold of the flag, low plastic-stool
// panels and a pronoun chart, because who you are talking to decides every
// word. Big Shoulders Display for signage headings, Nunito to read.
const PRONOUNS = [
  ['Anh', 'A man a little older than you'],
  ['Chị', 'A woman a little older than you'],
  ['Em', 'Anyone younger than you'],
  ['Bạn', 'Friend. The safe choice with someone your age'],
];
const PHRASES = [
  ['Xin chào', 'Hello. Polite and safe everywhere.'],
  ['Bạn khỏe không?', 'How are you? Answer: "Tôi khỏe, cảm ơn."'],
  ['Ăn cơm chưa?', 'Have you eaten yet? It means "how are you doing".'],
  ['Cảm ơn', 'Thank you.'],
  ['Trời ơi!', 'Oh heavens! For surprise, traffic and prices.'],
  ['Một, hai, ba, dô!', 'One, two, three, cheers!'],
];

module.exports = {
  slug: 'vietnam',
  name: 'Vietnam',
  date: '2026-11-10',
  title: 'Talk to Strangers in Vietnam: Trò Chuyện Với Người Lạ',
  description: 'Trò chuyện với người lạ miễn phí, không cần đăng ký. Free voice and text chat with people in Vietnam. Phrases, pronouns, topics and best hours.',
  keywords: 'trò chuyện với người lạ, nói chuyện với người lạ, chat với người lạ, chat voice miễn phí, luyện nói tiếng anh, talk to strangers vietnam, vietnam chat, random chat vietnam, chat with vietnamese people, practise english vietnam',
  h1: 'Talk to Strangers in Vietnam',
  theme: '#da251d',
  preload: ['big-shoulders-display-latin-800-normal', 'nunito-latin-400-normal'],
  css: `
:root{--paper:#fbf4e6;--ink:#2a1a12;--rule:#e6d6b8;--do:#da251d;--vang:#ffcd00;--cafe:#4a2c1a;--mast:#fff}
body{font-family:Nunito,system-ui,sans-serif;background:var(--paper);color:var(--ink)}
.c-bar{background:var(--do);color:var(--mast);max-width:none}
.vn-hero{background:var(--cafe);color:#fdf6e6;padding:58px 20px 50px;border-bottom:10px solid var(--vang)}
.vn-hero div{max-width:840px;margin:0 auto}
.vn-hero h1{font:800 clamp(46px,8vw,104px)/.92 "Big Shoulders Display",sans-serif;text-transform:uppercase;margin:0 0 16px;color:var(--vang)}
.vn-hero p{font-size:20px;line-height:1.6;margin:0 0 26px;max-width:640px}
.vn-main{max-width:780px;margin:0 auto;padding:0 20px}
.vn-sec{padding-top:44px}
.vn-sec h2{font:800 clamp(32px,5vw,52px)/1 "Big Shoulders Display",sans-serif;text-transform:uppercase;color:var(--do);margin:0 0 12px}
.vn-sec p{font-size:18px;line-height:1.75;margin:0 0 1em}
.vn-sec a{color:var(--do)}
.vn-stools{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0}
.vn-stools div{background:var(--do);color:#fff;border-radius:14px 14px 4px 4px;padding:18px 12px 14px;text-align:center;border-bottom:8px solid #a5140f}
.vn-stools div:nth-child(even){background:#1f6fb5;border-bottom-color:#144d80}
.vn-stools b{display:block;font:800 34px/1 "Big Shoulders Display",sans-serif}
.vn-stools span{font-size:14px;line-height:1.35;display:block;margin-top:6px}
.vn-menu{background:#fff;border:2px solid var(--cafe);padding:8px 20px;margin:20px 0}
.vn-menu div{display:grid;grid-template-columns:200px 1fr;gap:14px;padding:12px 0;border-top:1px dashed var(--rule)}
.vn-menu div:first-child{border-top:0}
.vn-menu b{font-weight:800;font-size:18px;color:var(--cafe)}
.vn-menu span{font-size:16px;line-height:1.45}
.vn-cup{background:var(--vang);padding:20px 22px;margin:22px 0;font-size:17px;line-height:1.5}
.vn-cup b{display:block;font:800 30px/1.05 "Big Shoulders Display",sans-serif;text-transform:uppercase;margin-bottom:6px}
.vn-help{border:2px solid var(--do);background:#fff;padding:16px 20px;font-size:16.5px;line-height:1.6}
.c-faq{max-width:780px;margin:44px auto 0;padding:0 20px}
.c-faq h2{font:800 44px/1 "Big Shoulders Display",sans-serif;text-transform:uppercase;color:var(--do);margin:0 0 12px}
.c-faq summary{font:800 17px/1.45 Nunito,sans-serif}
.c-faq p{font-size:16.5px;line-height:1.65}
.vn-end{margin-top:60px;background:var(--do);color:#fff;text-align:center;padding:56px 20px}
.vn-end h2{font:800 clamp(44px,8vw,84px)/.95 "Big Shoulders Display",sans-serif;text-transform:uppercase;color:var(--vang);margin:0 0 10px}
.vn-end p{font-size:18px;line-height:1.55;margin:0 auto 24px;max-width:540px}
.vn-end .c-ctas{justify-content:center}
@media (max-width:640px){.vn-stools{grid-template-columns:1fr 1fr}.vn-menu div{grid-template-columns:1fr;gap:2px}}
`,
  faq: [
    { q: 'TalkLive có miễn phí không?', a: 'Có. Voice calls and text chat are free in Vietnam, with no account, no phone number and no camera. Choosing Vietnam as a preferred country is free too.' },
    { q: 'Can I chat in Vietnamese?', a: 'Yes. Speak any language you and your match share. Most people from Vietnam chat in Vietnamese, and many want to practise English.' },
    { q: 'Can I practise speaking English here?', a: 'Yes. Add the English practice interest before you start and you are matched first with others who want to practise. A voice call is the quickest way to get past the fear of speaking.' },
    { q: 'When is Vietnam online on TalkLive?', a: 'Vietnam is UTC+7. Evenings from about 20:00 to midnight local time are the easiest hours to find people from Vietnam and nearby countries, and TalkLive as a whole is busiest from 22:00 Vietnam time.' },
    { q: 'What are the emergency numbers in Vietnam?', a: 'Police is 113, fire is 114 and ambulance is 115.' },
  ],
  body: (c) => `<main id="story">
<section class="vn-hero"><div>
  <h1>Talk to strangers in Vietnam</h1>
  <p>Trò chuyện với người lạ, miễn phí, không cần đăng ký. A voice call or text chat with someone new, from Hà Nội to Đà Nẵng to Sài Gòn. No account, no camera.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</div></section>

<div class="vn-main">
  <section class="vn-sec">
    <h2>Pull up a stool</h2>
    <p>Life in Vietnam happens on the pavement, on low plastic stools, over iced coffee or a bowl of something hot. Strangers share tables, ask where you are from and how old you are within a minute, and nobody finds it rude. It is how you work out what to call each other.</p>
    <p>It is also a young country that is keen to practise English, so a lot of people open the app for exactly that. Offer ten minutes of English and you will get ten minutes of Vietnamese back.</p>
  </section>

  <section class="vn-sec">
    <h2>First, who are you talking to?</h2>
    <p>Vietnamese has no single word for "you". You pick one by age, which is why the age question comes so early:</p>
    <div class="vn-stools">${PRONOUNS.map(([w, m]) => `<div><b>${w}</b><span>${m}</span></div>`).join('')}</div>
    <div class="vn-menu">${PHRASES.map(([w, m]) => `<div><b>${w}</b><span>${m}</span></div>`).join('')}</div>
    <div class="vn-cup"><b>Cà phê sữa đá</b>Strong dark coffee dripped through a metal phin onto condensed milk, poured over ice. Ask anyone where the best one is in their city. You will be there a while.</div>
  </section>

  <section class="vn-sec">
    <h2>What to talk about</h2>
    <p>Food, always: phở in the north against the south, bún chả, bánh mì, and what your match had for lunch. Football, where the national team stops traffic when it wins. Tết and the trip home, motorbike life, the weather in Hà Nội versus Sài Gòn, music and K-dramas. Ask for a food recommendation and take notes.</p>
  </section>

  <section class="vn-sec">
    <h2>Stay safe</h2>
    <p>Keep your full name, address, workplace and social accounts to yourself at first. Never share a bank OTP or a login code, and end the call with anyone asking for money, photos or to move to Zalo or another app straight away. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">scam guide</a> lists the usual tricks, and every call and chat has Report and Block.</p>
    <div class="vn-help"><b>Khẩn cấp:</b> police <b>113</b>, fire <b>114</b>, ambulance <b>115</b>.</div>
  </section>
</div>

${c.faq('Câu hỏi thường gặp')}
<section class="vn-end">
  <h2>Một, hai, ba, dô!</h2>
  <p>Someone in Vietnam is online now. Start a call or a chat.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
