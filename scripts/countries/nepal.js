'use strict';
// Nepal: "Dal bhat power". A prayer-flag strip in the five colours runs across
// the top, sections sit on warm paper like a trekking-lodge menu, and the
// greetings are set as a call-and-answer board. Bricolage Grotesque for
// display, Literata to read. Crimson and the deep blue of the flag's border.
const GREETINGS = [
  ['Namaste', 'Namaste', 'The everyday hello, palms together. Works for everyone.'],
  ['K cha?', 'Thik cha', '"What\'s up?" - "It\'s fine." The one you will hear most.'],
  ['Sanchai hunuhuncha?', 'Sanchai chu', 'Polite: "Are you well?" - "I am well."'],
  ['Khana khanu bhayo?', 'Khaye', '"Have you eaten?" - "I have." It means "how are you".'],
];

module.exports = {
  slug: 'nepal',
  name: 'Nepal',
  date: '2026-11-10',
  title: 'Talk to Strangers in Nepal - Free Voice Chat | TalkLive',
  description: 'Free voice and text chat with people in Nepal, in Nepali or English. No sign-up or camera. Greetings, topics, safety and when Nepal is online.',
  keywords: 'talk to strangers nepal, nepal chat, nepali voice chat, random chat nepal, chat with nepali people, nepali chat room, online chat nepal, free voice call nepal, k cha, english speaking practice nepal',
  h1: 'Talk to Strangers in Nepal',
  theme: '#dc143c',
  preload: ['bricolage-grotesque-latin-700-normal', 'literata-latin-400-normal'],
  css: `
:root{--paper:#fbf6ee;--ink:#1c1a17;--rule:#e2d6c2;--crimson:#dc143c;--blue:#003893;--mast:#fff}
body{font-family:Literata,Georgia,serif;background:var(--paper);color:var(--ink)}
.c-bar{background:var(--blue);color:var(--mast);max-width:none}
.np-flags{display:flex;height:22px}
.np-flags i{flex:1}
.np-flags i:nth-child(5n+1){background:#1f5fbf}.np-flags i:nth-child(5n+2){background:#f4f1ea}.np-flags i:nth-child(5n+3){background:#d7263d}.np-flags i:nth-child(5n+4){background:#2e9b57}.np-flags i:nth-child(5n){background:#f2b705}
.np-hero{max-width:860px;margin:0 auto;padding:54px 20px 22px}
.np-hero h1{font:700 clamp(40px,7vw,84px)/.96 "Bricolage Grotesque",sans-serif;letter-spacing:-.03em;margin:0 0 16px;color:var(--crimson)}
.np-hero p{font-size:20px;line-height:1.6;margin:0 0 24px;max-width:640px}
.np-main{max-width:760px;margin:0 auto;padding:0 20px}
.np-sec{padding:34px 0 4px;border-top:2px solid var(--ink);margin-top:34px}
.np-sec h2{font:700 clamp(26px,4vw,40px)/1.05 "Bricolage Grotesque",sans-serif;letter-spacing:-.02em;margin:0 0 12px}
.np-sec p{font-size:18px;line-height:1.75;margin:0 0 1em}
.np-sec a{color:var(--blue)}
.np-board{margin:18px 0;border:2px solid var(--ink);background:#fff}
.np-row{display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:0;border-top:1px solid var(--rule)}
.np-row:first-child{border-top:0}
.np-row b,.np-row em,.np-row span{padding:12px 14px;font-size:16px;line-height:1.4}
.np-row b{font:700 19px/1.2 "Bricolage Grotesque",sans-serif;color:var(--crimson)}
.np-row em{font:700 19px/1.2 "Bricolage Grotesque",sans-serif;font-style:normal;color:var(--blue);border-left:1px solid var(--rule)}
.np-row span{border-left:1px solid var(--rule)}
.np-power{background:var(--crimson);color:#fff;padding:20px 22px;margin:22px 0;font-size:17px;line-height:1.5}
.np-power b{display:block;font:700 24px/1.15 "Bricolage Grotesque",sans-serif;margin-bottom:6px}
.np-help{border:2px solid var(--blue);background:#fff;padding:16px 20px;font-size:16.5px;line-height:1.6}
.c-faq{max-width:760px;margin:40px auto 0;padding:0 20px}
.c-faq h2{font:700 34px/1.05 "Bricolage Grotesque",sans-serif;margin:0 0 12px}
.c-faq summary{font:700 17px/1.45 Literata,serif}
.c-faq p{font-size:16.5px;line-height:1.65}
.np-end{margin-top:60px;background:var(--blue);color:#fff;text-align:center;padding:56px 20px}
.np-end h2{font:700 clamp(34px,6vw,60px)/1 "Bricolage Grotesque",sans-serif;margin:0 0 10px}
.np-end p{font-size:18px;line-height:1.55;margin:0 auto 24px;max-width:540px}
.np-end .c-ctas{justify-content:center}
@media (max-width:640px){.np-row{grid-template-columns:1fr 1fr}.np-row span{grid-column:1/-1;border-left:0;border-top:1px dashed var(--rule)}}
`,
  faq: [
    { q: 'Is TalkLive free in Nepal?', a: 'Yes. Voice calls and text chat are free, with no account, no phone number and no camera. Choosing Nepal as a preferred country is free too.' },
    { q: 'Can I talk in Nepali?', a: 'Yes. Speak any language you and your match share. Many people from Nepal chat in Nepali, and most are happy to switch to English or Hindi.' },
    { q: 'When is Nepal online on TalkLive?', a: 'TalkLive is busiest between 15:00 and 21:00 UTC. Nepal is UTC+5:45, so that is about 8:45 in the evening to 2:45 at night, Nepal time.' },
    { q: 'Can I practise English here?', a: 'Yes. Add the English practice interest before you start and you are matched first with others who want to practise speaking.' },
    { q: 'What are the emergency numbers in Nepal?', a: 'Police is 100, fire is 101 and ambulance is 102. The tourist police in Kathmandu can be reached on 1144.' },
  ],
  body: (c) => `<main id="story">
<div class="np-flags" aria-hidden="true">${'<i></i>'.repeat(25)}</div>
<section class="np-hero">
  <h1>Talk to strangers in Nepal</h1>
  <p>A free voice call or text chat with someone new, from Kathmandu to Pokhara to a Nepali living abroad. No sign-up, no number, no camera. Just say Namaste and start.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>

<div class="np-main">
  <section class="np-sec">
    <h2>Easy people to talk to</h2>
    <p>Nepal has more than a hundred languages and a habit of making room for guests, so talking to someone you have never met comes naturally. Conversations start politely and warm up fast. Most people you meet here speak Nepali and at least some English, and a lot of them also follow Hindi from films and songs.</p>
    <p>Millions of Nepalis work or study abroad, in the Gulf, Malaysia, Japan, Australia and beyond, so the person who answers may be in Doha or Sydney and very glad to hear a voice from home.</p>
  </section>

  <section class="np-sec">
    <h2>Say it the Nepali way</h2>
    <p>Four openers and the answers people expect:</p>
    <div class="np-board">${GREETINGS.map(([q, a, note]) => `<div class="np-row"><b>${q}</b><em>${a}</em><span>${note}</span></div>`).join('')}</div>
    <p>Add <em>dai</em> (older brother), <em>didi</em> (older sister), <em>bhai</em> or <em>bahini</em> after a name and you sound instantly friendly. <em>Dhanyabad</em> is thank you, and <em>hajur</em> is the polite "yes?" you will hear on every call.</p>
    <div class="np-power"><b>Dal bhat power, 24 hour</b>The line on half the T-shirts in Thamel, and a fair summary of the national diet: rice, lentils, twice a day, and somehow enough energy to walk up a mountain.</div>
  </section>

  <section class="np-sec">
    <h2>What to talk about</h2>
    <p>Momo, and which filling is the right one. Dashain and Tihar, the two festivals everyone travels home for. Cricket, where the national team's fans fill every seat, and football. Trekking routes, load-shedding stories from a few years back, and the weather in the hills versus the Terai. Ask someone where they are from and you will usually get a district, a village and a recommendation.</p>
    <p>If you are learning Nepali, say so at the start. People are patient with learners and will slow down for you.</p>
  </section>

  <section class="np-sec">
    <h2>Stay safe</h2>
    <p>Keep your full name, address, workplace and social accounts to yourself at first. Never share an eSewa, Khalti or bank code, and end the call with anyone who asks for money, photos or to move to another app straight away. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">scam guide</a> lists the usual tricks, and every call and chat has Report and Block.</p>
    <div class="np-help"><b>Emergency:</b> police <b>100</b>, fire <b>101</b>, ambulance <b>102</b>.</div>
  </section>
</div>

${c.faq('Questions people ask')}
<section class="np-end">
  <h2>K cha?</h2>
  <p>Someone from Nepal is online and ready to answer "thik cha". Start a call or a chat now.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
