#!/usr/bin/env node
/*
 * TalkLive SEO builder.
 * Generates keyword-targeted landing pages, sitemap.xml and an index of
 * internal links from a single data model, so the SEO surface stays
 * consistent and scalable. Run: `npm run build:seo` (or `node scripts/build-seo.js`).
 * Output is written into ./public and committed to the repo.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SITE = 'https://talklive.app';
const PUBLIC = path.join(__dirname, '..', 'public');
const LANGS = ['en', 'es', 'pt', 'fr', 'de', 'ru', 'tr', 'ar', 'hi', 'ur', 'id', 'zh'];
const BUILD_DATE = new Date().toISOString().slice(0, 10);

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- Shared building blocks -------------------------------------------------

// Every landing page appears in the global nav/footer so link equity flows
// between them and back to the app. `slug: ''` is the home app.
const NAV = [
  { slug: 'talk-to-strangers', label: 'Talk to Strangers' },
  { slug: 'random-voice-chat', label: 'Random Voice Chat' },
  { slug: 'random-text-chat', label: 'Random Text Chat' },
  { slug: 'text-chat-with-strangers', label: 'Text Chat with Strangers' },
  { slug: 'random-video-chat', label: 'Random Video Chat' },
  { slug: 'random-video-call', label: 'Random Video Call' },
  { slug: 'random-call', label: 'Random Call' },
  { slug: 'anonymous-chat', label: 'Anonymous Chat' },
  { slug: 'meet-new-people', label: 'Meet New People' },
  { slug: 'international-calls', label: 'International Calls' },
  { slug: 'stranger-video-call', label: 'Stranger Video Call' },
  { slug: 'pakistani-chat', label: 'Pakistani Chat' },
  { slug: 'omegle-alternative', label: 'Omegle Alternative' },
  { slug: 'ometv-alternative', label: 'OmeTV Alternative' },
  { slug: 'monkey-app-alternative', label: 'Monkey App Alternative' },
  { slug: 'chatroulette-alternative', label: 'Chatroulette Alternative' },
  { slug: 'talk-to-someone', label: 'Talk to Someone' },
  { slug: 'free-online-calls', label: 'Free Online Calls' },
  { slug: 'practice-english-speaking', label: 'Practice English Speaking' },
];

function url(slug) { return slug ? `${SITE}/${slug}` : `${SITE}/`; }

function icon(name) {
  const p = {
    bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18"/>',
    shield: '<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3z"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="22"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 15.5c2.7.4 5 2.2 5 4.5"/>',
    chat: '<path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
    next: '<path d="M5 4v16M9 12h11M9 12l4-4M9 12l4 4"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    heart: '<path d="M12 20s-7-4.4-9.2-8.4C1.2 8.5 3 5.5 6 5.5c1.9 0 3.1 1 4 2 0.9-1 2.1-2 4-2 3 0 4.8 3 3.2 6.1C19 15.6 12 20 12 20z"/>',
    phone: '<path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.4 2.4z"/>',
    world: '<circle cx="12" cy="12" r="9"/><path d="M8 4c-1.5 3-1.5 13 0 16M16 4c1.5 3 1.5 13 0 16M3.5 9h17M3.5 15h17"/>',
  };
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p[name] || p.chat}</svg>`;
}

function headerHtml(currentSlug) {
  const links = NAV.filter(n => n.slug !== currentSlug).slice(0, 5)
    .map(n => `<a href="/${n.slug}">${n.label}</a>`).join('');
  return `<header class="site-header">
    <div class="wrap">
      <a class="logo" href="/"><img src="/favicon.svg" width="30" height="30" alt="TalkLive logo" /> TalkLive</a>
      <nav class="nav" aria-label="Primary">${links}</nav>
      <span style="display:inline-flex;gap:8px">
        <a class="btn btn-talk" href="/?utm_source=seo&amp;utm_medium=landing&amp;utm_campaign=${currentSlug || 'home'}" style="padding:10px 18px;font-size:15px">🎙 Talk</a>
        <a class="btn btn-chat" href="/?mode=chat&amp;utm_source=seo&amp;utm_medium=landing&amp;utm_campaign=${currentSlug || 'home'}" style="padding:10px 18px;font-size:15px">💬 Chat</a>
      </span>
    </div>
  </header>`;
}

function footerHtml() {
  const cols = [
    { h: 'Talk', items: NAV.slice(0, 4) },
    { h: 'Discover', items: NAV.slice(4) },
  ];
  const colHtml = cols.map(c => `<div><h4>${c.h}</h4><ul>${c.items.map(i => `<li><a href="/${i.slug}">${i.label}</a></li>`).join('')}</ul></div>`).join('');
  return `<footer class="site-footer">
    <div class="wrap">
      <div class="cols">
        <div style="max-width:280px">
          <a class="logo" href="/"><img src="/favicon.svg" width="28" height="28" alt="TalkLive logo" /> TalkLive</a>
          <p style="margin-top:12px">Free random voice &amp; text chat with strangers around the world. Tap to Talk or Tap to Chat — anonymous, no sign-up, just real live conversations.</p>
        </div>
        ${colHtml}
        <div><h4>App</h4><ul>
          <li><a href="/">Open TalkLive</a></li>
          <li><a href="/blog/">Blog</a></li>
          <li><a href="/pricing">Pricing</a></li>
          <li><a href="/about">About</a></li>
          <li><a href="/contact">Contact</a></li>
          <li><a href="/privacy">Privacy Policy</a></li>
          <li><a href="/terms">Terms</a></li>
        </ul></div>
      </div>
      <div class="legal">
        <span>&copy; ${new Date().getFullYear()} TalkLive. All rights reserved.</span>
        <span>Made for people who love to talk. 18+ only.</span>
      </div>
    </div>
  </footer>`;
}

function linkCloud(currentSlug) {
  const extra = [
    { slug: 'talk-to-strangers', label: 'Talk to strangers online' },
    { slug: 'random-voice-chat', label: 'Random voice chat' },
    { slug: 'random-text-chat', label: 'Random text chat' },
    { slug: 'text-chat-with-strangers', label: 'Text chat with strangers' },
    { slug: 'random-video-chat', label: 'Random video chat' },
    { slug: 'random-video-call', label: 'Random video call' },
    { slug: 'random-call', label: 'Random call app' },
    { slug: 'anonymous-chat', label: 'Anonymous chat' },
    { slug: 'meet-new-people', label: 'Meet new people' },
    { slug: 'international-calls', label: 'International calls' },
    { slug: 'stranger-video-call', label: 'Stranger video call' },
    { slug: 'omegle-alternative', label: 'Omegle alternative' },
    { slug: 'ometv-alternative', label: 'OmeTV alternative' },
    { slug: 'monkey-app-alternative', label: 'Monkey app alternative' },
    { slug: 'chatroulette-alternative', label: 'Chatroulette alternative' },
    { slug: 'talk-to-someone', label: 'Someone to talk to' },
    { slug: 'free-online-calls', label: 'Free online calls' },
    { slug: 'practice-english-speaking', label: 'Practice English speaking' },
    { slug: 'pakistani-chat', label: 'Pakistani voice chat' },
    { slug: '', label: 'Live voice chat rooms' },
    { slug: '', label: 'Free calls with strangers' },
  ];
  return `<div class="link-cloud">${extra.filter(e => e.slug !== currentSlug)
    .map(e => `<a href="${e.slug ? '/' + e.slug : '/'}">${e.label}</a>`).join('')}</div>`;
}

// --- Page template ----------------------------------------------------------

function page(p) {
  const canonical = url(p.slug);
  const features = p.features.map(f => `<div class="card"><div class="ico">${icon(f.icon)}</div><h3>${f.h}</h3><p>${f.p}</p></div>`).join('');
  const steps = p.steps.map(s => `<div class="step"><h3>${s.h}</h3><p>${s.p}</p></div>`).join('');
  const proseHtml = p.prose.map(b => b.h ? `<h2>${b.h}</h2>${b.body.map(x => `<p>${x}</p>`).join('')}` : b.body.map(x => `<p>${x}</p>`).join('')).join('');
  const faqHtml = p.faq.map(f => `<details><summary>${f.q}</summary><p>${f.a}</p></details>`).join('');

  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'TalkLive',
      alternateName: p.h1,
      url: canonical,
      applicationCategory: 'CommunicationApplication',
      operatingSystem: 'Web, Android, iOS',
      browserRequirements: 'Requires a modern browser with microphone access',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      inLanguage: LANGS,
      isAccessibleForFree: true,
      description: p.description,
      featureList: p.features.map(f => f.h).concat([
        'Tap to Talk — anonymous voice calls',
        'Tap to Chat — anonymous text chat',
      ]),
      aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.7', ratingCount: '2840', bestRating: '5' },
      publisher: { '@type': 'Organization', name: 'TalkLive', url: SITE, logo: `${SITE}/favicon.svg` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: p.crumb, item: canonical },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: p.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5162304231095978" crossorigin="anonymous"></script>
<script src="/loading.js"></script>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${esc(p.title)}</title>
<meta name="description" content="${esc(p.description)}" />
<meta name="keywords" content="${esc(p.keywords)}" />
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
<meta name="theme-color" content="#0b0f1a" />
<meta name="author" content="TalkLive" />
<link rel="canonical" href="${canonical}" />
<link rel="alternate" href="${canonical}" hreflang="x-default" />
${LANGS.map(l => `<link rel="alternate" href="${canonical}?lang=${l}" hreflang="${l}" />`).join('\n')}
<meta property="og:type" content="website" />
<meta property="og:site_name" content="TalkLive" />
<meta property="og:title" content="${esc(p.title)}" />
<meta property="og:description" content="${esc(p.description)}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${SITE}/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="TalkLive — free random voice chat with strangers worldwide" />
<meta property="og:locale" content="en_US" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(p.title)}" />
<meta name="twitter:description" content="${esc(p.description)}" />
<meta name="twitter:image" content="${SITE}/og-image.png" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/favicon.svg" />
<link rel="manifest" href="/site.webmanifest" />
<link rel="preconnect" href="https://flagcdn.com" crossorigin />
<link rel="stylesheet" href="/seo.css" />
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
${headerHtml(p.slug)}
<main>
  <section class="hero">
    <div class="wrap">
      <span class="eyebrow"><span class="dot"></span> ${p.eyebrow}</span>
      <h1>${p.h1}</h1>
      <p class="lede">${p.lede}</p>
      <div class="cta-row">
        <a class="btn btn-talk" href="/?utm_source=seo&amp;utm_medium=landing&amp;utm_campaign=${p.slug}">🎙 ${p.cta}</a>
        <a class="btn btn-chat" href="/?mode=chat&amp;utm_source=seo&amp;utm_medium=landing&amp;utm_campaign=${p.slug}">💬 ${p.ctaChat || 'Tap to Chat'}</a>
        <a class="btn btn-ghost" href="#how">How it works</a>
      </div>
      <p class="hero-meta">Free forever · No sign-up · Anonymous · Voice &amp; text · Works on any device</p>
    </div>
  </section>

  <section id="features">
    <div class="wrap center">
      <h2>${p.featuresH}</h2>
      <p class="section-intro">${p.featuresIntro}</p>
      <div class="grid">${features}</div>
    </div>
  </section>

  <section id="how">
    <div class="wrap">
      <h2>${p.stepsH}</h2>
      <p class="section-intro">${p.stepsIntro}</p>
      <div class="steps">${steps}</div>
    </div>
  </section>

  <section>
    <div class="wrap prose">${proseHtml}</div>
  </section>

  <section class="faq">
    <div class="wrap">
      <h2>Frequently asked questions</h2>
      ${faqHtml}
    </div>
  </section>

  <section>
    <div class="wrap">
      <h2>Explore more ways to connect</h2>
      <p class="section-intro">TalkLive is one app with many ways to meet people. Jump into whichever fits your mood.</p>
      ${linkCloud(p.slug)}
    </div>
  </section>

  <div class="wrap">
    <div class="cta-band">
      <h2>${p.ctaBandH}</h2>
      <p>${p.ctaBandP}</p>
      <div class="cta-row">
        <a class="btn btn-talk" href="/?utm_source=seo&amp;utm_medium=cta&amp;utm_campaign=${p.slug}">🎙 ${p.cta}</a>
        <a class="btn btn-chat" href="/?mode=chat&amp;utm_source=seo&amp;utm_medium=cta&amp;utm_campaign=${p.slug}">💬 ${p.ctaChat || 'Tap to Chat'}</a>
      </div>
    </div>
  </div>
</main>
${footerHtml()}
</body>
</html>
`;
}

// --- Content model ----------------------------------------------------------

const PAGES = [
  {
    slug: 'talk-to-strangers',
    crumb: 'Talk to Strangers',
    eyebrow: 'Live voice chat',
    title: 'Talk to Strangers Online — Free Random Voice Chat | TalkLive',
    description: 'Talk to strangers online for free with TalkLive. One tap connects you to a random person for a live, anonymous voice conversation. No sign-up, audio only, worldwide.',
    keywords: 'talk to strangers, talk to strangers online, chat with strangers, stranger chat, talk to strangers app, random stranger chat, free stranger chat',
    h1: 'Talk to Strangers Online — Instantly, for Free',
    lede: 'Tap once and TalkLive pairs you with a random person somewhere in the world for a live voice conversation. No profiles, no sign-up, no pressure — just real people and real talk.',
    cta: 'Talk to a Stranger',
    featuresH: 'Why people love talking to strangers on TalkLive',
    featuresIntro: 'Everything is built for spontaneous, judgment-free conversations that actually feel human.',
    features: [
      { icon: 'bolt', h: 'One-tap matching', p: 'Skip the forms. Press Tap to Talk and you are connected to a waiting stranger in seconds.' },
      { icon: 'shield', h: 'Stay anonymous', p: 'No real names, photos, or phone numbers required. Share only what you want to share.' },
      { icon: 'globe', h: 'People worldwide', p: 'Get matched with strangers from dozens of countries, or filter to the regions you prefer.' },
      { icon: 'next', h: 'Next in a tap', p: 'Not clicking? Hit Next Stranger and you are instantly matched with someone new.' },
      { icon: 'mic', h: 'Voice-first', p: 'Hearing a real voice builds a connection that typing never could. Mute anytime.' },
      { icon: 'lock', h: 'Safe by design', p: 'Block and report tools, plus repeated-report bans, keep conversations respectful.' },
    ],
    stepsH: 'How to talk to strangers on TalkLive',
    stepsIntro: 'From landing here to your first hello takes under ten seconds.',
    steps: [
      { h: 'Open TalkLive', p: 'Load the app in any browser on your phone or computer. Nothing to install.' },
      { h: 'Tap to Talk', p: 'Allow microphone access and press the big button to join the queue.' },
      { h: 'Meet a stranger', p: 'We instantly pair you with another person who wants to talk right now.' },
      { h: 'Talk or skip', p: 'Enjoy the conversation, add a friend, or tap Next for someone new.' },
    ],
    prose: [
      { h: 'A better way to talk to strangers', body: [
        'For as long as the internet has existed, people have wanted a simple way to talk to strangers — to hear a new voice, swap stories, practice a language, or just beat boredom at 2 a.m. TalkLive strips that experience down to its essence: one button, one stranger, one live conversation.',
        'Unlike endless text threads that fizzle out, a voice call carries tone, laughter, and personality. That is why a two-minute chat with a stranger on TalkLive often feels more real than hours of messaging elsewhere.' ] },
      { h: 'Who you will meet', body: [
        'TalkLive connects students, night-shift workers, travelers, language learners, and curious people from every continent. Some want a deep late-night talk, others want a quick laugh before moving on. Both are welcome, and the Next button means you are never stuck.',
        'Prefer to keep it local or go global? Optional filters let you widen or narrow who you meet without ever compromising your anonymity.' ] },
      { h: 'Respect and safety come first', body: [
        'Great conversations need to feel safe. Every user must be 18 or older, and one tap lets you block or report anyone who breaks the rules — which ends the call immediately. Repeated reports lead to bans, so the community stays friendly.' ] },
    ],
    faq: [
      { q: 'Is talking to strangers on TalkLive really free?', a: 'Yes. TalkLive is completely free to use with no hidden charges, no premium paywall for matching, and no credit card required.' },
      { q: 'Do I need to create an account?', a: 'No. You can start talking to strangers instantly without signing up. An optional free account lets you keep friends and history, but it is never required.' },
      { q: 'Is it anonymous?', a: 'Yes. You are identified only by a temporary display name. No phone number, email, or real name is needed to talk.' },
      { q: 'Can I choose who I talk to?', a: 'You can apply optional filters such as gender and country preferences. If no match is found quickly, TalkLive connects you with any available stranger so you never wait long.' },
      { q: 'What if someone is rude?', a: 'Tap report or block. The call ends instantly, that person can no longer reach you, and repeated reports can get them banned.' },
    ],
    ctaBandH: 'Ready to talk to a stranger?',
    ctaBandP: 'Thousands of people are online right now, waiting to say hello.',
  },
  {
    slug: 'random-voice-chat',
    crumb: 'Random Voice Chat',
    eyebrow: 'Audio only',
    title: 'Random Voice Chat — Free Live Audio Chat with Strangers | TalkLive',
    description: 'Free random voice chat with strangers worldwide. TalkLive connects you to a real voice in seconds — anonymous, audio-only, no sign-up. Start a random voice chat now.',
    keywords: 'random voice chat, voice chat, random audio chat, live voice chat, voice chat with strangers, free voice chat, random voice call, anonymous voice chat',
    h1: 'Random Voice Chat with Strangers — Free & Instant',
    lede: 'TalkLive is pure random voice chat: press one button and you are live with a random stranger, voice to voice. No video, no typing required, no accounts — just clear audio and real conversation.',
    cta: 'Start Random Voice Chat',
    featuresH: 'Random voice chat, done right',
    featuresIntro: 'Low-latency peer-to-peer audio and instant matching make every chat feel effortless.',
    features: [
      { icon: 'mic', h: 'Crystal-clear audio', p: 'Peer-to-peer WebRTC audio keeps latency low so voices sound natural and in sync.' },
      { icon: 'bolt', h: 'Instant random match', p: 'No lobbies to browse — one tap drops you straight into a live voice chat.' },
      { icon: 'shield', h: 'Anonymous & private', p: 'Audio flows directly between you and your partner; the server never records your call.' },
      { icon: 'next', h: 'Skip anytime', p: 'Tap Next to leave one voice chat and land in a fresh random one immediately.' },
      { icon: 'globe', h: 'Global voices', p: 'Talk with random people across the world or narrow it to your favorite regions.' },
      { icon: 'chat', h: 'Text alongside voice', p: 'Share a name, link, or word using in-call chat without interrupting the audio.' },
    ],
    stepsH: 'How random voice chat works',
    stepsIntro: 'Voice-only means you focus on the conversation, not on how you look.',
    steps: [
      { h: 'Press Tap to Talk', p: 'Allow your microphone and join the live queue with a single tap.' },
      { h: 'Get matched at random', p: 'TalkLive pairs you with another person who is ready for a voice chat right now.' },
      { h: 'Chat voice to voice', p: 'Speak freely. Mute when you need to, use in-call text for anything you want to type.' },
      { h: 'Next or make a friend', p: 'Loved the chat? Add them as a friend. Otherwise, tap Next for a new voice.' },
    ],
    prose: [
      { h: 'Why voice beats video and text', body: [
        'Random voice chat hits a sweet spot. Text feels slow and easy to fake; video can feel exposing and puts pressure on appearance. Voice keeps things human and warm while protecting your privacy — people relax, open up, and actually enjoy the conversation.',
        'Because TalkLive is audio-only, it also works great on slow connections and older phones. There is no camera to worry about and far less data to burn.' ] },
      { h: 'Built on real-time peer-to-peer audio', body: [
        'TalkLive uses WebRTC to send audio directly between the two people in a call. That means lower latency, better quality, and a design where your voice is never routed through or stored on a central server. The only thing our servers do is introduce two strangers and then get out of the way.' ] },
      { h: 'Great for language practice', body: [
        'Learners use random voice chat to practice speaking with native and fluent speakers from around the world. A few minutes of real conversation does more for your accent and confidence than an hour of drills.' ] },
    ],
    faq: [
      { q: 'Is TalkLive voice chat free?', a: 'Yes, random voice chat on TalkLive is 100% free with unlimited matches and no premium wall.' },
      { q: 'Do I need headphones?', a: 'Headphones are recommended because they prevent echo and improve call quality, but they are not required.' },
      { q: 'Is there video?', a: 'No. TalkLive is intentionally audio-only, which keeps it private, low-bandwidth, and pressure-free.' },
      { q: 'Are my calls recorded?', a: 'No. Audio flows peer-to-peer between you and the other person and is never recorded or stored by TalkLive.' },
      { q: 'Can I use it on mobile data?', a: 'Yes. Voice-only chat uses very little data, so it works well on mobile networks and slower connections.' },
    ],
    ctaBandH: 'Your next great conversation is one tap away',
    ctaBandP: 'Join the live random voice chat and meet someone new right now.',
  },
  {
    slug: 'random-text-chat',
    crumb: 'Random Text Chat',
    eyebrow: 'Text only · no mic',
    title: 'Random Text Chat — Free Anonymous Chat with Strangers | TalkLive',
    description: 'Free random text chat with strangers worldwide. Tap to Chat and TalkLive pairs you with a random person for an instant, anonymous text conversation — no mic, no sign-up, works on any phone.',
    keywords: 'random text chat, text chat, random chat, anonymous text chat, text chat with strangers, free text chat, stranger text chat, chat without mic, random chat no sign up',
    h1: 'Random Text Chat with Strangers — Instant & Anonymous',
    lede: 'Not in the mood to talk out loud? Tap to Chat and TalkLive pairs you with a random stranger for a live, anonymous text conversation. No microphone, no sign-up, no video — just fast, private messaging with a real person.',
    cta: 'Tap to Talk',
    ctaChat: 'Start Text Chat',
    featuresH: 'Text chat, stripped to the fun part',
    featuresIntro: 'Instant matching and a buttery-smooth chat screen that flies even on low-end phones.',
    features: [
      { icon: 'chat', h: 'Instant text match', p: 'Tap once and you are typing with a random stranger in seconds — no lobbies, no forms.' },
      { icon: 'bolt', h: 'Feather-light', p: 'No audio or video streams. The chat runs smoothly on 1GB phones, old laptops, and 2G-era connections.' },
      { icon: 'lock', h: 'Totally anonymous', p: 'No name, number, or email. You appear as a temporary display name that vanishes when you leave.' },
      { icon: 'shield', h: 'Nothing left behind', p: 'Stranger chats are relayed live and are not kept after your session ends.' },
      { icon: 'next', h: 'Next in one tap', p: 'Conversation fizzled? Tap next and a brand-new stranger appears instantly.' },
      { icon: 'mic', h: 'Switch to voice anytime', p: 'Feeling brave? One tap moves you to a live voice call — same app, same stranger pool.' },
    ],
    stepsH: 'How random text chat works',
    stepsIntro: 'From this page to a live conversation takes under five seconds — no permissions needed.',
    steps: [
      { h: 'Open TalkLive', p: 'Works in any browser on any device. Nothing to install, nothing to allow.' },
      { h: 'Tap to Chat', p: 'Press the blue chat button — no microphone or camera permission required.' },
      { h: 'Get matched instantly', p: 'We pair you with a random person who wants to text chat right now.' },
      { h: 'Type, laugh, next', p: 'Chat as long as you like, add a friend, or tap next for someone new.' },
    ],
    prose: [
      { h: 'Sometimes typing beats talking', body: [
        'Voice is great, but there are moments when text wins: you are in a quiet room at 2 a.m., on a bus, at work, or you simply think better with your thumbs. Random text chat gives you the same thrill of meeting a stranger — the new perspectives, the unexpected jokes, the "where are you from?" — without making a sound.',
        'TalkLive treats text as a first-class way to connect. Tap to Chat has its own matching pool, so everyone you meet there wants to type too. Nobody is waiting for you to unmute.' ] },
      { h: 'Built to fly on any device', body: [
        'Because a text chat carries no audio or video stream, TalkLive\'s chat mode is extraordinarily light. It works smoothly on entry-level Android phones, old desktops, and slow connections where video chat apps stutter and die. Messages are relayed instantly over a single lightweight connection.',
        'That makes it perfect for people on limited data plans too — an entire evening of text chat uses less data than a minute of video.' ] },
      { h: 'Anonymous, moderated, 18+', body: [
        'The same safety rails as voice chat apply: everyone is 18 or older, you appear only as a temporary display name, links are blocked automatically, and one tap reports and blocks anyone who misbehaves. Repeated reports lead to automatic bans.' ] },
    ],
    faq: [
      { q: 'Is random text chat on TalkLive free?', a: 'Yes. Text chat is completely free with unlimited matches — no credit card, no premium wall.' },
      { q: 'Do I need a microphone?', a: 'No. Tap to Chat is pure text — no microphone or camera permission is ever requested.' },
      { q: 'Will it work on my old phone?', a: 'Yes. Chat mode carries no audio or video, so it runs smoothly even on 1GB devices and slow networks.' },
      { q: 'Are my messages saved?', a: 'Stranger chat messages are relayed live and are not kept after your session ends.' },
      { q: 'Can I switch to a voice call?', a: 'Yes. Tap to Talk any time to join the voice pool — the same app with the same instant matching.' },
    ],
    ctaBandH: 'Someone is ready to chat right now',
    ctaBandP: 'Tap the blue button and say hi — no mic, no sign-up, no waiting.',
  },
  {
    slug: 'text-chat-with-strangers',
    crumb: 'Text Chat with Strangers',
    eyebrow: 'Anonymous messaging',
    title: 'Text Chat with Strangers — Free Anonymous Stranger Chat | TalkLive',
    description: 'Text chat with strangers online for free. TalkLive pairs you with a random person for an anonymous, live text conversation — no sign-up, no mic, no video. Start chatting in one tap.',
    keywords: 'text chat with strangers, chat with strangers, stranger chat, anonymous chat with strangers, talk to strangers text, free stranger chat, chat with random people, stranger messaging',
    h1: 'Text Chat with Strangers — Free, Anonymous, Instant',
    lede: 'One tap connects you with a random stranger somewhere in the world for a live text conversation. No profile, no sign-up, no microphone — share only what you choose and leave whenever you want.',
    cta: 'Tap to Talk',
    ctaChat: 'Chat with a Stranger',
    featuresH: 'Why people text strangers on TalkLive',
    featuresIntro: 'All the curiosity of meeting someone new, none of the pressure.',
    features: [
      { icon: 'users', h: 'Real people, right now', p: 'Every match is a live human who tapped the same button you did, seconds ago.' },
      { icon: 'lock', h: 'Anonymous by default', p: 'No real name, photo, or number. A temporary display name is all anyone sees.' },
      { icon: 'globe', h: 'The whole world typing', p: 'Meet strangers across dozens of countries, or filter to the regions you prefer.' },
      { icon: 'chat', h: 'Smooth, familiar chat', p: 'A clean messaging screen with typing indicators and instant delivery — like texting a friend you have not met yet.' },
      { icon: 'shield', h: 'Safe space, 18+', p: 'Link blocking, one-tap report and block, and automatic bans keep conversations respectful.' },
      { icon: 'heart', h: 'Keep the good ones', p: 'Click with someone? Add each other as friends and pick the conversation back up later.' },
    ],
    stepsH: 'How to text chat with strangers',
    stepsIntro: 'You are four taps away from your first hello.',
    steps: [
      { h: 'Open TalkLive', p: 'Any browser, any device. There is nothing to install and no account to make.' },
      { h: 'Tap to Chat', p: 'Press the blue button. No permissions, no forms — you go straight into matching.' },
      { h: 'Say hi', p: 'You are paired with a random stranger. Ask where they are from and take it anywhere.' },
      { h: 'Next or befriend', p: 'Tap next for a new stranger anytime, or add a friend to chat again later.' },
    ],
    prose: [
      { h: 'The lost art of talking to strangers, by text', body: [
        'There is something special about a conversation with zero history and zero stakes. A stranger does not know your friends, your job, or your past — so you can be completely honest, completely silly, or completely yourself. Text chat makes that first step effortless: no voice, no face, just words.',
        'People use TalkLive text chat to beat boredom, vent after a long day, practice a new language, get an outside opinion, or just see who else is awake somewhere on the planet.' ] },
      { h: 'Anonymous does not mean lawless', body: [
        'TalkLive is strictly 18+, and the text pool is guarded by the same moderation as voice: automatic link blocking kills spam before it lands, reporting takes one tap and instantly ends the chat, and repeat offenders are banned by device and IP.' ] },
      { h: 'From stranger to friend', body: [
        'The best stranger chats do not have to end. When a conversation clicks, both of you can tap Add Friend — then you can message each other again later and even move to a voice call, all without sharing a number or a real name.' ] },
    ],
    faq: [
      { q: 'Is it free to text chat with strangers?', a: 'Yes. Matching and chatting are completely free and unlimited, with no credit card required.' },
      { q: 'Do I need an account?', a: 'No. Tap to Chat and you are matched instantly. An optional free account only exists to keep friends between visits.' },
      { q: 'Is it really anonymous?', a: 'Yes. You appear only as a temporary display name — no real name, email, phone number, or photo.' },
      { q: 'What if someone is creepy or rude?', a: 'Tap report or block. The chat ends instantly, they can never reach you again, and repeated reports get them banned.' },
      { q: 'Can we move to a voice call?', a: 'Yes. TalkLive also has Tap to Talk voice calls — add each other as friends and call back whenever you are both online.' },
    ],
    ctaBandH: 'A stranger somewhere is waiting to say hi',
    ctaBandP: 'Free anonymous text chat with real people worldwide. One tap and you are in.',
  },
  {
    slug: 'random-call',
    crumb: 'Random Call',
    eyebrow: 'Instant calls',
    title: 'Random Call App — Free Live Calls with Strangers | TalkLive',
    description: 'Make a random call to a stranger for free with TalkLive. Instant live calls, anonymous and audio-only, no number or sign-up needed. Start a random call in seconds.',
    keywords: 'random call, random call app, live call, call strangers, random phone call, free random call, stranger call, random voice call online',
    h1: 'Random Call App — Call a Stranger Instantly',
    lede: 'TalkLive turns your browser into a random call machine. One tap places a live call to a stranger somewhere in the world — no phone number, no contacts, no sign-up. Just press and connect.',
    cta: 'Make a Random Call',
    featuresH: 'Everything a great random call needs',
    featuresIntro: 'The simplicity of a phone call with the surprise of meeting someone brand new.',
    features: [
      { icon: 'phone', h: 'Call in one tap', p: 'No dialing, no numbers. Tap to Talk places a live call to a random stranger instantly.' },
      { icon: 'lock', h: 'No number needed', p: 'Your phone number stays private. Random calls happen entirely inside the app.' },
      { icon: 'next', h: 'Redial the world', p: 'Not feeling it? Hang up and place a new random call with a single tap.' },
      { icon: 'globe', h: 'Reach any country', p: 'Random calls connect you across borders — or filter to specific regions if you like.' },
      { icon: 'shield', h: 'Safe and reportable', p: 'Block and report tools end bad calls instantly and keep the community clean.' },
      { icon: 'heart', h: 'Call friends back', p: 'Met someone great? Add them and call each other back later — no numbers exchanged.' },
    ],
    stepsH: 'How to make a random call',
    stepsIntro: 'It works like a phone call, minus the contacts and the cost.',
    steps: [
      { h: 'Open the app', p: 'Load TalkLive in any browser. There is nothing to download or install.' },
      { h: 'Tap to call', p: 'Allow your mic and press the call button to place a random call.' },
      { h: 'Talk live', p: 'You are connected to a real person on the line. Mute or use chat whenever you want.' },
      { h: 'Hang up or reconnect', p: 'End the call and tap again to reach a new stranger, or add them as a friend.' },
    ],
    prose: [
      { h: 'The thrill of a random call', body: [
        'There is something exciting about a call when you have no idea who will pick up. TalkLive brings back that spontaneity in a safe, modern way. Every random call is a tiny adventure — a new accent, a new story, a new person who happened to tap the button at the same moment you did.',
        'Because it is browser-based, there is no app store detour and no phone number to hand out. You are one tap from a live call and one tap from ending it.' ] },
      { h: 'Random calls without the risks', body: [
        'Traditional calling means sharing your number and hoping for the best. TalkLive keeps your identity private: you appear only as a temporary display name, and calls run over encrypted peer-to-peer audio. If a call goes sideways, blocking or reporting ends it instantly.' ] },
      { h: 'Perfect for quick connections', body: [
        'Waiting for a bus, taking a break, or winding down at night — a random call is the perfect length of company. Talk for two minutes or two hours, then move on whenever you like.' ] },
    ],
    faq: [
      { q: 'Does a random call cost anything?', a: 'No. Random calls on TalkLive are free and unlimited. It uses your internet connection, not your phone plan.' },
      { q: 'Do I have to share my phone number?', a: 'Never. Random calls happen inside the app using a temporary display name, so your real number stays private.' },
      { q: 'Can I call the same person again?', a: 'Yes, if you both add each other as friends you can call each other back later — still without sharing numbers.' },
      { q: 'What devices work?', a: 'Any device with a modern browser and a microphone: phones, tablets, laptops, and desktops.' },
      { q: 'Is it safe to call strangers here?', a: 'TalkLive is 18+, anonymous, and includes instant block and report tools plus automatic bans for repeat offenders.' },
    ],
    ctaBandH: 'Place your first random call now',
    ctaBandP: 'Someone out there is ready to pick up. Tap to connect.',
  },
  {
    slug: 'anonymous-chat',
    crumb: 'Anonymous Chat',
    eyebrow: 'Private by design',
    title: 'Anonymous Chat — Talk or Text with Strangers Privately | TalkLive',
    description: 'Anonymous chat with strangers on TalkLive — live voice calls or instant text chat. No name, number, or sign-up. Talk or type privately with people worldwide, free.',
    keywords: 'anonymous chat, anonymous voice chat, anonymous text chat, anonymous calls, chat anonymously, private chat with strangers, no sign up chat, anonymous stranger chat',
    h1: 'Anonymous Chat with Strangers — No Names, No Sign-Up',
    lede: 'TalkLive is anonymous by design, both ways: Tap to Talk for a live voice call or Tap to Chat for pure text. No name, number, or email — share only what you choose, and disappear whenever you want.',
    cta: 'Start Anonymous Chat',
    ctaChat: 'Anonymous Text Chat',
    featuresH: 'Privacy built into every conversation',
    featuresIntro: 'Anonymity is not a feature we bolt on — it is how TalkLive works from the ground up.',
    features: [
      { icon: 'lock', h: 'No personal details', p: 'No email, phone number, or real name required to start chatting anonymously.' },
      { icon: 'shield', h: 'Temporary identity', p: 'You appear as a random display name that leaves no trail once you close the tab.' },
      { icon: 'mic', h: 'Calls never stored', p: 'Voice runs peer-to-peer between you and your partner and is never recorded.' },
      { icon: 'next', h: 'Vanish anytime', p: 'Tap Next or close the app and the conversation is gone — no history left behind.' },
      { icon: 'chat', h: 'Voice or text — your pick', p: 'Tap to Talk for a live call, or Tap to Chat for anonymous text with no microphone at all.' },
      { icon: 'users', h: 'Optional friends', p: 'Choose to add someone as a friend, or stay completely anonymous. Your call.' },
    ],
    stepsH: 'How anonymous chat works',
    stepsIntro: 'You stay in control of your identity at every step.',
    steps: [
      { h: 'Open TalkLive', p: 'No registration screen — just the app and a big Tap to Talk button.' },
      { h: 'Get a random name', p: 'You are given a temporary display name so no real identity is ever exposed.' },
      { h: 'Chat freely', p: 'Speak with a random stranger while your personal information stays private.' },
      { h: 'Leave no trace', p: 'Close the tab and your session ends — nothing personal is kept.' },
    ],
    prose: [
      { h: 'Why anonymous chat matters', body: [
        'Sometimes the best conversations happen when nobody knows who you are. Anonymity removes the fear of judgment and lets people be honest, silly, vulnerable, or curious. On TalkLive you can talk about anything with a stranger you will never have to see again unless you both choose to.',
        'That freedom is exactly why anonymous chat has stayed popular for decades — and TalkLive brings it to live voice, which feels far more human than anonymous text.' ] },
      { h: 'Anonymous does not mean unsafe', body: [
        'Anonymity and safety go together here. Everyone is 18 or older, and powerful block and report tools mean you are always in control. Reporting someone ends the call instantly and can trigger an automatic ban, so being anonymous never means being unprotected.' ] },
      { h: 'How your privacy is protected', body: [
        'TalkLive does not ask for or need your identity. Voice audio travels directly between you and the other person using peer-to-peer WebRTC, so your conversation is not routed through or stored on a central server. When you leave, your temporary identity leaves with you.' ] },
    ],
    faq: [
      { q: 'Is TalkLive really anonymous?', a: 'Yes. You do not provide a name, email, or phone number. You are identified only by a temporary display name that disappears when you leave.' },
      { q: 'Can people find out who I am?', a: 'No. TalkLive never collects your identity, so there is nothing to reveal. You share personal details only if you choose to.' },
      { q: 'Are anonymous calls recorded?', a: 'No. Voice flows peer-to-peer and is never recorded or stored by TalkLive.' },
      { q: 'Do I need an account for anonymous chat?', a: 'No account is needed. An optional free account only exists if you want to keep friends between visits.' },
      { q: 'Is anonymous chat safe?', a: 'Yes. Everyone must be 18+, and instant block and report tools plus automatic bans keep conversations respectful.' },
    ],
    ctaBandH: 'Say anything, anonymously',
    ctaBandP: 'Start a private, anonymous voice chat with a stranger right now.',
  },
  {
    slug: 'meet-new-people',
    crumb: 'Meet New People',
    eyebrow: 'Social discovery',
    title: 'Meet New People Online — Make Friends by Voice | TalkLive',
    description: 'Meet new people from around the world on TalkLive. Make online friends through live voice chat — anonymous, free, no sign-up. Start meeting new people today.',
    keywords: 'meet new people, make new friends online, online friends, meet people online, social discovery, find friends, meet new people app, new friends by voice',
    h1: 'Meet New People from Around the World',
    lede: 'TalkLive is the easiest way to meet new people and make online friends through real voice conversations. No swiping, no profiles to polish — just tap, talk, and connect with someone new.',
    cta: 'Meet Someone New',
    featuresH: 'A friendlier way to meet people',
    featuresIntro: 'Real voices build real friendships faster than any profile grid ever could.',
    features: [
      { icon: 'users', h: 'Make real friends', p: 'Hit it off with someone? Add them as a friend and pick the conversation back up later.' },
      { icon: 'globe', h: 'A world of people', p: 'Meet people from dozens of countries and cultures without leaving your room.' },
      { icon: 'mic', h: 'Voice-first connection', p: 'Hearing someone laugh creates a bond that a photo and a bio simply cannot.' },
      { icon: 'heart', h: 'Shared interests', p: 'Add interests to your profile so conversations start with something in common.' },
      { icon: 'chat', h: 'Message friends', p: 'Keep in touch with the friends you make using built-in text messaging.' },
      { icon: 'bolt', h: 'No awkward setup', p: 'Skip the endless onboarding. You are meeting someone new within seconds.' },
    ],
    stepsH: 'How to meet new people on TalkLive',
    stepsIntro: 'Making a new friend has never taken less effort.',
    steps: [
      { h: 'Tap to Talk', p: 'Join the queue and get matched with a new person instantly.' },
      { h: 'Break the ice', p: 'Say hi and let the conversation flow. Interests help you find common ground.' },
      { h: 'Add as friend', p: 'When you click with someone, add them so you can talk again another day.' },
      { h: 'Keep in touch', p: 'Message your new friends and call them back whenever you both are online.' },
    ],
    prose: [
      { h: 'Meeting people should be simple', body: [
        'Modern apps make meeting people feel like work: build a profile, upload photos, write a bio, swipe for hours. TalkLive throws all of that out. You meet new people the natural way — by talking. Within seconds you are in a real conversation, and real conversations are where friendships actually start.',
        'Whether you are new in town, working remotely, or just craving fresh perspectives, TalkLive puts a whole world of interesting people one tap away.' ] },
      { h: 'From strangers to friends', body: [
        'Every friend was once a stranger. TalkLive makes that leap easy: when a conversation clicks, add the person as a friend and you can message and call them back later. Over time you build a little circle of voices from around the globe.' ] },
      { h: 'Social discovery without the pressure', body: [
        'No likes to chase, no followers to grow. TalkLive is about genuine one-to-one connection. Meet people because you are curious about them, not because of a number next to their name.' ] },
    ],
    faq: [
      { q: 'How do I meet new people on TalkLive?', a: 'Just tap to talk. TalkLive instantly matches you with a new person for a live voice conversation — no profiles or swiping needed.' },
      { q: 'Can I make lasting friends?', a: 'Yes. When you enjoy talking with someone, add them as a friend so you can message and call them again later.' },
      { q: 'Is it free to meet people here?', a: 'Completely. TalkLive is free with unlimited matches and no premium tier.' },
      { q: 'Can I meet people from specific countries?', a: 'Yes. Optional filters let you focus on particular regions, or leave them off to meet people from everywhere.' },
      { q: 'Do I need to show my face?', a: 'No. TalkLive is voice-only, so you meet people through conversation, not appearance.' },
    ],
    ctaBandH: 'The world is full of people worth meeting',
    ctaBandP: 'Tap to talk and make a new friend from anywhere on Earth.',
  },
  {
    slug: 'international-calls',
    crumb: 'International Calls',
    eyebrow: 'Global chat',
    title: 'Free International Calls to Strangers — Global Voice Chat | TalkLive',
    description: 'Make free international calls and join a global voice chat with strangers on TalkLive. Talk to people in other countries instantly — anonymous, audio-only, no sign-up.',
    keywords: 'international calls, free international calls, global chat, international voice chat, call other countries, talk to people worldwide, global voice chat, international random chat',
    h1: 'Free International Calls & Global Voice Chat',
    lede: 'TalkLive connects you with real people across the globe over live voice — no international dialing codes, no fees, no sign-up. Explore the world one conversation at a time.',
    cta: 'Call the World',
    featuresH: 'The whole world on the line',
    featuresIntro: 'Cross borders in a single tap and hear how the rest of the planet sounds.',
    features: [
      { icon: 'world', h: 'Reach every continent', p: 'Get matched with people from dozens of countries across every time zone.' },
      { icon: 'phone', h: 'No calling fees', p: 'Calls run over the internet, so international conversations never cost a cent.' },
      { icon: 'globe', h: 'Country filters', p: 'Include or exclude specific countries to steer who you connect with around the world.' },
      { icon: 'mic', h: 'Hear the world', p: 'New accents, new languages, new stories — global voice chat is endlessly surprising.' },
      { icon: 'lock', h: 'Private and safe', p: 'Talk internationally without sharing your number, with block and report tools built in.' },
      { icon: 'users', h: 'Global friendships', p: 'Add friends abroad and call them back later, bridging distance with your voice.' },
    ],
    stepsH: 'How to make international calls on TalkLive',
    stepsIntro: 'Talking to someone on the other side of the planet is a single tap away.',
    steps: [
      { h: 'Open TalkLive', p: 'Works in any browser, anywhere in the world, with nothing to install.' },
      { h: 'Set your reach', p: 'Leave filters open for the whole world, or pick countries you want to reach.' },
      { h: 'Tap to connect', p: 'Get matched with a stranger abroad and start a live international conversation.' },
      { h: 'Explore and repeat', p: 'Tap Next to hop to another country, or add a friend to call back later.' },
    ],
    prose: [
      { h: 'The world in your headphones', body: [
        'International calling used to mean expensive rates and clunky calling cards. TalkLive replaces all of that with a single button. Because calls travel over the internet as peer-to-peer audio, reaching someone thousands of miles away costs exactly the same as reaching your neighbor: nothing.',
        'Every match is a window into another culture. One tap you are chatting with a student in Jakarta, the next a night-owl in São Paulo or Istanbul. Global voice chat turns curiosity about the world into real conversations.' ] },
      { h: 'Practice languages with native speakers', body: [
        'International voice chat is a language learner\'s dream. Instead of textbooks, you get spontaneous conversations with people who actually speak the language. TalkLive supports twelve interface languages, so learners and locals alike feel at home.' ] },
      { h: 'Made for a global community', body: [
        'TalkLive is designed for a worldwide audience, with full right-to-left support for Arabic and Urdu and a clean, low-bandwidth experience that works even on slower international connections.' ] },
    ],
    faq: [
      { q: 'Are international calls on TalkLive free?', a: 'Yes. All calls use your internet connection, so talking to someone in another country is completely free.' },
      { q: 'Can I choose which countries to talk to?', a: 'Yes. Optional country filters let you include or exclude specific countries so you connect with the regions you want.' },
      { q: 'What languages does TalkLive support?', a: 'The interface is available in twelve languages including English, Spanish, Portuguese, Arabic, Hindi, Urdu, Chinese and more, with full right-to-left support.' },
      { q: 'Do I need a phone number to call internationally?', a: 'No. International calls happen inside the app with no number required, keeping your identity private.' },
      { q: 'Will it work on a slow connection?', a: 'Yes. TalkLive is audio-only and lightweight, so it performs well even on slower international networks.' },
    ],
    ctaBandH: 'The whole world is online right now',
    ctaBandP: 'Tap to start a free international call and meet someone far away.',
  },
  {
    slug: 'pakistani-chat',
    crumb: 'Pakistani Chat',
    eyebrow: 'Pakistan · پاکستان',
    title: 'Pakistani Chat — Free Pakistani Voice Chat with Strangers | TalkLive',
    description: 'Free Pakistani voice chat on TalkLive. Talk to strangers from Pakistan and around the world over live audio — anonymous, no sign-up. Start Pakistani chat now.',
    keywords: 'pakistani chat, pakistani voice chat, pakistan chat room, chat with pakistani, pakistani random chat, urdu voice chat, pakistani call, desi chat',
    h1: 'Pakistani Voice Chat — Talk to Strangers in Pakistan',
    lede: 'TalkLive brings free Pakistani voice chat to the world. Tap once to talk with strangers from Pakistan and beyond over live audio — anonymous, no number, no sign-up, full Urdu support.',
    cta: 'Start Pakistani Chat',
    featuresH: 'Made for the Pakistani community and friends worldwide',
    featuresIntro: 'A warm, safe, and free place to talk in Urdu, English, or any language you like.',
    features: [
      { icon: 'chat', h: 'Full Urdu support', p: 'The whole app is available in Urdu with proper right-to-left layout for a natural feel.' },
      { icon: 'globe', h: 'Connect at home & abroad', p: 'Talk with people across Pakistan or with the Pakistani diaspora around the world.' },
      { icon: 'lock', h: 'Anonymous & free', p: 'No number, no fees, no sign-up. Your privacy comes first, always.' },
      { icon: 'shield', h: 'Respectful community', p: 'Strict 18+ rules with instant block and report keep every conversation friendly.' },
      { icon: 'mic', h: 'Clear voice calls', p: 'Low-latency audio makes it feel like your friend is right there with you.' },
      { icon: 'users', h: 'Make desi friends', p: 'Add friends you click with and call each other back whenever you are online.' },
    ],
    stepsH: 'How Pakistani voice chat works',
    stepsIntro: 'From here to a live conversation in Urdu or English takes seconds.',
    steps: [
      { h: 'Open TalkLive', p: 'Set the language to Urdu if you like — the whole app adapts instantly.' },
      { h: 'Tap to Talk', p: 'Allow your microphone and join the live queue with one tap.' },
      { h: 'Meet a stranger', p: 'Get matched with someone from Pakistan or elsewhere, ready to talk right now.' },
      { h: 'Talk or add a friend', p: 'Enjoy the chat, add them as a friend, or tap Next for someone new.' },
    ],
    prose: [
      { h: 'A voice chat home for Pakistan', body: [
        'TalkLive gives the Pakistani community a free, modern place to talk. Whether you are in Karachi, Lahore, Islamabad, or living abroad and missing home, one tap connects you to a live voice — someone to share a laugh, a story, or a late-night conversation with in Urdu, English, or both.',
        'The entire app is fully translated into Urdu with proper right-to-left support, so it feels natural from the very first tap.' ] },
      { h: 'Connect with the whole world too', body: [
        'Pakistani chat on TalkLive is not a closed room. You can talk with fellow Pakistanis or open up to strangers from every continent, practicing English or simply making friends across cultures. Optional country filters let you focus on Pakistan or go global whenever you like.' ] },
      { h: 'Safe, respectful, and 18+', body: [
        'Community matters. TalkLive is strictly for adults, and one tap lets you block or report anyone who is disrespectful — which ends the call immediately. Repeated reports lead to bans, keeping the space friendly for everyone.' ] },
    ],
    faq: [
      { q: 'Is Pakistani voice chat on TalkLive free?', a: 'Yes, it is completely free with unlimited calls and no sign-up required.' },
      { q: 'Is the app available in Urdu?', a: 'Yes. TalkLive is fully translated into Urdu with proper right-to-left layout, alongside eleven other languages.' },
      { q: 'Can I talk to Pakistanis living abroad?', a: 'Yes. You can connect with people across Pakistan and with the Pakistani community worldwide.' },
      { q: 'Do I need to share my phone number?', a: 'No. Conversations happen inside the app with a temporary display name, so your number stays private.' },
      { q: 'Is it safe?', a: 'TalkLive is 18+ only and includes instant block and report tools plus automatic bans for repeat offenders.' },
    ],
    ctaBandH: 'Ab baat karein — start talking now',
    ctaBandP: 'Join free Pakistani voice chat and meet someone new in seconds.',
  },
  {
    slug: 'omegle-alternative',
    crumb: 'Omegle Alternative',
    eyebrow: 'Voice, not video',
    title: 'Best Omegle Alternative — Free Random Voice Chat | TalkLive',
    description: 'Looking for an Omegle alternative? TalkLive is free random chat with strangers — voice-only, anonymous, no sign-up, with real moderation. Talk to a stranger in one tap.',
    keywords: 'omegle alternative, omegle alternatives, sites like omegle, apps like omegle, omegle replacement, random chat like omegle, omegle without video',
    h1: 'The Omegle Alternative That Fixes What Omegle Got Wrong',
    lede: 'Omegle shut down because unmoderated random video went wrong. TalkLive keeps the magic — one tap, one random stranger, a live conversation — and drops the problems: it is voice-only, 18+, moderated, and completely free.',
    cta: 'Try the Alternative',
    featuresH: 'Why TalkLive is the Omegle alternative people stay on',
    featuresIntro: 'Everything you liked about random chat, rebuilt around voice and safety.',
    features: [
      { icon: 'mic', h: 'Voice instead of video', p: 'No camera means no explicit content problem and no pressure about how you look. Just talk.' },
      { icon: 'bolt', h: 'Instant random matching', p: 'One tap and you are live with a stranger — the same thrill Omegle had, without the wait.' },
      { icon: 'shield', h: 'Actually moderated', p: 'Instant block and report tools plus automatic bans for repeat offenders keep chats clean.' },
      { icon: 'lock', h: 'Anonymous by default', p: 'No account, email, or phone number required. You appear as a temporary display name only.' },
      { icon: 'globe', h: 'Worldwide or filtered', p: 'Meet strangers everywhere, or use country and gender filters to shape who you match.' },
      { icon: 'heart', h: 'Keep the good ones', p: 'Great conversation? Add each other as friends and call back later — no numbers exchanged.' },
    ],
    stepsH: 'From Omegle to TalkLive in ten seconds',
    stepsIntro: 'No download, no registration — it works exactly the way random chat should.',
    steps: [
      { h: 'Open TalkLive', p: 'Load it in any browser on your phone or computer. Nothing to install.' },
      { h: 'Tap to Talk', p: 'Allow your microphone and press the button to join the live queue.' },
      { h: 'Meet a random stranger', p: 'You are paired instantly with a real person who wants to talk right now.' },
      { h: 'Next or befriend', p: 'Skip to a new stranger any time, or add a friend to talk again later.' },
    ],
    prose: [
      { h: 'Why people are searching for an Omegle alternative', body: [
        'Omegle defined random chat for over a decade, then closed in late 2023 under the weight of its own moderation problems. Millions of people did not stop wanting spontaneous conversations with strangers — they just lost the place to have them. Most replacements copied the video format and inherited the same issues.',
        'TalkLive takes a different bet: the best part of Omegle was never the camera. It was the moment a random stranger said hello. Voice keeps that moment — the tone, the laughter, the accents — while removing the single biggest source of abuse on video chat platforms.' ] },
      { h: 'How TalkLive compares to other Omegle alternatives', body: [
        'Most sites like Omegle are video-first, ad-heavy, and lightly moderated. TalkLive is audio-only and free, with no camera anxiety, low data use, and calls that run peer-to-peer so your voice is never recorded on a server. Blocking and reporting takes one tap and ends the call immediately.',
        'It also works everywhere a browser works — no app store, no download, no sign-up wall. That is closer to the original Omegle spirit than most of its imitators.' ] },
      { h: 'Safer by design, not by promise', body: [
        'TalkLive is strictly 18+. There are no video streams to moderate, every user can be reported in one tap, and repeated reports lead to bans. Safety here is structural: remove the camera, and you remove the way random chat most often goes wrong.' ] },
    ],
    faq: [
      { q: 'Is TalkLive really a free Omegle alternative?', a: 'Yes. Matching and talking are completely free with no time limits and no credit card. Optional Premium only adds extras like advanced filters.' },
      { q: 'Does TalkLive have video like Omegle?', a: 'No, and that is deliberate. TalkLive is voice-only, which keeps chats private, low-pressure, and far safer than random video.' },
      { q: 'Do I need an account?', a: 'No. Tap once and you are talking. An optional free account lets you keep friends and history.' },
      { q: 'Why did Omegle shut down?', a: 'Omegle closed in November 2023, citing the cost and difficulty of fighting misuse of its unmoderated video chat. TalkLive avoids that failure mode by being voice-only, 18+, and moderated.' },
      { q: 'Can I choose who I get matched with?', a: 'Yes. Optional country and gender filters shape your matches, and if no filtered match is found quickly you are connected to any available stranger.' },
    ],
    ctaBandH: 'Ready for random chat done right?',
    ctaBandP: 'Thousands of strangers are online now. One tap and you are in a live conversation.',
  },
  {
    slug: 'random-video-chat',
    crumb: 'Random Video Chat',
    eyebrow: 'Voice-first alternative',
    title: 'Random Video Chat Alternative — Free Live Chat with Strangers | TalkLive',
    description: 'Want random video chat with strangers but not the camera pressure? TalkLive is the voice-first alternative: one tap, a random stranger, live and anonymous. Free, no sign-up.',
    keywords: 'random video chat, video chat, video chat with strangers, random video chat with strangers, chat video, random chat video, video chat app, live video chat',
    h1: 'Random Video Chat, Reimagined as Voice-First',
    lede: 'Random video chat gave the world instant conversations with strangers — and a pile of privacy and safety problems. TalkLive keeps the instant, random, worldwide part and swaps the camera for crystal-clear voice. One tap connects you live to a random person, anonymously.',
    cta: 'Start a Random Chat',
    featuresH: 'The best parts of random video chat, without the camera',
    featuresIntro: 'Everything people love about random video chat — the surprise, the speed, the reach — rebuilt around voice.',
    features: [
      { icon: 'mic', h: 'Voice instead of video', p: 'No camera means no awkwardness about how you look and none of the explicit-content problem that plagues random video chat.' },
      { icon: 'bolt', h: 'Instant random match', p: 'Tap once and you are live with a random stranger in seconds — the same rush as spinning to a new video chat.' },
      { icon: 'globe', h: 'Strangers worldwide', p: 'Get randomly matched with people across dozens of countries, or filter to the regions you prefer.' },
      { icon: 'next', h: 'Skip in one tap', p: 'Not clicking? Hit Next and you are instantly in a fresh random chat with someone new.' },
      { icon: 'shield', h: 'Moderated and safe', p: 'One-tap block and report tools plus automatic bans for repeat offenders keep the community clean.' },
      { icon: 'lock', h: 'Anonymous by design', p: 'No real name, photo, or number. Audio runs peer-to-peer and is never recorded on a server.' },
    ],
    stepsH: 'How random chat works on TalkLive',
    stepsIntro: 'From this page to talking with a random stranger takes under ten seconds.',
    steps: [
      { h: 'Open TalkLive', p: 'Load the app in any browser on your phone or computer. Nothing to install.' },
      { h: 'Tap to Talk', p: 'Allow microphone access and press the button to join the live random queue.' },
      { h: 'Meet a random stranger', p: 'We instantly pair you with another person who wants to chat right now.' },
      { h: 'Talk or spin again', p: 'Enjoy the conversation, add a friend, or tap Next for a brand-new random match.' },
    ],
    prose: [
      { h: 'Why a voice-first random chat beats random video chat', body: [
        'Random video chat is exciting because it is unpredictable — you never know who the next stranger will be. But the camera is also its biggest weakness: it invites explicit content, makes people self-conscious about their appearance, burns data, and is extremely hard to moderate at scale.',
        'TalkLive keeps the unpredictable magic and removes the camera. You get the same one-tap, random, worldwide matching, but the conversation is voice-to-voice. People relax faster, open up more, and there is far less that can go wrong.' ] },
      { h: 'Random chat that works on any device', body: [
        'Because there is no video stream, TalkLive works smoothly on slow connections, older phones, and mobile data. There is no camera permission to grant and no bandwidth-heavy stream to hold. Just tap, talk, and skip whenever you want.',
        'Audio flows directly between you and the other person over WebRTC, so latency is low and your voice is never routed through or stored on a central server.' ] },
      { h: 'Great for meeting people and practicing languages', body: [
        'People use random chat to beat boredom, make friends across the world, and practice speaking a new language with native speakers. A few minutes of real voice conversation does more for confidence and fluency than an hour of solo drills — and it is a lot more fun.' ] },
    ],
    faq: [
      { q: 'Does TalkLive have video chat?', a: 'No, and that is intentional. TalkLive is a voice-first alternative to random video chat, which keeps conversations private, low-pressure, low-data, and much safer.' },
      { q: 'Is random chat on TalkLive free?', a: 'Yes. Random matching and talking are completely free and unlimited, with no credit card and no premium wall for matching.' },
      { q: 'Do I need to sign up?', a: 'No. Tap once and you are chatting with a random stranger. An optional free account lets you keep friends and history.' },
      { q: 'Is it anonymous?', a: 'Yes. You appear only as a temporary display name — no real name, photo, phone number, or email required.' },
      { q: 'What if someone is inappropriate?', a: 'Tap report or block. The chat ends instantly, that person can no longer reach you, and repeated reports lead to a ban.' },
    ],
    ctaBandH: 'Ready for random chat without the camera?',
    ctaBandP: 'Thousands of strangers are online right now, ready for a live voice conversation.',
  },
  {
    slug: 'random-video-call',
    crumb: 'Random Video Call',
    eyebrow: 'Voice-first calling',
    title: 'Random Video Call Alternative — Free Live Calls with Strangers | TalkLive',
    description: 'Looking for a random video call with strangers? TalkLive is the free, voice-first alternative — one tap places a live call to a random person. Anonymous, no number, no sign-up.',
    keywords: 'random video call, video call, random video call app, free video call, video call with strangers, video call random, random call with strangers, live video call',
    h1: 'Random Video Call — the Free, Voice-First Way to Call Strangers',
    lede: 'Random video call apps connect you to strangers, but they cost your privacy and your data. TalkLive gives you the same instant thrill — one tap places a live call to a random person anywhere — as pure voice. No number, no camera, no sign-up.',
    cta: 'Make a Random Call',
    featuresH: 'A random call to a stranger, done safely',
    featuresIntro: 'The spontaneity of a random video call with none of the camera risk.',
    features: [
      { icon: 'phone', h: 'Call in one tap', p: 'No dialing, no numbers, no lobby. Tap to Talk places a live call to a random stranger instantly.' },
      { icon: 'lock', h: 'No number needed', p: 'Your phone number and identity stay private. Random calls happen entirely inside the app.' },
      { icon: 'mic', h: 'Voice, not video', p: 'Skip the camera pressure and the data drain. Clear peer-to-peer audio keeps it personal and private.' },
      { icon: 'next', h: 'Redial the world', p: 'Not feeling this call? Hang up and place a new random call to someone new with one tap.' },
      { icon: 'globe', h: 'Reach any country', p: 'Random calls connect you across borders, or filter to specific regions if you prefer.' },
      { icon: 'shield', h: 'Safe and reportable', p: 'One-tap block and report tools end bad calls instantly and keep the community clean.' },
    ],
    stepsH: 'How to make a random call',
    stepsIntro: 'It works like a video call app, minus the camera, the contacts, and the cost.',
    steps: [
      { h: 'Open the app', p: 'Load TalkLive in any browser. There is nothing to download or install.' },
      { h: 'Tap to call', p: 'Allow your microphone and press the call button to place a random call.' },
      { h: 'Talk live', p: 'You are connected to a real person on the line. Mute or use in-call text whenever you want.' },
      { h: 'Hang up or reconnect', p: 'End the call and tap again for a new stranger, or add them as a friend to call back.' },
    ],
    prose: [
      { h: 'Why voice beats a random video call', body: [
        'A random video call sounds fun until you think about what the camera exposes: your face, your room, your surroundings — to a complete stranger you have never met. It also eats data and makes many people self-conscious.',
        'TalkLive keeps the excitement of calling a random stranger and drops the camera. You appear only as a temporary display name, calls run over encrypted peer-to-peer audio, and nothing is recorded. It is the spontaneity of a random video call with your privacy intact.' ] },
      { h: 'Random calls without sharing your number', body: [
        'Traditional calling means handing out your phone number and hoping for the best. TalkLive places every random call inside the app, so your real number is never shared. If a call goes sideways, blocking or reporting ends it instantly.',
        'Because it is browser-based, there is no app-store detour — you are one tap from a live call and one tap from ending it.' ] },
      { h: 'Perfect for quick, spontaneous company', body: [
        'Waiting for a bus, on a break, or winding down late at night — a random call is the perfect length of company. Talk for two minutes or two hours, meet someone from the other side of the world, then move on whenever you like.' ] },
    ],
    faq: [
      { q: 'Does a random call on TalkLive use video?', a: 'No. TalkLive is a voice-first alternative to random video call apps — audio only, which keeps it private, low-data, and far safer.' },
      { q: 'Does it cost anything?', a: 'No. Random calls are free and unlimited. It uses your internet connection, not your phone plan.' },
      { q: 'Do I have to share my phone number?', a: 'Never. Random calls happen inside the app using a temporary display name, so your real number stays private.' },
      { q: 'Can I call the same person again?', a: 'Yes. If you both add each other as friends, you can call each other back later — still without sharing numbers.' },
      { q: 'What devices work?', a: 'Any device with a modern browser and a microphone: phones, tablets, laptops, and desktops.' },
    ],
    ctaBandH: 'Your next random call is one tap away',
    ctaBandP: 'Real people from around the world are online now, ready to pick up.',
  },
  {
    slug: 'ometv-alternative',
    crumb: 'OmeTV Alternative',
    eyebrow: 'Voice, not video',
    title: 'Best OmeTV Alternative — Free Random Voice Chat with Strangers | TalkLive',
    description: 'Looking for an OmeTV alternative? TalkLive is free random chat with strangers — voice-only, anonymous, moderated, no sign-up. Meet a random stranger in one tap.',
    keywords: 'ometv alternative, ome tv alternative, sites like ometv, apps like ome tv, ometv replacement, random chat like ometv, ome tv without video, ometv chat',
    h1: 'The OmeTV Alternative Built Around Voice and Safety',
    lede: 'OmeTV made random video chat huge — and inherited every problem that comes with an unmoderated camera. TalkLive keeps the one-tap, random, worldwide experience and rebuilds it around voice: anonymous, 18+, moderated, and completely free.',
    cta: 'Try the Alternative',
    featuresH: 'Why TalkLive is the OmeTV alternative people stay on',
    featuresIntro: 'Everything you liked about OmeTV, rebuilt around voice and real moderation.',
    features: [
      { icon: 'mic', h: 'Voice instead of video', p: 'No camera means no explicit-content problem and no pressure about how you look. Just talk.' },
      { icon: 'bolt', h: 'Instant random matching', p: 'One tap drops you straight into a live chat with a random stranger — no lobby, no wait.' },
      { icon: 'shield', h: 'Actually moderated', p: 'Instant block and report tools plus automatic bans for repeat offenders keep chats clean.' },
      { icon: 'lock', h: 'Anonymous by default', p: 'No account, email, or phone number required. You appear as a temporary display name only.' },
      { icon: 'globe', h: 'Worldwide or filtered', p: 'Meet strangers everywhere, or use country and gender filters to shape who you match.' },
      { icon: 'heart', h: 'Keep the good ones', p: 'Great conversation? Add each other as friends and call back later — no numbers exchanged.' },
    ],
    stepsH: 'From OmeTV to TalkLive in ten seconds',
    stepsIntro: 'No download, no registration — random chat the way it should work.',
    steps: [
      { h: 'Open TalkLive', p: 'Load it in any browser on your phone or computer. Nothing to install.' },
      { h: 'Tap to Talk', p: 'Allow your microphone and press the button to join the live queue.' },
      { h: 'Meet a random stranger', p: 'You are paired instantly with a real person who wants to talk right now.' },
      { h: 'Next or befriend', p: 'Skip to a new stranger any time, or add a friend to talk again later.' },
    ],
    prose: [
      { h: 'Why people look for an OmeTV alternative', body: [
        'OmeTV is one of the most popular random video chat apps, but the same things that make random video exciting also make it risky: explicit content, appearance pressure, heavy data use, and moderation that is always a step behind. Many people want the spontaneous stranger conversation without the camera baggage.',
        'TalkLive is that alternative. It keeps the moment a random stranger says hello — the tone, the accent, the laughter — while removing the single biggest source of abuse on video chat platforms: the camera.' ] },
      { h: 'How TalkLive compares to OmeTV', body: [
        'OmeTV is video-first, ad-supported, and lightly moderated. TalkLive is audio-only and free, with no camera anxiety, low data use, and calls that run peer-to-peer so your voice is never recorded on a server. Blocking and reporting takes one tap and ends the chat immediately.',
        'It also runs anywhere a browser works — no app store, no download, no sign-up wall.' ] },
      { h: 'Safer by structure, not by promise', body: [
        'TalkLive is strictly 18+. There are no video streams to police, every user can be reported in one tap, and repeated reports lead to bans. Safety here is built into the design: remove the camera, and you remove the way random chat most often goes wrong.' ] },
    ],
    faq: [
      { q: 'Is TalkLive a free OmeTV alternative?', a: 'Yes. Matching and talking are completely free with no time limits and no credit card. Optional Premium only adds extras like advanced filters.' },
      { q: 'Does TalkLive have video like OmeTV?', a: 'No, and that is deliberate. TalkLive is voice-only, which keeps chats private, low-pressure, and far safer than random video.' },
      { q: 'Do I need an account?', a: 'No. Tap once and you are talking. An optional free account lets you keep friends and history.' },
      { q: 'Is it moderated?', a: 'Yes. Every user can be blocked or reported in one tap, the chat ends instantly, and repeated reports lead to automatic bans.' },
      { q: 'Can I choose who I match with?', a: 'Yes. Optional country and gender filters shape your matches, and if no filtered match is found quickly you are connected to any available stranger.' },
    ],
    ctaBandH: 'Ready for random chat done right?',
    ctaBandP: 'Thousands of strangers are online now. One tap and you are in a live conversation.',
  },
  {
    slug: 'stranger-video-call',
    crumb: 'Stranger Video Call',
    eyebrow: 'Voice-first alternative',
    title: 'Stranger Video Call Alternative — Talk to Strangers Live & Free | TalkLive',
    description: 'Want a stranger video call but not the camera? TalkLive lets you call and talk to strangers live — voice-first, anonymous, no number, no sign-up. Free random calls worldwide.',
    keywords: 'stranger video call, video call with stranger, talk to strangers video call, video call stranger, stranger call, random stranger video call, call strangers, stranger video call app',
    h1: 'Stranger Video Call — the Voice-First Way to Talk to Strangers',
    lede: 'A stranger video call is exciting because you never know who is on the other end. TalkLive keeps that surprise and makes it safe: one tap places a live call to a random stranger, voice-to-voice. No camera, no number, no sign-up.',
    cta: 'Call a Stranger',
    featuresH: 'Everything a great stranger call needs',
    featuresIntro: 'The thrill of calling a stranger, with your privacy fully protected.',
    features: [
      { icon: 'phone', h: 'Call a stranger in one tap', p: 'No dialing, no lobby. Tap to Talk places a live call to a random stranger instantly.' },
      { icon: 'mic', h: 'Voice, not video', p: 'Skip the camera and the awkwardness. Clear peer-to-peer audio keeps the call personal and private.' },
      { icon: 'lock', h: 'Stay anonymous', p: 'No real name, photo, or phone number. You appear only as a temporary display name.' },
      { icon: 'next', h: 'New stranger anytime', p: 'Not feeling this one? Hang up and tap again to reach a completely new stranger.' },
      { icon: 'globe', h: 'Strangers worldwide', p: 'Call people across dozens of countries, or filter to the regions you prefer.' },
      { icon: 'shield', h: 'Safe and moderated', p: 'One-tap block and report tools end bad calls instantly, and repeat offenders are banned.' },
    ],
    stepsH: 'How to video-call a stranger the voice-first way',
    stepsIntro: 'From this page to talking with a stranger takes under ten seconds.',
    steps: [
      { h: 'Open TalkLive', p: 'Load the app in any browser on your phone or computer. Nothing to install.' },
      { h: 'Tap to call', p: 'Allow your microphone and press the button to place a live call to a stranger.' },
      { h: 'Talk to a stranger', p: 'You are connected to a real person right now. Mute or use in-call text anytime.' },
      { h: 'Hang up or add a friend', p: 'End the call for a new stranger, or add them as a friend to talk again later.' },
    ],
    prose: [
      { h: 'Why a voice-first stranger call is better', body: [
        'A stranger video call exposes your face, your room, and your surroundings to someone you have never met. That is a lot to give away for a conversation that might last two minutes. It also makes many people self-conscious and burns through mobile data.',
        'TalkLive keeps the excitement of calling a random stranger and removes the camera. You are just a voice and a temporary display name, calls run over encrypted peer-to-peer audio, and nothing is recorded. It is the surprise of a stranger video call with none of the exposure.' ] },
      { h: 'Talk to strangers without sharing anything personal', body: [
        'There is no number to hand out, no profile to build, and no account required. You tap, you talk to a stranger, and if it is not a fit you tap again. Blocking or reporting ends a call instantly and can get a rule-breaker banned.',
        'Because everything runs in the browser, it works on any phone, tablet, or computer with a microphone — no app store, no download.' ] },
      { h: 'A safer community by design', body: [
        'TalkLive is strictly 18+. Without a camera there are no video streams to exploit, every stranger can be reported in one tap, and repeated reports lead to automatic bans. The result is a friendlier place to meet strangers and talk.' ] },
    ],
    faq: [
      { q: 'Is this a real stranger video call?', a: 'TalkLive is a voice-first alternative to a stranger video call — you call and talk to random strangers live, but audio-only, which is more private and much safer than random video.' },
      { q: 'Is it free to call strangers?', a: 'Yes. Calling and talking to strangers is completely free and unlimited, with no credit card required.' },
      { q: 'Do I need to share my phone number?', a: 'No. Calls happen inside the app using a temporary display name, so your real number and identity stay private.' },
      { q: 'Is it safe to call strangers here?', a: 'TalkLive is 18+, anonymous, and includes instant block and report tools plus automatic bans for repeat offenders.' },
      { q: 'What devices can I use?', a: 'Any device with a modern browser and a microphone — phones, tablets, laptops, and desktops. Nothing to install.' },
    ],
    ctaBandH: 'Ready to call a stranger?',
    ctaBandP: 'Thousands of strangers are online right now, waiting for a live conversation.',
  },
  {
    slug: 'monkey-app-alternative',
    crumb: 'Monkey App Alternative',
    eyebrow: 'Voice, not video',
    title: 'Monkey App Alternative — Free Random Voice Chat with Strangers | TalkLive',
    description: 'Looking for a Monkey app alternative? TalkLive is free random chat with strangers — voice-only, anonymous, 18+, moderated, no sign-up. Meet a random stranger in one tap.',
    keywords: 'monkey app alternative, monkey alternative, apps like monkey, sites like monkey app, monkey app replacement, random chat like monkey, monkey video chat alternative',
    h1: 'The Monkey App Alternative for Grown-Up Random Chat',
    lede: 'The Monkey app made quick random video chats popular, but the camera brings real privacy and safety concerns. TalkLive keeps the fast, random, worldwide matching and rebuilds it around voice — anonymous, strictly 18+, moderated, and completely free.',
    cta: 'Try the Alternative',
    featuresH: 'Why TalkLive is the Monkey app alternative that feels safer',
    featuresIntro: 'Fast random matching with strangers, rebuilt around voice and real moderation.',
    features: [
      { icon: 'mic', h: 'Voice instead of video', p: 'No camera means no explicit-content problem and no pressure about how you look. Just talk.' },
      { icon: 'bolt', h: 'Instant random match', p: 'One tap connects you to a random stranger in seconds — the quick-match feel, without the camera.' },
      { icon: 'shield', h: 'Strictly 18+ and moderated', p: 'One-tap block and report tools plus automatic bans for repeat offenders keep the community clean.' },
      { icon: 'lock', h: 'Anonymous by default', p: 'No account, email, or phone number required. You appear as a temporary display name only.' },
      { icon: 'globe', h: 'Meet people worldwide', p: 'Get randomly matched across dozens of countries, or filter to the regions you prefer.' },
      { icon: 'next', h: 'Skip anytime', p: 'Not clicking? Tap Next and you are instantly matched with a brand-new stranger.' },
    ],
    stepsH: 'From the Monkey app to TalkLive in ten seconds',
    stepsIntro: 'No download, no registration — quick random chat the way it should work.',
    steps: [
      { h: 'Open TalkLive', p: 'Load it in any browser on your phone or computer. Nothing to install.' },
      { h: 'Tap to Talk', p: 'Allow your microphone and press the button to join the live queue.' },
      { h: 'Meet a random stranger', p: 'You are paired instantly with a real person who wants to talk right now.' },
      { h: 'Next or befriend', p: 'Skip to a new stranger any time, or add a friend to talk again later.' },
    ],
    prose: [
      { h: 'Why people look for a Monkey app alternative', body: [
        'The Monkey app popularized fast, random video chats, but random video comes with well-known downsides: exposure of your face and surroundings, appearance pressure, heavy data use, and moderation that struggles to keep up. Plenty of people want the quick random-stranger experience without the camera risk.',
        'TalkLive is that alternative. It keeps the fast, spontaneous match with a random stranger and swaps the camera for clear voice — so conversations feel human while staying private.' ] },
      { h: 'How TalkLive compares to the Monkey app', body: [
        'The Monkey app is video-first and skews young. TalkLive is audio-only, strictly 18+, and free, with no camera anxiety, low data use, and calls that run peer-to-peer so your voice is never recorded on a server. Blocking and reporting takes one tap and ends the chat immediately.',
        'It runs anywhere a browser works — no app store, no download, no sign-up wall.' ] },
      { h: 'Safer by design', body: [
        'TalkLive is built for adults and moderated by design. There are no video streams to exploit, every user can be reported in one tap, and repeated reports lead to bans. Remove the camera, and you remove the way random chat most often goes wrong.' ] },
    ],
    faq: [
      { q: 'Is TalkLive a free Monkey app alternative?', a: 'Yes. Matching and talking are completely free with no time limits and no credit card. Optional Premium only adds extras like advanced filters.' },
      { q: 'Does TalkLive have video like the Monkey app?', a: 'No, and that is deliberate. TalkLive is voice-only, which keeps chats private, low-pressure, and far safer than random video.' },
      { q: 'Is there an age requirement?', a: 'Yes. TalkLive is strictly for users 18 and older, and it is moderated with one-tap reporting and automatic bans.' },
      { q: 'Do I need an account?', a: 'No. Tap once and you are talking. An optional free account lets you keep friends and history.' },
      { q: 'Can I choose who I match with?', a: 'Yes. Optional country and gender filters shape your matches, and if no filtered match is found quickly you are connected to any available stranger.' },
    ],
    ctaBandH: 'Ready for random chat done right?',
    ctaBandP: 'Thousands of strangers are online now. One tap and you are in a live conversation.',
  },
  {
    slug: 'talk-to-someone',
    crumb: 'Talk to Someone',
    eyebrow: 'Someone is always awake',
    title: 'Need Someone to Talk To? Talk or Text with a Real Person Now | TalkLive',
    description: 'Need someone to talk to right now? TalkLive connects you with a real, friendly person in seconds — free voice call or text chat, anonymous, no sign-up, day or night.',
    keywords: 'someone to talk to, i need someone to talk to, talk to someone, need to talk to someone, talk to someone online free, someone to talk to online, talk to someone right now, free someone to talk to',
    h1: 'Need Someone to Talk To? Someone Is Here Right Now',
    lede: 'Some nights you just need another human. Tap once and TalkLive connects you with a real person for a live voice call — or a text chat if you would rather type. Free, anonymous, no sign-up, and someone is always online, whatever the hour.',
    cta: 'Talk to Someone Now',
    ctaChat: 'Chat with Someone',
    featuresH: 'A real person, whenever you need one',
    featuresIntro: 'Not a bot, not a feed — a live human who also felt like talking right now.',
    features: [
      { icon: 'users', h: 'Always someone awake', p: 'TalkLive is worldwide, so whatever time it is for you, it is evening for someone who wants to talk.' },
      { icon: 'heart', h: 'Judgment-free', p: 'A stranger has no history with you. Say what is really on your mind — vent, ramble, or just chat.' },
      { icon: 'lock', h: 'Completely anonymous', p: 'No name, number, or email. Share only what you choose and leave whenever you want.' },
      { icon: 'chat', h: 'Voice or text — your mood', p: 'Tap to Talk when you want to hear a voice, Tap to Chat when typing feels easier.' },
      { icon: 'bolt', h: 'No forms, no waiting', p: 'You are talking to someone within seconds. No profile, no sign-up, no queue of screens.' },
      { icon: 'shield', h: 'Respectful by design', p: 'Strictly 18+, with one-tap block and report tools that end a bad conversation instantly.' },
    ],
    stepsH: 'How to find someone to talk to right now',
    stepsIntro: 'From this page to a live conversation in under ten seconds.',
    steps: [
      { h: 'Open TalkLive', p: 'Works in any browser on any device. Nothing to install, nobody to register with.' },
      { h: 'Pick voice or text', p: 'Tap the green button to talk out loud, or the blue one to chat by text.' },
      { h: 'Meet a real person', p: 'You are matched with someone who also wants a conversation right now.' },
      { h: 'Talk as long as you like', p: 'Two minutes or two hours — end anytime, or tap Next to meet someone new.' },
    ],
    prose: [
      { h: 'Sometimes you just need to talk', body: [
        'Loneliness does not keep office hours. It shows up at 3 a.m., on quiet weekends, in new cities, after long shifts. What usually helps is not advice or a feed to scroll — it is another human voice saying "yeah, I get it." TalkLive exists for exactly that moment: one tap, and there is a real person on the line.',
        'People come here to vent about their day, think out loud about a decision, share good news that nobody around them cares about yet, or simply hear another voice while making dinner. There is no topic requirement and no pressure — it is just a conversation.' ] },
      { h: 'Why a stranger is sometimes the easiest person to talk to', body: [
        'Talking to friends and family can carry weight: their expectations, their worry, the fear of being judged or becoming a burden. A friendly stranger carries none of that. They do not know your boss, your ex, or your family — which is precisely why honesty comes easier. Psychologists call it the "strangers on a train" effect, and anyone who has had a great late-night conversation with a stranger knows it is real.',
        'And when the conversation clicks, it does not have to end: add each other as friends on TalkLive and you can talk again tomorrow — still without sharing a number or a real name.' ] },
      { h: 'A caring note', body: [
        'TalkLive is real people keeping each other company — it is not a counseling service, and strangers are not a substitute for professional support. If you are in crisis or having thoughts of harming yourself, please reach out to a local crisis line or emergency services right away (in the US, call or text 988; in the UK and Ireland, Samaritans at 116 123). For everyday loneliness, boredom, and the simple need to be heard — we are here, and it is free.' ] },
    ],
    faq: [
      { q: 'Is there really someone to talk to right now?', a: 'Yes. TalkLive matches people worldwide around the clock, so there is almost always someone online. Tap to Talk and you are usually connected within seconds.' },
      { q: 'Is it free to talk to someone?', a: 'Completely free — voice calls and text chat, unlimited, with no credit card and no sign-up.' },
      { q: 'Do I have to use my voice?', a: 'No. Tap to Chat pairs you with someone for a pure text conversation — no microphone or camera needed.' },
      { q: 'Will anyone know who I am?', a: 'No. You appear as a temporary display name. No phone number, email, or real name is ever required.' },
      { q: 'Is this a counseling or therapy service?', a: 'No. TalkLive is friendly strangers keeping each other company, not professional help. If you are in crisis, please contact a local crisis line (988 in the US, 116 123 in the UK/Ireland) or emergency services.' },
    ],
    ctaBandH: 'You do not have to sit with it alone',
    ctaBandP: 'A friendly stranger is online right now. Tap to talk or chat — free and anonymous.',
  },
  {
    slug: 'free-online-calls',
    crumb: 'Free Online Calls',
    eyebrow: 'Call from your browser',
    title: 'Free Online Calls — Voice Call People Without a Number | TalkLive',
    description: 'Make free online calls straight from your browser. TalkLive gives you unlimited voice calls with people worldwide — no phone number, no app, no sign-up. Start a free call now.',
    keywords: 'free online calls, free voice call online, online call free, make free calls online, voice call online, free calling website, call online without number, free internet calls, browser voice call',
    h1: 'Free Online Calls — No Number, No App, No Cost',
    lede: 'TalkLive turns any browser into a free calling app. One tap starts a live voice call with a real person anywhere on Earth — no phone number, no downloads, no minutes to count. Meet someone new, or add friends and call them back free, forever.',
    cta: 'Start a Free Call',
    featuresH: 'Everything a free calling app should be',
    featuresIntro: 'Real-time voice over the internet, minus the apps, accounts and per-minute charges.',
    features: [
      { icon: 'phone', h: 'Truly free calls', p: 'Calls travel over your internet connection, so talking costs nothing — across town or across the planet.' },
      { icon: 'lock', h: 'No phone number needed', p: 'Call and get called without ever revealing a number. Your identity stays yours.' },
      { icon: 'bolt', h: 'No app to install', p: 'Everything runs in the browser on any phone, tablet, or computer. Open the page and call.' },
      { icon: 'mic', h: 'Crystal-clear audio', p: 'Peer-to-peer WebRTC keeps latency low, so voices sound natural — often better than a phone line.' },
      { icon: 'users', h: 'Call friends back free', p: 'Add people you like and call each other again any time — your own free calling circle, no SIM required.' },
      { icon: 'world', h: 'Worldwide reach', p: 'International calls cost exactly the same as local ones here: nothing.' },
    ],
    stepsH: 'How to make a free call online',
    stepsIntro: 'No SIM, no credit, no setup — just your browser and a microphone.',
    steps: [
      { h: 'Open TalkLive', p: 'Load the site in any modern browser. There is nothing to download or configure.' },
      { h: 'Tap to Talk', p: 'Allow microphone access and press the green button to start a free voice call.' },
      { h: 'Talk to a real person', p: 'You are connected live with someone who wants to talk right now. Free, unlimited.' },
      { h: 'Build your circle', p: 'Add great people as friends and call each other back later — always free.' },
    ],
    prose: [
      { h: 'Free calling, actually free', body: [
        '"Free calls" usually comes with an asterisk: free for ten minutes, free if the other person installs the same app, free until the trial ends. TalkLive has no asterisk. Calls run peer-to-peer over your internet connection, so there is nothing to meter and nothing to bill — talk for five minutes or five hours.',
        'There is also nothing to install and nobody to invite. Where other calling apps are useless until your contacts join, TalkLive is full of people to talk to the moment you arrive.' ] },
      { h: 'Calls without a phone number', body: [
        'Your phone number is one of the most personal identifiers you own — and traditional calling forces you to hand it out. On TalkLive, calls happen entirely inside the browser under a temporary display name. You can meet someone, become friends, and call each other for years without either of you ever knowing the other\'s number.' ] },
      { h: 'Light on data, easy on devices', body: [
        'Voice-only calling uses a fraction of the data of a video call, so free online calls work fine on mobile data, hotel Wi-Fi, and older devices. If you can load a web page, you can make a call.' ] },
    ],
    faq: [
      { q: 'Are online calls on TalkLive really free?', a: 'Yes — unlimited voice calls at no cost. Calls use your internet connection, so there are no per-minute charges, trials, or hidden fees.' },
      { q: 'Do I need a phone number or SIM?', a: 'No. Calls run entirely in the browser under a temporary display name. No number, SIM, or email is required.' },
      { q: 'Can I call a specific person for free?', a: 'Yes. Meet someone on TalkLive, add each other as friends, and you can call each other back free whenever you are both online.' },
      { q: 'Do international calls cost more?', a: 'No. Distance is irrelevant on the internet — a call to another continent is as free as a call next door.' },
      { q: 'What do I need to start?', a: 'Any device with a modern browser and a microphone. Open TalkLive, tap the green button, and you are on a call.' },
    ],
    ctaBandH: 'Your next call is free — all of them are',
    ctaBandP: 'Tap once and talk to a real person anywhere in the world, straight from your browser.',
  },
  {
    slug: 'practice-english-speaking',
    crumb: 'Practice English Speaking',
    eyebrow: 'Language practice',
    title: 'Practice English Speaking Online Free — Talk with Real People | TalkLive',
    description: 'Practice English speaking online for free with real people. TalkLive connects you to live voice conversations in seconds — no classes, no fees, no sign-up. Start speaking English today.',
    keywords: 'practice english speaking, english speaking practice, practice english online free, speak english with strangers, english conversation practice, improve spoken english, talk in english online, free english speaking practice app',
    h1: 'Practice English Speaking with Real People — Free',
    lede: 'Fluency comes from speaking, not studying. TalkLive gives you unlimited live voice conversations with real people around the world — the fastest, most natural way to practice English, completely free and one tap away.',
    cta: 'Practice Speaking Now',
    ctaChat: 'Practice by Text First',
    featuresH: 'Why learners practice English on TalkLive',
    featuresIntro: 'Real conversations beat drills — and here every conversation is real.',
    features: [
      { icon: 'mic', h: 'Real conversation, instantly', p: 'One tap puts you in a live English conversation. No lesson plans, no scheduling, no tutors to book.' },
      { icon: 'globe', h: 'Every accent on Earth', p: 'Talk with speakers from the US, UK, India, the Philippines and beyond — train your ear on real-world English.' },
      { icon: 'shield', h: 'Mistake-friendly', p: 'Strangers are anonymous and judgment-free. Fumble a sentence, laugh, try again — nobody knows you.' },
      { icon: 'next', h: 'Unlimited partners', p: 'Every tap is a new person and a fresh conversation. That variety is exactly what builds fluency.' },
      { icon: 'chat', h: 'Warm up by text', p: 'Nervous? Start in Tap to Chat to practice written English, then switch to voice when you are ready.' },
      { icon: 'heart', h: 'Free forever', p: 'Tutors charge by the hour. TalkLive gives you unlimited speaking practice for exactly nothing.' },
    ],
    stepsH: 'How to practice English speaking here',
    stepsIntro: 'The method is simple: speak every day, with different people, about real things.',
    steps: [
      { h: 'Tap to Talk', p: 'Open TalkLive in your browser, allow the microphone, and press the green button.' },
      { h: 'Say hello', p: '"Hi! Where are you from?" is a perfect opener — and instant listening practice.' },
      { h: 'Keep it going', p: 'Talk about your day, your city, movies, food. Real topics build real vocabulary.' },
      { h: 'Repeat daily', p: 'Ten minutes a day with new partners beats an hour of drills once a week.' },
    ],
    prose: [
      { h: 'The fastest way to improve is to speak', body: [
        'Most learners spend years on grammar apps and vocabulary lists yet freeze when a real conversation starts. That is because speaking is a skill of its own — it needs live pressure, real reactions, and the small chaos of genuine conversation. TalkLive supplies exactly that, on demand, for free.',
        'Every call is spontaneous: you cannot script it, so your brain learns to build sentences in real time. A few weeks of daily ten-minute conversations does more for spoken fluency than months of silent study.' ] },
      { h: 'No teachers, no judgment — just practice', body: [
        'Speaking a new language in front of people you know is scary; speaking it to an anonymous stranger is not. On TalkLive nobody knows your name or face, so the fear of embarrassment disappears. If a conversation goes badly, tap Next — the next partner never knew.',
        'Many users you meet are learners too, practicing exactly like you, while others are native speakers happy to chat. Both make excellent practice: learners give you confidence, natives give you speed and idiom.' ] },
      { h: 'Tips to get the most out of it', body: [
        'Set a tiny daily habit — one call a day, even five minutes. Ask questions: people love talking about their city and food, and questions keep you listening actively. Do not translate in your head; describe around missing words instead ("the machine for cold food" will get you to "fridge"). And when you meet a great conversation partner, add them as a friend and make it a regular exchange.' ] },
    ],
    faq: [
      { q: 'Is this really free English speaking practice?', a: 'Yes. Unlimited voice conversations at no cost — no lesson fees, subscriptions, or trial limits.' },
      { q: 'Will I talk to native English speakers?', a: 'You will meet a global mix — native speakers and learners from many countries. Both improve your fluency, and country filters let you steer who you meet.' },
      { q: 'My English is basic. Is that okay?', a: 'Absolutely. Simple conversations are perfect practice, and partners are anonymous strangers — there is no embarrassment. You can also start with text chat to warm up.' },
      { q: 'How often should I practice?', a: 'Short and daily beats long and rare. Ten minutes of real conversation every day produces visible progress within weeks.' },
      { q: 'Do I need an account or an app?', a: 'No. TalkLive runs in any browser with one tap — no sign-up, no download, no booking.' },
    ],
    ctaBandH: 'Fluency is a conversation away',
    ctaBandP: 'Tap to Talk and start practicing English with a real person right now — free.',
  },
  {
    slug: 'chatroulette-alternative',
    crumb: 'Chatroulette Alternative',
    eyebrow: 'Roulette, minus the camera',
    title: 'Chatroulette Alternative — Random Chat Without the Camera | TalkLive',
    description: 'Looking for a Chatroulette alternative? TalkLive keeps the random-roulette thrill but swaps risky video for anonymous voice and text chat. Free, 18+, moderated, no sign-up.',
    keywords: 'chatroulette alternative, sites like chatroulette, chatroulette without video, apps like chatroulette, random roulette chat, chat roulette alternative, chatroulette replacement, voice roulette',
    h1: 'The Chatroulette Alternative Without the Camera Problem',
    lede: 'Chatroulette invented the random-chat roulette — and its camera invented the problems everyone knows about. TalkLive keeps the spin: one tap, a random stranger, next whenever you like — but over anonymous voice or text instead of video. Free, strictly 18+, and moderated.',
    cta: 'Spin the Roulette',
    ctaChat: 'Text Roulette',
    featuresH: 'Everything Chatroulette got right, none of what it got wrong',
    featuresIntro: 'Instant random matching with real people — rebuilt around voice, text, and actual moderation.',
    features: [
      { icon: 'bolt', h: 'The roulette thrill', p: 'Tap and you never know who you will get — a student in Berlin, a night owl in Karachi. That is the fun.' },
      { icon: 'mic', h: 'Voice, not video', p: 'No camera means no flashing problem, no appearance pressure, and no showing your room to strangers.' },
      { icon: 'chat', h: 'Text mode too', p: 'Tap to Chat is a full text roulette — random strangers, instant matching, no microphone needed.' },
      { icon: 'shield', h: 'Moderated and 18+', p: 'One-tap block and report, automatic bans for repeat offenders, and an adults-only policy.' },
      { icon: 'next', h: 'Next in one tap', p: 'The soul of roulette chat: not feeling it, tap Next and a new stranger appears instantly.' },
      { icon: 'lock', h: 'Anonymous always', p: 'No account, email, or number. You are a temporary display name that vanishes when you leave.' },
    ],
    stepsH: 'How the TalkLive roulette works',
    stepsIntro: 'Same one-button simplicity that made Chatroulette famous — safer execution.',
    steps: [
      { h: 'Open TalkLive', p: 'Runs in any browser on any device. No download, no registration.' },
      { h: 'Choose voice or text', p: 'Green button for a live voice call, blue button for a text chat.' },
      { h: 'Get a random stranger', p: 'The roulette matches you with a live person somewhere in the world.' },
      { h: 'Talk or spin again', p: 'Stay as long as it is good, tap Next the moment it is not.' },
    ],
    prose: [
      { h: 'Why people leave Chatroulette', body: [
        'Chatroulette\'s idea was brilliant: connect two random people, instantly, with a Next button. Its problem was the webcam. Random video attracts exhibitionists faster than moderators can ban them, makes everyone else self-conscious, and burns data. Most people who quit roulette sites quit because of what the camera showed them, not because random chat stopped being fun.',
        'TalkLive keeps the format and deletes the failure mode. Random matching, worldwide strangers, instant Next — over voice or text, where the worst thing a troll can do is talk, and one tap ends that.' ] },
      { h: 'Voice roulette feels surprisingly different', body: [
        'Without video, conversations get better. Nobody is judging a face or a bedroom, so people relax and actually talk. A voice carries humor, warmth, and accent — enough to feel genuinely human, not enough to compromise your privacy. And text mode drops the barrier even lower: no mic, no sound, just a live stranger and a keyboard.' ] },
      { h: 'Moderation that actually works', body: [
        'TalkLive is strictly 18+, blocks links automatically, and gives every user a one-tap report that ends the conversation instantly. Repeat offenders are banned by device and IP. A roulette is only fun when the next spin is safe — that is the whole design here.' ] },
    ],
    faq: [
      { q: 'Is TalkLive a free Chatroulette alternative?', a: 'Yes. Random voice and text matching are completely free and unlimited — no credit card, no trial.' },
      { q: 'Does TalkLive have video like Chatroulette?', a: 'No, on purpose. Voice and text keep the random-roulette fun while removing the explicit-content problem that plagues video roulette sites.' },
      { q: 'Can I skip people like on Chatroulette?', a: 'Yes — Next is one tap away at all times and instantly matches you with a new random stranger.' },
      { q: 'Do I need to sign up?', a: 'No. Open the site and tap once. An optional free account exists only to keep friends between visits.' },
      { q: 'Is it safe?', a: 'Much safer than video roulette: strictly 18+, anonymous, link-blocking, one-tap report and block, and automatic bans for repeat offenders.' },
    ],
    ctaBandH: 'Spin a better roulette',
    ctaBandP: 'Random strangers, instant Next, zero camera risk. Tap to talk or chat now.',
  },
];

// --- Blog -------------------------------------------------------------------
// Long-form SEO articles targeting long-tail keywords, published under /blog/.
// Each post gets Article + Breadcrumb JSON-LD and links back to the landing
// pages and the app, so blog authority flows into the money pages.

const BLOG = [
  {
    slug: 'best-omegle-alternatives',
    date: '2026-07-06',
    title: '10 Best Omegle Alternatives in 2026 (Voice-Only Options Included) | TalkLive Blog',
    h1: 'The 10 Best Omegle Alternatives in 2026',
    description: 'Omegle shut down — so where do you talk to strangers now? We compare the best Omegle alternatives in 2026, including voice-only options that skip the video weirdness.',
    keywords: 'omegle alternatives, omegle replacement, sites like omegle, talk to strangers, random chat 2026',
    tag: 'Guides',
    sections: [
      { h: null, ps: [
        'When Omegle shut down in November 2023, millions of people lost their favourite way to meet strangers on the internet. Since then, dozens of "Omegle alternatives" have appeared — but most of them copied the worst parts of Omegle (unmoderated video, endless bots) instead of the best part: the thrill of a real conversation with a random human.',
        'This guide looks at what actually matters in a stranger-chat app in 2026 — safety, moderation, speed of matching, and whether you can just start talking without giving away your identity — and ranks the options accordingly.',
      ]},
      { h: 'Why voice-only is winning', ps: [
        'The biggest shift since Omegle died is the move away from video. Video chat with strangers has two structural problems: it exposes your face to someone you know nothing about, and it attracts exactly the behaviour that killed Omegle. Voice-only platforms remove both problems at once. You stay anonymous, the conversation is the whole product, and moderation is dramatically more effective.',
        'Voice also just feels better. Without a camera you are not performing — you are talking. Users consistently report longer, deeper conversations on audio-only platforms than on video roulette sites.',
      ]},
      { h: 'Our top pick: TalkLive', ps: [
        'TalkLive is a free, voice-only random chat: one tap connects you to a live audio call with a stranger anywhere in the world. There is no sign-up, no video, and no recording — audio flows peer-to-peer between browsers and never touches the server. If a conversation is not working, "Next" instantly re-matches you.',
        'Moderation is built in: users can report bad actors, repeat offenders are banned by device and IP, and the whole platform is 18+. It works on any phone or laptop with a browser — nothing to install.',
      ]},
      { h: 'What to look for in any alternative', ps: [
        'Whatever platform you choose, check four things before you invest time in it. First, moderation: is there a working report button, and do bans actually stick? Second, privacy: does the site record your calls or require an account? Third, liveness: are real people online when you are, or do you sit in an empty queue? Fourth, friction: the best stranger-chat experiences are one tap from landing page to live conversation.',
        'Most video-roulette clones fail at least two of these. Voice-first platforms, purpose-built after Omegle’s shutdown, tend to pass all four.',
      ]},
      { h: 'The verdict', ps: [
        'If you miss Omegle for the conversations rather than the chaos, a voice-only platform is the closest thing to that original magic — with far less of the content that made Omegle unusable. Try a live voice call with a stranger and see how different it feels when nobody is on camera.',
      ]},
    ],
  },
  {
    slug: 'practice-english-speaking-online-free',
    date: '2026-07-06',
    title: 'How to Practice Speaking English Online for Free (With Real People) | TalkLive Blog',
    h1: 'How to Practice Speaking English Online for Free — With Real Humans',
    description: 'Apps teach you vocabulary, but only conversation makes you fluent. Here is how to practice speaking English online for free with real people, starting today.',
    keywords: 'practice english speaking online free, english conversation practice, speak english with strangers, language exchange, improve spoken english',
    tag: 'Language Learning',
    sections: [
      { h: null, ps: [
        'You can finish every Duolingo tree and still freeze when a real person asks you a question. That is because fluency is not knowledge — it is a motor skill. Your mouth, ears and brain need live, unpredictable conversation to wire together, and no flashcard app can simulate that.',
        'The problem: real conversation practice is expensive. Tutors cost $10–30 an hour, language exchange apps bury you in texting that never becomes a call, and speaking clubs meet once a week if you are lucky. Here is the free alternative.',
      ]},
      { h: 'Talk to random strangers — seriously', ps: [
        'Random voice chat platforms connect you to a live audio call with a stranger in seconds, free. For language learners this is close to a cheat code: every call is an unscripted conversation with a new accent, new speed, new vocabulary. You cannot memorise your way through it — which is exactly the point.',
        'Because it is voice-only and anonymous, the fear factor drops massively. Nobody sees your face, nobody knows your name, and if you embarrass yourself you tap "Next" and the moment is gone forever. That psychological safety is why shy speakers improve faster on anonymous voice chat than in classrooms.',
      ]},
      { h: 'A 30-day speaking routine that works', ps: [
        'Week 1: one 5-minute call per day. Your only goal is to survive the call — introduce yourself, ask where they are from, keep it going. Week 2: two calls per day, and steal one new phrase from every conversation (write it down after the call, not during). Week 3: push length — try to hold one 15-minute conversation daily. Week 4: variety — deliberately talk to different accents and ask people to correct you.',
        'Twenty minutes a day of real speaking beats two hours of app drills. By day 30 most learners notice they stop translating in their head and start just... answering.',
      ]},
      { h: 'Tips for your first calls', ps: [
        'Prepare three openers so you never freeze at "hello": where are you from, what time is it there, what did you do today. Do not apologise for your English — most people you meet are practising too. If someone is rude, skip instantly; the next human is one tap away. And keep calls anonymous: no real names, no socials, just conversation.',
      ]},
    ],
  },
  {
    slug: 'voice-chat-vs-video-chat',
    date: '2026-07-06',
    title: 'Voice Chat vs Video Chat: Why Audio Wins for Meeting Strangers | TalkLive Blog',
    h1: 'Voice Chat vs Video Chat: Why Audio-Only Wins for Meeting Strangers',
    description: 'Video roulette sites promised connection and delivered chaos. Here is why voice-only chat is safer, deeper and less awkward for talking to strangers online.',
    keywords: 'voice chat vs video chat, audio chat strangers, anonymous voice chat, is video chat safe, talking to strangers online',
    tag: 'Opinion',
    sections: [
      { h: null, ps: [
        'Every random-video-chat site eventually turns into the same place. If you have used one, you know exactly what we mean. The format itself is the problem: put anonymous people on camera with zero friction and the worst users define the experience for everyone else.',
        'Voice chat takes the single feature that attracts abuse — the camera — and deletes it. What is left is the actual product: two strangers having a conversation.',
      ]},
      { h: 'Safety is structural, not a policy', ps: [
        'On video, your face is your identity: it can be recorded, screenshotted and traced. On voice, you are a sound. Nobody can screenshot your voice into a profile. Combined with no sign-up and peer-to-peer audio that is never recorded, anonymity on a voice platform is real rather than promised.',
        'Moderation works better too. Video moderation requires scanning frames in real time — expensive and always behind. Voice platforms lean on user reports plus device and IP bans, which is simpler and more decisive.',
      ]},
      { h: 'Conversations get deeper without a camera', ps: [
        'Psychologists have known this for decades: removing visual self-awareness makes people more honest. It is why therapy couches face away from the therapist and why late-night phone calls go deep. On camera you manage your face, your background, your angle. On audio you just talk — and strangers tell each other things they would never say on video.',
        'There is a practical side as well: you can voice chat lying in bed with the lights off, walking, or looking like you just woke up. The barrier to starting a conversation drops to zero.',
      ]},
      { h: 'When video still makes sense', ps: [
        'Video is right when identity is the point — catching up with family, remote work, dating apps where you have already matched. But for the specific act of meeting a stranger, audio-first is simply the better-engineered experience: safer by design, easier to moderate, and better at producing the thing you came for — a real conversation.',
      ]},
    ],
  },
  {
    slug: 'is-talklive-safe',
    date: '2026-07-06',
    title: 'Is TalkLive Safe? How Our Anonymous P2P Voice Chat Actually Works | TalkLive Blog',
    h1: 'Is TalkLive Safe? How Our Anonymous Voice Chat Actually Works',
    description: 'A transparent look at TalkLive safety: peer-to-peer audio that is never recorded, no sign-up required, report and ban systems, and what data we do and don’t keep.',
    keywords: 'is talklive safe, anonymous voice chat safety, p2p audio privacy, talk to strangers safely, webrtc privacy',
    tag: 'Trust & Safety',
    sections: [
      { h: null, ps: [
        'Any app that connects you to strangers owes you a straight answer about safety. This post explains exactly how TalkLive works under the hood — what we can see, what we cannot, and what happens when someone behaves badly.',
      ]},
      { h: 'Your voice never touches our servers', ps: [
        'TalkLive calls run on WebRTC, the same technology behind most modern calling apps. Once two people are matched, audio streams directly between their browsers — peer-to-peer. Our server only performs the introduction: it pairs two waiting users and relays the connection setup messages. It never receives, hears, or stores call audio. We could not record your calls even if we wanted to, because the audio does not pass through us.',
      ]},
      { h: 'Anonymous by default', ps: [
        'You can use TalkLive without creating an account. No name, no email, no phone number. The person you talk to sees a display name and a country flag — nothing else. Signing up (optional) only exists so you can keep friends and settings across devices.',
        'Browsers enforce microphone permission on secure origins, so TalkLive runs on HTTPS everywhere, and your mic is only live during a call — mute is one tap and hangs up entirely with another.',
      ]},
      { h: 'What happens to bad actors', ps: [
        'Every user can report a call. Reports are reviewed with full context, and bans apply to both the device and the IP address — a banned user cannot reconnect until the ban expires. Accumulate three reports and you are automatically banned while a human reviews. The platform is 18+ and moderation activity is logged and audited.',
      ]},
      { h: 'What we do keep, honestly', ps: [
        'We keep operational data: aggregate visit counts, match counts, country-level statistics, and reports with the context needed to act on them. Text chat (the optional in-call messaging) is retained for moderation and disclosed in our privacy policy. Voice is never recorded, full stop. If a service claims stranger chat with zero data, read their privacy policy — moderation without any data is impossible, and we would rather be honest about the trade-off we chose.',
      ]},
    ],
  },
  {
    slug: 'science-of-talking-to-strangers',
    date: '2026-07-06',
    title: 'The Science of Talking to Strangers: Why It Makes You Happier | TalkLive Blog',
    h1: 'The Science of Talking to Strangers (And Why It Makes You Happier)',
    description: 'Research keeps finding the same thing: conversations with strangers boost mood, reduce loneliness, and go deeper than we expect. Here’s the science, simply explained.',
    keywords: 'talking to strangers benefits, loneliness research, social connection science, why talk to strangers, conversations with strangers study',
    tag: 'Wellbeing',
    sections: [
      { h: null, ps: [
        'We are living through what health officials have called a loneliness epidemic — and at the same time, most of us actively avoid the cheapest known remedy: talking to people we do not know. The research on stranger conversations is remarkably consistent, and it points the opposite way from our instincts.',
      ]},
      { h: 'We wrongly predict strangers will reject us', ps: [
        'In a well-known series of studies, behavioural scientists Nicholas Epley and Juliana Schroeder asked commuters to strike up conversations with strangers on trains. Participants predicted the conversations would be awkward and unwelcome. The result was the reverse: talkers reported significantly happier commutes, and their partners enjoyed it too. The barrier was not the experience — it was the (wrong) forecast of the experience.',
        'Follow-up research found the same "liking gap" everywhere: after talking to someone new, we systematically underestimate how much they liked us.',
      ]},
      { h: 'Deep talk with strangers feels surprisingly good', ps: [
        'A 2021 paper in the Journal of Personality and Social Psychology found that people expect deep questions with strangers to be excruciating and instead find them connecting — strangers were willing to go deeper than participants predicted, and both sides came away happier. Anonymity amplifies this: when someone has no link to your real life, the social cost of honesty drops to zero. It is the "stranger on a train" effect, and voice chat is essentially that train, on demand.',
      ]},
      { h: 'Even weak ties count', ps: [
        'Sociologist Mark Granovetter’s classic work on "the strength of weak ties" and later studies by Gillian Sandstrom show that interactions with acquaintances and strangers — not just close friends — measurably improve belonging and mood. You do not need every conversation to produce a best friend. The conversation itself is the nutrient.',
        'So the practical advice from the literature is almost embarrassingly simple: talk to more strangers. Your brain will tell you it will go badly. Your brain is, statistically, wrong.',
      ]},
    ],
  },
  {
    slug: 'how-to-start-a-conversation-with-a-stranger',
    date: '2026-07-06',
    title: 'How to Start a Conversation With a Stranger (25 Openers That Work) | TalkLive Blog',
    h1: 'How to Start a Conversation With a Stranger: 25 Openers That Actually Work',
    description: 'Never freeze at "hello" again. Practical conversation openers, follow-up techniques and exit lines for talking to strangers — online or off.',
    keywords: 'how to start a conversation, conversation starters with strangers, what to say to a stranger, voice chat conversation topics, icebreakers',
    tag: 'Guides',
    sections: [
      { h: null, ps: [
        'The first ten seconds with a stranger feel like the hardest part, but they are actually the most forgiving: nobody expects brilliance at "hello". A stranger has zero context on you, which means any genuine question is interesting. Here is a toolbox that works both on voice chat and in real life.',
      ]},
      { h: 'Openers that always have somewhere to go', ps: [
        'Location openers: "Where in the world are you right now?" / "What time is it there?" / "What’s the weather doing?" — simple, universal, and they instantly produce a follow-up (life in their city, why they are awake at 3am). Day openers: "What did you do today?" / "What are you avoiding doing right now?" Curiosity openers: "What made you tap the call button today?" — surprisingly disarming, because the honest answer is usually a real story.',
        'For language-exchange calls: "Can I practise my English with you? Correct me when I mess up." People love being asked to help.',
      ]},
      { h: 'The 70/30 rule of keeping it alive', ps: [
        'A conversation dies when both people answer in full stops. Keep yours alive with the 70/30 rule: for every answer you give, spend roughly a third of it on the answer and the rest adding a hook — a detail, an opinion, a question back. "I’m from Karachi" is a full stop. "I’m from Karachi — it’s 2am here and the whole city is still awake, is your city a night city?" is a conversation.',
        'Listen for their hooks too. People constantly drop threads ("...since I moved", "...after work") hoping you will pull one. Pull one.',
      ]},
      { h: 'Exiting gracefully (and instantly)', ps: [
        'On voice chat, the exit is built in: "This was great — I’m going to jump to the next call. Good luck out there." No excuses needed; the format expects it. That freedom cuts both ways, and it is what makes practice cheap: a bad conversation costs you five seconds, a good one can last an hour. The only way to get good at talking to strangers is volume, and random voice chat gives you more first-conversations per hour than any other place on earth.',
      ]},
    ],
  },
  {
    slug: 'psychological-benefits-of-talking-to-strangers',
    date: '2026-07-07',
    title: 'The Psychological Benefits of Talking to Strangers Every Day | TalkLive Blog',
    h1: 'The Psychological Benefits of Talking to Strangers Every Day',
    description: 'A short, simple look at how a daily voice chat with a stranger can lift your mood, ease loneliness, and build real confidence over time.',
    keywords: 'psychological benefits of talking to strangers, mental health benefits of voice chat, loneliness, mood boost, social confidence',
    tag: 'Wellbeing',
    sections: [
      { h: null, ps: [
        'Most of us spend the day texting people we already know. That is fine, but it is not the same as a real conversation with a new voice. A quick voice chat with a stranger works on your mind in ways a text message never will, and the effect is bigger than most people expect.',
      ]},
      { h: 'It lifts your mood almost right away', ps: [
        'Talking out loud to another person, even for a few minutes, wakes up your brain in a different way than scrolling or typing. Your tone changes, you laugh a little, you react in real time. That small burst of live connection often leaves people feeling lighter and calmer right after the call ends.',
      ]},
      { h: 'It quietly fights loneliness', ps: [
        'Loneliness is not only about being alone. It is about going long stretches without a real human exchange. A short voice chat breaks that stretch. It reminds your brain that people are out there, that conversation still feels good, and that you are not invisible. Over time, small doses like this add up to a real drop in the lonely feeling.',
      ]},
      { h: 'It builds your confidence to speak', ps: [
        'Every time you open a conversation with someone new and it goes fine, your brain updates its expectations. You learn that starting small talk is not scary, that silence is not the end of the world, and that most strangers are kind when you are kind first. This confidence carries over into calls, interviews, and everyday conversations with people you know.',
      ]},
      { h: 'It gives your brain a small, healthy challenge', ps: [
        'Meeting someone new means you cannot predict what they will say. Your brain has to listen, think, and respond on the spot. This kind of light mental exercise keeps your social skills sharp, in the same way a short walk keeps your body from feeling stiff.',
      ]},
      { h: 'A simple daily habit', ps: [
        'You do not need a long call or a deep talk every time. Even a five minute chat, once a day, is enough to notice a difference in your mood within a week or two. Think of it as a small daily habit for your mind, the same way you might stretch your body every morning.',
      ]},
    ],
  },
];

function blogUrl(slug) { return `${SITE}/blog/${slug}`; }

function blogPost(b) {
  const canonical = blogUrl(b.slug);
  const bodyHtml = b.sections.map(s =>
    (s.h ? `<h2>${s.h}</h2>` : '') + s.ps.map(p => `<p>${p}</p>`).join('')
  ).join('');
  const words = b.sections.reduce((n, s) => n + s.ps.join(' ').split(/\s+/).length, 0);
  const readMins = Math.max(2, Math.round(words / 200));
  const others = BLOG.filter(x => x.slug !== b.slug).slice(0, 3)
    .map(x => `<li><a href="/blog/${x.slug}">${esc(x.h1)}</a></li>`).join('');

  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: b.h1,
      description: b.description,
      datePublished: b.date,
      dateModified: BUILD_DATE,
      mainEntityOfPage: canonical,
      image: `${SITE}/og-image.png`,
      wordCount: words,
      author: { '@type': 'Organization', name: 'TalkLive', url: SITE },
      publisher: { '@type': 'Organization', name: 'TalkLive', url: SITE, logo: { '@type': 'ImageObject', url: `${SITE}/favicon.svg` } },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog/` },
        { '@type': 'ListItem', position: 3, name: b.h1, item: canonical },
      ],
    },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5162304231095978" crossorigin="anonymous"></script>
<script src="/loading.js"></script>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${esc(b.title)}</title>
<meta name="description" content="${esc(b.description)}" />
<meta name="keywords" content="${esc(b.keywords)}" />
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
<meta name="theme-color" content="#0b0f1a" />
<meta name="author" content="TalkLive" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="TalkLive" />
<meta property="og:title" content="${esc(b.h1)}" />
<meta property="og:description" content="${esc(b.description)}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${SITE}/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="article:published_time" content="${b.date}" />
<meta property="article:section" content="${esc(b.tag)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(b.h1)}" />
<meta name="twitter:description" content="${esc(b.description)}" />
<meta name="twitter:image" content="${SITE}/og-image.png" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="manifest" href="/site.webmanifest" />
<link rel="stylesheet" href="/seo.css" />
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
${headerHtml('blog')}
<main>
  <article>
    <section class="hero" style="padding-bottom:24px">
      <div class="wrap">
        <span class="eyebrow"><span class="dot"></span> ${esc(b.tag)} · ${readMins} min read</span>
        <h1>${esc(b.h1)}</h1>
        <p class="lede">${esc(b.description)}</p>
        <p class="hero-meta">By the TalkLive team · Updated ${BUILD_DATE}</p>
      </div>
    </section>
    <section>
      <div class="wrap prose">${bodyHtml}</div>
    </section>
  </article>

  <div class="wrap">
    <div class="cta-band">
      <h2>Try it right now — talk or text with a stranger</h2>
      <p>TalkLive is free, anonymous random chat — live voice calls or instant text chat. No sign-up, no video, no recording. One tap and you're in a live conversation.</p>
      <div class="cta-row">
        <a class="btn btn-talk" href="/?utm_source=blog&amp;utm_medium=cta&amp;utm_campaign=${b.slug}">🎙 Start Talking Free</a>
        <a class="btn btn-chat" href="/?mode=chat&amp;utm_source=blog&amp;utm_medium=cta&amp;utm_campaign=${b.slug}">💬 Start Chatting Free</a>
      </div>
    </div>
  </div>

  <section>
    <div class="wrap prose">
      <h2>Keep reading</h2>
      <ul>${others}</ul>
      <p><a href="/blog/">← All articles</a></p>
    </div>
  </section>
</main>
${footerHtml()}
</body>
</html>
`;
}

function blogIndex() {
  const canonical = `${SITE}/blog/`;
  const cards = BLOG.map(b => `<a class="card" href="/blog/${b.slug}" style="display:block;text-decoration:none">
      <p style="margin:0 0 8px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;opacity:.7">${esc(b.tag)}</p>
      <h3 style="margin:0 0 10px">${esc(b.h1)}</h3>
      <p>${esc(b.description)}</p>
    </a>`).join('');
  const ld = [{
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'TalkLive Blog',
    url: canonical,
    description: 'Guides and research on talking to strangers, voice chat, language practice and online safety — from the team behind TalkLive.',
    publisher: { '@type': 'Organization', name: 'TalkLive', url: SITE },
    blogPost: BLOG.map(b => ({ '@type': 'BlogPosting', headline: b.h1, url: blogUrl(b.slug), datePublished: b.date })),
  }];
  return `<!DOCTYPE html>
<html lang="en">
<head>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5162304231095978" crossorigin="anonymous"></script>
<script src="/loading.js"></script>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>TalkLive Blog — Talking to Strangers, Voice Chat & Language Practice</title>
<meta name="description" content="Guides and research on talking to strangers, voice-only chat, practising languages with real people, and staying safe online — from the team behind TalkLive." />
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
<meta name="theme-color" content="#0b0f1a" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="TalkLive" />
<meta property="og:title" content="TalkLive Blog" />
<meta property="og:description" content="Guides and research on talking to strangers, voice chat and language practice." />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${SITE}/og-image.png" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="manifest" href="/site.webmanifest" />
<link rel="stylesheet" href="/seo.css" />
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
${headerHtml('blog')}
<main>
  <section class="hero" style="padding-bottom:24px">
    <div class="wrap">
      <span class="eyebrow"><span class="dot"></span> The TalkLive Blog</span>
      <h1>Conversations, strangers &amp; the science of talking</h1>
      <p class="lede">Guides and research on meeting people by voice — from the team behind TalkLive.</p>
    </div>
  </section>
  <section>
    <div class="wrap">
      <div class="grid">${cards}</div>
    </div>
  </section>
  <div class="wrap">
    <div class="cta-band">
      <h2>Done reading? Go talk — or chat.</h2>
      <p>One tap connects you to a live voice call or an anonymous text chat with a stranger somewhere in the world. Free and anonymous.</p>
      <div class="cta-row">
        <a class="btn btn-talk" href="/?utm_source=blog&amp;utm_medium=index">🎙 Start Talking Free</a>
        <a class="btn btn-chat" href="/?mode=chat&amp;utm_source=blog&amp;utm_medium=index">💬 Start Chatting Free</a>
      </div>
    </div>
  </div>
</main>
${footerHtml()}
</body>
</html>
`;
}

// --- Emit -------------------------------------------------------------------

let count = 0;
for (const p of PAGES) {
  fs.writeFileSync(path.join(PUBLIC, `${p.slug}.html`), page(p));
  count++;
}

// Blog: /blog/ index + one page per post.
const BLOG_DIR = path.join(PUBLIC, 'blog');
fs.mkdirSync(BLOG_DIR, { recursive: true });
fs.writeFileSync(path.join(BLOG_DIR, 'index.html'), blogIndex());
for (const b of BLOG) {
  fs.writeFileSync(path.join(BLOG_DIR, `${b.slug}.html`), blogPost(b));
  count++;
}

// Sitemap with hreflang alternates for the home + all landing pages.
const sitemapUrls = [{ slug: '', priority: '1.0', freq: 'daily' }]
  .concat(PAGES.map(p => ({ slug: p.slug, priority: '0.8', freq: 'weekly' })))
  .concat([{ slug: 'blog/', priority: '0.7', freq: 'weekly', raw: true }])
  .concat(BLOG.map(b => ({ slug: `blog/${b.slug}`, priority: '0.6', freq: 'monthly', raw: true })))
  .concat([
    { slug: 'pricing', priority: '0.5', freq: 'monthly', raw: true },
    { slug: 'about', priority: '0.4', freq: 'yearly', raw: true },
    { slug: 'contact', priority: '0.4', freq: 'yearly', raw: true },
    { slug: 'privacy', priority: '0.3', freq: 'yearly', raw: true },
    { slug: 'terms', priority: '0.3', freq: 'yearly', raw: true },
    { slug: 'refund', priority: '0.3', freq: 'yearly', raw: true },
  ]);

function buildSitemap() {
  const head = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">';
  const body = sitemapUrls.map(u => {
    const loc = u.raw ? `${SITE}/${u.slug}` : url(u.slug);
    const alts = u.raw ? '' : ['\n    <xhtml:link rel="alternate" hreflang="x-default" href="' + loc + '"/>']
      .concat(LANGS.map(l => `\n    <xhtml:link rel="alternate" hreflang="${l}" href="${loc}${loc.includes('?') ? '&' : '?'}lang=${l}"/>`)).join('');
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${BUILD_DATE}</lastmod>\n    <changefreq>${u.freq}</changefreq>\n    <priority>${u.priority}</priority>${alts}\n  </url>`;
  }).join('\n');
  return `${head}\n${body}\n</urlset>\n`;
}
fs.writeFileSync(path.join(PUBLIC, 'sitemap.xml'), buildSitemap());

console.log(`Built ${count} landing pages + sitemap.xml (${sitemapUrls.length} urls).`);
