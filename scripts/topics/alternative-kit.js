'use strict';
// Shared layout for the "<app> alternative" guides. Each guide supplies its
// own words (what the app is, why people look elsewhere, when it is still the
// better pick) and its own colours; the structure - a plain comparison, an
// honest "stay with it if" box and a short FAQ - is the same on all of them.
// Space Grotesk for display, Inter to read.
function make(o) {
  const k = o.key;
  return {
    slug: o.slug,
    name: `${o.app} Alternative`,
    date: '2026-11-10',
    about: { '@type': 'Thing', name: `Alternatives to ${o.app}` },
    title: o.title,
    description: o.description,
    keywords: o.keywords,
    h1: `${o.app} Alternative`,
    theme: o.ink,
    preload: ['space-grotesk-latin-700-normal', 'inter-latin-400-normal'],
    css: `
:root{--paper:${o.paper};--ink:${o.ink};--rule:${o.rule};--accent:${o.accent};--mast:${o.ink}}
body{font-family:Inter,system-ui,sans-serif;background:var(--paper);color:var(--ink)}
.c-bar{border-bottom:1px solid var(--rule)}
.${k}-hero{max-width:900px;margin:0 auto;padding:50px 20px 24px}
.${k}-tag{display:inline-block;font:600 12px/1 Inter,sans-serif;letter-spacing:.1em;text-transform:uppercase;background:var(--accent);color:#fff;padding:8px 12px;border-radius:999px}
.${k}-hero h1{font:700 clamp(38px,7vw,84px)/.98 "Space Grotesk",sans-serif;letter-spacing:-.03em;margin:18px 0 16px}
.${k}-hero p{font-size:20px;line-height:1.6;margin:0 0 24px;max-width:680px}
.${k}-main{max-width:900px;margin:0 auto;padding:0 20px}
.${k}-sec{padding:38px 0 6px;border-top:1px solid var(--rule);margin-top:34px}
.${k}-sec h2{font:700 clamp(26px,3.8vw,40px)/1.05 "Space Grotesk",sans-serif;letter-spacing:-.02em;margin:0 0 14px}
.${k}-sec p{font-size:18px;line-height:1.72;margin:0 0 1em;max-width:740px}
.${k}-sec a{color:var(--accent)}
.table-scroll{overflow-x:auto}
.${k}-table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--rule);font-size:15.5px;margin:18px 0}
.${k}-table th,.${k}-table td{padding:13px 16px;text-align:left;border-bottom:1px solid var(--rule);vertical-align:top}
.${k}-table thead th{background:var(--ink);color:#fff;font:700 14px/1.2 "Space Grotesk",sans-serif}
.${k}-table td:last-child{font-weight:600;background:${o.tint}}
.${k}-stay{background:#fff;border:2px solid var(--ink);padding:20px 22px;margin:22px 0;font-size:16.5px;line-height:1.6}
.${k}-stay b{display:block;font:700 20px/1.2 "Space Grotesk",sans-serif;margin-bottom:6px}
.c-faq{max-width:900px;margin:40px auto 0;padding:0 20px}
.c-faq h2{font:700 34px/1.05 "Space Grotesk",sans-serif;margin:0 0 12px}
.c-faq summary{font:600 17px/1.45 Inter,sans-serif}
.c-faq p{font-size:16.5px;line-height:1.65}
.${k}-end{margin-top:60px;background:var(--ink);color:#fff;text-align:center;padding:56px 20px}
.${k}-end h2{font:700 clamp(32px,5.4vw,56px)/1 "Space Grotesk",sans-serif;margin:0 0 10px}
.${k}-end p{font-size:18px;line-height:1.55;margin:0 auto 24px;max-width:560px;color:#d8dee6}
.${k}-end .c-ctas{justify-content:center}
`,
    faq: o.faq,
    body: (c) => `<main id="story">
<section class="${k}-hero">
  <span class="${k}-tag">Alternative guide</span>
  <h1>${o.h1Line}</h1>
  <p>${o.dek}</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
<div class="${k}-main">
  <section class="${k}-sec"><h2>What ${o.app} is</h2>${o.what.map((p) => `<p>${p}</p>`).join('')}</section>
  <section class="${k}-sec"><h2>Why people look for something else</h2>${o.why.map((p) => `<p>${p}</p>`).join('')}</section>
  <section class="${k}-sec">
    <h2>${o.app} and TalkLive, side by side</h2>
    <div class="table-scroll"><table class="${k}-table"><thead><tr><th></th><th>${o.app}</th><th>TalkLive</th></tr></thead><tbody>${o.rows
    .map(([a, b, d]) => `<tr><th scope="row">${a}</th><td>${b}</td><td>${d}</td></tr>`).join('')}</tbody></table></div>
    <p>Details about other services change. Check ${o.app}'s own site for what it offers today.</p>
    <div class="${k}-stay"><b>Stay with ${o.app} if</b>${o.stay}</div>
  </section>
  <section class="${k}-sec"><h2>How TalkLive works</h2>
    <p>Open the site or the Android app and tap Talk for a voice call, or Chat for text. You are paired with one other adult, usually within seconds. There is no camera at any point, no account to create and no phone number to give. Calls are never recorded and go through a relay, so the other person does not see your IP address.</p>
    <p>If the conversation is not for you, one tap moves you on. Report and Block are on every call and chat, and our <a href="/safety">safety page</a> explains what happens when you use them. If you click with someone, add them as a friend and call or message them later without swapping numbers.</p>
  </section>
</div>
${c.faq('Questions people ask')}
<section class="${k}-end">
  <h2>Try a call without a camera</h2>
  <p>Free, no sign-up, adults only. Someone is online now.</p>
  ${c.ctas('Tap to Talk', 'Tap to Chat')}
</section>
</main>`,
  };
}
module.exports = { make };
