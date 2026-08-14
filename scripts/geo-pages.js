'use strict';
/*
 * Country, city and language landing pages.
 *
 * These are programmatic pages, which is a format Google is right to be
 * suspicious of — the usual version is one template with a name substituted
 * in, which is a doorway page. The defence here is that every page is built
 * from facts in scripts/data/geo.js that are true of exactly one place: the
 * languages actually spoken there, the local clock and when its users are
 * awake, the cities searched alongside it, and a paragraph of context that
 * would be wrong under any other heading. Two pages from this file never share
 * a paragraph of body copy.
 *
 * Output shape matches CORE_PAGES in build-seo.js, plus:
 *   parent  breadcrumb ancestor { slug, label } for the nested URL
 *   cluster which sub-sitemap and hub the page belongs to
 *
 * Prose bodies are emitted unescaped by the page template, so internal links
 * are written inline here — that is deliberate, and the only interpolated
 * values are our own slugs and names, never anything user-supplied.
 */
const { COUNTRIES, LANGUAGES } = require('./data/geo');

const byCountrySlug = new Map(COUNTRIES.map(c => [c.slug, c]));

// Every city, flattened out of the country records, so a city page can name
// its neighbours and the hub can list them all.
const CITIES = [];
for (const c of COUNTRIES) {
  for (const city of c.cities) {
    CITIES.push({ ...city, country: c });
  }
}

function list(items, join = 'and') {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${join} ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} ${join} ${items[items.length - 1]}`;
}

function langNames(c) { return c.langs.map(l => l.name); }

// "the United States", "the Philippines" — a handful of country names need a
// definite article to read as English. Without this every generated sentence
// says "in United States", which reads like machine output and undermines the
// whole point of writing these pages properly.
function nm(c) { return c.the ? `the ${c.name}` : c.name; }
// Same, capitalised for the start of a sentence.
function Nm(c) { return c.the ? `The ${c.name}` : c.name; }

function link(href, text) { return `<a href="${href}">${text}</a>`; }

/*
 * Length-aware title and description builders.
 *
 * Google truncates titles around 60 characters and descriptions around 155.
 * A template that reads fine for "Manila" overflows for "Saint Petersburg" or
 * "United Arab Emirates", and a truncated title loses whatever was at the end
 * — usually the brand, sometimes the keyword. Rather than hand-tuning 174
 * strings, both builders take the required part plus optional segments and
 * append each only while it still fits, so the important half always survives
 * and long names simply get a shorter tail.
 */
const TITLE_MAX = 60;
const DESC_MAX = 155;

function title(required, optional = [], brand = 'TalkLive') {
  let t = required;
  for (const seg of optional) {
    const candidate = `${t} — ${seg}`;
    if (`${candidate} | ${brand}`.length <= TITLE_MAX) t = candidate; else break;
  }
  // The brand suffix is dropped rather than truncated when the required part
  // alone already fills the budget — a cut-off brand name looks broken.
  return `${t} | ${brand}`.length <= TITLE_MAX + 12 ? `${t} | ${brand}` : t;
}

function description(sentences) {
  let d = '';
  for (const s of sentences) {
    const candidate = d ? `${d} ${s}` : s;
    if (candidate.length <= DESC_MAX) d = candidate; else break;
  }
  return d || sentences[0];
}

// Countries in the same region, for "people also look at" cross-linking. Real
// neighbours rather than a random sample, so the link makes sense to a reader
// as well as to a crawler.
function neighbours(c, n = 4) {
  const same = COUNTRIES.filter(x => x.region === c.region && x.slug !== c.slug);
  const rest = COUNTRIES.filter(x => x.region !== c.region && x.slug !== c.slug);
  return same.concat(rest).slice(0, n);
}

/* --- Country pages -------------------------------------------------------- */

function countryPage(c) {
  const langs = langNames(c);
  const primary = c.langs[0];
  const cityLinks = c.cities.map(ct => link(`/cities/${ct.slug}`, ct.name));
  const nearby = neighbours(c);
  const langPages = LANGUAGES.filter(l => (l.countries || []).includes(c.slug));

  return {
    slug: `countries/${c.slug}`,
    cluster: 'countries',
    parent: { slug: 'countries', label: 'Countries' },
    crumb: c.name,
    eyebrow: `${c.region} · ${c.tz}`,
    title: title(`Talk to Strangers in ${nm(c)}`, [`Free ${c.demonym} Voice Chat`, `Free ${c.demonym} Chat`]),
    description: description([`Free voice and text chat with people in ${nm(c)}.`, `${list(langs)} speakers, anonymous, no sign-up.`, `Busiest around ${c.peak}.`]),
    keywords: `${c.demonym.toLowerCase()} chat, chat with ${c.demonym.toLowerCase()}s, random chat ${c.name.toLowerCase()}, talk to strangers ${c.name.toLowerCase()}, ${c.name.toLowerCase()} voice chat, ${c.name.toLowerCase()} chat room, online chat ${c.name.toLowerCase()}`,
    h1: `Talk to Strangers in ${nm(c)}`,
    lede: `One tap connects you to someone in ${nm(c)} for a live voice call or an anonymous text chat. ${list(langs)} are all spoken here, it is free, and nothing needs installing.`,
    cta: `Talk to Someone in ${nm(c)}`,
    ctaChat: 'Tap to Chat',

    featuresH: `Chatting with people in ${nm(c)}`,
    featuresIntro: `What to expect when you filter your matches to ${nm(c)}.`,
    features: [
      { icon: 'globe', h: `${langs.length > 1 ? 'Languages you will hear' : 'The language spoken'}`, p: `${list(langs)}. A typical opener is “${primary.hello}” — you will hear it within the first few seconds.` },
      { icon: 'bolt', h: 'When people are online', p: `Local time is ${c.tz}. Traffic from ${nm(c)} peaks around ${c.peak}, so that is when matches connect fastest.` },
      { icon: 'world', h: 'Cities you will match with', p: `Most matches come from ${list(c.cities.slice(0, 4).map(x => x.name))}${c.cities.length > 4 ? ' and other large cities' : ''}.` },
      { icon: 'mic', h: 'Voice or text, your call', p: 'Tap to Talk for a live anonymous voice call, or Tap to Chat if you would rather type. Both are free and unlimited.' },
      { icon: 'shield', h: 'Anonymous by default', p: `No name, email or phone number. People in ${nm(c)} see a temporary display name and nothing else about you.` },
      { icon: 'next', h: 'Skip in one tap', p: 'Not the conversation you wanted? Next Stranger requeues you instantly — no awkward goodbye required.' },
    ],

    stepsH: `How to chat with someone in ${nm(c)}`,
    stepsIntro: 'Four steps, about ten seconds, no account.',
    steps: [
      { h: 'Open TalkLive', p: 'It runs in any phone or desktop browser. There is no app to download and no sign-up form.' },
      { h: `Filter to ${nm(c)}`, p: `Open match filters and add ${nm(c)} to your preferred countries. Filters are free — they are not behind a paid tier here.` },
      { h: 'Tap to Talk or Tap to Chat', p: 'Voice needs microphone permission. Text needs nothing at all and works on the weakest connection.' },
      { h: 'Say hello', p: `“${primary.hello}” works. If the match is not for you, tap Next and you are back in the queue immediately.` },
    ],

    prose: [
      { h: `What random chat in ${nm(c)} is actually like`, body: [
        c.context,
        `People here tend to end up talking about ${list(c.topics)} — not because anyone plans it, but because those are the subjects a stranger can pick up without context. If you want to steer somewhere else, just ask a question; on a voice call it is far easier to change the subject than it is in text.`,
      ] },
      { h: `The best time to find someone in ${nm(c)}`, body: [
        `${Nm(c)} runs on ${c.tz}, and its users are most active around ${c.peak}. If you are matching from another continent, that window is what to aim for — outside it you will still connect, just to a smaller pool and often to ${c.demonym}s living abroad rather than at home.`,
        `That last point is worth knowing: the ${c.demonym} community outside ${nm(c)} is large, so filtering to ${nm(c)} finds people in the country while simply speaking ${primary.name} finds them everywhere.`,
      ] },
      { h: `Cities in ${nm(c)} people match with most`, body: [
        `${c.cities.map(ct => `<strong>${ct.name}</strong> — ${ct.note}.`).join(' ')}`,
        `Each of those has its own page: ${list(cityLinks)}.`,
      ] },
      { h: `Practising ${primary.name}`, body: [
        langPages.length
          ? `If your reason for filtering to ${nm(c)} is the language rather than the place, the ${list(langPages.map(l => link(`/languages/${l.slug}`, l.name)))} ${langPages.length > 1 ? 'pages cover' : 'page covers'} that intent directly — including which countries are easiest to start with and what learners typically get stuck on.`
          : `If you are here to practise ${primary.name} rather than to meet ${c.demonym}s specifically, our ${link('/language-exchange', 'language exchange')} page explains how to set that up so both people get something out of it.`,
        `Voice matters more than text for this. Reading and writing a language are separate skills from following someone at conversational speed, and the second only improves by doing it — which is the entire argument for ${link('/practice-english-speaking', 'speaking practice with real people')} over another app.`,
      ] },
      { h: 'Staying safe', body: [
        `TalkLive is strictly 18+. Voice calls are peer-to-peer and never recorded, one tap reports or blocks anyone who is out of line and ends the call immediately, and repeated reports lead to a device and IP ban. Nothing about your identity or location beyond the country you choose to share is visible to a match.`,
        `Our ${link('/blog/random-chat-safety-tips', 'safety guide')} covers the rest — what never to share, how to spot the handful of scam patterns that turn up on every chat platform, and what to do if a conversation goes wrong.`,
      ] },
      { h: 'Nearby and related', body: [
        `People who filter to ${nm(c)} often try ${list(nearby.map(n => link(`/countries/${n.slug}`, n.name)))} too. The full list is on the ${link('/countries/', 'countries hub')}.`,
      ] },
    ],

    faq: [
      { q: `Can I chat with people in ${nm(c)} for free?`, a: `Yes. Matching, voice calls and text chat are all free and unlimited, and the country filter that targets ${nm(c)} is free too — it is not reserved for a paid tier.` },
      { q: `Do I need to speak ${primary.name}?`, a: `No. ${langs.length > 1 ? `${list(langs)} are all common in ${nm(c)}, and English turns up in a large share of matches.` : `${primary.name} is the main language, but English turns up in a large share of matches.`} Saying up front that you are learning usually gets you a slower, friendlier conversation rather than a hang-up.` },
      { q: `What time are most people from ${nm(c)} online?`, a: `Around ${c.peak}. Local time is ${c.tz}, so convert from your own timezone and aim for that window if you want the fastest matches and the biggest pool.` },
      { q: `Is video required to chat with someone in ${nm(c)}?`, a: 'No. TalkLive is voice and text only — there is no camera and no video mode at all. Nobody sees your face, your room or your surroundings.' },
      { q: `Do I need an account to chat with ${c.demonym} strangers?`, a: 'No. There is no sign-up, no email confirmation and no password. An optional free account exists only if you want to keep a friends list between sessions.' },
      { q: `Which cities in ${nm(c)} will I be matched with?`, a: `Mostly ${list(c.cities.map(x => x.name))}. Matching is random within your filters, so you cannot pick a single city — but those are where the volume is.` },
    ],

    ctaBandH: `Say hello to someone in ${nm(c)}`,
    ctaBandP: `Free, anonymous, no sign-up. Voice or text — one tap either way.`,
    posts: ['how-to-start-a-conversation-with-a-stranger', 'random-chat-safety-tips', 'how-to-make-friends-online'],
  };
}

/* --- City pages ----------------------------------------------------------- */

function cityPage(city) {
  const c = city.country;
  const langs = langNames(c);
  const primary = c.langs[0];
  const siblings = c.cities.filter(x => x.slug !== city.slug);
  const otherCities = CITIES.filter(x => x.country.slug !== c.slug).slice(0, 6);

  return {
    slug: `cities/${city.slug}`,
    cluster: 'cities',
    parent: { slug: 'cities', label: 'Cities' },
    crumb: city.name,
    eyebrow: `${nm(c)} · ${c.tz}`,
    title: title(`Talk to Strangers in ${city.name}`, ['Free Voice & Text Chat', 'Free Chat']),
    description: description([`Free voice and text chat with people in ${city.name}, ${nm(c)}.`, `Anonymous, no sign-up.`, `${list(langs)} spoken; busiest around ${c.peak}.`]),
    keywords: `${city.name.toLowerCase()} chat, chat with people in ${city.name.toLowerCase()}, random chat ${city.name.toLowerCase()}, talk to strangers ${city.name.toLowerCase()}, ${city.name.toLowerCase()} voice chat, ${city.name.toLowerCase()} chat room`,
    h1: `Talk to Strangers in ${city.name}`,
    lede: `Match with someone in ${city.name} for a live anonymous voice call or an instant text chat. Free, no account, nothing to install.`,
    cta: `Talk to Someone in ${city.name}`,
    ctaChat: 'Tap to Chat',

    featuresH: `Chatting with ${city.name}`,
    featuresIntro: `What a match from ${city.name} usually looks like.`,
    features: [
      { icon: 'world', h: `What makes ${city.name} different`, p: `${city.name} is ${city.note}.` },
      { icon: 'globe', h: 'Languages', p: `${list(langs)}. “${primary.hello}” is a safe opener anywhere in ${nm(c)}.` },
      { icon: 'bolt', h: 'Peak hours', p: `${city.name} runs on ${c.tz} and is busiest around ${c.peak}.` },
      { icon: 'mic', h: 'Voice or text', p: 'A live voice call, or anonymous text if you cannot talk out loud right now. Both free, both unlimited.' },
      { icon: 'shield', h: 'Nothing to reveal', p: `No profile, no photo, no location beyond the city you choose to mention. Calls are never recorded.` },
      { icon: 'next', h: 'One tap to the next person', p: 'Skip instantly if a conversation is not going anywhere. Nobody is offended by Next.' },
    ],

    stepsH: `How to chat with someone in ${city.name}`,
    stepsIntro: 'No account, no download, about ten seconds.',
    steps: [
      { h: 'Open TalkLive', p: 'Any browser on any phone or computer. There is no app store step.' },
      { h: `Filter to ${nm(c)}`, p: `Matching is by country, so add ${nm(c)} to your preferred list — ${city.name} is one of its largest sources of traffic.` },
      { h: 'Tap to Talk or Tap to Chat', p: 'Voice asks for your microphone. Text asks for nothing and runs fine on a weak signal.' },
      { h: 'Start talking', p: `Ask where in ${nm(c)} they are. It is the easiest opener there is and it works every time.` },
    ],

    prose: [
      { h: `Why ${city.name}`, body: [
        `${city.name} is ${city.note} — which is exactly the kind of thing that makes a random conversation with someone there worth having rather than interchangeable with any other match.`,
        `It sits in ${nm(c)}, on ${c.tz}, and its users are most active around ${c.peak}. ${c.context}`,
      ] },
      { h: `Matching ${city.name} specifically`, body: [
        `TalkLive filters by country rather than by city, so the honest answer is that you filter to ${link(`/countries/${c.slug}`, nm(c))} and ${city.name} arrives as a large share of the results — it is one of the country's biggest sources of traffic. Ask where someone is in the first ten seconds and you will know immediately.`,
        siblings.length
          ? `The other ${nm(c)} cities people match with most are ${list(siblings.map(s => link(`/cities/${s.slug}`, s.name)))}.`
          : `${city.name} is where most ${nm(c)} traffic originates, so a ${nm(c)} filter is effectively a ${city.name} filter.`,
      ] },
      { h: 'What people talk about', body: [
        `${list(c.topics).replace(/^./, m => m.toUpperCase())} — the usual ground a stranger can pick up without any shared context. Local specifics come out fast though: if you have ever been to ${city.name}, or want to go, that is the entire conversation sorted.`,
        `If you would rather have a reason to call than wing it, the ${link('/blog/how-to-start-a-conversation-with-a-stranger', 'opener guide')} has lines that work on people who did not expect to be talking to you.`,
      ] },
      { h: 'Safety, briefly', body: [
        `18+ only, calls are peer-to-peer and never recorded, and report or block ends a conversation in one tap and can ban the other person by device and IP. Do not share your address, your workplace or your financial details with a stranger in ${city.name} or anywhere else — the ${link('/blog/random-chat-safety-tips', 'safety guide')} covers the specifics.`,
      ] },
      { h: 'Other cities', body: [
        `${list(otherCities.map(x => link(`/cities/${x.slug}`, x.name)))} — or browse the whole ${link('/cities/', 'cities hub')} and ${link('/countries/', 'countries hub')}.`,
      ] },
    ],

    faq: [
      { q: `Can I chat with someone specifically in ${city.name}?`, a: `Matching is by country, so you filter to ${nm(c)} and ${city.name} comes up frequently — it is one of the country's largest sources of users. There is no city-level filter, and any service claiming one for random chat is guessing from your IP address.` },
      { q: `Is chatting with people in ${city.name} free?`, a: 'Yes — unlimited voice calls and text chat, no card, no paywall on matching, and country filters are free too.' },
      { q: `What language should I use in ${city.name}?`, a: `${list(langs)} are what you will hear. “${primary.hello}” opens well, and English appears in a large share of matches.` },
      { q: `When is ${city.name} busiest?`, a: `Around ${c.peak}, on ${c.tz}. Convert to your local time and aim for that window.` },
      { q: 'Is there video?', a: 'No. TalkLive is voice and text only — no camera, ever. That is the main reason people choose it over the video-roulette sites.' },
    ],

    ctaBandH: `Talk to someone in ${city.name} right now`,
    ctaBandP: 'One tap. No sign-up, no camera, no cost.',
    posts: ['how-to-start-a-conversation-with-a-stranger', 'how-to-make-friends-online', 'random-chat-safety-tips'],
  };
}

/* --- Language pages ------------------------------------------------------- */

function languagePage(l) {
  const countries = (l.countries || []).map(s => byCountrySlug.get(s)).filter(Boolean);
  const others = LANGUAGES.filter(x => x.slug !== l.slug).slice(0, 6);

  return {
    slug: `languages/${l.slug}`,
    cluster: 'languages',
    parent: { slug: 'languages', label: 'Languages' },
    crumb: l.name,
    eyebrow: 'Language practice',
    title: title(`Practise ${l.name} with Strangers`, [`Free ${l.name} Voice Chat`, 'Free Voice Chat']),
    description: description([`Practise speaking ${l.name} with real people, free.`, `Random voice chat with native speakers — anonymous, no sign-up, no tutor fees.`]),
    keywords: `practise ${l.name.toLowerCase()}, speak ${l.name.toLowerCase()}, ${l.name.toLowerCase()} conversation practice, ${l.name.toLowerCase()} language exchange, talk to ${l.name.toLowerCase()} speakers, free ${l.name.toLowerCase()} speaking practice, ${l.name.toLowerCase()} voice chat`,
    h1: `Practise ${l.name} with Real People — Free`,
    lede: `${l.native} — “${l.hello}”. One tap puts you in a live voice call with a ${l.name} speaker who did not know you were coming. That unrehearsed half is the part a course cannot give you.`,
    cta: `Practise ${l.name} Now`,
    ctaChat: 'Practise by Text',

    featuresH: `Why live conversation beats another ${l.name} app`,
    featuresIntro: 'Apps drill vocabulary. They cannot simulate being asked something you did not prepare for.',
    features: [
      { icon: 'mic', h: 'Speaking, not tapping', p: `Voice-first by design. You produce ${l.name} out loud, at speed, to someone who will react — which is the skill that actually transfers.` },
      { icon: 'users', h: 'Real speakers, not scripts', p: `${l.speakers ? `Around ${l.speakers}.` : ''} You get accents, slang and speed that no recorded lesson contains.` },
      { icon: 'bolt', h: 'No scheduling', p: 'No booking, no tutor calendar, no cancellation fees. Tap when you have ten free minutes.' },
      { icon: 'heart', h: 'Free, permanently', p: 'Unlimited practice at no cost. Compare that to a per-hour tutor rate and the arithmetic is not close.' },
      { icon: 'shield', h: 'Low stakes', p: 'Anonymous, and one tap ends it. Being bad in front of a stranger you will never meet again is the easiest possible place to be bad.' },
      { icon: 'next', h: 'Next in one tap', p: 'Bad match, dead conversation, someone unwilling to slow down? Requeue instantly.' },
    ],

    stepsH: `How to practise ${l.name} on TalkLive`,
    stepsIntro: 'The whole setup is one filter and one button.',
    steps: [
      { h: 'Open TalkLive', p: 'Browser only. No install, no account, no card.' },
      { h: 'Filter to where it is spoken', p: countries.length ? `Add ${list(countries.map(c => nm(c)))} to your preferred countries.` : `Add the countries where ${l.name} is spoken to your preferred list.` },
      { h: 'Say you are learning', p: 'One sentence at the start changes the whole call. Most people slow down, and many will offer to swap languages.' },
      { h: 'Talk badly on purpose', p: 'Wrong and fluent beats correct and silent. The stranger is not grading you and you will never speak to them again.' },
    ],

    prose: [
      { h: `Why ${l.name} specifically`, body: [l.why] },
      { h: `What learners actually get stuck on`, body: [
        l.hard,
        `None of that is fixed by more input. It is fixed by output under time pressure, which is exactly what a call with a stranger is and what almost no study method provides.`,
      ] },
      { h: 'One tip that changes everything', body: [
        l.tip,
        `The corollary: do not treat a bad call as evidence about you. Some matches are distracted, in a loud room, or simply not in the mood to be someone's practice partner. Tap Next and try again — the next one is ten seconds away.`,
      ] },
      countries.length ? { h: `Where ${l.name} speakers are`, body: [
        `${countries.map(c => `<strong>${link(`/countries/${c.slug}`, c.name)}</strong> — ${c.langs[0].name === l.name ? `first language for most of the country, busiest around ${c.peak} (${c.tz})` : `${l.name} is widely spoken here; busiest around ${c.peak} (${c.tz})`}.`).join(' ')}`,
        `Filtering to more than one of those at once gives you a wider pool and a better spread of accents, which is what you want after the first few weeks.`,
      ] } : null,
      { h: 'Voice or text?', body: [
        `Both work and they train different things. ${link('/random-voice-chat', 'Voice')} is the one that fixes listening speed and the terror of being put on the spot. ${link('/random-text-chat', 'Text')} is better for a language whose script you are still learning, and it is the right choice when you are somewhere you cannot talk out loud.`,
        `Most people who take this seriously use both — text to build confidence, voice once holding a sentence together stops being the hard part.`,
      ] },
      { h: 'Other languages', body: [
        `${list(others.map(x => link(`/languages/${x.slug}`, x.name)))}. The full set is on the ${link('/languages/', 'languages hub')}, and the ${link('/language-exchange', 'language exchange')} page covers how to run a proper two-way swap.`,
      ] },
    ].filter(Boolean),

    faq: [
      { q: `Is practising ${l.name} on TalkLive really free?`, a: 'Yes. Unlimited voice calls and text chat, no card, no trial, no per-minute charge. Country filters are free too.' },
      { q: `Will ${l.name} speakers mind that I am learning?`, a: 'Almost never, if you say so at the start. Most people slow down, plenty offer to swap languages, and the ones who cannot be bothered are one tap away from being replaced.' },
      { q: `Do I need to be at a certain level to start?`, a: `No, and waiting until you feel ready is the most common mistake learners make. If you can manage “${l.hello}” and a question, you can hold a call — the stranger will carry more of it than you expect.` },
      { q: `Is this better than a ${l.name} tutor?`, a: 'It is different. A tutor gives structure and correction; random conversation gives volume, unpredictability and zero cost. The people who progress fastest use both — lessons for the grammar, strangers for the fluency.' },
      { q: 'Can I practise by text instead of speaking?', a: 'Yes. Tap to Chat gives anonymous text matching and never asks for your microphone, which is the right choice if you are still learning the script or simply cannot talk out loud right now.' },
      { q: `How long should a ${l.name} practice call be?`, a: 'Ten to fifteen minutes is plenty, done often. Three short calls across a week beat one long one, because the hard part is starting cold and short calls make you practise starting.' },
    ],

    ctaBandH: `Speak ${l.name} out loud in the next ten seconds`,
    ctaBandP: 'Free, anonymous, no booking. Tap and start.',
    posts: ['practice-english-speaking-online-free', 'how-to-start-a-conversation-with-a-stranger', 'phone-anxiety-how-to-get-comfortable-talking'],
  };
}

/* --- Hub pages ------------------------------------------------------------ */
/*
 * Hubs are not filler. Without them the ~130 pages below hang off nothing but
 * the link cloud, which gives a crawler no signal about how they relate; with
 * them there is a real Home → hub → page hierarchy that matches the breadcrumb
 * trail and concentrates internal link equity where it is useful.
 */

function hubPage({ slug, crumb, title, description, keywords, h1, lede, intro, groups, prose, faq }) {
  return {
    slug,
    cluster: slug.replace(/\/$/, ''),
    isHub: true,
    crumb,
    eyebrow: 'Directory',
    title,
    description,
    keywords,
    h1,
    lede,
    cta: 'Tap to Talk',
    ctaChat: 'Tap to Chat',
    featuresH: intro.h,
    featuresIntro: intro.p,
    features: intro.features,
    stepsH: 'How matching works',
    stepsIntro: 'The same four steps wherever you point it.',
    steps: [
      { h: 'Open TalkLive', p: 'Any browser, any device. No install and no account.' },
      { h: 'Set your filters', p: 'Country and interest filters are free — pick one, several, or leave it open to the whole world.' },
      { h: 'Tap to Talk or Tap to Chat', p: 'Voice needs a microphone. Text needs nothing and works on the weakest connection.' },
      { h: 'Skip freely', p: 'Next Stranger requeues you instantly. No goodbyes, no penalty.' },
    ],
    prose: groups.concat(prose || []),
    faq,
    ctaBandH: 'Stop browsing. Start talking.',
    ctaBandP: 'One tap connects you to a live conversation with a stranger somewhere in the world.',
    posts: ['how-to-make-friends-online', 'best-random-chat-apps-2026', 'science-of-talking-to-strangers'],
  };
}

function countriesHub() {
  const regions = [...new Set(COUNTRIES.map(c => c.region))];
  const groups = regions.map(r => ({
    h: r,
    body: [COUNTRIES.filter(c => c.region === r)
      .map(c => `<strong>${link(`/countries/${c.slug}`, c.name)}</strong> — ${list(langNames(c))}, busiest ${c.peak}.`)
      .join('<br />')],
  }));
  return hubPage({
    slug: 'countries/',
    crumb: 'Countries',
    title: title('Random Chat by Country', [`Talk to Strangers in ${COUNTRIES.length} Countries`, 'Talk to Strangers Worldwide']),
    description: description([`Pick a country and talk to strangers there by voice or text.`, `${COUNTRIES.length} countries with local languages, peak hours and real context.`, `Free and anonymous.`]),
    keywords: 'random chat by country, chat with people from other countries, international chat, country chat rooms, talk to strangers by country, global random chat',
    h1: 'Random Chat by Country',
    lede: `Filter your matches to a country and you change who you meet entirely. Here is what each of ${COUNTRIES.length} countries is actually like to chat with — the languages you will hear, when its users are awake, and what conversations tend to be about.`,
    intro: {
      h: 'Why the country filter is worth using',
      p: 'Random is more interesting when you can aim it.',
      features: [
        { icon: 'world', h: 'Free filters', p: 'Country filters cost nothing here. On most video-roulette sites the equivalent sits behind a subscription.' },
        { icon: 'bolt', h: 'Timezones matter', p: 'A country is only "busy" during its own evening. Every page below lists the local peak so you can aim at it.' },
        { icon: 'globe', h: 'Language follows country', p: 'Filtering by country is the practical way to filter by language, which is why learners use it constantly.' },
        { icon: 'users', h: 'Or leave it open', p: 'No filter at all is still the fastest match and the biggest surprise. Filters narrow the pool by design.' },
        { icon: 'shield', h: 'Anonymous either way', p: 'Choosing a country to talk to reveals nothing about where you are.' },
        { icon: 'next', h: 'Change it anytime', p: 'Filters are not a commitment. Swap countries between calls as often as you like.' },
      ],
    },
    groups,
    prose: [
      { h: 'How to use this properly', body: [
        `Picking one country narrows the pool, which means slower matches and a smaller range of people — worth it when you are practising a language or genuinely curious about a place, not worth it at 3am when the country you picked is asleep. Selecting three or four related countries is usually the better move: still targeted, still fast.`,
        `If your goal is the language rather than the place, the ${link('/languages/', 'languages hub')} is the page you actually want — a language spans many countries and the two intents are not the same.`,
      ] },
      { h: 'Cities', body: [
        `Matching is country-level, not city-level, but people search by city constantly and the ${link('/cities/', 'cities hub')} covers the ${CITIES.length} that come up most — what makes each one distinct and which country filter reaches it.`,
      ] },
    ],
    faq: [
      { q: 'Can I choose which country I get matched with?', a: 'Yes, and it is free. Add one or more countries to your preferred list in match filters. If nobody from those countries is available quickly, TalkLive widens the search rather than leaving you waiting.' },
      { q: 'Does filtering by country reveal where I am?', a: 'No. Your own country is shown to a match only as a country name and flag — never a city, address or IP. Choosing who to talk to reveals nothing extra about you.' },
      { q: 'Why is a country I picked so quiet?', a: 'Almost always timezone. Every country page here lists the local peak hours; a country in the middle of its night has very few people online no matter how large it is.' },
      { q: 'Is there a limit on how many countries I can pick?', a: 'The free tier covers a handful of countries per list, which is enough for almost everyone. TalkLive Plus lifts the cap if you want to select a whole region.' },
      { q: 'Which countries are busiest overall?', a: 'India, Pakistan, the United States, Brazil, Indonesia and the Philippines carry the most traffic, but "busiest" depends entirely on when you are looking — each has a different evening.' },
    ],
  });
}

function citiesHub() {
  const byCountry = COUNTRIES.filter(c => c.cities.length).map(c => ({
    h: c.name,
    body: [c.cities.map(ct => `<strong>${link(`/cities/${ct.slug}`, ct.name)}</strong> — ${ct.note}.`).join('<br />')
      + `<br /><em>${list(langNames(c))} · ${c.tz} · busiest ${c.peak} · ${link(`/countries/${c.slug}`, `all of ${nm(c)}`)}</em>`],
  }));
  return hubPage({
    slug: 'cities/',
    crumb: 'Cities',
    title: title('Random Chat by City', [`Talk to Strangers in ${CITIES.length} Cities`, 'Talk to Strangers Locally']),
    description: description([`Talk to strangers in ${CITIES.length} cities worldwide by voice or text.`, `What each city is like to chat with, and when it is busiest.`]),
    keywords: 'chat by city, city chat rooms, talk to strangers in my city, local random chat, meet people in city, city voice chat',
    h1: 'Random Chat by City',
    lede: `Matching on TalkLive is country-level, not city-level — but cities are how people actually think about where someone is from. These ${CITIES.length} come up most, and each page explains which filter reaches it and what a match from there is like.`,
    intro: {
      h: 'An honest note on city matching',
      p: 'Worth reading before you go looking for a city filter that does not exist.',
      features: [
        { icon: 'world', h: 'Country-level filtering', p: 'You filter to a country; cities arrive in proportion to their share of that country\'s traffic. No chat service can reliably do better than that.' },
        { icon: 'shield', h: 'Which is the point', p: 'City-level targeting of strangers would be a safety problem, not a feature. Anything offering it is guessing from an IP address.' },
        { icon: 'chat', h: 'Just ask', p: '"Where in the country are you?" is the single most reliable opener on the platform. Ten seconds and you know.' },
        { icon: 'bolt', h: 'Big cities dominate', p: 'Traffic concentrates hard in the largest few cities, so filtering to a country largely means matching its metros.' },
        { icon: 'globe', h: 'Cities are multilingual', p: 'Dubai, Toronto, London and Kuala Lumpur match across four or five first languages each.' },
        { icon: 'users', h: 'Timezone is per country', p: 'Every city page lists its country\'s peak, which is when that city is actually online.' },
      ],
    },
    groups: byCountry,
    prose: [
      { h: 'Looking for something broader?', body: [
        `The ${link('/countries/', 'countries hub')} covers ${COUNTRIES.length} countries with the same detail, and the ${link('/languages/', 'languages hub')} is the right page if the language rather than the location is what you are after.`,
      ] },
    ],
    faq: [
      { q: 'Can I chat with people in my own city?', a: 'Only indirectly — filter to your country and your own city will be well represented, since matching is proportional to where traffic comes from. There is no city-level filter, deliberately.' },
      { q: 'Why is there no city filter?', a: 'Two reasons. Technically, city detection means IP geolocation, which is wrong often enough to be useless. More importantly, letting strangers target each other by city is a safety problem rather than a feature.' },
      { q: 'How do I find out what city someone is in?', a: 'Ask. It is the most common opening question on the platform and almost nobody minds answering at city level. Share only what you are comfortable sharing in return.' },
      { q: 'Which cities have the most users?', a: 'Consistently the largest metros in the highest-traffic countries — Mumbai, Delhi, Karachi, Lagos, Jakarta, São Paulo, Manila, Cairo, Istanbul and the big US cities.' },
    ],
  });
}

function languagesHub() {
  const groups = [{
    h: 'Every language with a practice page',
    body: [LANGUAGES.map(l => `<strong>${link(`/languages/${l.slug}`, l.name)}</strong> (${l.native}, “${l.hello}”) — ${l.speakers}.`).join('<br />')],
  }];
  return hubPage({
    slug: 'languages/',
    crumb: 'Languages',
    title: title('Practise a Language with Strangers', [`${LANGUAGES.length} Languages, Free`, 'Free']),
    description: description([`Free speaking practice in ${LANGUAGES.length} languages with real native speakers.`, `Random voice chat — no tutor fees, no scheduling, no sign-up.`]),
    keywords: 'language exchange, practise speaking a language, free language practice, talk to native speakers, conversation practice online, language partner free',
    h1: 'Practise a Language with Real People',
    lede: `Every language app on earth will drill your vocabulary. None of them can ask you something you did not prepare for. That is the gap these ${LANGUAGES.length} pages are about — and it closes faster than most learners expect.`,
    intro: {
      h: 'What live practice fixes that apps cannot',
      p: 'The bottleneck for most learners is not knowledge. It is retrieval speed under pressure.',
      features: [
        { icon: 'mic', h: 'Output under time pressure', p: 'You cannot pause a stranger to conjugate. That constraint is the entire training effect.' },
        { icon: 'users', h: 'Unscripted input', p: 'Real accents, real speed, real slang. Recorded lessons are spoken slowly by people being paid to be clear.' },
        { icon: 'heart', h: 'Zero cost', p: 'Unlimited, free, forever. A tutor charges by the hour for the conversational half you can get here for nothing.' },
        { icon: 'bolt', h: 'No scheduling friction', p: 'The main reason people stop practising is that booking a session is work. Tapping a button is not.' },
        { icon: 'shield', h: 'Anonymous, so low-stakes', p: 'Being bad in front of someone you will never meet again is the cheapest practice there is.' },
        { icon: 'next', h: 'Swap partners freely', p: 'Someone unwilling to slow down is one tap away from being replaced.' },
      ],
    },
    groups,
    prose: [
      { h: 'How to run a language exchange that works', body: [
        `Say in the first sentence that you are learning and offer the swap explicitly — half in their language, half in yours. That framing turns you from someone using them into someone trading with them, and acceptance rates go up sharply.`,
        `Then agree on correction. "Correct me when it matters, ignore small things" is the setting most people want, and saying it out loud prevents both failure modes: being corrected every four words, or being politely let off entirely. The ${link('/language-exchange', 'language exchange guide')} goes into the rest.`,
      ] },
      { h: 'Countries, not just languages', body: [
        `A language spans many countries and they do not sound alike. The ${link('/countries/', 'countries hub')} lists which countries speak what, when each is online, and how the accents differ — useful once you are past the beginner stage and want deliberate variety.`,
      ] },
    ],
    faq: [
      { q: 'Is language practice on TalkLive free?', a: 'Yes — unlimited voice and text practice at no cost, no card and no trial period. Country filters, which is how you target a language, are free too.' },
      { q: 'How do I find a native speaker of a specific language?', a: 'Filter to the countries where it is spoken. Each language page lists them with local peak hours, which matters — a country in the middle of its night has almost nobody online.' },
      { q: 'What if I am a complete beginner?', a: 'Start anyway. Say you are learning, keep the first calls to a few minutes, and let the other person carry more of it. Waiting until you feel ready is the most common reason people never start speaking at all.' },
      { q: 'Will people correct my mistakes?', a: 'If you ask them to. Say what you want at the start — most people default to being polite and letting errors go, which is comfortable and useless.' },
      { q: 'Is this a replacement for lessons?', a: 'No, a complement. Lessons give structure and correction; strangers give volume and unpredictability. Learners who do both progress noticeably faster than those who do either alone.' },
    ],
  });
}

const countryPages = COUNTRIES.map(countryPage);
const cityPages = CITIES.map(cityPage);
const languagePages = LANGUAGES.map(languagePage);
const hubPages = [countriesHub(), citiesHub(), languagesHub()];

module.exports = {
  COUNTRIES,
  CITIES,
  LANGUAGES,
  GEO_PAGES: hubPages.concat(countryPages, cityPages, languagePages),
};
