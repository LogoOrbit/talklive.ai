'use strict';
// /talk-to-someone: "Someone to Talk To". Quiet and warm: a dawn wash from
// peach to lavender, a single letter-like column, handwritten margin notes.
// Crisis lines come first. Deliberately carries no ads at all (noAds).
// Fraunces for display, Literata to read, Caveat for the notes.
module.exports = {
  slug: 'talk-to-someone',
  name: 'Talk to Someone',
  date: '2026-10-05',
  noAds: true,
  about: { '@type': 'Thing', name: 'Finding someone to talk to' },
  title: 'Talk to Someone Now - Free, Anonymous Voice or Text Chat | TalkLive',
  description: 'Need someone to talk to right now? Have a free, anonymous conversation by voice or text with another adult, with no sign-up - and where to find trained support if it is urgent.',
  keywords: 'talk to someone, someone to talk to, need to talk to someone, talk to someone now, someone to listen, talk to someone online free',
  h1: 'Talk to Someone',
  theme: '#f7e3d6',
  preload: ['fraunces-latin-400-normal', 'literata-latin-400-normal'],
  css: `
:root{--paper:#fbf4ee;--ink:#2d2433;--rule:#e6d7cf;--plum:#6b4c7a;--peach:#f2b8a0;--mast:#2d2433}
body{font-family:"Literata",Georgia,serif;background:linear-gradient(180deg,#f7e3d6 0,#efe0ef 520px,var(--paper) 1100px)}
.so-wrap{max-width:720px;margin:0 auto;padding:60px 20px 0}
.so-wrap h1{font:400 clamp(52px,9vw,96px)/.95 "Fraunces",serif;letter-spacing:-.02em;margin:0 0 18px}
.so-wrap h1 i{color:var(--plum)}
.so-dek{font-size:21px;line-height:1.65;margin:0 0 28px}
.so-urgent{background:#fff;border-radius:18px;padding:22px 24px;margin:0 0 30px;box-shadow:0 6px 24px rgba(107,76,122,.12);font-size:17px;line-height:1.65}
.so-urgent h2{font:400 24px/1.2 "Fraunces",serif;margin:0 0 10px;color:var(--plum)}
.so-urgent ul{margin:8px 0 0;padding-left:20px}
.so-urgent li{margin:4px 0}
.so-urgent a{color:var(--plum)}
.c-ctas a{font:400 18px/1 "Fraunces",serif;padding:16px 24px;border-radius:999px}
.c-talk{background:var(--plum);color:#fff}
.c-chat{background:#fff;color:var(--plum);border:1px solid #d9c6e2}
.so-body{font-size:19px;line-height:1.8}
.so-body h2{font:400 34px/1.15 "Fraunces",serif;margin:2em 0 .5em}
.so-body p{margin:0 0 1.15em}
.so-body a{color:var(--plum)}
.so-note{font:500 25px/1.25 "Caveat",cursive;color:var(--plum);margin:-6px 0 22px;padding-left:18px;border-left:2px solid var(--peach)}
.so-split{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:22px 0}
.so-split div{background:#fff;border-radius:16px;padding:16px 18px;font-size:16.5px;line-height:1.55}
.so-split b{font:400 20px/1.2 "Fraunces",serif;display:block;margin-bottom:6px;color:var(--plum)}
.so-say{margin:20px 0;display:grid;gap:10px}
.so-say p{background:#f3e8f5;border-radius:16px 16px 16px 4px;padding:12px 16px;margin:0;font-size:17px;max-width:90%}
.c-faq{max-width:720px;margin:30px auto 0;padding:0 20px}
.c-faq h2{font:400 34px/1.15 "Fraunces",serif;margin:0 0 10px}
.c-faq summary{font:400 18px/1.45 "Fraunces",serif}
.c-faq p{font-size:16.5px;line-height:1.7}
.so-end{max-width:720px;margin:56px auto 0;padding:40px 20px;text-align:center;border-top:1px solid var(--rule)}
.so-end h2{font:400 clamp(32px,5vw,50px)/1.1 "Fraunces",serif;margin:0 0 12px}
.so-end p{font-size:18px;margin:0 0 22px}
.so-end .c-ctas{justify-content:center}
@media (max-width:640px){.so-split{grid-template-columns:1fr}}
`,
  faq: [
    { q: 'Is there someone I can talk to right now for free?', a: 'Yes. TalkLive matches you with another adult for a free voice call or text chat, usually within seconds at busy times. No account is needed.' },
    { q: 'Are the people on TalkLive counsellors or therapists?', a: 'No. They are ordinary adults using the same app as you. For mental-health support or a crisis, use a trained helpline such as 988 in the US, Samaritans on 116 123 in the UK and Ireland, Tele-MANAS on 14416 in India, or findahelpline.com elsewhere.' },
    { q: 'Can I talk to someone anonymously?', a: 'Yes. You do not need to give a name, email or phone number, and there is no video. The other person only knows what you choose to tell them.' },
    { q: 'What if I do not want to talk out loud?', a: 'Use Tap to Chat. It starts a text conversation and never asks for microphone permission.' },
    { q: 'What time is it easiest to find someone?', a: 'TalkLive is busiest between roughly 15:00 and 21:00 UTC, but people are online around the clock. If a search takes a while, wait a minute or try text chat.' },
  ],
  body: (c) => `<main id="story">
<div class="so-wrap">
  <h1>Need someone to <i>talk to?</i></h1>
  <p class="so-dek">Sometimes you do not need advice. You need a voice on the other end, or someone to read what you type and answer like a person. TalkLive connects you with another adult for a free, anonymous voice call or text chat, with nothing to sign up for.</p>
  <aside class="so-urgent" aria-labelledby="urgent-h">
    <h2 id="urgent-h">If you are in danger, or thinking about ending your life, please start here</h2>
    The people on TalkLive are kind strangers, not trained counsellors. These services are free, confidential and answered by people who are trained for exactly this:
    <ul>
      <li>United States: call or text <strong>988</strong> (Suicide and Crisis Lifeline)</li>
      <li>United Kingdom and Ireland: Samaritans, <strong>116 123</strong>, any time</li>
      <li>India: Tele-MANAS, <strong>14416</strong></li>
      <li>Anywhere else: <a href="https://findahelpline.com" rel="noopener" target="_blank">findahelpline.com</a> lists helplines by country</li>
      <li>In an emergency, call your local emergency number</li>
    </ul>
  </aside>
  ${c.ctas('Talk to someone now', 'Message someone now')}

  <div class="so-body">
    <h2>Why saying it helps</h2>
    <p>Saying something out loud changes it. A worry that loops in your head for hours often shrinks once it has been put into sentences, and there is research that suggests why. In a 2007 study published in <em>Psychological Science</em>, Matthew Lieberman and colleagues at UCLA scanned people's brains while they looked at pictures of angry or frightened faces. When they simply put a word to the feeling - "angry", "scared" - activity in the amygdala, part of the brain's alarm system, went down. The researchers called it affect labelling. Naming a feeling, it turns out, takes a little of its heat away.</p>
    <p class="so-note">You don't need the right words. Any words will do.</p>
    <p>Writing works too. Since the 1980s the psychologist James Pennebaker has studied what happens when people write about difficult experiences for a few minutes a day; in his early studies, students who did so made fewer visits to the health centre in the months that followed. Talking and writing are different, but both turn something shapeless into something you can look at.</p>

    <h2>Why a stranger, of all people</h2>
    <p>In 1953 a London vicar named Chad Varah started a telephone line for people who were thinking about suicide. He had never forgotten conducting the funeral of a young girl, years earlier, who had died believing she had no one to turn to. His line - the number was Mansion House 9000 - became Samaritans. Varah soon noticed that many of the people who called did not need him to fix anything. They needed someone to listen. The volunteers who began helping him answer the phone were not experts; they were ordinary people who would stay on the line.</p>
    <p>That is the quiet power of a stranger. They do not know your family. They will not bring it up next week. They have no stake in what you decide. It is often easier to tell the truth to someone who will never see you again than to someone who will see you at breakfast.</p>
    <p class="so-note">They don't know your history. That can be a relief.</p>

    <h2>What TalkLive can be - and what it can't</h2>
    <div class="so-split">
      <div><b>What it can be</b>Another real adult, usually within seconds at busy times. Someone outside your life. Voice if you want to be heard, text if speaking is hard. Someone you can keep, if they were kind - both of you can add each other as friends.</div>
      <div><b>What it can't be</b>A counsellor, a doctor or a crisis service. Not every match will be a good listener, and that is not your fault. For anything urgent, the lines at the top of this page are the right place.</div>
    </div>
    <p>Being lonely is not the same as being alone, either - you can be surrounded by people and still feel that nobody is really listening. The Journal looks at <a href="/blog/loneliness-what-actually-helps">what actually helps with loneliness</a>, and it is often smaller and more ordinary than people expect.</p>

    <h2>How to ask for the conversation you need</h2>
    <p>The person you are matched with cannot read your mind, and most people default to small talk. A single sentence tells them how to help:</p>
    <div class="so-say">
      <p>"I've had a rough day and I just want to talk to someone. I don't need advice."</p>
      <p>"Can you distract me? Tell me something good about where you live."</p>
      <p>"I can't sleep. What are you up to?"</p>
    </div>
    <p>Most people are glad to be given a clear role. And if you would rather listen than talk, that works too - plenty of people want someone to hear them out, and being that person for ten minutes can be its own relief. <a href="/blog/how-to-be-a-good-listener">Listening is a skill</a> worth practising.</p>

    <h2>Looking after yourself when you're low</h2>
    <p>When you are upset, it is easier to overshare and easier to be taken advantage of. Keep your name, address, workplace, social media and photos to yourself. Be wary of anyone who becomes intensely close very fast, wants to move to another app straight away, or brings up money. Kind people do not need any of that to keep talking to you.</p>
    <p>If someone is cruel, end it. Tap Report or Block - it takes a second, they are not told why, and you will not be matched with them again. Then, if you still want to talk, try someone else. If you would rather type than speak, <a href="/random-text-chat">text chat</a> needs no microphone at all.</p>
  </div>
</div>

${c.faq('Questions people ask')}
<section class="so-end">
  <h2>You don't have to sit with it alone</h2>
  <p>Someone, somewhere, is pressing the same button tonight.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
