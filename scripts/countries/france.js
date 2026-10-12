'use strict';
// France: "L'Ardoise". The café chalkboard: a green-black slate with chalk
// handwriting in Caveat, a red and white terrace awning across the top, and the
// day's "menu" being the hours France is online. Playfair Display for the big
// type, DM Sans to read. The meme lives on a Post-it stuck to the board.
const MENU = [
  ['17h', 'Sortie du taf', 'First call of the evening'],
  ['18h30', "L'apéro", 'Everyone has an opinion'],
  ['20h', 'Le dîner', 'Long talks, slow food'],
  ['21h', 'Le match', 'Ligue 1 or Champions League'],
  ['22h30', 'Le canap', 'Phones out, chats on'],
];
const SLANG = [
  ['Wesh', 'Hey, what’s up. Works for literally everyone under 35.'],
  ['Tkt', 'Short for t’inquiète, no worries. You will see it in every chat.'],
  ['Mdr / ptdr', 'The French LOL. Ptdr means you are actually dying.'],
  ['Askip', 'Apparently. For gossip you cannot confirm.'],
  ['J’ai le seum', 'I’m gutted. Usually after a football result.'],
  ['La flemme', 'That deep, honest laziness. Ça passe crème if you admit it.'],
  ['En mode', 'Like, in the mood of. En mode chill, en mode détente.'],
  ['C’est chaud', 'It’s tricky, or it’s amazing. Context decides.'],
];

module.exports = {
  slug: 'france',
  name: 'France',
  date: '2026-10-12',
  title: 'Talk to Strangers in France: Chat Vocal Gratuit, Sans Inscription | TalkLive',
  description: 'Parler à des inconnus, en français ou en anglais. Free voice and text chat with people in France, no sign-up, no camera. Slang, apéro hours and how to start the convo.',
  keywords: 'parler à des inconnus, chat vocal gratuit, tchat sans inscription, chat anonyme, appel aléatoire, rencontrer des gens en ligne, discuter avec des inconnus, talk to strangers france, french voice chat, chat with french people',
  h1: 'Talk to Strangers in France',
  theme: '#1f2a24',
  preload: ['playfair-display-latin-700-normal', 'dm-sans-latin-400-normal', 'caveat-latin-500-normal'],
  css: `
:root{--paper:#f4efe6;--ink:#1b1a17;--rule:#ddd3c2;--slate:#1f2a24;--chalk:#f3f1ea;--bleu:#0055a4;--rouge:#ef4135;--mast:#f3f1ea}
body{font-family:"DM Sans",system-ui,sans-serif;background:var(--paper);color:var(--ink)}
.c-bar{background:var(--slate);color:var(--mast);max-width:none}
.fr-awning{height:34px;background:repeating-linear-gradient(90deg,var(--rouge) 0 46px,#fff 46px 92px);clip-path:polygon(0 0,100% 0,100% 60%,97% 100%,94% 60%,91% 100%,88% 60%,85% 100%,82% 60%,79% 100%,76% 60%,73% 100%,70% 60%,67% 100%,64% 60%,61% 100%,58% 60%,55% 100%,52% 60%,49% 100%,46% 60%,43% 100%,40% 60%,37% 100%,34% 60%,31% 100%,28% 60%,25% 100%,22% 60%,19% 100%,16% 60%,13% 100%,10% 60%,7% 100%,4% 60%,1% 100%,0 60%)}
.fr-board{max-width:1060px;margin:26px auto 0;padding:0 16px}
.fr-slate{position:relative;background:radial-gradient(ellipse at 30% 20%,#2c3a32,var(--slate) 70%);color:var(--chalk);border:14px solid #6b4a2b;border-radius:6px;padding:46px 40px 40px;box-shadow:0 20px 40px -24px rgba(0,0,0,.6)}
.fr-flag{width:66px;height:44px;display:block;margin-bottom:18px;border:2px solid var(--chalk)}
.fr-slate h1{font:700 clamp(40px,7vw,84px)/.98 "Playfair Display",serif;margin:0 0 6px}
.fr-scrawl{font:500 clamp(26px,3.6vw,38px)/1.1 Caveat,cursive;color:#f6d06b;margin:0 0 18px;transform:rotate(-1.5deg)}
.fr-slate p.fr-dek{font-size:18.5px;line-height:1.65;max-width:620px;margin:0 0 26px;opacity:.92}
.fr-postit{position:absolute;right:28px;top:-22px;width:210px;background:#fff27a;color:#2a2611;padding:16px 14px 18px;transform:rotate(5deg);box-shadow:0 10px 20px -10px rgba(0,0,0,.5);font:500 22px/1.15 Caveat,cursive}
.fr-postit b{display:block;font:700 12px/1 "DM Sans",sans-serif;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px;opacity:.7}
.fr-main{max-width:760px;margin:0 auto;padding:20px 20px 0}
.fr-sec{padding:40px 0 6px;border-bottom:1px dashed var(--rule)}
.fr-sec h2{font:700 clamp(30px,4.4vw,44px)/1.05 "Playfair Display",serif;margin:0 0 14px}
.fr-sec p{font-size:18px;line-height:1.75;margin:0 0 1.05em}
.fr-sec a{color:var(--bleu)}
.fr-menu{background:var(--slate);color:var(--chalk);border-radius:6px;padding:22px 24px;margin:18px 0 24px}
.fr-menu h3{font:500 30px/1 Caveat,cursive;margin:0 0 12px;color:#f6d06b}
.fr-menu li{display:grid;grid-template-columns:70px 1fr auto;gap:10px;align-items:baseline;padding:8px 0;border-bottom:1px dotted rgba(243,241,234,.3);font-size:16px}
.fr-menu ul{list-style:none;margin:0;padding:0}
.fr-menu b{font:500 24px/1 Caveat,cursive;color:#f6d06b}
.fr-menu span{font:500 22px/1.1 Caveat,cursive}
.fr-menu em{font-style:normal;opacity:.7;font-size:14px;text-align:right}
.fr-lex{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0 22px}
.fr-lex div{background:#fff;border:1px solid var(--rule);padding:12px 14px;border-radius:4px}
.fr-lex b{display:block;font:500 28px/1 Caveat,cursive;color:var(--bleu);margin-bottom:4px}
.fr-lex span{font-size:15px;line-height:1.5}
.fr-meme{display:grid;grid-template-columns:1fr 1fr;border:3px solid var(--ink);margin:22px 0;background:#fff}
.fr-meme div{padding:18px 16px;font:700 18px/1.35 "DM Sans",sans-serif}
.fr-meme div:first-child{border-right:3px solid var(--ink)}
.fr-meme small{display:block;font:500 12px/1 "DM Sans",sans-serif;letter-spacing:.14em;text-transform:uppercase;opacity:.6;margin-bottom:8px}
.fr-meme .fr-face{font-size:44px;line-height:1;margin-top:10px}
.fr-help{border-left:5px solid var(--rouge);background:#fff;padding:16px 20px;font-size:16.5px;line-height:1.6}
.c-faq{max-width:760px;margin:36px auto 0;padding:0 20px}
.c-faq h2{font:700 36px/1.05 "Playfair Display",serif;margin:0 0 12px}
.c-faq summary{font:700 17px/1.45 "DM Sans",sans-serif}
.c-faq p{font-size:16.5px;line-height:1.65}
.fr-end{margin:60px auto 0;max-width:1060px;padding:0 16px}
.fr-end-in{background:var(--slate);color:var(--chalk);border:14px solid #6b4a2b;border-radius:6px;padding:48px 24px;text-align:center}
.fr-end h2{font:500 clamp(40px,6vw,64px)/1 Caveat,cursive;margin:0 0 10px;color:#f6d06b}
.fr-end p{font-size:18px;line-height:1.55;margin:0 auto 24px;max-width:520px}
.fr-end .c-ctas{justify-content:center;margin:0 auto}
@media (max-width:760px){.fr-postit{position:static;transform:rotate(-2deg);margin:0 0 20px;width:auto}.fr-slate{padding:30px 20px 26px;border-width:10px}.fr-lex,.fr-meme{grid-template-columns:1fr}.fr-meme div:first-child{border-right:0;border-bottom:3px solid var(--ink)}.fr-menu li{grid-template-columns:56px 1fr}.fr-menu em{display:none}}
`,
  faq: [
    { q: 'Est-ce que TalkLive est gratuit en France ?', a: 'Oui. Voice and text chat are free, with no account, no phone number and no camera. Picking France as a preferred country is free too.' },
    { q: 'Can I chat in French?', a: 'Yes. Talk in whatever language you and your match share, and switch the whole site to French at talklive.app/fr/ if you like.' },
    { q: 'When is France busiest on TalkLive?', a: 'TalkLive is busiest between 15:00 and 21:00 UTC, which is about 17h to 23h in France in summer and 16h to 22h in winter.' },
    { q: 'Do I need to download an app?', a: 'Non. It runs in the browser on Android, iPhone and computer. Add it to your home screen if you want an icon.' },
    { q: 'What is the emergency number in France?', a: '112 works everywhere in the EU. In France you can also call 15 for medical help (SAMU), 17 for police and 18 for the fire brigade.' },
  ],
  body: (c) => `<main id="story">
<div class="fr-awning" aria-hidden="true"></div>
<div class="fr-board"><section class="fr-slate">
  <div class="fr-postit"><b>Mood du jour</b>POV : t’as dit "on s’appelle" il y a 3 semaines et personne n’a appelé</div>
  <svg class="fr-flag" viewBox="0 0 3 2" role="img" aria-label="Flag of France"><rect width="1" height="2" fill="#0055a4"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ef4135"/></svg>
  <h1>Talk to strangers in France</h1>
  <p class="fr-scrawl">parler à des inconnus, sans prise de tête</p>
  <p class="fr-dek">A voice call or a text chat with someone new, from Paris to Marseille, Lyon to Lille. Free, no sign-up, no camera. Just you, a stranger and whatever you feel like talking about tonight.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section></div>

<div class="fr-main">
  <section class="fr-sec">
    <h2>The French art of the long chat</h2>
    <p>France is a country that loves to talk. Dinners last three hours, the apéro is basically a national sport, and a café terrace is where people go to debate everything from football to the best boulangerie on the street. If you have ever wanted to <em>discuter avec des inconnus</em> without the awkward small talk, French people are honestly great at it.</p>
    <p>On TalkLive you get the same vibe, just online. One tap and you are on a call with a real person. Can’t talk out loud? Tap to Chat and type instead.</p>
    <div class="fr-menu">
      <h3>Menu du soir</h3>
      <ul>${MENU.map(([t, a, b]) => `<li><b>${t}</b><span>${a}</span><em>${b}</em></li>`).join('')}</ul>
    </div>
    <p>TalkLive is busiest from 15:00 to 21:00 UTC, so in France the good stuff happens from late afternoon until about 23h.</p>
  </section>

  <section class="fr-sec">
    <h2>Le petit lexique</h2>
    <p>Want to sound like a local and not like a textbook? Here is the slang you will actually hear on a call or see in a chat. Use it and watch someone go "attends, t’es français ?"</p>
    <div class="fr-lex">${SLANG.map(([w, m]) => `<div><b>${w}</b><span>${m}</span></div>`).join('')}</div>
    <p>Gen Z bonus: something amazing is <em>giga</em> or <em>de ouf</em>, something awkward is <em>cringe</em> (yes, same word), and if someone is <em>en PLS</em> they are emotionally wrecked, usually for no serious reason.</p>
    <div class="fr-meme" aria-label="Meme: expectation versus reality of a first call">
      <div><small>Ce que tu crois</small>"On va juste parler 5 minutes"<div class="fr-face" aria-hidden="true">\u{1F60C}</div></div>
      <div><small>Ce qui se passe</small>2 heures plus tard, vous refaites le monde<div class="fr-face" aria-hidden="true">\u{1F92F}</div></div>
    </div>
  </section>

  <section class="fr-sec">
    <h2>What to talk about</h2>
    <p>Food, always. Ask someone where to find the best croissant and you will get a passionate answer and maybe a feud. Football is safe too, as long as you are ready for the PSG vs OM debate, Le Classique, which nobody has ever settled. Music works, from French rap to the old classics everyone’s parents play.</p>
    <p>If you are learning French, say it upfront. People are much kinder about your accent than you think, and a voice call is the fastest way to stop sounding like an audiobook. The whole site also works <a href="/fr/">en français</a>.</p>
  </section>

  <section class="fr-sec">
    <h2>Keep it safe</h2>
    <p>Keep your full name, address, Insta and workplace to yourself at first. Never share a bank code or an SMS code, and skip anyone who asks for money, photos or wants to move to another app right away. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">scam guide</a> covers the usual tricks. Every call has Report and Block, and TalkLive is for adults 18+.</p>
    <div class="fr-help"><b>Urgence :</b> call <b>112</b>, or <b>15</b> for medical help, <b>17</b> for police and <b>18</b> for fire. Free from any phone.</div>
  </section>
</div>

${c.ad()}
${c.faq('Questions fréquentes')}
<section class="fr-end"><div class="fr-end-in">
  <h2>Allez, on se capte ?</h2>
  <p>Someone in France is up for a chat right now. Wesh, say hi.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</div></section>
</main>`,
};
