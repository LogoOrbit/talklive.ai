'use strict';
// A passport. Navy cover band, Syne headlines over Manrope, and each country
// as an ink stamp: a greeting, a safe opener and the question to save for later.
const STAMPS = [
  { c: 'United States', col: '#1d3d8f', hi: '"Hey, how are you?"', ok: 'Work, weekend plans, sport, food, where you are from.', no: 'Salary and, with strangers, politics or religion.', note: '"How are you?" is a greeting, not a question. "Good, you?" is the full answer.' },
  { c: 'United Kingdom', col: '#b3261e', hi: '"You alright?"', ok: 'The weather, honestly. Also travel, telly, football and mild complaints.', no: 'How much things cost, and anything that sounds like boasting.', note: 'Understatement is a sport. "Not bad" can mean genuinely good.' },
  { c: 'Japan', col: '#c2185b', hi: '"Konnichiwa." Online: a simple "hajimemashite" (nice to meet you).', ok: 'Food, seasons, travel, hobbies, anime and games if they bring them up.', no: 'Blunt disagreement and very personal questions early on.', note: 'Listeners give constant small responses, "hai", "sō desu ne", called aizuchi. Silence from you can read as not listening.' },
  { c: 'China', col: '#c62828', hi: '"Nǐ hǎo." Traditionally also "Chī le ma?" (Have you eaten?)', ok: 'Food above all, family, studies, cities you have visited.', no: 'Politics, and anything that could make someone lose face in front of others.', note: '"Have you eaten?" is care, not a dinner invitation. Answering "yes, have you?" is perfect.' },
  { c: 'India', col: '#e65100', hi: '"Namaste", or "Hi, how are you?"', ok: 'Cricket, films, food, family, exams and work.', no: 'Criticising religion or a region, even as a joke.', note: 'Questions about family, marriage or your job can come early. It usually means interest, not intrusion.' },
  { c: 'Nigeria', col: '#00796b', hi: '"How far?" (Pidgin) or "Good evening, how is your day?"', ok: 'Football, music, food, family, hustle and business.', no: 'Skipping the greeting. Launching straight into business can feel rude.', note: 'Greetings are generous and specific. In Yoruba there is a greeting for almost every situation, including one for someone at work.' },
  { c: 'Egypt', col: '#8d6e00', hi: '"Ezzayak?" (to a man) / "Ezzayik?" (to a woman)', ok: 'Football, films and songs, food, family, Cairo traffic.', no: 'Mocking religion, and pushing for direct yes-or-no answers.', note: '"Inshallah" (God willing) is everywhere and can mean yes, maybe or not really. Tone tells you which.' },
  { c: 'Brazil', col: '#2e7d32', hi: '"Oi, tudo bem?" Answer: "Tudo bom!"', ok: 'Football, music, food, beaches, the city they are from.', no: 'Mixing up Brazil with Spanish-speaking countries. It is Portuguese.', note: 'Warmth comes fast and conversations run long. A quick exit can feel cold.' },
  { c: 'Germany', col: '#37474f', hi: '"Hallo", "Guten Abend"', ok: 'Travel, work, hobbies, books, practical topics.', no: 'Asking "Wie geht\'s?" unless you want a real answer.', note: 'Small talk is less valued than real conversation. Directness is honesty, not rudeness.' },
  { c: 'Finland', col: '#1565c0', hi: '"Moi!" or "Hei!"', ok: 'Nature, saunas, hobbies, music, the seasons.', no: 'Filling every pause. Overenthusiasm can seem insincere.', note: 'Comfortable silence is part of the conversation. Let it sit.' },
  { c: 'Philippines', col: '#6a1b9a', hi: '"Kumusta?" Older people: add "po"', ok: 'Food, family, singing, basketball, where in the islands they are from.', no: 'Direct confrontation, which makes people lose face.', note: '"Kain tayo!" (Let\'s eat!) is often a friendly greeting. Taglish, mixing Tagalog and English, is normal.' },
  { c: 'South Korea', col: '#ad1457', hi: '"Annyeonghaseyo"', ok: 'Food, K-dramas and music if they like them, travel, study.', no: 'Being offended when asked your age.', note: 'Age is often asked early because Korean grammar changes with who is older. It is a practical question.' },
];

module.exports = {
  slug: 'small-talk-around-the-world',
  tag: 'Culture',
  h1: 'Small Talk Around the World: What to Say, and What Not to Ask',
  title: 'Small Talk Around the World: What to Say in 12 Countries | TalkLive Journal',
  description: 'Why "Have you eaten?" means hello in China, why Finns are fine with silence, and why Koreans ask your age. A passport of greetings, safe openers and questions to save for later in 12 countries.',
  date: '2026-10-06',
  theme: '#14213d',
  preload: ['syne-latin-800-normal', 'manrope-latin-400-normal'],
  faq: [
    { q: 'What are safe small talk topics in any country?', a: 'Food, travel, music, films, sport and where someone is from work almost everywhere. Asking what a person recommends, a dish, a song or a place, is a near-universal opener because it lets them be the expert.' },
    { q: 'What topics should I avoid with strangers from other cultures?', a: 'Politics, religion and money are the safest to leave until you know someone, though the exact line varies. Personal questions about age, marriage or salary are normal in some cultures and intrusive in others, so take the lead from the other person.' },
    { q: 'Why do people in some countries ask about age or marriage so quickly?', a: 'In places like South Korea, age decides how people speak to each other, so it is a practical question. In India and many other countries, questions about family are a way of showing interest. They are rarely meant as judgement.' },
    { q: 'How do I start a conversation with someone from another country online?', a: 'Greet them in their language if you can, even badly; it almost always gets a smile. Then ask about something they know and you do not: their city, their food, their favourite local word.' },
  ],
  css: `
:root{--paper:#f4f1ea;--ink:#14213d;--rule:#d8d1c1;--navy:#14213d;--gold:#c9a227}
body{font-family:"Manrope",system-ui,sans-serif}
.pp-cover{background:var(--navy);color:#f4f1ea;padding:56px 20px 46px;text-align:center}
.pp-crest{width:74px;height:74px;margin:0 auto 18px;border:2px solid var(--gold);border-radius:50%;display:grid;place-items:center;color:var(--gold);font:800 26px/1 "Syne",sans-serif}
.pp-k{font:700 12px/1 "Manrope",sans-serif;letter-spacing:.32em;text-transform:uppercase;color:var(--gold)}
.pp-cover h1{font:800 clamp(34px,5.8vw,64px)/1.02 "Syne",sans-serif;margin:16px auto 16px;max-width:17ch;letter-spacing:-.01em}
.pp-cover p{font-size:19px;line-height:1.55;max-width:620px;margin:0 auto;color:#cfd6e4}
.pp-body{max-width:700px;margin:0 auto;padding:36px 20px 0;font-size:18px;line-height:1.75}
.pp-body p{margin:0 0 1.1em}
.pp-body h2{font:800 28px/1.15 "Syne",sans-serif;margin:1.7em 0 .5em}
.pp-grid{max-width:1100px;margin:30px auto;padding:0 20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:18px}
.pp-stamp{--c:#14213d;background:#fffdf8;border:3px double var(--c);border-radius:14px;padding:18px 18px 16px;position:relative;font-size:15px;line-height:1.5}
.pp-stamp:nth-child(3n+1){transform:rotate(-.6deg)}.pp-stamp:nth-child(3n+2){transform:rotate(.5deg)}
.pp-stamp h3{font:800 20px/1.1 "Syne",sans-serif;color:var(--c);margin:0 0 4px;text-transform:uppercase;letter-spacing:.02em}
.pp-hi{font-weight:700;margin:0 0 10px}
.pp-stamp dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:4px 10px}
.pp-stamp dt{font:700 11px/1.9 "Manrope",sans-serif;letter-spacing:.14em;text-transform:uppercase;color:var(--c)}
.pp-stamp dd{margin:0}
.pp-note{margin:12px 0 0;padding-top:10px;border-top:1px dashed var(--c);font-style:italic}
.pp-src{font-size:13px;line-height:1.6;color:#6c6a62;border-top:1px solid var(--rule);padding-top:14px;margin-top:2em}
`,
  body: (ctx) => `<main id="story">
<header class="pp-cover">
  <div class="pp-crest" aria-hidden="true">12</div>
  <div class="pp-k">A conversation passport</div>
  <h1>Small talk around the world</h1>
  <p>The first sixty seconds with a stranger follow different rules in every country. Here are the greetings, the safe openers and the questions to save for later in twelve of them.</p>
</header>

<div class="pp-body">
<p>In 1923 the anthropologist Bronisław Malinowski gave a name to the kind of talk that carries no information at all: "phatic communion". Comments about the weather, "how are you" with no expectation of an answer, a remark about the queue. He argued that this talk is not empty. Its job is to create a bond, to show that you are friendly and paying attention, before anything that matters is said.</p>
<p>Every culture has phatic talk. What changes is the script. In one country the polite opener is the weather, in another it is food, in another it is a question about your age that would be startling anywhere else. Get the script wrong and a perfectly friendly person can seem cold, nosy or odd. Get it roughly right, even clumsily, and doors open fast.</p>
<p>Treat what follows as a starting point, not a rulebook. Countries are huge, generations differ, and the person in front of you is always more important than the generalisation. But when you are talking to someone from the other side of the world, a few of these will make the first minute easier.</p>
</div>

<section class="pp-grid" aria-label="Twelve countries">
${STAMPS.map(s => `<article class="pp-stamp" style="--c:${s.col}">
<h3>${ctx.esc(s.c)}</h3>
<p class="pp-hi">${ctx.esc(s.hi)}</p>
<dl><dt>Try</dt><dd>${ctx.esc(s.ok)}</dd><dt>Save</dt><dd>${ctx.esc(s.no)}</dd></dl>
<p class="pp-note">${ctx.esc(s.note)}</p>
</article>`).join('\n')}
</section>

<div class="pp-body">
<h2>The three openers that work almost everywhere</h2>
<p><strong>Ask for a recommendation.</strong> "What should I eat if I ever visit?" or "What song should I listen to from there?" lets the other person be the expert, which most people enjoy, and it sidesteps every sensitive topic at once.</p>
<p><strong>Try their language, badly.</strong> A greeting in someone's own language, even mispronounced, nearly always gets a smile. Ask them to correct you and you have a conversation.</p>
<p><strong>Ask about their time of day.</strong> When you talk to someone on the other side of the world, you are often in different parts of the day: your morning, their midnight. "What time is it there? What are you doing up?" is a natural opener with a story behind it.</p>

<h2>The universal "save for later" list</h2>
<p>Politics, religion and money are the classic three, and they are a sensible default with someone you have just met. The interesting part is everything in between. Age, marriage and salary are rude in some places and routine in others. The safest rule is to let the other person set the depth: answer what you are comfortable answering, ask back at the same level, and change the subject gracefully when you would rather not.</p>
<p>And when you get it wrong, which everyone does, the fix is the same in every country. Smile, say "sorry, I didn't know", and ask how it works where they are. Curiosity forgives a lot. Which of these twelve would you most like to try on a real person tonight?</p>

<p class="pp-src">Sources: Malinowski, B. (1923), "The problem of meaning in primitive languages", in Ogden &amp; Richards, <em>The Meaning of Meaning</em>; on Japanese aizuchi, Maynard, S. K. (1986), "On back-channel behavior in Japanese and English casual conversation", <em>Linguistics</em>; on Korean speech levels, Sohn, H.-M. (1999), <em>The Korean Language</em>. Country notes are general observations and vary by region, generation and person.</p>
</div>
${ctx.faq('Questions about talking across cultures')}
${ctx.cta({ wide: true, title: 'Try one of these on a real person tonight', sub: 'Someone in another country, another time zone, another script. One tap, matched in seconds.' })}
${ctx.ad()}
${ctx.more}
</main>`,
};
