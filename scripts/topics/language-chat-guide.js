'use strict';
// /language-chat-guide: "Seventeen Doors". The hub for using TalkLive in your
// own language: a wall of coloured doors, one per interface language, each
// greeting you in its own script; then how languages actually work in the app.
// A navigation hub, so it carries no ads (noAds). Bricolage Grotesque for
// display, Literata to read.
const LOCALES = require('../locales');

const HELLO = {
  en: 'Hello', es: 'Hola', pt: 'Olá', fr: 'Bonjour', de: 'Hallo', ru: 'Привет', tr: 'Merhaba', ar: 'مرحبا',
  hi: 'नमस्ते', ur: 'سلام', id: 'Halo', zh: '你好', ja: 'こんにちは', ko: '안녕하세요', it: 'Ciao', fa: 'سلام', bn: 'নমস্কার',
};
const COLOURS = ['#e4572e', '#29335c', '#f3a712', '#669bbc', '#a8c686', '#8e5572', '#2a9d8f', '#e76f51', '#264653', '#c1121f', '#6a4c93', '#1982c4', '#8ac926', '#ff595e', '#3d5a80', '#bc6c25', '#588157'];

function doors() {
  const all = [{ code: 'en', name: 'English', dir: 'ltr', href: '/' }].concat(LOCALES.map((l) => ({ ...l, href: `/${l.code}/` })));
  return all.map((l, i) => `<a class="lg-door" href="${l.href}" style="--c:${COLOURS[i % COLOURS.length]}" lang="${l.code}"><b dir="${l.dir}">${HELLO[l.code]}</b><span>${l.name}</span></a>`).join('');
}

module.exports = {
  slug: 'language-chat-guide',
  name: 'Languages',
  date: '2026-10-05',
  noAds: true,
  about: { '@type': 'Thing', name: 'Using TalkLive in different languages' },
  title: 'TalkLive in 17 Languages - Chat in Your Own Language',
  description: 'Use TalkLive in 17 languages, including right-to-left Arabic, Persian and Urdu. How the interface language works, how to find people who speak your language, and tips for talking across languages.',
  keywords: 'chat in my language, talklive languages, voice chat in arabic, chat in hindi, chat in spanish, multilingual voice chat',
  h1: 'TalkLive in 17 Languages',
  theme: '#fbf7ef',
  preload: ['bricolage-grotesque-latin-700-normal', 'literata-latin-400-normal'],
  css: `
:root{--paper:#fbf7ef;--ink:#1f1b16;--rule:#e6dccb;--mast:#1f1b16}
body{font-family:"Literata",Georgia,serif;background:var(--paper)}
.lg-head{max-width:1180px;margin:0 auto;padding:50px 20px 24px}
.lg-head h1{font:700 clamp(46px,8vw,104px)/.92 "Bricolage Grotesque",sans-serif;letter-spacing:-.04em;margin:0 0 16px}
.lg-head p{font-size:20px;line-height:1.6;max-width:760px;margin:0 0 22px}
.c-ctas a{font:700 16px/1 "Bricolage Grotesque",sans-serif;padding:16px 22px;border-radius:12px}
.c-talk{background:var(--ink);color:#fff}
.c-chat{background:#fff;color:var(--ink);border:2px solid var(--ink)}
.lg-wall{max-width:1180px;margin:0 auto;padding:10px 20px 20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}
.lg-door{display:flex;flex-direction:column;justify-content:space-between;min-height:170px;padding:16px;border-radius:70px 70px 8px 8px;background:var(--c);color:#fff;text-decoration:none;position:relative;box-shadow:inset 0 -6px 0 rgba(0,0,0,.18)}
.lg-door::after{content:"";position:absolute;right:16px;top:52%;width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.8)}
.lg-door b{font:700 26px/1.15 "Noto Sans","Noto Sans Arabic","Noto Sans Devanagari","Noto Sans Bengali","Noto Sans CJK SC",system-ui,sans-serif;margin-top:34px}
.lg-door span{font:700 14px/1.2 "Bricolage Grotesque",sans-serif;opacity:.92}
.lg-door:hover{transform:translateY(-3px)}
.lg-main{max-width:820px;margin:0 auto;padding:10px 20px 0}
.lg-sec{padding:40px 0;border-top:2px solid var(--ink)}
.lg-sec h2{font:700 clamp(28px,3.8vw,42px)/1.05 "Bricolage Grotesque",sans-serif;letter-spacing:-.03em;margin:0 0 14px}
.lg-sec p{font-size:18.5px;line-height:1.75;margin:0 0 1.05em}
.lg-sec a{color:#b23a1c}
.lg-how{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}
.lg-how div{background:#fff;border:1px solid var(--rule);border-radius:14px;padding:16px;font-size:15.5px;line-height:1.55}
.lg-how b{font:700 17px/1.2 "Bricolage Grotesque",sans-serif;display:block;margin-bottom:6px}
.c-faq{max-width:820px;margin:0 auto;padding:30px 20px 0}
.c-faq h2{font:700 34px/1.05 "Bricolage Grotesque",sans-serif;margin:0 0 12px}
.c-faq summary{font:700 17px/1.4 "Bricolage Grotesque",sans-serif}
.c-faq p{font-size:16.5px;line-height:1.65}
.lg-end{max-width:820px;margin:44px auto 0;padding:30px 20px;text-align:center;border-top:2px solid var(--ink)}
.lg-end h2{font:700 clamp(28px,4.4vw,46px)/1.05 "Bricolage Grotesque",sans-serif;margin:0 0 16px}
.lg-end .c-ctas{justify-content:center}
@media (max-width:760px){.lg-how{grid-template-columns:1fr}.lg-door{min-height:140px}}
`,
  faq: [
    { q: 'How do I change TalkLive\'s language?', a: 'TalkLive follows your phone or browser language automatically. To change it, open Settings and choose a language - your choice is remembered on that device. Each localized homepage above also opens the app in its language.' },
    { q: 'Will I be matched with people who speak my language?', a: 'Not automatically. The interface language only changes how TalkLive is shown to you. You can prefer countries in Filters, but countries are multilingual - ask your match which language suits them.' },
    { q: 'Are right-to-left languages supported?', a: 'Yes. Arabic, Persian and Urdu display right to left throughout the app.' },
    { q: 'Can I suggest a better translation?', a: 'Yes, please. Use the Contact page and include the page, the current wording, your suggestion and the dialect or region it is for.' },
  ],
  body: (c) => `<main id="story">
<section class="lg-head">
  <h1>TalkLive in 17 languages</h1>
  <p>Every door below opens TalkLive in a different language - the whole app, from the buttons to the safety screens, including right-to-left Arabic, Persian and Urdu. Pick yours, or simply start: TalkLive already follows your phone's language.</p>
  ${c.ctas('Start a voice chat', 'Start a text chat')}
</section>
<nav class="lg-wall" aria-label="TalkLive in your language">${doors()}</nav>

<div class="lg-main">
  <section class="lg-sec">
    <h2>How language works on TalkLive</h2>
    <div class="lg-how">
      <div><b>Automatic</b>The app opens in your phone's or browser's language if it is one of the seventeen.</div>
      <div><b>Your choice</b>Settings, then Language, switches it - and remembers your choice on that device.</div>
      <div><b>Direct links</b>Each door above is a homepage in that language that opens the app in it too.</div>
    </div>
    <p>One distinction matters more than any other: the <em>interface</em> language is not the <em>conversation</em> language. Switching TalkLive to Japanese changes the buttons, not the people. You will still be matched with whoever is searching, and you can talk in any language the two of you share. Country preferences in Filters can tilt the odds - prefer Egypt and you are more likely to meet Arabic speakers - but countries are multilingual, and a country label is an estimate, not a guarantee. The simplest approach is to ask: "Which language is easiest for you?"</p>
  </section>

  <section class="lg-sec">
    <h2>Talking across languages</h2>
    <p>Some of the best conversations on TalkLive happen in a language neither person speaks perfectly. A few habits help. Speak a little more slowly than usual, and use complete, simple sentences rather than slang. Check rather than assume: "Did I explain that well?" is better than ploughing on. Let silences run - the other person may be building a sentence in their head. And use text when a word will not come: in a voice call you can type a word or a name in the chat without interrupting.</p>
    <p>If you are using TalkLive to practise, our guides to <a href="/language-exchange">language exchange</a> and <a href="/practice-english-speaking">practising English speaking</a> go further. For the story behind each of the seventeen languages - who speaks them, and how to say hello properly - the Journal's feature <a href="/languages/">Seventeen Ways to Say Hello</a> is the long read. And for the places TalkLive hears from most, see the <a href="/country-chat-guide">country guides</a>.</p>
    <p>The same safety rules apply in every language: keep personal details private, never send money or codes, and use Report or Block whenever you need to. A language barrier is never a reason to put up with pressure. Spotted a translation that could be better? Tell us through <a href="/contact">Contact</a>, with the page, the current wording, your suggestion and the dialect it is for.</p>
  </section>
</div>

${c.faq('Questions about languages')}
<section class="lg-end">
  <h2>Hello, in whatever language you like</h2>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
};
