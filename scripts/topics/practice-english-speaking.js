'use strict';
// /practice-english-speaking: "The Exercise Book". A ruled school notebook:
// blue lines, a red margin, handwritten teacher's notes in the margin, and a
// phrase bank you can actually use on a call. Lora to read, Caveat for the
// handwriting, Archivo Black for headings.
module.exports = {
  slug: 'practice-english-speaking',
  name: 'Practice English Speaking',
  date: '2026-10-05',
  about: { '@type': 'Thing', name: 'English speaking practice' },
  title: 'Practice English Speaking Online Free - Talk to Real People | TalkLive',
  description: 'Practise speaking English for free in real conversations with people around the world. Why speaking (not just listening) builds fluency, a phrase bank for real calls, and how to make five minutes count.',
  keywords: 'practice english speaking, english speaking practice online free, speak english with strangers, english conversation practice, improve spoken english',
  h1: 'Practice English Speaking',
  theme: '#fdfbf3',
  preload: ['archivo-black-latin-400-normal', 'lora-latin-400-normal'],
  css: `
:root{--paper:#fdfbf3;--ink:#22262e;--rule:#bcd3ea;--margin:#e2574c;--pen:#1d4fbf;--mast:#22262e}
body{font-family:"Lora",Georgia,serif;background:var(--paper)}
.en-book{max-width:980px;margin:30px auto 0;background:#fffef8 repeating-linear-gradient(180deg,transparent 0 33px,var(--rule) 33px 34px);border:1px solid #e7e1cf;box-shadow:0 14px 40px rgba(40,40,30,.08);position:relative;padding:40px 48px 40px 120px}
.en-book::before{content:"";position:absolute;left:90px;top:0;bottom:0;width:2px;background:var(--margin)}
.en-holes{position:absolute;left:28px;top:60px;bottom:60px;display:flex;flex-direction:column;justify-content:space-between}
.en-holes i{width:22px;height:22px;border-radius:50%;background:#e9e4d4;box-shadow:inset 0 2px 3px rgba(0,0,0,.15)}
.en-date{font:500 24px/34px "Caveat",cursive;color:var(--pen);text-align:right;margin:0}
.en-book h1{font:400 clamp(40px,6.4vw,76px)/1.02 "Archivo Black",sans-serif;letter-spacing:-.02em;margin:0 0 20px;line-height:1.05}
.en-book h1 s{text-decoration-color:var(--margin);text-decoration-thickness:4px;color:#8a8f99}
.en-fix{font:500 30px/1 "Caveat",cursive;color:var(--margin);display:block;margin-top:4px}
.en-book p{font-size:18.5px;line-height:34px;margin:0 0 34px}
.en-book h2{font:400 28px/34px "Archivo Black",sans-serif;margin:34px 0 0;padding-top:0}
.en-book h2+p{margin-top:0}
.en-book a{color:var(--pen)}
.en-note{position:absolute;left:8px;width:76px;font:500 19px/1.05 "Caveat",cursive;color:var(--margin);transform:rotate(-6deg);text-align:center}
.en-hand{font:500 25px/34px "Caveat",cursive;color:var(--pen)}
.c-ctas{margin:0 0 34px}
.c-ctas a{font:400 15px/1 "Archivo Black",sans-serif;padding:15px 20px;border-radius:4px}
.c-talk{background:var(--pen);color:#fff}
.c-chat{background:#fff;color:var(--pen);border:2px solid var(--pen)}
.en-book a.c-talk{color:#fff}
.en-phrases{display:grid;grid-template-columns:1fr 1fr;gap:0 30px;margin:0 0 34px}
.en-phrases div{font-size:17px;line-height:34px}
.en-phrases b{font:400 15px/34px "Archivo Black",sans-serif;display:block}
.en-sticky{background:#fff3a6;padding:14px 18px;transform:rotate(-1deg);box-shadow:0 6px 14px rgba(0,0,0,.08);margin:0 0 34px;font:500 23px/1.25 "Caveat",cursive;color:#3b3200;max-width:520px}
.en-steps{list-style:none;padding:0;margin:0 0 34px;counter-reset:s}
.en-steps li{counter-increment:s;font-size:18px;line-height:34px;padding-left:44px;position:relative}
.en-steps li::before{content:counter(s) ".";position:absolute;left:0;font:500 26px/34px "Caveat",cursive;color:var(--margin)}
.c-faq{max-width:980px;margin:34px auto 0;padding:0 20px}
.c-faq h2{font:400 30px/1.1 "Archivo Black",sans-serif;margin:0 0 12px}
.c-faq summary{font:600 18px/1.4 "Lora",serif}
.c-faq p{font-size:17px;line-height:1.65}
.en-end{max-width:980px;margin:50px auto 0;padding:34px 20px;text-align:center}
.en-end h2{font:400 clamp(32px,5vw,52px)/1.05 "Archivo Black",sans-serif;margin:0 0 10px}
.en-end p{font:500 26px/1.2 "Caveat",cursive;color:var(--pen);margin:0 0 20px}
.en-end .c-ctas{justify-content:center}
@media (max-width:760px){.en-book{padding:30px 18px 20px 46px;margin:20px 8px 0}.en-book::before{left:34px}.en-holes,.en-note{display:none}.en-phrases{grid-template-columns:1fr}}
`,
  faq: [
    { q: 'Can I practise English speaking for free on TalkLive?', a: 'Yes. Voice calls and text chats are free and need no account. You are matched with another adult who is searching at the same time.' },
    { q: 'Will I be matched with a native English speaker?', a: 'Not necessarily. Many people on TalkLive speak English as an additional language, and that is useful practice too. You can prefer countries such as the United States or the United Kingdom, but that does not guarantee a native speaker.' },
    { q: 'Are the people on TalkLive English teachers?', a: 'No. They are ordinary people. Some will be happy to correct you if you ask; others just want a conversation. For structured teaching, a qualified teacher is the right choice.' },
    { q: 'What if I cannot understand someone?', a: 'Ask them to repeat or slow down - the phrase bank on this page helps. If it still is not working, say thank you and tap Next.' },
    { q: 'Can I practise by text if I am too nervous to speak?', a: 'Yes. Tap to Chat lets you practise in writing first. Many learners start with text and move to voice once they are more comfortable.' },
  ],
  body: (c) => `<main id="story">
<article class="en-book">
  <div class="en-holes" aria-hidden="true"><i></i><i></i><i></i></div>
  <p class="en-date">Lesson: speaking. Homework: talk to someone.</p>
  <h1>Practice <s>English</s> speaking<span class="en-fix">- you already know more than you can say</span></h1>
  <p>Most English learners can understand far more than they can say. The gap is not knowledge; it is practice - and the one thing a classroom, an app or a film cannot give you is someone who answers back. TalkLive matches you with another adult for a free voice call (or a text chat, if you want to start gently), with no account and no camera.</p>
  ${c.ctas('Practise speaking now', 'Practise by text first')}

  <span class="en-note" aria-hidden="true">read this bit!</span>
  <h2>Why listening alone is not enough</h2>
  <p>For years, a very influential idea in language teaching - associated with the linguist Stephen Krashen - held that we acquire languages mainly by understanding input: lots of listening and reading at the right level. It is a good idea and mostly right about comprehension. But in the 1980s the Canadian linguist Merrill Swain noticed something about students in French immersion programmes. After years of excellent input they understood French very well, and still spoke it noticeably less accurately than they understood it.</p>
  <p>Her explanation, the "output hypothesis", was that producing language does work that listening cannot. When you have to say something, you discover exactly what you do not know - the word that will not come, the tense you are unsure of - and that gap is what you then go and learn. Speaking is not just showing what you have learned. It is part of how you learn it.</p>
  <p class="en-hand">→ So: listen a lot, but talk too. Even five minutes a day.</p>

  <h2>English is not one accent</h2>
  <p>Roughly one and a half billion people speak English, and most of them learned it as an additional language. That changes what "practice" should mean. On TalkLive you might be matched with someone from Lagos, Manila, Lahore, Leeds or Lisbon. Each will sound different, and each is real English as it is actually spoken. If your goal is to be understood by people around the world - for study, work or travel - practising with a mix of speakers is not second best. It is the job.</p>
  <p>Native speakers have their own challenge: they often speak fast and use idioms without noticing. If you would like an American or British match specifically, you can prefer the <a href="/countries/united-states">United States</a> or the <a href="/countries/united-kingdom">United Kingdom</a> in Filters - our guides to each explain when they are online.</p>

  <h2>Your phrase bank</h2>
  <p>These are the sentences that keep a conversation going when you get stuck. Learn five of them and you will never freeze completely again.</p>
  <div class="en-phrases">
    <div><b>When you did not understand</b>"Sorry, could you say that again?"<br/>"Could you speak a little more slowly?"<br/>"What does ___ mean?"</div>
    <div><b>When you cannot find a word</b>"How do you say... it's like a ___ but ___."<br/>"I don't know the word in English."<br/>"Let me think for a second."</div>
    <div><b>When you want corrections</b>"I'm practising English - please correct me if I make a mistake."<br/>"Was that sentence right?"</div>
    <div><b>To keep it going</b>"That's interesting - why?"<br/>"What do you mean?"<br/>"And then what happened?"</div>
  </div>
  <div class="en-sticky">Tip: write the phrase you needed and did not have on a sticky note after every call. Next time, you will have it.</div>

  <h2>Make five minutes count</h2>
  <ol class="en-steps">
    <li>Before: pick one topic you could talk about for a minute - your city, your work, a film.</li>
    <li>Start: say you are practising. Most people slow down and become kinder at once.</li>
    <li>During: ask two questions and one follow-up. Listening is half of speaking.</li>
    <li>After: note one new word and one sentence you wished you could say.</li>
    <li>Repeat tomorrow. Short and often beats long and rare.</li>
  </ol>
  <p>The Journal has a longer, four-week plan in <a href="/blog/how-to-practise-a-language-by-speaking">why you understand more than you can say</a>, and if you also want to help someone with your language in return, see <a href="/language-exchange">language exchange</a>.</p>

  <h2>Being a good practice partner</h2>
  <p>Remember that the other person is not your teacher, and they are not obliged to correct you. Ask, rather than expect. If they speak English as a first language and you would like them to slow down, just say so - most people are glad to. If a conversation is not working, thank them and tap Next. Keep your personal details private as you would on any call: no surname, address, workplace or social media with someone you have just met. Every call has Report and Block, and TalkLive is for adults 18 and over only.</p>
  <p class="en-hand">Mistakes are proof you are trying. Keep making them.</p>
</article>

${c.faq('Questions from learners')}
${c.ad()}
<section class="en-end">
  <h2>Class is open</h2>
  <p>no homework, no grades - just talk</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
