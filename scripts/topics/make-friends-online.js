'use strict';
// /make-friends-online: "Fifty Hours". How long it really takes to turn a
// stranger into a friend, built around Jeffrey Hall's hours-to-friendship
// research: a sunny scrapbook with an hours meter climbing the page, polaroid
// cards and tape. Fraunces for display, Manrope to read.
module.exports = {
  slug: 'make-friends-online',
  name: 'Make Friends Online',
  date: '2026-10-05',
  about: { '@type': 'Thing', name: 'Making friends online' },
  title: 'Make Friends Online - Meet New People by Voice, Free | TalkLive',
  description: 'Make friends online through real conversations, not profiles. What research says about how many hours a friendship takes, and how TalkLive helps you keep the people you click with - free, no sign-up to start.',
  keywords: 'make friends online, how to make friends online, find friends online, online friends, meet new people online, make new friends',
  h1: 'Make Friends Online',
  theme: '#fff6dc',
  preload: ['fraunces-latin-700-normal', 'manrope-latin-400-normal'],
  css: `
:root{--paper:#fff6dc;--ink:#2b2118;--rule:#ecd9a6;--sun:#ffc93c;--coral:#ef6a4c;--sky:#4da3d9;--mast:#2b2118}
body{font-family:"Manrope",system-ui,sans-serif;background:var(--paper)}
.fr-hero{max-width:1100px;margin:0 auto;padding:54px 20px 30px;display:grid;grid-template-columns:1.2fr 1fr;gap:40px;align-items:center}
.fr-hero h1{font:700 clamp(50px,8vw,100px)/.95 "Fraunces",serif;letter-spacing:-.03em;margin:0 0 18px}
.fr-hero h1 em{font-style:italic;font-weight:400;color:var(--coral)}
.fr-dek{font-size:20px;line-height:1.6;margin:0 0 26px}
.fr-polas{position:relative;height:340px}
.fr-pola{position:absolute;width:200px;background:#fff;padding:12px 12px 40px;box-shadow:0 10px 26px rgba(43,33,24,.15);font:400 italic 18px/1.2 "Fraunces",serif;text-align:center}
.fr-pola div{height:150px;margin-bottom:10px;border-radius:2px}
.fr-pola::before{content:"";position:absolute;top:-10px;left:50%;width:70px;height:22px;transform:translateX(-50%) rotate(-3deg);background:rgba(255,201,60,.7)}
.fr-p1{left:0;top:30px;transform:rotate(-7deg)}.fr-p1 div{background:linear-gradient(135deg,var(--sky),#9fd3f2)}
.fr-p2{left:150px;top:0;transform:rotate(5deg)}.fr-p2 div{background:linear-gradient(135deg,var(--coral),#f7b39f)}
.fr-p3{left:80px;top:150px;transform:rotate(-2deg)}.fr-p3 div{background:linear-gradient(135deg,var(--sun),#ffe39a)}
.c-ctas a{font:700 16px/1 "Manrope",sans-serif;padding:16px 24px;border-radius:999px}
.c-talk{background:var(--coral);color:#fff}
.c-chat{background:#fff;color:var(--ink);border:2px solid var(--ink)}
.fr-main{max-width:1100px;margin:0 auto;padding:10px 20px 0;display:grid;grid-template-columns:110px minmax(0,1fr);gap:40px}
.fr-meter{position:relative}
.fr-meter-bar{position:sticky;top:30px;height:70vh;width:26px;margin:0 auto;border-radius:20px;background:#fff;border:2px solid var(--ink);overflow:hidden}
.fr-meter-bar i{position:absolute;left:0;right:0;bottom:0;height:62%;background:linear-gradient(0deg,var(--coral),var(--sun))}
.fr-meter small{display:block;text-align:center;font:700 12px/1.3 "Manrope",sans-serif;margin-top:8px;position:sticky;top:calc(30px + 70vh + 6px)}
.fr-sec{padding:40px 0;border-bottom:2px dashed var(--rule)}
.fr-sec h2{font:700 clamp(30px,4vw,46px)/1.05 "Fraunces",serif;letter-spacing:-.02em;margin:0 0 16px}
.fr-sec p{font-size:18.5px;line-height:1.75;margin:0 0 1.05em}
.fr-sec a{color:#b8421f}
.fr-hours{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:24px 0}
.fr-hours div{background:#fff;border-radius:18px;padding:20px;box-shadow:0 6px 0 var(--rule)}
.fr-hours b{display:block;font:700 54px/1 "Fraunces",serif}
.fr-hours span{font-size:15.5px;line-height:1.45}
.fr-hours div:nth-child(1) b{color:var(--sky)}.fr-hours div:nth-child(2) b{color:var(--coral)}.fr-hours div:nth-child(3) b{color:#d39b00}
.fr-how{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin:20px 0}
.fr-how div{background:#fff;border:2px solid var(--ink);border-radius:16px;padding:16px 18px;font-size:16px;line-height:1.55}
.fr-how b{font:700 20px/1.2 "Fraunces",serif;display:block;margin-bottom:4px}
.c-faq{max-width:1100px;margin:0 auto;padding:40px 20px 0}
.c-faq h2{font:700 40px/1.05 "Fraunces",serif;margin:0 0 12px}
.c-faq details{background:#fff;border:0;border-radius:14px;padding:14px 18px;margin-bottom:10px}
.c-faq summary{font:700 17px/1.4 "Manrope",sans-serif}
.c-faq p{font-size:16.5px;line-height:1.65}
.fr-end{max-width:1100px;margin:50px auto 0;padding:46px 24px;background:var(--sun);border-radius:28px;text-align:center}
.fr-end h2{font:700 clamp(36px,6vw,66px)/1 "Fraunces",serif;margin:0 0 10px}
.fr-end p{font-size:18px;margin:0 0 22px}
.fr-end .c-ctas{justify-content:center}
@media (max-width:860px){.fr-hero{grid-template-columns:1fr}.fr-polas{height:300px;max-width:360px}.fr-main{grid-template-columns:1fr}.fr-meter{display:none}.fr-hours,.fr-how{grid-template-columns:1fr}}
@media (max-width:420px){.fr-pola{width:170px}.fr-p2{left:auto;right:4px}.fr-p3{left:50px;top:140px}}
`,
  faq: [
    { q: 'Can you really make friends on a random chat?', a: 'You can meet people you click with, and research suggests friendship comes from time spent together. TalkLive\'s friends feature lets you keep talking to the people you meet, which is how a good conversation can become a friendship.' },
    { q: 'Is TalkLive a dating app?', a: 'No. TalkLive is for conversation and friendship. There are no dating profiles, photos or swiping.' },
    { q: 'How do I keep in touch with someone I met?', a: 'Both of you add each other as friends. After that you can message each other and call back when you are both online - no phone numbers needed.' },
    { q: 'Is it free to make friends here?', a: 'Yes. Random matching and the friends feature are free. An optional account keeps your friends list between visits.' },
    { q: 'What if I am shy?', a: 'Start with text chat - no microphone needed - and move to voice when you are ready. Most people are as nervous as you are.' },
  ],
  body: (c) => `<main id="story">
<section class="fr-hero">
  <div>
    <h1>Make friends online, <em>one conversation at a time</em></h1>
    <p class="fr-dek">Friendship does not come from a profile or a follow button. It comes from talking - and then talking again. TalkLive gives you both halves: a free, one-tap voice or text conversation with someone new, and a simple way to keep the people you click with.</p>
    ${c.ctas('Meet someone by voice', 'Meet someone by text')}
  </div>
  <div class="fr-polas" aria-hidden="true">
    <div class="fr-pola fr-p1"><div></div>hour one</div>
    <div class="fr-pola fr-p2"><div></div>hour fifty</div>
    <div class="fr-pola fr-p3"><div></div>hour two hundred</div>
  </div>
</section>

<div class="fr-main">
  <div class="fr-meter" aria-hidden="true"><div class="fr-meter-bar"><i></i></div><small>hours together</small></div>
  <div>
    <section class="fr-sec">
      <h2>How many hours does a friend take?</h2>
      <p>In 2018 the communication researcher Jeffrey Hall at the University of Kansas set out to answer a question most of us have never thought to ask: how much time does it actually take to make a friend? He surveyed adults who had recently moved to a new city, and students in their first weeks at university, and tracked how many hours they spent with new acquaintances and how those relationships developed. His results were published in the <em>Journal of Social and Personal Relationships</em> in 2019.</p>
      <div class="fr-hours">
        <div><b>~50</b><span>hours together to move from acquaintance to casual friend</span></div>
        <div><b>~90</b><span>hours to become a friend</span></div>
        <div><b>200+</b><span>hours to become a close friend</span></div>
      </div>
      <p>Two things stand out. The first is that friendship is mostly a matter of time spent, not of instant chemistry. The second is that the time has to be spent <em>together</em> - Hall found that the kind of time mattered too, with hanging out, joking and catching up doing more than time spent side by side on a task. In other words: conversation.</p>
    </section>

    <section class="fr-sec">
      <h2>Why you made friends easily at school</h2>
      <p>In 1950, the psychologists Leon Festinger, Stanley Schachter and Kurt Back studied friendships in Westgate, a housing development for married students at MIT. Who became friends with whom? Not, mostly, the people with the most in common. It was the people who lived closest together - neighbours, and especially the people whose doors were near the stairways and mailboxes everyone passed. Friendship followed repeated, easy, unplanned contact.</p>
      <p>School, university and a first job all supply that contact automatically. Adult life mostly does not, which is why so many adults find it hard to make new friends - and why online friendship works best when it recreates the same pattern: easy contact, again and again, with the same person.</p>
    </section>

    <section class="fr-sec">
      <h2>From one good conversation to a friend</h2>
      <p>A random conversation is hour one. On its own it is a pleasant evening; the trick is turning it into hour two. TalkLive is built for that step:</p>
      <div class="fr-how">
        <div><b>Add each other</b>When a conversation clicks, you both tap Add Friend. It only works if both of you want it.</div>
        <div><b>Message and call back</b>Your friends list lets you send messages and call back when you are both online - no phone numbers swapped.</div>
        <div><b>Voice messages, by consent</b>In a friend chat, you can exchange voice messages once both of you have agreed to.</div>
        <div><b>Block still works</b>If a friendship goes wrong, remove or block the person; blocked people are never matched with you again.</div>
      </div>
      <p>An optional account keeps your friends list between visits and devices. Nothing else changes: you still do not need to share your real name, number or social media to stay in touch.</p>
    </section>

    <section class="fr-sec">
      <h2>Being the kind of person people want to call back</h2>
      <p>Ask questions, and then ask the follow-up. Remember what they told you last time - "how did the interview go?" is the most powerful sentence in friendship. Be a little more open than feels natural; most people are waiting for someone else to go first. And be patient: by Hall's numbers, an hour-long first conversation is about half of one per cent of the way to a close friend.</p>
      <p>Not every match will become a friend, and that is fine. Plenty of people are on TalkLive for one good conversation, not a new best friend. If someone is not interested, let them go kindly and tap Next. And keep the usual care: a new friend online should earn your surname, your city and your social accounts over time, not get them in the first hour. If anyone moves quickly towards money, photos or another app, they are not looking for a friend. The <a href="/blog/loneliness-what-actually-helps">Journal's piece on loneliness</a> and our guide to <a href="/talk-to-strangers">the first five minutes with a stranger</a> are good next reads.</p>
    </section>
  </div>
</div>

${c.faq('Friendly questions')}
${c.ad()}
<section class="fr-end">
  <h2>Hour one starts now</h2>
  <p>Someone you have not met yet could be someone you call every week.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
