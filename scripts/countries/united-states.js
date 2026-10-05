'use strict';
// United States: "Caller, You're On the Air". Late-night call-in radio: a
// tuning dial in the hero, the page laid out as a program log with Courier
// timestamps, and a six-time-zone chart of when TalkLive is busy. Bebas Neue
// for display, Archivo to read, Courier Prime for the log.

// Daylight-time offsets; each is an hour earlier in standard time.
const ZONES = [
  ['Eastern', -4], ['Central', -5], ['Mountain', -6], ['Pacific', -7], ['Alaska', -8], ['Hawaii', -10],
];

function chart() {
  const rows = ZONES.map(([name, off]) => {
    const cells = Array.from({ length: 24 }, (_, local) => {
      const utc = (local - off + 24) % 24;
      const cls = utc >= 15 && utc < 21 ? 'b' : (utc < 5 ? 'q' : '');
      return `<i class="${cls}"></i>`;
    }).join('');
    const from = (15 + off + 24) % 24;
    const to = (21 + off + 24) % 24;
    const fmt = (h) => `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`;
    return `<div class="us-row"><b>${name}</b><div class="us-cells">${cells}</div><span>${fmt(from)} - ${fmt(to)}</span></div>`;
  }).join('');
  return `<figure class="us-chart" aria-label="When TalkLive is busiest, in each US time zone">
  <figcaption><b>When the lines are busiest</b>Local time, midnight to midnight. Red: TalkLive's busiest hours worldwide. Grey: its quietest.</figcaption>
  ${rows}
  <div class="us-axis"><span>12 am</span><span>6 am</span><span>noon</span><span>6 pm</span><span>12 am</span></div>
  <p class="us-src">Daylight time shown; in winter, everything is an hour earlier. From TalkLive's hourly match counts, late September to early October 2026.</p>
</figure>`;
}

module.exports = {
  slug: 'united-states',
  name: 'United States',
  date: '2026-10-05',
  title: 'Talk to Strangers in the USA - Free American Voice Chat | TalkLive',
  description: 'Free voice and text chat with people in the United States - no sign-up, no camera, no phone number. America\'s long love affair with talking to strangers, and when Americans are online in every time zone.',
  keywords: 'talk to strangers usa, american voice chat, chat with americans, talk to americans online, random chat usa, us voice chat, talk to someone in america',
  h1: 'Talk to Strangers in the USA',
  theme: '#fbfaf6',
  preload: ['bebas-neue-latin-400-normal', 'archivo-latin-400-normal'],
  css: `
:root{--paper:#fbfaf6;--ink:#151515;--rule:#dedbd2;--red:#d7261e;--blue:#1d3d8f;--mast:#151515}
body{font-family:"Archivo",system-ui,sans-serif;background:var(--paper)}
.us-hero{max-width:1180px;margin:0 auto;padding:40px 20px 30px}
.us-onair{display:inline-flex;align-items:center;gap:10px;font:400 22px/1 "Bebas Neue",sans-serif;letter-spacing:.12em;color:#fff;background:var(--red);padding:8px 16px 6px;border-radius:4px;box-shadow:0 0 22px rgba(215,38,30,.45)}
.us-onair::before{content:"";width:10px;height:10px;border-radius:50%;background:#fff}
.us-hero h1{font:400 clamp(64px,12vw,168px)/.86 "Bebas Neue",sans-serif;margin:22px 0 6px;letter-spacing:.005em}
.us-hero h1 span{color:var(--blue)}
.us-hero-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:40px;align-items:end}
.us-dek{font-size:21px;line-height:1.55;margin:0 0 24px;max-width:620px}
.us-dial{background:#1b1b1b;border-radius:14px;padding:22px 22px 18px;color:#f1e9d2;font:400 13px/1 "Courier Prime",monospace}
.us-scale{position:relative;height:64px;background:repeating-linear-gradient(90deg,#f1e9d2 0 1px,transparent 1px 12px) bottom/100% 18px no-repeat,repeating-linear-gradient(90deg,#f1e9d2 0 2px,transparent 2px 60px) bottom/100% 30px no-repeat;border-bottom:1px solid #f1e9d2}
.us-needle{position:absolute;left:62%;top:0;bottom:-6px;width:3px;background:var(--red);box-shadow:0 0 10px var(--red)}
.us-freq{display:flex;justify-content:space-between;margin-top:8px;color:#a59f8c}
.us-station{margin-top:16px;font:400 28px/1 "Bebas Neue",sans-serif;letter-spacing:.08em}
.us-station small{display:block;font:400 13px/1.4 "Courier Prime",monospace;letter-spacing:0;color:#a59f8c;margin-top:6px}
.c-ctas a{font:400 22px/1 "Bebas Neue",sans-serif;letter-spacing:.08em;padding:15px 24px 13px;border-radius:4px}
.c-talk{background:var(--red);color:#fff}
.c-chat{background:var(--blue);color:#fff}
.us-log{max-width:1180px;margin:30px auto 0;padding:0 20px}
.us-seg{display:grid;grid-template-columns:190px minmax(0,700px);gap:36px;padding:44px 0;border-top:2px solid var(--ink)}
.us-time{font:700 14px/1.5 "Courier Prime",monospace;color:var(--red);text-transform:uppercase}
.us-time small{display:block;font-weight:400;color:#6d695f;text-transform:none;margin-top:6px}
.us-seg h2{font:400 clamp(36px,5vw,58px)/.95 "Bebas Neue",sans-serif;margin:0 0 16px;letter-spacing:.01em}
.us-seg p{font-size:18.5px;line-height:1.7;margin:0 0 1.1em}
.us-seg a{color:var(--blue)}
.us-pull{font:700 22px/1.45 "Courier Prime",monospace;border-left:6px solid var(--red);padding:6px 0 6px 20px;margin:26px 0}
.us-pull cite{display:block;font:400 14px/1.4 "Archivo",sans-serif;font-style:normal;color:#6d695f;margin-top:10px}
.us-chart{margin:26px 0;font-family:"Archivo",sans-serif}
.us-chart figcaption{font-size:14px;color:#6d695f;margin-bottom:12px}
.us-chart figcaption b{display:block;font:400 26px/1 "Bebas Neue",sans-serif;color:var(--ink);letter-spacing:.04em;margin-bottom:4px}
.us-row{display:grid;grid-template-columns:84px 1fr 120px;gap:10px;align-items:center;margin:6px 0;font-size:14px}
.us-cells{display:grid;grid-template-columns:repeat(24,1fr);gap:2px}
.us-cells i{height:22px;background:#e9e6dc;border-radius:2px}
.us-cells i.b{background:var(--red)}
.us-cells i.q{background:#b8b4a8}
.us-row span{font:700 13px/1 "Courier Prime",monospace;color:var(--red)}
.us-axis{display:flex;justify-content:space-between;margin:6px 130px 0 94px;font:400 12px/1 "Courier Prime",monospace;color:#6d695f}
.us-src{font-size:12.5px;color:#6d695f;margin-top:10px}
.us-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0;padding:0;list-style:none}
.us-steps li{background:#fff;border:1px solid var(--rule);padding:16px;font-size:16px;line-height:1.5}
.us-steps b{display:block;font:400 30px/1 "Bebas Neue",sans-serif;color:var(--blue);margin-bottom:6px}
.us-help{background:var(--ink);color:#f1e9d2;padding:20px 22px;font-size:17px;line-height:1.6;border-radius:4px}
.us-help b{color:#ff7a70}
.us-help a{color:#9fb7ff}
.c-faq{max-width:1180px;margin:30px auto 0;padding:0 20px}
.c-faq h2{font:400 52px/1 "Bebas Neue",sans-serif;margin:0 0 10px;border-top:2px solid var(--ink);padding-top:30px}
.c-faq summary{font:600 18px/1.4 "Archivo",sans-serif}
.c-faq p{font-size:17px;line-height:1.65}
.us-end{background:var(--blue);color:#fff;margin-top:64px;padding:56px 20px;text-align:center}
.us-end h2{font:400 clamp(48px,8vw,104px)/.9 "Bebas Neue",sans-serif;margin:0 0 12px}
.us-end p{font-size:19px;margin:0 auto 26px;max-width:560px;line-height:1.55;color:#dfe6fb}
.us-end .c-ctas{justify-content:center}
.us-end .c-chat{background:#fff;color:var(--blue)}
@media (max-width:900px){.us-hero-grid{grid-template-columns:1fr}.us-seg{grid-template-columns:1fr;gap:10px}.us-steps{grid-template-columns:1fr 1fr}.us-row{grid-template-columns:62px 1fr;}.us-row span{grid-column:2}.us-axis{margin:6px 0 0 72px}}
`,
  faq: [
    { q: 'Can I talk to Americans for free?', a: 'Yes. Voice and text chat on TalkLive are free and need no account, and preferring the United States in the country filter is free too.' },
    { q: 'What is the best time to find someone from the US?', a: 'TalkLive as a whole is busiest from late morning to afternoon US time (about 11 am to 5 pm Eastern), when waits are shortest. Americans themselves search a lot in their own evening, but the worldwide queue is quieter then.' },
    { q: 'Can I call the US from another country?', a: 'Yes, at no cost. Calls run over the internet in your browser, so there are no international charges and no phone numbers are involved.' },
    { q: 'Is TalkLive available in Spanish?', a: 'Yes. The interface is available in Spanish at talklive.app/es/, and you can speak whichever language you and your match share.' },
    { q: 'Is TalkLive like Omegle?', a: 'It shares the idea of one-tap conversations with strangers, but it has no video at all, is for adults 18+ only, and has block and report on every screen. Omegle closed in November 2023.' },
    { q: 'Does anyone see my phone number?', a: 'No. Calls run in the browser over the internet, so no phone number is exchanged.' },
  ],
  body: (c) => `<main id="story">
<section class="us-hero">
  <span class="us-onair">On air</span>
  <h1>Talk to strangers <span>in the USA</span></h1>
  <div class="us-hero-grid">
    <div>
      <p class="us-dek">For sixteen years, Larry King hosted an overnight radio show on the Mutual network, and across America people who could not sleep picked up the phone and talked, live, to a stranger. The country has always loved that kind of conversation. TalkLive is the same idea without the switchboard: one tap, and you are on the line with someone new - free, with no number, no account and no camera.</p>
      ${c.ctas('Tap to Talk', 'Tap to Chat')}
    </div>
    <div class="us-dial" aria-hidden="true">
      <div class="us-scale"><div class="us-needle"></div></div>
      <div class="us-freq"><span>540</span><span>800</span><span>1000</span><span>1300</span><span>1600</span></div>
      <div class="us-station">TalkLive - all night, all states<small>No call screener. No hold music. No phone number.</small></div>
    </div>
  </div>
</section>

<div class="us-log">
  <section class="us-seg">
    <div class="us-time">Segment 1<small>The loneliness advisory</small></div>
    <div>
      <h2>America's doctor said it out loud</h2>
      <p>In May 2023 the US Surgeon General, Dr Vivek Murthy, did something unusual for the nation's top doctor: he issued a formal public-health advisory about loneliness. <em>Our Epidemic of Loneliness and Isolation</em> reported that about half of American adults say they experience loneliness, and that the health effect of being socially disconnected is comparable to smoking up to fifteen cigarettes a day. The prescription was not a pill. It was, in large part, more conversation - including with the people we do not know.</p>
      <p>None of this means a chat with a stranger is therapy. It is not. But the evidence that small, ordinary conversations matter is strong enough that the federal government put its name to it. TalkLive is built for exactly that small, ordinary kind: a voice on the line at the end of a long day, someone who asks where you are calling from and actually wants to know.</p>
    </div>
  </section>

  <section class="us-seg">
    <div class="us-time">Segment 2<small>What strangers know</small></div>
    <div>
      <h2>You will learn more than you expect</h2>
      <p>One reason people do not talk to strangers is that they assume they will not get much out of it. In a series of studies published in <em>PNAS</em> in 2022, the researchers Sandra Atir, Xuewei Wang and Nicholas Epley found that people consistently underestimate how much they will learn from a conversation with a stranger - and how much they will enjoy it. The surprise, in other words, is built in.</p>
      <p>Studs Terkel, the Chicago broadcaster who spent decades interviewing ordinary Americans for books like <em>Working</em> (1974), would not have been surprised at all. He made a career out of the conviction that everyone has a story worth hearing if you ask the right question and then stop talking. He signed off his radio show the same way for years:</p>
      <p class="us-pull">"Take it easy, but take it."<cite>Studs Terkel's sign-off on WFMT Chicago</cite></p>
    </div>
  </section>

  <section class="us-seg">
    <div class="us-time">Segment 3<small>Six time zones</small></div>
    <div>
      <h2>A country that is never all asleep</h2>
      <p>The United States runs across Eastern, Central, Mountain and Pacific time on the mainland, plus Alaska and Hawaii, and most of it springs forward and falls back for daylight saving - except Hawaii and most of Arizona, which do not. So there is no single "American evening". There is a wave that rolls west.</p>
      <p>Here is the useful, slightly counter-intuitive part. TalkLive's busiest hours worldwide, measured from our own match counts, fall between 15:00 and 21:00 UTC - when South Asia and Europe are out in force. For Americans, that is late morning to afternoon. The classic American "late-night call" hours, roughly 8 pm to 1 am Eastern, land in the quietest stretch of the whole site.</p>
      ${chart()}
      <p>You will still find people in the evening - Americans search a lot then - but the shortest waits are earlier in the day. If an evening search takes a while, widen your country filters or switch to text chat. And if you are outside the US hoping for an American match, the US evening is when they are most likely to be looking.</p>
    </div>
  </section>

  <section class="us-seg">
    <div class="us-time">Segment 4<small>After Omegle</small></div>
    <div>
      <h2>The format you already know - minus the camera</h2>
      <p>Plenty of Americans met strangers online for the first time on Omegle, which ran from 2009 until its founder shut it down in November 2023, saying the fight against people misusing it had become unsustainable. Most of that misuse ran through the webcam. TalkLive keeps the good part - one tap, one random person, a Next button - and drops video entirely. It is voice or text, it is for adults 18 and over only, and every screen has Report and Block. Our <a href="/omegle-alternative">Omegle alternative</a> page explains the rest.</p>
    </div>
  </section>

  <section class="us-seg">
    <div class="us-time">Segment 5<small>The world is calling</small></div>
    <div>
      <h2>Everyone wants to practise with an American</h2>
      <p>For millions of English learners, the English they grew up hearing in films, music and online is American English - contractions, slang, "gonna" and all - and a real conversation with an American is the practice they cannot get in a classroom. If you are matched with a learner, slowing down a little and asking whether they want corrections makes the call better for both of you. Our <a href="/practice-english-speaking">English speaking practice</a> guide has ideas.</p>
      <p>It works the other way too. More than forty million people in the US speak Spanish at home, and TalkLive's interface is <a href="/es/">available in Spanish</a>. Sport, music, work, travel plans and whatever the internet is arguing about this week are all good ground; politics is best left until you know your match wants to go there.</p>
    </div>
  </section>

  <section class="us-seg">
    <div class="us-time">Segment 6<small>Station rules</small></div>
    <div>
      <h2>Keep it friendly, keep it safe</h2>
      <p>The Federal Trade Commission's advice fits random chat perfectly: no real business or government agency will ever ask you to pay with gift cards, cryptocurrency or a wire transfer, and anyone who does is running a scam. Be careful with people who profess strong feelings very quickly, ask for photos, or want to move to another app in the first five minutes. Keep your full name, address, workplace and social handles to yourself.</p>
      <p>On TalkLive, tap Report or Block on anyone abusive; blocked people are not matched with you again.</p>
      <div class="us-help"><b>988</b> - call or text the Suicide and Crisis Lifeline any time if you or someone you are talking to is in crisis. <b>911</b> in an emergency. Report fraud to the FTC at <a href="https://reportfraud.ftc.gov" rel="noopener">ReportFraud.ftc.gov</a>.</div>
      <ol class="us-steps">
        <li><b>1</b>Open TalkLive in your browser. No app, no sign-up.</li>
        <li><b>2</b>Optional: prefer the United States in Filters (two preferred countries are free).</li>
        <li><b>3</b>Tap to Talk for voice, or Tap to Chat to type.</li>
        <li><b>4</b>Ask where they are calling from. Tap Next whenever you like.</li>
      </ol>
      <p>For a wider view, the Journal's <a href="/regions/americas">One Evening, Two Continents</a> looks at how North and South America share their nights. See also our guide to the <a href="/countries/united-kingdom">United Kingdom</a>.</p>
    </div>
  </section>
</div>

${c.faq('Listener questions')}
${c.ad()}
<section class="us-end">
  <h2>Caller, you're on the air</h2>
  <p>Somebody in Ohio, Oregon or Oklahoma is waiting for the line to connect.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
