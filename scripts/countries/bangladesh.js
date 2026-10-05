'use strict';
// Bangladesh: "An Adda With Someone New". A little-magazine chapbook: cream
// stock, the red sun and green field of the flag, Bengali numerals for
// chapters, margin notes beside a narrow column. Old Standard TT for display,
// Libre Caslon Text to read.
module.exports = {
  slug: 'bangladesh',
  name: 'Bangladesh',
  date: '2026-10-05',
  title: 'Talk to Strangers in Bangladesh - Free Bangla Voice Chat | TalkLive',
  description: 'Free voice and text chat with people in Bangladesh and Bangla speakers worldwide - no sign-up, no camera, with a Bangla interface. On adda, the language people died for, and when Bangladesh is online.',
  keywords: 'talk to strangers bangladesh, bangladeshi chat, bangla voice chat, bengali voice chat, chat with bangladeshi, random chat bangladesh, bangla adda online',
  h1: 'Talk to Strangers in Bangladesh',
  theme: '#f7f1e3',
  preload: ['old-standard-tt-latin-700-normal', 'libre-caslon-text-latin-400-normal'],
  css: `
:root{--paper:#f7f1e3;--ink:#22201b;--rule:#d9cfb9;--green:#006a4e;--red:#e0293c;--mast:#22201b}
body{font-family:"Libre Caslon Text",Georgia,serif;background:var(--paper)}
.c-bar{border-bottom:1px solid var(--rule)}
.bd-hero{max-width:900px;margin:0 auto;padding:60px 20px 40px;display:grid;grid-template-columns:1fr 220px;gap:30px;align-items:center}
.bd-sun{width:220px;aspect-ratio:1;border-radius:50%;background:var(--red);box-shadow:0 0 0 18px var(--green);margin:18px}
.bd-eyebrow{font:400 italic 17px/1.4 "Libre Caslon Text",serif;color:var(--green)}
.bd-hero h1{font:700 clamp(42px,6.6vw,78px)/1 "Old Standard TT",serif;margin:12px 0 16px;letter-spacing:-.01em}
.bd-dek{font-size:20px;line-height:1.6;margin:0 0 26px;color:#4a453a}
.c-ctas a{font:700 16px/1 "Libre Caslon Text",serif;padding:15px 22px}
.c-talk{background:var(--green);color:#fff}
.c-chat{color:var(--green);border:1.5px solid var(--green)}
.bd-col{max-width:1040px;margin:0 auto;padding:0 20px;display:grid;grid-template-columns:minmax(0,640px) 260px;gap:0 60px;justify-content:center}
.bd-ch{grid-column:1;font-size:19px;line-height:1.8;padding-top:30px}
.bd-ch p{margin:0 0 1.15em}
.bd-ch h2{font:700 30px/1.15 "Old Standard TT",serif;margin:1.4em 0 .6em;display:flex;align-items:baseline;gap:14px}
.bd-ch h2 span{font:700 46px/1 "Noto Sans Bengali","Hind Siliguri","Vrinda",serif;color:var(--red)}
.bd-ch .bd-first::first-letter{float:left;font:700 76px/.82 "Old Standard TT",serif;color:var(--green);padding:6px 10px 0 0}
.bd-note{grid-column:2;font-size:14.5px;line-height:1.6;color:#5d574a;border-top:2px solid var(--red);padding-top:10px;margin-top:44px;align-self:start}
.bd-note b{font-family:"Old Standard TT",serif;color:var(--ink)}
.bd-verse{margin:30px 0;padding:24px 0;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);text-align:center}
.bd-verse .bn{font:500 24px/1.6 "Noto Sans Bengali","Hind Siliguri","Vrinda",serif;margin:0}
.bd-verse .tr{font:400 italic 19px/1.6 "Libre Caslon Text",serif;margin:10px 0 0;color:#4a453a}
.bd-verse cite{display:block;font:400 13px/1.5 "Libre Caslon Text",serif;font-style:normal;letter-spacing:.08em;text-transform:uppercase;color:var(--green);margin-top:12px}
.bd-clock{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--ink);margin:22px 0}
.bd-clock div{padding:14px;border-right:1px solid var(--ink)}
.bd-clock div:last-child{border-right:0}
.bd-clock b{display:block;font:700 24px/1.1 "Old Standard TT",serif}
.bd-clock span{font-size:14px;color:#5d574a}
.bd-clock div:first-child{background:var(--green);color:#fff}.bd-clock div:first-child span{color:#d6efe5}
.bd-list{list-style:none;padding:0;margin:16px 0}
.bd-list li{padding:10px 0 10px 34px;border-bottom:1px dotted var(--rule);position:relative}
.bd-list li::before{content:"";position:absolute;left:4px;top:18px;width:12px;height:12px;border-radius:50%;background:var(--red)}
.bd-box{background:var(--green);color:#f1fbf6;padding:20px 22px;font-size:17px;line-height:1.6;margin:24px 0}
.bd-box b{color:#ffd9dd}
.bd-box a{color:#fff}
.c-faq{grid-column:1;margin-top:40px}
.c-faq h2{font:700 30px/1.15 "Old Standard TT",serif;margin:0 0 10px}
.c-faq summary{font:700 18px/1.4 "Libre Caslon Text",serif}
.c-faq p{font-size:17px;line-height:1.7;color:#4a453a}
.bd-end{max-width:900px;margin:60px auto 0;padding:46px 20px;text-align:center;border-top:4px double var(--ink);border-bottom:4px double var(--ink)}
.bd-end h2{font:700 clamp(32px,5vw,52px)/1.1 "Old Standard TT",serif;margin:0 0 12px}
.bd-end p{font-size:18px;color:#4a453a;margin:0 0 22px}
.bd-end .c-ctas{justify-content:center}
@media (max-width:860px){.bd-col{grid-template-columns:1fr}.bd-note{grid-column:1;margin-top:10px}.bd-hero{grid-template-columns:1fr}.bd-sun{width:120px;order:-1}.bd-clock{grid-template-columns:1fr}.bd-clock div{border-right:0;border-bottom:1px solid var(--ink)}}
`,
  faq: [
    { q: 'Can I voice chat in Bangla on TalkLive?', a: 'Yes. Speak whichever language you and your match share. The whole interface is also available in Bangla at talklive.app/bn/.' },
    { q: 'Is TalkLive free in Bangladesh?', a: 'Yes. Voice calls and text chats are free and need no account. Normal mobile data charges apply if you are not on Wi-Fi.' },
    { q: 'When is Bangladesh busiest on TalkLive?', a: 'About 9 pm to 3 am Bangladesh time (UTC+6). The quietest stretch is about 6 to 11 am.' },
    { q: 'Can I talk to Bengali speakers in India or the UK?', a: 'Yes. Prefer India or the United Kingdom in Filters, or match worldwide and ask - Bangla speakers live in many countries.' },
    { q: 'Will I always be matched with someone from Bangladesh?', a: 'Not always. A country preference steers matching, but it depends on who is searching at that moment.' },
    { q: 'Does anyone see my number or NID?', a: 'No. Calls run in the browser over the internet and nothing identifying is needed.' },
  ],
  body: (c) => `<main id="story">
<header class="bd-hero">
  <div>
    <p class="bd-eyebrow">A guide, and an invitation to adda</p>
    <h1>Talk to strangers in Bangladesh</h1>
    <p class="bd-dek">Bangla is one of the ten most spoken languages on earth, a language people gave their lives for, and still an afterthought on most chat apps. On TalkLive you can simply speak it - with someone in Dhaka, Sylhet, Kolkata or London - by voice or by text, free, with no account and no camera.</p>
    ${c.ctas('Tap to Talk', 'Tap to Chat')}
  </div>
  <div class="bd-sun" aria-hidden="true"></div>
</header>

<div class="bd-col">
  <section class="bd-ch">
    <h2><span aria-hidden="true">১</span> Adda</h2>
    <p class="bd-first">There is a Bangla word for a kind of conversation that English does not quite have. <em>Adda</em> is long, unhurried and slightly argumentative talk, usually among friends, usually over tea, usually about everything and nothing - politics, football, a film, a poem, somebody's cousin's terrible decision. It has no agenda and no end time. People do not "have" an adda so much as fall into one, at the tea stall on the corner, on the steps of a university hall, in the back room of a bookshop on a rainy afternoon.</p>
    <p>The historian Dipesh Chakrabarty thought adda important enough to write a scholarly essay about it - "Adda, Calcutta: Dwelling in Modernity", published in the journal <em>Public Culture</em> in 1999 - arguing that this habit of idle, democratic talk was one of the ways Bengalis made modern city life their own. And when the singer Manna Dey wanted to break a generation's heart in 1983, he sang about an adda that was gone: "Coffee House-er sei adda ta aaj ar nei" - that old adda at the Coffee House is no more.</p>
    <p>Friends scatter. They go abroad, they marry, they move to Gazipur for work. The adda does not have to stop. A stranger who has an hour and wants to argue about whether Tagore or Nazrul is the better poet is, for that hour, as good an adda partner as any.</p>
  </section>
  <aside class="bd-note"><b>Adda as a verb.</b> In Bangla you <em>adda deoa</em> - literally "give adda". It is something you do, not something that happens to you. TalkLive's Next button is, in this sense, very un-Bengali: nobody leaves a good adda early.</aside>

  <section class="bd-ch">
    <h2><span aria-hidden="true">২</span> The language people died for</h2>
    <p>On 21 February 1952, police opened fire on students in Dhaka who were demonstrating for Bangla to be recognised as a state language of Pakistan. Several were killed. The Language Movement they started became one of the roots of an independent Bangladesh, and in 1999 UNESCO declared 21 February International Mother Language Day, now marked around the world. Every year, people walk barefoot to the Shaheed Minar at dawn singing the song written in grief that week:</p>
    <div class="bd-verse">
      <p class="bn" lang="bn">আমার ভাইয়ের রক্তে রাঙানো একুশে ফেব্রুয়ারি, আমি কি ভুলিতে পারি</p>
      <p class="tr">"My brother's blood-spattered Twenty-first of February - can I ever forget it?"</p>
      <cite>Abdul Gaffar Choudhury, 1952; set to music by Altaf Mahmud</cite>
    </div>
    <p>It is not surprising, then, that so many Bangladeshis would rather talk in Bangla when they can - and that a stranger who manages even a clumsy <em>kemon acho?</em> ("how are you?") tends to be met with delight rather than correction.</p>
  </section>
  <aside class="bd-note"><b>Script and keyboards.</b> Bengali script is a joy to read and a chore to type on a phone, which is why so much Bangla online is written in English letters with improvised spelling. Voice skips the keyboard altogether.</aside>

  <section class="bd-ch">
    <h2><span aria-hidden="true">৩</span> One language, many places</h2>
    <p>Bangla does not stop at the border. It is the language of West Bengal and Tripura in India, of the Barak Valley in Assam, and of a diaspora spread from the Gulf and Malaysia to Italy, the United States and Britain - where Brick Lane in east London has street signs in Bengali script. Many British Bangladeshis grew up speaking Sylheti, a variety distinctive enough that a Dhaka listener notices at once; Chittagonian is more distinctive still.</p>
    <p>That makes Bangla speakers unusually easy to find at almost any hour. If you prefer Bangladesh in TalkLive's filters you will often meet people at home; widen it to India or the United Kingdom and you will meet Bengalis who are just as keen to talk in the language, and who may tease you about your accent in a completely different way. Asking "where is your accent from?" is one of the best openers there is.</p>
  </section>
  <aside class="bd-note"><b>Why weak ties matter.</b> In a 2014 study, the psychologists Gillian Sandstrom and Elizabeth Dunn found that people felt happier and more connected on days they had more interactions with "weak ties" - acquaintances and near-strangers - not just close friends (<em>Personality and Social Psychology Bulletin</em>).</aside>

  <section class="bd-ch">
    <h2><span aria-hidden="true">৪</span> When to find an adda</h2>
    <p>TalkLive's busiest hours, measured from our own hourly match counts in late September and early October 2026, fall between 15:00 and 21:00 UTC. Bangladesh keeps Bangladesh Standard Time (UTC+6) all year.</p>
    <div class="bd-clock">
      <div><b>9 pm - 3 am</b><span>Busiest in Bangladesh</span></div>
      <div><b>6 am - 11 am</b><span>Quietest hours</span></div>
      <div><b>10 pm Dhaka</b><span>= 9:30 pm Kolkata, 8 pm Dubai, 5 pm London (summer)</span></div>
    </div>
    <p>A small warning about abbreviations: Bangladesh Standard Time is written BST, and so is British Summer Time, which is five hours behind it. If a cousin in Birmingham says "let's talk at nine BST", ask which one.</p>

    <h2><span aria-hidden="true">৫</span> What the adda is about</h2>
    <ul class="bd-list">
      <li>Cricket, and the Tigers' latest result - the most reliable opener in the country.</li>
      <li>Exams: HSC results, university admission tests, the BCS civil-service exam that so many people spend years preparing for.</li>
      <li>Going abroad, and the relatives who already have.</li>
      <li>Poetry and song. Tagore wrote the national anthem, "Amar Shonar Bangla"; Kazi Nazrul Islam is the national poet; both are quoted in ordinary conversation.</li>
      <li>Food, especially ilish - hilsa, the national fish - and the correct way to cook it, which nobody agrees on.</li>
    </ul>

    <h2><span aria-hidden="true">৬</span> Talk freely, share carefully</h2>
    <p>Never share a mobile-wallet PIN or one-time code - for bKash, Nagad or anything else - with someone you meet online, and never send money to a stranger however urgent the story. Your NID number, photos and family details are not for a first conversation either. Be wary of anyone who asks you to move to another app straight away.</p>
    <p>Every TalkLive call and chat has Report and Block; blocked people are not matched with you again.</p>
    <div class="bd-box"><b>In an emergency</b> in Bangladesh, call the national emergency number <b>999</b>. If you are struggling and want someone trained to talk to, <a href="https://findahelpline.com" rel="noopener">findahelpline.com</a> lists free, confidential helplines.</div>

    <h2><span aria-hidden="true">৭</span> Starting is easy</h2>
    <ul class="bd-list">
      <li>Open TalkLive in your browser - no app and no sign-up. The interface is also <a href="/bn/">in Bangla</a>.</li>
      <li>Optional: prefer Bangladesh (and perhaps India or the UK) in Filters. Two preferred countries are free.</li>
      <li>Tap to Talk to speak, or Tap to Chat to type.</li>
      <li>Say <em>assalamu alaikum</em> or <em>nomoshkar</em>, then <em>kemon acho?</em> - and let the adda begin.</li>
    </ul>
    <p>For the wider story of South Asia's long evenings, read <a href="/regions/south-asia">Why South Asia Talks After Midnight</a>; our neighbouring guides cover <a href="/countries/india">India</a> and <a href="/countries/pakistan">Pakistan</a>.</p>
  </section>

  ${c.faq('Questions, briefly')}
</div>
${c.ad()}
<section class="bd-end">
  <h2>Cha is ready. Who is coming?</h2>
  <p>Someone, somewhere, wants to argue about Tagore tonight.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
