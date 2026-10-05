'use strict';
// /talk-to-strangers: "The First Five Minutes". A conversation with a stranger
// minute by minute, laid out on a stopwatch rail: off-white, black and a lime
// signal colour. Syne for display, Source Serif 4 to read.
module.exports = {
  slug: 'talk-to-strangers',
  name: 'Talk to Strangers',
  date: '2026-10-05',
  about: { '@type': 'Thing', name: 'Talking to strangers' },
  title: 'Talk to Strangers - Free Voice and Text Chat, No Sign-Up | TalkLive',
  description: 'Talk to strangers by voice or text, free and without an account. What the first five minutes of a conversation with someone new are really like, minute by minute, and what research says about each one.',
  keywords: 'talk to strangers, talk to strangers online, chat with strangers, stranger chat, talk to random people, how to talk to strangers',
  h1: 'Talk to Strangers',
  theme: '#111111',
  preload: ['syne-latin-800-normal', 'source-serif-4-latin-400-normal'],
  css: `
:root{--paper:#f6f5f0;--ink:#111;--rule:#d8d6cc;--lime:#c6f432;--mast:#f6f5f0}
body{font-family:"Source Serif 4",Georgia,serif;background:var(--paper)}
.c-bar{background:var(--ink);color:var(--mast);max-width:none}
.ts-hero{background:var(--ink);color:#f6f5f0;padding:56px 20px 0}
.ts-hero-in{max-width:1180px;margin:0 auto}
.ts-hero h1{font:800 clamp(36px,8.4vw,128px)/.9 "Syne",sans-serif;letter-spacing:-.04em;margin:0 0 26px;text-transform:uppercase;overflow-wrap:anywhere}
.ts-hero h1 span{color:var(--lime)}
.ts-hero-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:40px;align-items:end;padding-bottom:40px}
.ts-dek{font-size:22px;line-height:1.5;margin:0 0 24px;color:#d9d8d0}
.ts-fact{font:400 15px/1.6 "Source Serif 4",serif;border-left:3px solid var(--lime);padding-left:16px;color:#bdbcb4}
.ts-fact b{display:block;font:800 30px/1.05 "Syne",sans-serif;color:#fff;margin-bottom:6px}
.c-ctas a{font:800 15px/1 "Syne",sans-serif;text-transform:uppercase;letter-spacing:.04em;padding:17px 24px;border-radius:999px}
.c-talk{background:var(--lime);color:var(--ink)}
.c-chat{color:#f6f5f0;border:2px solid #f6f5f0}
.ts-ruler{display:grid;grid-template-columns:repeat(6,1fr);border-top:1px solid #333;font:800 13px/1 "Syne",sans-serif;color:#8d8c84}
.ts-ruler a{padding:16px 0 18px;text-decoration:none;border-left:1px solid #333;padding-left:10px}
.ts-ruler a:hover{color:var(--lime)}
.ts-ruler a b{display:block;font-size:24px;color:#fff;margin-bottom:4px}
.ts-main{max-width:1180px;margin:0 auto;padding:0 20px}
.ts-min{display:grid;grid-template-columns:180px minmax(0,700px);gap:40px;padding:56px 0;border-bottom:1px solid var(--rule)}
.ts-clock{position:sticky;top:20px;align-self:start;width:150px;height:150px;border-radius:50%;background:var(--ink);color:var(--lime);display:grid;place-items:center;font:800 40px/1 "Syne",sans-serif;letter-spacing:-.02em}
.ts-clock small{display:block;font-size:11px;color:#8d8c84;letter-spacing:.14em;text-align:center;margin-top:6px}
.ts-min h2{font:800 clamp(30px,4vw,48px)/1 "Syne",sans-serif;letter-spacing:-.02em;margin:0 0 18px}
.ts-min p{font-size:19.5px;line-height:1.72;margin:0 0 1.1em}
.ts-min a{color:var(--ink);text-decoration-color:var(--lime);text-decoration-thickness:3px}
.ts-try{background:var(--lime);padding:18px 22px;margin:24px 0;font-size:18px;line-height:1.55}
.ts-try b{font:800 13px/1 "Syne",sans-serif;text-transform:uppercase;letter-spacing:.1em;display:block;margin-bottom:8px}
.ts-study{border:2px solid var(--ink);padding:18px 22px;margin:24px 0;font-size:16.5px;line-height:1.6}
.ts-study b{font:800 13px/1 "Syne",sans-serif;text-transform:uppercase;letter-spacing:.1em;display:block;margin-bottom:8px}
.ts-rules{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:2px solid var(--ink);margin:24px 0}
.ts-rules div{padding:18px;border-right:2px solid var(--ink);font-size:16px;line-height:1.55}
.ts-rules div:last-child{border-right:0}
.ts-rules b{display:block;font:800 18px/1.15 "Syne",sans-serif;margin-bottom:6px}
.c-faq{max-width:1180px;margin:0 auto;padding:50px 20px 0}
.c-faq h2{font:800 46px/1 "Syne",sans-serif;letter-spacing:-.02em;margin:0 0 14px}
.c-faq summary{font:600 19px/1.4 "Source Serif 4",serif}
.c-faq p{font-size:17px;line-height:1.65}
.ts-end{background:var(--ink);color:#f6f5f0;margin-top:64px;padding:60px 20px;text-align:center}
.ts-end h2{font:800 clamp(44px,8vw,100px)/.9 "Syne",sans-serif;letter-spacing:-.03em;margin:0 0 14px;text-transform:uppercase}
.ts-end p{font-size:19px;color:#bdbcb4;margin:0 auto 26px;max-width:540px}
.ts-end .c-ctas{justify-content:center}
@media (max-width:860px){.ts-hero-grid,.ts-min{grid-template-columns:1fr}.ts-min{gap:16px;padding:40px 0}.ts-clock{position:static;width:96px;height:96px;font-size:26px}.ts-ruler{grid-template-columns:repeat(3,1fr)}.ts-rules{grid-template-columns:1fr}.ts-rules div{border-right:0;border-bottom:2px solid var(--ink)}}
`,
  faq: [
    { q: 'Is it free to talk to strangers on TalkLive?', a: 'Yes. Random voice calls and text chats are free, and no account is needed for a basic match. The site is supported by ads.' },
    { q: 'Do I need to make an account?', a: 'No. You can be matched straight away. An optional account lets you keep friends and call them back on another visit.' },
    { q: 'Will the stranger see my face or my number?', a: 'No. TalkLive has no video at all, and calls run in the browser, so no phone number is exchanged in either direction.' },
    { q: 'Who will I be matched with?', a: 'Another adult who is searching at the same moment. Country and other preferences can steer matching, but nobody\'s identity, age or location is verified.' },
    { q: 'What if a stranger is rude or inappropriate?', a: 'Tap Report or Block on the call or chat screen. Blocked people are not matched with you again, and reports are reviewed by the TalkLive team.' },
    { q: 'Is TalkLive for teenagers?', a: 'No. TalkLive is for adults aged 18 and over only.' },
  ],
  body: (c) => `<main id="story">
<section class="ts-hero">
  <div class="ts-hero-in">
    <h1>Talk to <span>strangers</span></h1>
    <div class="ts-hero-grid">
      <div>
        <p class="ts-dek">Almost everyone expects a conversation with a stranger to go worse than it does. Here is what actually happens in the first five minutes - minute by minute, with what the research says about each one - and a button to find out for yourself, by voice or text, free and without an account.</p>
        ${c.ctas('Talk to someone new', 'Text someone new')}
      </div>
      <p class="ts-fact"><b>One tap. One person. No camera.</b>TalkLive pairs you with another adult who pressed the same button, for a one-to-one voice call or text chat. Leave whenever you want.</p>
    </div>
    <nav class="ts-ruler" aria-label="The five minutes">
      <a href="#m0"><b>0:00</b>The button</a><a href="#m1"><b>0:10</b>Hello</a><a href="#m2"><b>1:00</b>The question</a><a href="#m3"><b>2:30</b>The turn</a><a href="#m4"><b>4:00</b>The pause</a><a href="#m5"><b>5:00</b>The exit</a>
    </nav>
  </div>
</section>

<div class="ts-main">
  <section class="ts-min" id="m0">
    <div class="ts-clock">0:00<small>THE BUTTON</small></div>
    <div>
      <h2>The worst part happens before anyone speaks</h2>
      <p>Your thumb is over the button and your brain is listing reasons not to press it. They will not want to talk to me. I will not know what to say. It will be awkward, and it will be my fault. Nearly everybody has this voice, and it is remarkably consistent about what it fears.</p>
      <p>It is also, remarkably consistently, wrong. In 2021 the psychologists Gillian Sandstrom and Erica Boothby pulled together several of their own studies into a mini meta-analysis titled, plainly, <em>Why do people avoid talking to strangers?</em> (published in <em>Self and Identity</em>). People worried that they would not enjoy the conversation, that the other person would not like them, and that they lacked the skill to keep it going. When they actually talked to someone, all three fears turned out to be overblown. The anticipation was the hard part. The conversation was fine.</p>
      <div class="ts-try"><b>Try this</b>Decide in advance that you will stay for one full minute, whatever happens. The first thirty seconds are the least representative part of any conversation.</div>
    </div>
  </section>

  <section class="ts-min" id="m1">
    <div class="ts-clock">0:10<small>HELLO</small></div>
    <div>
      <h2>Hello is a handshake, not a test</h2>
      <p>The first ten seconds of a random call are mostly logistics. The other person may still be putting headphones in, or walking into another room, or wondering whether their microphone works. Give them a beat. "Hi - can you hear me okay?" is a perfectly good first line, because it is a real question and it is easy to answer.</p>
      <p>Then use what you have. TalkLive shows you what time it is where the other person is, which hands you the most natural opener there is: "Wait, is it three in the morning there?" Location, time, weather, what they were doing before they pressed the button - concrete, small, easy. Nobody needs a clever line. People who open with "hi" and then nothing put the whole job on the other person; people who open with "hi" plus a small question share it.</p>
      <p>What tends to end conversations in the first ten seconds is the opposite of small: a list of demographic questions, or anything that sounds like a form. Let people tell you who they are at their own speed.</p>
    </div>
  </section>

  <section class="ts-min" id="m2">
    <div class="ts-clock">1:00<small>THE QUESTION</small></div>
    <div>
      <h2>Talk about what you share, not only what is new</h2>
      <p>Around the first minute, small talk either finds something to grip or it does not. A useful finding here comes from a 2017 study in <em>Psychological Science</em> by Gus Cooney, Daniel Gilbert and Timothy Wilson, called "The Novelty Penalty". People expected to enjoy hearing about other people's novel, exciting experiences most - and to be enjoyed most when they shared their own. In fact listeners liked hearing about things they already had some experience of, because they could join in. A story about a place, a film or a food the other person knows beats a story about something only you have done.</p>
      <p>So go looking for overlap. Have they seen it, eaten it, been there, studied it, hated it too? Once you have one shared thing, follow it with a real follow-up question - why, how did that go, what happened next - and the conversation stops being an interview and starts being a conversation.</p>
      <div class="ts-study"><b>What strangers are good for</b>A stranger has no history with you, no friends in common and no stake in your decisions, which is exactly why people sometimes say things to strangers they would not say at home. If you want to know why, the Journal has a long read on <a href="/blog/why-talking-to-strangers-feels-easier">why it is sometimes easier to tell a stranger the truth</a>.</div>
    </div>
  </section>

  <section class="ts-min" id="m3">
    <div class="ts-clock">2:30<small>THE TURN</small></div>
    <div>
      <h2>Somebody has to go one level deeper</h2>
      <p>Somewhere past two minutes there is a choice. You can keep trading safe facts - job, city, weather - or one of you can ask something with a little more weight. What do you actually like about it? What would you do instead, if you could? What is the best thing that happened this week? Most people wait for the other person to go first, and so most conversations stay on the surface longer than either person wants.</p>
      <p>Go first. You do not need to confess anything; you just need to show that you are interested in the person rather than the profile. If the other person does not want to follow, they will steer back, and nothing is lost. If they do, this is usually the moment a random call becomes a good one. The Journal's <a href="/blog/what-to-talk-about-with-a-stranger">thirty questions that get past small talk</a> are sorted from easy to deep if you want a ladder to climb.</p>
    </div>
  </section>

  <section class="ts-min" id="m4">
    <div class="ts-clock">4:00<small>THE PAUSE</small></div>
    <div>
      <h2>A silence is not a verdict</h2>
      <p>Human conversation runs on astonishingly tight timing. When Tanya Stivers and colleagues compared turn-taking across ten languages, from Danish to Japanese to the Mayan language Tzeltal, they found the same pattern everywhere: the typical gap between one person finishing and the next starting is around a fifth of a second (<em>PNAS</em>, 2009). We notice gaps much longer than that. And in 2022, Emma Templeton, Luke Chang and Thalia Wheatley showed that faster replies really do feel like connection - people who answered each other quickly felt closer, and outsiders listening in judged them as closer too (<em>PNAS</em>, 2022).</p>
      <p>That is why a four-second silence on a voice call feels like an hour. It is not a sign that the conversation has failed; it is just a gap, and the remedy is cheap. Pick up any thread from earlier ("going back to what you said about...") or say what is true ("I've completely lost my train of thought"). Laughing at a lull together is one of the faster routes to liking someone.</p>
      <div class="ts-try"><b>Try this</b>Keep one thread in your pocket from the first minute - something they mentioned and you did not follow up. It is your lifeline for the first silence.</div>
    </div>
  </section>

  <section class="ts-min" id="m5">
    <div class="ts-clock">5:00<small>THE EXIT</small></div>
    <div>
      <h2>Leave well, or stay</h2>
      <p>Five minutes in, you know. Either you are enjoying it and the clock has disappeared, or it is not going anywhere and you would both rather try someone else. Both are fine. On TalkLive, Next ends the conversation for both of you and starts a new search, and nobody is owed an explanation - but "it was nice talking to you, I'm going to head off" costs four seconds and leaves both of you feeling better than a sudden disconnect.</p>
      <p>And if it was good, say so. Both of you can add the other as a friend and talk again another day - no phone numbers, no social media handles swapped. Plenty of good friendships have started as somebody's five-minute experiment.</p>
      <p>Whatever happens, keep the stranger part intact until you are sure: no surname, address, workplace or social accounts in a first conversation, and never money or codes for anyone, however good the story. Every call and chat has Report and Block. Our <a href="/safety">Safety Center</a> has the details.</p>
      <div class="ts-rules">
        <div><b>Voice or text</b>Tap to Talk for a call, Tap to Chat to type. No camera, ever.</div>
        <div><b>Free, no sign-up</b>Matching is free and needs no account. Adults 18+ only.</div>
        <div><b>Next and Block</b>Leave any time; blocked people are never matched with you again.</div>
      </div>
    </div>
  </section>
</div>

${c.faq('Before you press the button')}
${c.ad()}
<section class="ts-end">
  <h2>Start the clock</h2>
  <p>The worst part was the thirty seconds before you pressed the button. That part is over.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
