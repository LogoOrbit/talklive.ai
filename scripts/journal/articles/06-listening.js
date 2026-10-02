'use strict';
// Magazine Q&A. DM Serif Display questions, DM Sans answers, two-column
// opener with a big italic headline, forest-green accents.
module.exports = {
  slug: 'how-to-be-a-good-listener',
  tag: 'Conversation',
  h1: 'Listening Is a Skill. Most of Us Were Never Taught It.',
  title: 'How to Be a Good Listener: Ten Questions, Answered | TalkLive Journal',
  description: 'Why we interrupt, the "shift response" that quietly steals conversations, and what research says about the single habit that makes people like you more. Ten questions about listening.',
  date: '2026-10-02',
  theme: '#fbfaf6',
  preload: ['dm-serif-display-latin-400-normal', 'dm-sans-latin-400-normal'],
  css: `
:root{--paper:#fbfaf6;--ink:#1c1f1b;--rule:#dcd8cc;--green:#1f5c45}
body{font-family:"DM Sans",system-ui,sans-serif}
.q-top{max-width:1120px;margin:0 auto;padding:60px 20px 40px;display:grid;grid-template-columns:1.2fr 1fr;gap:48px;align-items:end;border-bottom:1px solid var(--ink)}
.q-top h1{font:400 clamp(44px,7vw,92px)/.95 "DM Serif Display",serif;margin:0;letter-spacing:-.015em}
.q-top h1 em{color:var(--green)}
.q-intro{font-size:19px;line-height:1.55}
.q-intro .q-tag{font:500 12px/1 "DM Sans",sans-serif;letter-spacing:.2em;text-transform:uppercase;color:var(--green);display:block;margin-bottom:14px}
.q-body{max-width:720px;margin:0 auto;padding:30px 20px 0;font-size:18px;line-height:1.7}
.q-item{padding:30px 0;border-bottom:1px solid var(--rule)}
.q-item h2{font:400 clamp(25px,3.2vw,32px)/1.2 "DM Serif Display",serif;margin:0 0 14px;display:grid;grid-template-columns:44px 1fr}
.q-item h2::before{content:"Q.";font:400 italic 26px/1.2 "DM Serif Display",serif;color:var(--green)}
.q-item p{margin:0 0 .9em;padding-left:44px}
.q-item p:first-of-type::before{content:"A.";font:500 15px/1 "DM Sans",sans-serif;color:var(--green);margin-left:-44px;width:44px;display:inline-block}
.q-pull{font:400 italic clamp(26px,3.6vw,38px)/1.25 "DM Serif Display",serif;color:var(--green);margin:36px 0;padding:0 0 0 44px}
.q-try{background:var(--green);color:#f4f1e8;padding:24px 26px;margin:34px 0;border-radius:2px}
.q-try h3{font:400 24px/1.2 "DM Serif Display",serif;margin:0 0 10px}
.q-try p{margin:0;padding:0}
.q-try p::before{display:none}
@media (max-width:820px){.q-top{grid-template-columns:1fr;gap:22px}}
`,
  body: (ctx) => `<main id="story">
<header class="q-top">
  <h1>Listening is a skill. <em>Most of us were never taught it.</em></h1>
  <div class="q-intro"><span class="q-tag">Ten questions</span>Schools teach us to speak, write and argue. Almost nobody teaches us to listen, and it shows. Here are the questions people actually ask about it, answered as plainly as we can.</div>
</header>
<div class="q-body">

<div class="q-item"><h2>Isn't listening just being quiet while the other person talks?</h2>
<p>No, and that is the most common misunderstanding. You can be perfectly silent and not listening at all: rehearsing your reply, waiting for a gap, thinking about dinner. Listening is an active job. Its goal is for the other person to feel understood, and they can tell very quickly whether that is happening.</p></div>

<div class="q-item"><h2>Where does the phrase "active listening" come from?</h2>
<p>From the psychologist Carl Rogers and his colleague Richard Farson, who wrote about it in the 1950s. Rogers built a whole approach to therapy around the idea that people change when they feel genuinely heard, not when they are told what to do. The phrase later escaped into management training and lost some of its depth, but the original idea still holds up.</p></div>

<div class="q-item"><h2>What is the most common way people get it wrong?</h2>
<p>Turning the conversation back to themselves. The sociologist Charles Derber described two kinds of reply. A "support response" keeps the focus on the speaker: <em>"What happened next?"</em> A "shift response" moves it to you: <em>"Oh, that happened to me too, I was..."</em></p>
<p>Shift responses are not evil. Sharing a similar story can be a way of saying "I understand." But a string of them quietly turns a conversation into a competition for attention, and most of us do it far more than we realise.</p></div>

<p class="q-pull">"What happened next?" is one of the kindest sentences in the language.</p>

<div class="q-item"><h2>Does listening actually change how people feel about you?</h2>
<p>There is good evidence it does. A set of studies led by Karen Huang at Harvard in 2017 looked at thousands of conversations, including speed dates, and found that people who asked more questions, especially follow-up questions, were better liked by their partners. Follow-ups are the giveaway, because you cannot ask a good one unless you were paying attention to the answer.</p></div>

<div class="q-item"><h2>What happens to the speaker when someone really listens?</h2>
<p>Something interesting. Research by Guy Itzchakov and Avraham Kluger found that people who were listened to well became less defensive and more willing to see both sides of their own views. Feeling heard seems to lower the guard. That is why good listening is not just pleasant; it can make hard conversations possible.</p></div>

<div class="q-item"><h2>Why is it harder on a voice call?</h2>
<p>Because the other person cannot see you nodding. In person, a huge amount of listening is done with the face. On a call, all of that has to travel through sound: small "mm"s and "right"s, a laugh at the right moment, repeating a word back. Without them, a speaker on the phone can start to wonder whether you are still there, and will often stop sharing.</p></div>

<div class="q-item"><h2>Should I give advice when someone tells me a problem?</h2>
<p>Usually not first. Most people telling you about a problem want to be understood before they want to be fixed, and advice delivered too early sounds like "please stop talking about this." If you are not sure, ask: <em>"Do you want ideas, or do you just want to vent?"</em> People are rarely offended by that question, and the answer saves a lot of misfires.</p></div>

<div class="q-item"><h2>What about silence?</h2>
<p>Silence is underrated. When someone finishes a sentence and you wait two or three seconds instead of jumping in, they often keep going, and the second thing they say is frequently more honest than the first. The urge to fill every gap is mostly our own discomfort.</p></div>

<div class="q-item"><h2>How do I know if I'm a bad listener?</h2>
<p>A few honest signs: you often know what you will say before the other person has finished; you notice that conversations tend to end up on your topics; people repeat themselves to you; you remember what you said in a conversation better than what they said. Nearly everyone does some of these. The point is to notice.</p></div>

<div class="q-item"><h2>Can you actually get better at it?</h2>
<p>Yes, and faster than most skills, because you get dozens of practice sessions a day. One habit is enough to start with:</p>
<div class="q-try"><h3>The one-week experiment</h3><p>For seven days, in every conversation, ask at least one follow-up question before you say anything about yourself. Notice what you learn that you would have missed, and whether people seem to talk to you differently by the end of the week.</p></div>
<p>The strange thing is how often people say afterwards that they enjoyed the conversations more, even though they talked less. Which raises a fair question: how much of what we call "being interesting" is really just being interested?</p></div>

</div>
${ctx.ad()}
${ctx.more}
</main>`,
};
