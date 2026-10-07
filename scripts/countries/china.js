'use strict';
// China: "One Clock". A country five time zones wide that keeps a single
// clock, set on rice paper with vermilion seal-red and ink black: a large
// clock face for the hero and a strip of conversation phrases like seal
// stamps. Source Serif 4 for display, Inter to read; Chinese characters use
// the visitor's system CJK font.
const PHRASES = [
  ['你好', 'nǐ hǎo', 'Hello'],
  ['吃了吗？', 'chī le ma?', 'Have you eaten? - a greeting, not an invitation'],
  ['加油', 'jiāyóu', 'Keep going! You can do it!'],
  ['没事', 'méi shì', 'It\'s fine, no problem'],
  ['666', 'liù liù liù', 'Online slang: awesome, smooth'],
  ['哈哈哈', 'hā hā hā', 'Laughing, in text'],
];

module.exports = {
  slug: 'china',
  name: 'China',
  date: '2026-10-07',
  title: 'Talk to Strangers in China - 和陌生人聊天 | TalkLive',
  description: 'Free voice and text chat with people in China - in Mandarin or English, no sign-up, no camera. Phrases, topics, safety and when China is online on Beijing time.',
  keywords: 'talk to strangers china, china chat, chinese voice chat, chat with chinese people, practice mandarin, 和陌生人聊天, 匿名聊天, 语音聊天',
  h1: 'Talk to Strangers in China',
  theme: '#b8231b',
  preload: ['source-serif-4-latin-600-normal', 'inter-latin-400-normal'],
  css: `
:root{--paper:#f6f0e4;--ink:#1a1714;--rule:#ddd0b8;--seal:#b8231b;--jade:#2f6f5e;--mast:#f6f0e4}
body{font-family:"Inter",system-ui,sans-serif;background:var(--paper);color:var(--ink)}
.c-bar{color:var(--mast);background:var(--ink);max-width:none}
.cn-hero{max-width:1100px;margin:0 auto;padding:56px 20px 40px;display:grid;grid-template-columns:1.3fr 1fr;gap:44px;align-items:center}
.cn-kicker{font:600 12px/1 "Inter",sans-serif;letter-spacing:.22em;text-transform:uppercase;color:var(--seal)}
.cn-hero h1{font:600 clamp(40px,6.8vw,84px)/.98 "Source Serif 4",serif;letter-spacing:-.03em;margin:16px 0 18px}
.cn-hero h1 span{color:var(--seal)}
.cn-dek{font:400 18.5px/1.7 "Inter",sans-serif;margin:0 0 26px;max-width:600px}
.cn-clock{position:relative;aspect-ratio:1;max-width:360px;width:100%;margin:0 auto;border-radius:50%;border:10px solid var(--ink);background:#fffaf0}
.cn-clock i{position:absolute;left:50%;top:50%;transform-origin:0 0;background:var(--ink);border-radius:3px}
.cn-clock .h{width:6px;height:28%;transform:rotate(150deg) translateX(-50%)}
.cn-clock .m{width:4px;height:38%;transform:rotate(180deg) translateX(-50%)}
.cn-clock .band{position:absolute;inset:8%;border-radius:50%;background:conic-gradient(from -30deg,transparent 0 0deg,rgba(184,35,27,.18) 0deg 180deg,transparent 180deg)}
.cn-clock b{position:absolute;left:50%;bottom:22%;transform:translateX(-50%);font:600 15px/1.2 "Inter",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--seal);white-space:nowrap}
.cn-clock em{position:absolute;left:50%;bottom:32%;transform:translateX(-50%);font:600 italic 18px/1 "Source Serif 4",serif;font-style:italic}
.cn-seal{max-width:1100px;margin:0 auto;padding:0 20px;display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
.cn-seal div{border:2px solid var(--seal);padding:14px 12px;background:#fffaf0;text-align:center}
.cn-seal b{display:block;font-size:26px;line-height:1.1;color:var(--seal);font-weight:700}
.cn-seal small{display:block;font:500 13px/1.3 "Inter",sans-serif;margin:6px 0 4px;opacity:.85}
.cn-seal span{font:400 13px/1.4 "Inter",sans-serif;opacity:.8}
.cn-main{max-width:760px;margin:0 auto;padding:16px 20px 0}
.cn-sec{padding:40px 0 6px;border-bottom:1px solid var(--rule)}
.cn-sec h2{font:600 clamp(28px,4vw,42px)/1.05 "Source Serif 4",serif;letter-spacing:-.02em;margin:0 0 16px}
.cn-sec h2 span{color:var(--seal)}
.cn-sec p{font:400 17.5px/1.78 "Inter",sans-serif;margin:0 0 1.05em}
.cn-sec a{color:var(--seal)}
.cn-time{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:20px 0}
.cn-time div{background:var(--ink);color:var(--paper);padding:18px 20px}
.cn-time div:last-child{background:var(--jade)}
.cn-time b{display:block;font:600 34px/1 "Source Serif 4",serif;margin-bottom:8px}
.cn-time span{font:400 15.5px/1.5 "Inter",sans-serif}
.cn-help{border:2px solid var(--seal);background:#fffaf0;padding:18px 22px;font:400 16.5px/1.6 "Inter",sans-serif}
.cn-help b{color:var(--seal)}
.c-faq{max-width:760px;margin:36px auto 0;padding:0 20px}
.c-faq h2{font:600 34px/1.05 "Source Serif 4",serif;margin:0 0 12px}
.c-faq summary{font:600 17px/1.45 "Inter",sans-serif}
.c-faq p{font:400 16px/1.68 "Inter",sans-serif}
.cn-end{margin-top:60px;background:var(--seal);color:#fff;padding:60px 20px;text-align:center}
.cn-end h2{font:600 clamp(36px,6vw,68px)/1 "Source Serif 4",serif;margin:0 0 12px}
.cn-end p{font:400 18px/1.55 "Inter",sans-serif;margin:0 auto 24px;max-width:540px}
.cn-end .c-ctas{justify-content:center;margin:0 auto}
@media (max-width:900px){.cn-hero{grid-template-columns:1fr}.cn-clock{max-width:260px}.cn-seal{grid-template-columns:repeat(3,1fr)}}
@media (max-width:520px){.cn-seal{grid-template-columns:repeat(2,1fr)}.cn-time{grid-template-columns:1fr}}
`,
  faq: [
    { q: 'Can I chat in Chinese on TalkLive?', a: 'Yes. Speak whichever language you and your match share, and switch the whole interface to Chinese at talklive.app/zh/ if you prefer.' },
    { q: 'Is TalkLive free?', a: 'Yes. Voice and text chat are free, need no account and no app download, and preferring China in the country filter is free.' },
    { q: 'Does TalkLive work in China?', a: 'TalkLive runs in an ordinary web browser with no app-store download, and people in China do use it. We cannot promise that every network will reach it, so if it does not load, try another connection.' },
    { q: 'When is China busiest on TalkLive?', a: 'TalkLive is busiest worldwide between 15:00 and 21:00 UTC, which is 11 pm to 5 am Beijing time. Chinese evenings, 7 pm to 11 pm, are quieter but line up with the middle of the day in Europe.' },
    { q: 'Is TalkLive good for practising Mandarin?', a: 'Yes. Prefer China in Filters, say in your first sentence that you are learning, and offer to help with your own language in return.' },
    { q: 'Who can I call in an emergency in China?', a: 'Call 110 for the police and 120 for an ambulance. The national psychological assistance hotline is 12356.' },
  ],
  body: (c) => `<main id="story">
<section class="cn-hero">
  <div>
    <span class="cn-kicker">Country guide &middot; China &middot; 中国</span>
    <h1>Talk to strangers in <span>China</span></h1>
    <p class="cn-dek">和陌生人聊天 - chat with a stranger. China is five time zones wide and runs on one clock, which means that somewhere in the country it is always a good time to talk. Start a voice call or a text chat, free, with no account, no phone number and no camera.</p>
    ${c.ctas('Tap to Talk', 'Tap to Chat')}
  </div>
  <div class="cn-clock" role="img" aria-label="A clock showing TalkLive's busiest hours, 11 pm to 5 am Beijing time"><span class="band"></span><em>北京时间</em><i class="h"></i><i class="m"></i><b>11 pm - 5 am</b></div>
</section>

<div class="cn-seal" aria-label="Useful Chinese phrases">
${PHRASES.map(([zh, py, en]) => `<div><b lang="zh">${zh}</b><small>${py}</small><span>${en}</span></div>`).join('\n')}
</div>

<div class="cn-main">
  <section class="cn-sec">
    <h2>Five time zones, <span>one clock</span></h2>
    <p>China is home to about 1.4 billion people, and its territory stretches across roughly five geographical time zones. Since 1949 the whole country has kept a single official time, Beijing time, eight hours ahead of UTC. In the far west the sun can rise after 9 am by the clock, and in Xinjiang many people also use an unofficial local time two hours behind.</p>
    <div class="cn-time">
      <div><b>11 pm-5 am</b><span>TalkLive's busiest hours (15:00-21:00 UTC) on Beijing time. Night owls get the fullest queue.</span></div>
      <div><b>7-11 pm</b><span>Chinese evenings - quieter on TalkLive, and the middle of the day in Europe and Africa.</span></div>
    </div>
  </section>

  <section class="cn-sec">
    <h2>Mandarin, and <span>much more</span></h2>
    <p>Standard Mandarin, Putonghua, is the language of school, television and most conversations between strangers, and it is what most people in China will speak with you. It is far from the only one: Cantonese, Shanghainese, Hokkien, Hakka and many other varieties are spoken at home, alongside the languages of China's 55 recognised ethnic minorities. Many younger people have studied English for years and welcome a chance to use it out loud.</p>
    <p>If you are learning Mandarin, say so at the start - most people are delighted, and patient with tones. If you are a Chinese speaker practising English, our guide to <a href="/practice-english-speaking">practising English speaking</a> is for you, and the whole app is available <a href="/zh/">in Chinese</a>.</p>
  </section>

  <section class="cn-sec">
    <h2>What to <span>talk about</span></h2>
    <p>Food is the safest and richest subject there is: northern noodles and dumplings versus southern rice, Sichuan spice, Cantonese dim sum, and the long-running online debate over whether tofu pudding should be sweet or savoury. Then hometowns - everyone has one, and everyone has an opinion on it - the Spring Festival and the travel rush around it, the gaokao, basketball and table tennis, C-dramas, games, and the cities that have changed beyond recognition in a decade. Politics can wait until you know each other.</p>
  </section>

  <section class="cn-sec">
    <h2>Privacy and <span>safety</span></h2>
    <p>Keep your full name, ID number, address, workplace and social accounts to yourself in a first conversation. Never share a payment code, bank details or a verification code. Telecom fraud often starts with someone claiming to be from the police, a court, a bank or customer service and asking you to move money to a "safe account" - no real authority ever does that, so hang up. Be wary of anyone who asks for photos or money, or wants to move to another app at once; our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">guide to chat scams</a> covers the rest. Every call and chat has Report and Block, and TalkLive is for adults 18 and over only.</p>
    <div class="cn-help"><b>In an emergency</b> in China, call <b>110</b> for the police or <b>120</b> for an ambulance. The national psychological assistance hotline is <b>12356</b>.</div>
    <p style="margin-top:20px">Getting started: open TalkLive in your browser (no app, no sign-up), prefer China in Filters if you like (two preferred countries are free), and Tap to Talk or Tap to Chat. Our <a href="/late-night-chat">late-night chat guide</a> is for the hours after midnight, and the Journal's <a href="/regions/southeast-asia">Southeast Asia feature</a> covers the neighbours to the south.</p>
  </section>
</div>

${c.ad()}
${c.faq('常见问题 - questions people ask')}
<section class="cn-end">
  <h2>聊聊吧 - let's talk</h2>
  <p>Someone in Beijing, Shanghai, Chengdu or Guangzhou is up for a chat.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
