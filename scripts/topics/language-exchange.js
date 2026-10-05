'use strict';
// /language-exchange: "Tandem". Two people, two languages, one conversation
// that swaps halfway: a split design in teal and tangerine, with a "swap"
// divider in the middle of the page and a script that mirrors itself.
// Playfair Display for display, Manrope to read.
module.exports = {
  slug: 'language-exchange',
  name: 'Language Exchange',
  date: '2026-10-05',
  about: { '@type': 'Thing', name: 'Language exchange (tandem learning)' },
  title: 'Language Exchange - Free Speaking Practice by Voice | TalkLive',
  description: 'Free language exchange by voice or text: trade ten minutes of your language for ten of theirs with someone new. The tandem method\'s two rules, a ready-made script, and how to correct each other well.',
  keywords: 'language exchange, language exchange online, tandem language exchange, language exchange partner, speak with native speakers free, conversation exchange',
  h1: 'Language Exchange',
  theme: '#0f6e6a',
  preload: ['playfair-display-latin-700-normal', 'manrope-latin-400-normal'],
  css: `
:root{--paper:#fbf8f2;--ink:#1d2423;--rule:#e2ddd2;--teal:#0f6e6a;--tang:#f08a24;--mast:#fbf8f2}
body{font-family:"Manrope",system-ui,sans-serif;background:var(--paper)}
.c-bar{background:linear-gradient(90deg,var(--teal) 50%,var(--tang) 50%);color:#fff;max-width:none}
.lx-hero{display:grid;grid-template-columns:1fr 1fr;min-height:420px}
.lx-half{padding:60px 40px;color:#fff}
.lx-half.a{background:var(--teal);text-align:right}
.lx-half.b{background:var(--tang)}
.lx-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.lx-half h1,.lx-half .lx-big{font:700 clamp(46px,7vw,96px)/.92 "Playfair Display",serif;margin:0;letter-spacing:-.01em}
.lx-half p{font-size:19px;line-height:1.6;margin:18px 0 0;max-width:460px}
.lx-half.a p{margin-left:auto}
.lx-say{font:400 italic 26px/1.3 "Playfair Display",serif;opacity:.9;margin-top:28px}
.lx-cta{background:var(--ink);color:#fff;padding:22px 20px;display:flex;justify-content:center}
.c-ctas a{font:700 16px/1 "Manrope",sans-serif;padding:16px 24px;border-radius:999px}
.c-talk{background:var(--tang);color:#1d1306}
.c-chat{background:var(--teal);color:#fff}
.lx-main{max-width:820px;margin:0 auto;padding:20px 20px 0}
.lx-sec{padding:44px 0;border-bottom:1px solid var(--rule)}
.lx-sec h2{font:700 clamp(30px,4vw,46px)/1.05 "Playfair Display",serif;margin:0 0 16px}
.lx-sec p{font-size:18.5px;line-height:1.75;margin:0 0 1.05em}
.lx-sec a{color:var(--teal);font-weight:700}
.lx-rules{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:22px 0}
.lx-rules div{padding:22px;border-radius:18px;color:#fff;font-size:16.5px;line-height:1.55}
.lx-rules div:first-child{background:var(--teal)}
.lx-rules div:last-child{background:var(--tang);color:#1d1306}
.lx-rules b{font:700 26px/1.1 "Playfair Display",serif;display:block;margin-bottom:8px}
.lx-swap{position:relative;text-align:center;margin:10px 0 0;padding:26px 0}
.lx-swap::before{content:"";position:absolute;left:0;right:0;top:50%;height:4px;background:linear-gradient(90deg,var(--teal) 50%,var(--tang) 50%)}
.lx-swap span{position:relative;background:var(--paper);padding:0 16px;font:700 14px/1 "Manrope",sans-serif;letter-spacing:.24em;text-transform:uppercase}
.lx-script{display:grid;gap:10px;margin:22px 0}
.lx-script p{margin:0;padding:12px 16px;border-radius:14px;font-size:16.5px;line-height:1.5;max-width:86%}
.lx-script .a{background:#e3f1ef;border-left:5px solid var(--teal)}
.lx-script .b{background:#fdeedd;border-right:5px solid var(--tang);margin-left:auto;text-align:right}
.lx-script small{display:block;font-size:12.5px;color:#6b706e;margin-top:3px}
.lx-dont{list-style:none;padding:0;margin:18px 0;display:grid;gap:10px}
.lx-dont li{background:#fff;border:1px solid var(--rule);border-radius:14px;padding:14px 16px;font-size:16.5px;line-height:1.55}
.lx-dont b{color:var(--teal)}
.c-faq{max-width:820px;margin:0 auto;padding:40px 20px 0}
.c-faq h2{font:700 40px/1.05 "Playfair Display",serif;margin:0 0 12px}
.c-faq summary{font:700 17px/1.4 "Manrope",sans-serif}
.c-faq p{font-size:16.5px;line-height:1.65}
.lx-end{display:grid;grid-template-columns:1fr 1fr;margin-top:56px}
.lx-end>div{padding:46px 30px;color:#fff}
.lx-end>div:first-child{background:var(--teal);text-align:right}
.lx-end>div:last-child{background:var(--tang)}
.lx-end h2{font:700 clamp(30px,4.6vw,54px)/1 "Playfair Display",serif;margin:0 0 16px}
.lx-end>div:first-child .c-ctas{justify-content:flex-end}
.lx-end .c-talk{background:#fff;color:var(--teal)}
.lx-end .c-chat{background:#1d2423}
@media (max-width:760px){.lx-hero,.lx-end{grid-template-columns:1fr}.lx-half{padding:40px 20px}.lx-half.a,.lx-end>div:first-child{text-align:left}.lx-half.a p{margin-left:0}.lx-end>div:first-child .c-ctas{justify-content:flex-start}.lx-rules{grid-template-columns:1fr}}
`,
  faq: [
    { q: 'Is language exchange on TalkLive free?', a: 'Yes. Voice calls and text chats are free and need no account.' },
    { q: 'Can I choose the language of my partner?', a: 'Not directly. You can prefer countries in Filters, but a country does not guarantee a language or a native speaker - countries are multilingual. Ask at the start which languages your match speaks.' },
    { q: 'How do I keep a good exchange partner?', a: 'Add each other as friends. You can then message and call back for regular sessions without exchanging phone numbers.' },
    { q: 'Do I have to correct my partner?', a: 'Only if they ask. Agree at the start whether you both want corrections, and how many.' },
    { q: 'Can I exchange languages by text?', a: 'Yes. Text is good for vocabulary and writing; voice is better for listening and speaking. Many partners do both.' },
  ],
  body: (c) => `<main id="story">
<section class="lx-hero">
  <div class="lx-half a"><h1>Language<span class="lx-sr"> exchange</span></h1><p>You speak one language well and want another. Somewhere, someone has exactly the opposite problem.</p><p class="lx-say">"Hello - can we swap?"</p></div>
  <div class="lx-half b"><p class="lx-big" aria-hidden="true">exchange</p><p>Find them on TalkLive: a free voice call or text chat, ten minutes in your language, ten in theirs. No account, no camera, no lesson fee.</p><p class="lx-say">"¡Hola! ¿Cambiamos?"</p></div>
</section>
<div class="lx-cta">${c.ctas('Start a voice exchange', 'Start a text exchange')}</div>

<div class="lx-main">
  <section class="lx-sec">
    <h2>An old idea with a name: tandem</h2>
    <p>Language exchange is not new. After France and Germany signed the Élysée Treaty in 1963, the Franco-German Youth Office it created began bringing young French and German people together in their tens of thousands - and out of those meetings grew a method teachers came to call <em>tandem</em> learning: two people who each speak the language the other is learning, helping each other in turns. By the 1990s, with the Tandem Network set up by European universities, the method had moved online. A 1996 guide edited by David Little and Helmut Brammerts boiled it down to two principles, and they are still the whole secret.</p>
    <div class="lx-rules">
      <div><b>Reciprocity</b>Both of you should get as much out of it as you put in. Equal time in each language; equal patience in both directions.</div>
      <div><b>Autonomy</b>Each of you is responsible for your own learning. You decide what you want to practise, and ask for it - your partner is not your teacher.</div>
    </div>
    <p>Everything else is detail. Exchanges fail for one of two reasons: one person takes more than they give, or one person expects to be taught. Keep both rules in mind and almost any partner becomes a good one.</p>
  </section>

  <div class="lx-swap"><span>Swap halfway</span></div>

  <section class="lx-sec">
    <h2>A script for your first exchange</h2>
    <p>Random matching means you will not always find someone learning your language. When you do, a little structure makes it work. Here is a simple shape, shown for an English speaker learning Spanish:</p>
    <div class="lx-script">
      <p class="a">"Hi! I'm practising Spanish. Do you want to do an exchange - ten minutes in English, then ten in Spanish?"<small>Agree the deal first</small></p>
      <p class="b">"Sure! Can we start in English? And please correct my big mistakes."<small>Agree corrections: how many, and when</small></p>
      <p class="a">"Of course. So - where are you, and what are you learning English for?"<small>Ask questions that make them talk</small></p>
      <p class="b">"...¡Vale, ya son diez minutos! ¿Cambiamos?"<small>Swap on time, even mid-story</small></p>
      <p class="a">"¡Sí! Perdón, mi español es un poco lento..."<small>Now it is your turn to be patient with yourself</small></p>
    </div>
    <p>If your match is not learning your language, that is still a conversation in theirs - and it is fine to say "I'm learning Spanish, could we speak slowly?" Many people will happily help for a few minutes. If it is not working, thank them and tap Next; they joined for their own reasons too.</p>
  </section>

  <section class="lx-sec">
    <h2>How to correct, and be corrected, well</h2>
    <ul class="lx-dont">
      <li><b>Correct sparingly.</b> Fix mistakes that change the meaning, or that your partner keeps repeating. Ignore the rest; a conversation is not a test.</li>
      <li><b>Recast instead of interrupting.</b> Repeat the sentence back correctly - "Oh, you <em>went</em> to the beach yesterday?" - and keep going. It teaches without stopping the flow.</li>
      <li><b>Slow down, don't simplify into baby talk.</b> Speak a little more slowly and clearly, but keep normal grammar and vocabulary. That is what your partner is trying to learn.</li>
      <li><b>Let silences run.</b> Your partner is building a sentence. Wait a little longer than feels natural before you help.</li>
      <li><b>Write down one thing.</b> After each swap, note one phrase you want to reuse. Twenty calls later, that is a notebook full of real language.</li>
    </ul>
    <p>Keep good partners: add each other as friends and you can set up regular exchanges - the same partner every week is worth far more than twenty random ones. Keep the usual care, too: no surname, address, workplace or social accounts in a first conversation, and Report or Block anyone who makes it uncomfortable. For English specifically, see <a href="/practice-english-speaking">practice English speaking</a>; for the long view on why speaking is hard, the Journal's <a href="/blog/how-to-practise-a-language-by-speaking">why you understand more than you can say</a>.</p>
  </section>
</div>

${c.faq('Questions, in any language')}
${c.ad()}
<section class="lx-end">
  <div><h2>Your language</h2><div class="c-ctas">${c.talk('Tap to Talk')}</div></div>
  <div><h2>for theirs</h2><div class="c-ctas">${c.chat('Tap to Chat')}</div></div>
</section>
</main>`,
};
