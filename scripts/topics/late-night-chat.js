'use strict';
// /late-night-chat: "Somewhere, It Is Still Evening". Night sky from indigo to
// near-black with a field of stars, a moon, and a world clock showing what
// time it is elsewhere when it is 2 a.m. where you are. Instrument Serif for
// display, Inter to read.
const CLOCK = [
  ['Los Angeles', -7], ['New York', -4], ['London', 1], ['Lagos', 1], ['Cairo', 3],
  ['Karachi', 5], ['Delhi', 5.5], ['Dhaka', 6], ['Jakarta', 7], ['Manila', 8],
];
function at(baseOff) {
  const fmt = (raw) => {
    const h = ((raw % 24) + 24) % 24;
    const m = Math.round((h % 1) * 60); const hh = Math.floor(h);
    return `${hh % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${hh < 12 ? 'am' : 'pm'}`;
  };
  return CLOCK.map(([city, off]) => `<td>${fmt(2 - baseOff + off)}</td>`).join('');
}

module.exports = {
  slug: 'late-night-chat',
  name: 'Late Night Chat',
  date: '2026-10-05',
  about: { '@type': 'Thing', name: 'Late night chat' },
  title: 'Late Night Chat - Talk to Someone at Any Hour, Free | TalkLive',
  description: 'Can\'t sleep? Late night voice and text chat with people around the world, free and without an account. Where it is still evening when it is 2 a.m. for you, and how to look after yourself at night.',
  keywords: 'late night chat, chat at night, can\'t sleep chat, talk to someone at night, 3am chat, night chat online',
  h1: 'Late Night Chat',
  theme: '#0b0e24',
  preload: ['instrument-serif-latin-400-normal', 'inter-latin-400-normal'],
  css: `
:root{--paper:#07091a;--ink:#e9e7f5;--rule:#23264a;--moon:#f6e7b4;--violet:#9a8cf0;--mast:#e9e7f5}
body{font-family:"Inter",system-ui,sans-serif;background:var(--paper) linear-gradient(180deg,#1a1f4a 0,#0b0e24 700px,var(--paper) 1600px) no-repeat;color:var(--ink)}
.ln-sky{position:relative;overflow:hidden;padding:70px 20px 60px}
.ln-sky::before{content:"";position:absolute;inset:0;background-image:radial-gradient(1.5px 1.5px at 20px 30px,#fff,transparent),radial-gradient(1px 1px at 120px 80px,#fff,transparent),radial-gradient(1.5px 1.5px at 200px 160px,#cfd3ff,transparent),radial-gradient(1px 1px at 300px 40px,#fff,transparent),radial-gradient(1px 1px at 380px 120px,#fff,transparent);background-size:420px 220px;opacity:.7}
.ln-moon{position:absolute;right:12%;top:50px;width:120px;height:120px;border-radius:50%;background:var(--moon);box-shadow:0 0 60px rgba(246,231,180,.45),inset -18px -10px 0 rgba(0,0,0,.06)}
.ln-in{max-width:900px;margin:0 auto;position:relative}
.ln-in h1{font:400 clamp(60px,11vw,140px)/.9 "Instrument Serif",serif;margin:0 0 20px;letter-spacing:-.01em}
.ln-in h1 i{color:var(--moon)}
.ln-dek{font-size:20px;line-height:1.65;color:#c9c6e4;max-width:640px;margin:0 0 28px}
.c-ctas a{font:600 16px/1 "Inter",sans-serif;padding:16px 24px;border-radius:999px}
.c-talk{background:var(--moon);color:#1a1636}
.c-chat{color:var(--ink);border:1px solid #4a4d84}
.ln-main{max-width:900px;margin:0 auto;padding:0 20px}
.ln-sec{padding:44px 0;border-top:1px solid var(--rule)}
.ln-sec h2{font:400 clamp(34px,4.6vw,52px)/1.02 "Instrument Serif",serif;margin:0 0 16px}
.ln-sec h2 i{color:var(--violet)}
.ln-sec p{font-size:18.5px;line-height:1.75;margin:0 0 1.05em;color:#d3d1ea}
.ln-sec a{color:var(--moon)}
.ln-clock{overflow-x:auto;margin:20px 0}
.ln-clock table{border-collapse:collapse;width:100%;min-width:720px;font-size:14.5px}
.ln-clock th,.ln-clock td{padding:10px 8px;text-align:center;border-bottom:1px solid var(--rule)}
.ln-clock thead th{font-weight:600;color:#a9a6cc;font-size:12.5px;letter-spacing:.04em}
.ln-clock tbody th{text-align:left;color:var(--moon);font-weight:600;white-space:nowrap}
.ln-note{font-size:13.5px;color:#9a97bd}
.ln-cards{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin:20px 0}
.ln-cards div{background:rgba(154,140,240,.08);border:1px solid var(--rule);border-radius:16px;padding:18px;font-size:16.5px;line-height:1.55;color:#d3d1ea}
.ln-cards b{font:400 24px/1.1 "Instrument Serif",serif;color:var(--ink);display:block;margin-bottom:6px}
.ln-help{background:#141838;border:1px solid #393d7a;border-radius:16px;padding:18px 20px;font-size:16.5px;line-height:1.6}
.c-faq{max-width:900px;margin:0 auto;padding:40px 20px 0}
.c-faq h2{font:400 44px/1 "Instrument Serif",serif;margin:0 0 12px}
.c-faq details{border-top-color:var(--rule)}
.c-faq summary{font:600 17px/1.4 "Inter",sans-serif}
.c-faq p{font-size:16.5px;line-height:1.65;color:#c9c6e4}
.ln-end{text-align:center;padding:50px 20px 10px}
.ln-end h2{font:400 clamp(44px,7vw,84px)/1 "Instrument Serif",serif;margin:0 0 12px}
.ln-end p{color:#a9a6cc;font-size:18px;margin:0 0 24px}
.ln-end .c-ctas{justify-content:center}
.ad-card{border-top-color:var(--rule)}
.c-guides a{color:var(--moon)}
@media (max-width:760px){.ln-moon{width:70px;height:70px;right:20px;top:30px}.ln-cards{grid-template-columns:1fr}}
`,
  faq: [
    { q: 'Is there anyone to talk to late at night?', a: 'Yes. TalkLive runs around the clock, and because it is always evening somewhere, people are online at every hour. Waits are shortest between about 15:00 and 21:00 UTC.' },
    { q: 'Is late night chat free?', a: 'Yes. Voice and text chat are free and need no account.' },
    { q: 'Can I chat quietly without waking anyone?', a: 'Yes. Tap to Chat starts a text conversation with no sound and no microphone.' },
    { q: 'Is TalkLive a helpline?', a: 'No. The people you meet are ordinary adults. If you are struggling or in danger, contact a crisis line such as 988 in the US or Samaritans on 116 123 in the UK and Ireland, or find one at findahelpline.com.' },
    { q: 'Is TalkLive for under-18s?', a: 'No. TalkLive is for adults aged 18 and over only.' },
  ],
  body: (c) => `<main id="story">
<section class="ln-sky">
  <div class="ln-moon" aria-hidden="true"></div>
  <div class="ln-in">
    <h1>Late night <i>chat</i></h1>
    <p class="ln-dek">It is two in the morning, the house is quiet, and you are wide awake. Somewhere in the world it is a perfectly reasonable hour for a conversation. TalkLive connects you with another adult for a free voice call or a silent text chat - no account, no camera, no waking anyone up.</p>
    ${c.ctas('Talk to someone now', 'Text someone now')}
  </div>
</section>

<div class="ln-main">
  <section class="ln-sec">
    <h2>Somewhere, it is <i>still evening</i></h2>
    <p>The world never sleeps all at once. When it is the middle of the night where you are, it is after work in one place and the middle of the afternoon in another - and the people there are just as happy to talk. Here is what time it is around the world when it is 2 a.m. in a few of the cities TalkLive hears from most.</p>
    <div class="ln-clock">
      <table>
        <thead><tr><th scope="col">When it is 2 am in</th>${CLOCK.map(([city]) => `<th scope="col">${city}</th>`).join('')}</tr></thead>
        <tbody>
          <tr><th scope="row">New York</th>${at(-4)}</tr>
          <tr><th scope="row">London</th>${at(1)}</tr>
          <tr><th scope="row">Delhi</th>${at(5.5)}</tr>
          <tr><th scope="row">Jakarta</th>${at(7)}</tr>
        </tbody>
      </table>
    </div>
    <p class="ln-note">Northern-hemisphere summer time. In winter, New York and London move an hour back; Cairo moves an hour back at the end of October.</p>
    <p>TalkLive's own hourly match counts, averaged over late September and early October 2026, put its busiest stretch between 15:00 and 21:00 UTC - late night in South Asia, evening in Europe and Africa, afternoon in the Americas. The quietest hours are 00:00 to 05:00 UTC, which happens to be the American evening. So a sleepless night in Delhi or Dhaka is peak time; a sleepless night in Chicago is quieter, and widening your country filters or trying text chat helps.</p>
  </section>

  <section class="ln-sec">
    <h2>The hour of the wolf</h2>
    <p>Ingmar Bergman called his 1968 film <em>Hour of the Wolf</em> after the dark stretch between night and dawn - the hour, one of his characters says, when the most people die and the most are born, when sleepless people are haunted by their deepest fears. Most of us know the feeling without the folklore. A worry that would be manageable at noon becomes enormous at 3 a.m.</p>
    <p>There is some science behind that. In 2022 a group of sleep and psychiatry researchers - Andrew Tubbs, Elizabeth Klerman, Michael Grandner, Michael Perlis and colleagues - proposed what they called the "Mind After Midnight" hypothesis (<em>Frontiers in Network Physiology</em>). Being awake in the middle of the biological night, they argued, tilts the brain towards negative thinking and away from good judgement: we notice threats more, feel low more easily, and make decisions we would not make in daylight. It is a hypothesis, not a settled fact - but it matches a lot of experience.</p>
    <p>Two practical consequences. First, a little human contact can help a 3 a.m. thought shrink back to size: saying it out loud to a stranger, or just talking about something else entirely. Second, the middle of the night is the worst time to make big decisions - including about money, photos or personal details. Be kind to yourself, and a little more careful than usual.</p>
  </section>

  <section class="ln-sec">
    <h2>A good late-night conversation</h2>
    <div class="ln-cards">
      <div><b>Keep it quiet</b>Text chat makes no sound and needs no microphone. Turn your screen brightness down.</div>
      <div><b>Say why you're up</b>"Can't sleep - you?" is the most natural opener of the night. Most people awake at this hour are glad of company.</div>
      <div><b>Talk about something else</b>Sometimes the best help is distraction: ask them what their day was like, where it is still daytime.</div>
      <div><b>Know when to stop</b>If you start to feel sleepy, take it. Say goodnight - a friend you add can be called back tomorrow.</div>
    </div>
    <p>The usual rules apply, and matter more when you are tired: keep your name, address, workplace and social accounts to yourself; never send money, codes or photos to someone you have just met; and use Report or Block the moment anyone makes you uncomfortable. If you want the first few minutes to go smoothly, our guide to <a href="/talk-to-strangers">the first five minutes with a stranger</a> helps.</p>
    <div class="ln-help">If the night is about more than not sleeping - if you are struggling or thinking about harming yourself - please talk to someone trained. Call or text <strong>988</strong> in the US, call Samaritans on <strong>116 123</strong> in the UK and Ireland, or find a free helpline at <a href="https://findahelpline.com" rel="noopener">findahelpline.com</a>. Our page on <a href="/talk-to-someone">finding someone to talk to</a> lists more.</div>
  </section>
</div>

${c.faq('Questions at night')}
${c.ad()}
<section class="ln-end">
  <h2>The night is long. Share it.</h2>
  <p>Someone, somewhere, is awake too.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
