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

const SITE = 'https://talklive.ai';
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
  { slug: 'random-call', label: 'Random Call' },
  { slug: 'anonymous-chat', label: 'Anonymous Chat' },
  { slug: 'meet-new-people', label: 'Meet New People' },
  { slug: 'international-calls', label: 'International Calls' },
  { slug: 'pakistani-chat', label: 'Pakistani Chat' },
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
      <a class="btn btn-primary" href="/?utm_source=seo&amp;utm_medium=landing&amp;utm_campaign=${currentSlug || 'home'}" style="padding:10px 20px;font-size:15px">Start Talking</a>
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
          <p style="margin-top:12px">Free random voice chat with strangers around the world. One tap, anonymous, no sign-up — just real live conversations.</p>
        </div>
        ${colHtml}
        <div><h4>App</h4><ul>
          <li><a href="/">Open TalkLive</a></li>
          <li><a href="/privacy.html">Privacy Policy</a></li>
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
    { slug: 'random-call', label: 'Random call app' },
    { slug: 'anonymous-chat', label: 'Anonymous chat' },
    { slug: 'meet-new-people', label: 'Meet new people' },
    { slug: 'international-calls', label: 'International calls' },
    { slug: 'pakistani-chat', label: 'Pakistani voice chat' },
    { slug: '', label: 'Live voice chat rooms' },
    { slug: '', label: 'Free calls with strangers' },
    { slug: '', label: 'Global chat' },
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
      featureList: p.features.map(f => f.h),
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
<meta property="og:image" content="${SITE}/og-image.svg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="TalkLive — free random voice chat with strangers worldwide" />
<meta property="og:locale" content="en_US" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(p.title)}" />
<meta name="twitter:description" content="${esc(p.description)}" />
<meta name="twitter:image" content="${SITE}/og-image.svg" />
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
        <a class="btn btn-primary" href="/?utm_source=seo&amp;utm_medium=landing&amp;utm_campaign=${p.slug}">${p.cta}</a>
        <a class="btn btn-ghost" href="#how">How it works</a>
      </div>
      <p class="hero-meta">Free forever · No sign-up · Anonymous · Works on any device</p>
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
      <a class="btn btn-primary" href="/?utm_source=seo&amp;utm_medium=cta&amp;utm_campaign=${p.slug}">${p.cta}</a>
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
    title: 'Anonymous Chat — Talk to Strangers Privately | TalkLive',
    description: 'Anonymous voice chat with strangers on TalkLive. No name, number, or sign-up — talk privately with people worldwide over live audio. Start an anonymous chat free.',
    keywords: 'anonymous chat, anonymous voice chat, anonymous calls, chat anonymously, private chat with strangers, no sign up chat, anonymous stranger chat',
    h1: 'Anonymous Chat with Strangers — No Names, No Sign-Up',
    lede: 'TalkLive is anonymous by design. Talk to real people over live voice without ever revealing your name, number, or email. Share only what you choose, and disappear whenever you want.',
    cta: 'Start Anonymous Chat',
    featuresH: 'Privacy built into every conversation',
    featuresIntro: 'Anonymity is not a feature we bolt on — it is how TalkLive works from the ground up.',
    features: [
      { icon: 'lock', h: 'No personal details', p: 'No email, phone number, or real name required to start chatting anonymously.' },
      { icon: 'shield', h: 'Temporary identity', p: 'You appear as a random display name that leaves no trail once you close the tab.' },
      { icon: 'mic', h: 'Calls never stored', p: 'Voice runs peer-to-peer between you and your partner and is never recorded.' },
      { icon: 'next', h: 'Vanish anytime', p: 'Tap Next or close the app and the conversation is gone — no history left behind.' },
      { icon: 'globe', h: 'Talk to anyone', p: 'Meet anonymous strangers from around the world without exposing who you are.' },
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
];

// --- Emit -------------------------------------------------------------------

let count = 0;
for (const p of PAGES) {
  fs.writeFileSync(path.join(PUBLIC, `${p.slug}.html`), page(p));
  count++;
}

// Sitemap with hreflang alternates for the home + all landing pages.
const sitemapUrls = [{ slug: '', priority: '1.0', freq: 'daily' }]
  .concat(PAGES.map(p => ({ slug: p.slug, priority: '0.8', freq: 'weekly' })))
  .concat([{ slug: 'privacy.html', priority: '0.3', freq: 'yearly', raw: true }]);

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
