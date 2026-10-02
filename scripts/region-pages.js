'use strict';
/*
 * Regional chat pages: /regions/ and one page per world region.
 *
 * These replace the 45 country pages and 113 city pages that used to live
 * under /countries/ and /cities/. Those pages were individually accurate but
 * shared one template, and 158 near-identical pages read as scaled doorway
 * content to search engines and ad reviewers. Five long regional pages carry
 * the same facts - every country's languages, greetings, local peak hours,
 * context and city notes from scripts/data/geo.js - plus hand-written copy
 * per region, so each page is one substantial guide rather than many thin ones.
 *
 * The old URLs 301 to these pages (server/index.js, REGION_REDIRECTS), and
 * scripts/migrate-regions.js rewrites internal links to them.
 *
 * Same output shape as CORE_PAGES in build-seo.js. Prose bodies are emitted
 * unescaped; every interpolated value is our own data, never user input.
 */
const { COUNTRIES } = require('./data/geo');

const REGIONS = [
  {
    slug: 'south-asia',
    name: 'South Asia',
    countries: ['india', 'pakistan', 'bangladesh'],
    eyebrow: 'India, Pakistan & Bangladesh',
    title: 'Talk to Strangers in South Asia - India, Pakistan, Bangladesh | TalkLive',
    description: 'A guide to random voice and text chat across India, Pakistan and Bangladesh: languages, greetings, when each country is online and how country preferences work on TalkLive.',
    keywords: 'south asia chat, indian chat, pakistani chat, bangladeshi chat, talk to strangers india, urdu voice chat, hindi voice chat, bangla chat',
    h1: 'Talk to Strangers in South Asia',
    lede: 'India, Pakistan and Bangladesh are some of the busiest random-chat countries in the world, and they are online late. This guide covers the languages you will hear, the hours each country comes alive, and how to use country preferences without expecting guarantees.',
    intro: [
      'South Asia is where voice chat makes the most obvious sense. Hindi, Urdu, Bengali, Tamil and Punjabi are all written in different scripts, and typing any of them on a phone keyboard is slower than simply saying what you mean. That is the single biggest reason voice-first matching works so well across the region: people speak the way they already talk at home, switching languages mid-sentence without fighting an input method.',
      'The region is also one time-zone block. India runs on UTC+5:30, Pakistan on UTC+5 and Bangladesh on UTC+6, so all three countries are awake at roughly the same time. Evenings are busy, and the queue stays active long after midnight - later than almost anywhere in Europe or the Americas. If you are in Europe, South Asian late evening overlaps with your late afternoon; if you are in North America, it lines up with your morning.',
      'Hindi and Urdu are mutually intelligible in everyday speech, which means an Indian and a Pakistani caller can usually hold a normal conversation without either switching to English. English remains the common fallback for everyone else, and for many students it is the reason they are on a call at all.',
    ],
    features: [
      { icon: 'mic', h: 'Speak, do not type', p: 'Voice skips the script-switching problem entirely. Say it in Urdu, Hindi, Bengali or English.' },
      { icon: 'globe', h: 'One time-zone block', p: 'All three countries share the same evening, so the late-night queue is genuinely busy.' },
      { icon: 'users', h: 'Shared languages', p: 'Hindi and Urdu speakers understand each other in casual speech, across the border.' },
      { icon: 'chat', h: 'English practice', p: 'Many students use calls to practise spoken English with people outside their own country.' },
      { icon: 'phone', h: 'Mobile-friendly', p: 'Audio-only calls use far less data than video, which matters on prepaid mobile plans.' },
      { icon: 'shield', h: 'Anonymous by default', p: 'No phone number or real name is needed. Share only what you choose to share.' },
    ],
    faq: [
      { q: 'Can I choose to talk only to people from India or Pakistan?', a: 'You can set country preferences in the app. They are preferences, not guarantees: if nobody from your chosen countries is waiting, TalkLive may match you with someone else rather than leave you waiting indefinitely. The free plan allows up to two countries per list.' },
      { q: 'When is South Asia most active?', a: 'Roughly 9pm to 2am in India and Bangladesh and 9pm to 3am in Pakistan. Pakistan peaks later than almost any other country on the platform.' },
      { q: 'Can I talk in Urdu, Hindi or Bengali?', a: 'Yes. Calls are ordinary voice conversations, so you can speak any language you and the other person share. The interface itself is also available in Urdu, Hindi and Bengali.' },
      { q: 'Can I pick a specific city like Karachi or Mumbai?', a: 'No. TalkLive matches by country preference, not by city, and it does not verify anyone\'s location. The city notes on this page describe the places, not a matching option.' },
      { q: 'Does voice chat use a lot of mobile data?', a: 'Much less than video. An audio-only call uses a small fraction of the data a video call does, which is why it works well on mobile connections.' },
    ],
    posts: ['how-much-data-does-voice-chat-use', 'practice-english-speaking-online-free', 'someone-to-talk-to-at-3am'],
  },
  {
    slug: 'asia-pacific',
    name: 'East Asia, Southeast Asia & Oceania',
    countries: ['japan', 'south-korea', 'china', 'indonesia', 'philippines', 'vietnam', 'thailand', 'malaysia', 'singapore', 'australia', 'new-zealand'],
    eyebrow: 'From Tokyo to Auckland',
    title: 'Talk to Strangers in Asia-Pacific - Japan, Korea, Philippines, Australia | TalkLive',
    description: 'A guide to random voice chat across East Asia, Southeast Asia and Oceania: languages, greetings, local peak hours and what people talk about in eleven countries.',
    keywords: 'asia chat, japanese voice chat, korean chat, filipino chat, indonesian chat, australian chat, talk to strangers asia, asia pacific voice chat',
    h1: 'Talk to Strangers in East Asia, Southeast Asia & Oceania',
    lede: 'Eleven countries, more than a dozen languages and time zones from UTC+7 to UTC+13. This guide explains who is online when, what languages to expect and why this region is the heart of voice-based language exchange.',
    intro: [
      'This is the most linguistically varied region on TalkLive and the one where language practice drives the most conversations. Japanese and Korean are among the most-requested languages anywhere - far more learners want to practise them than native speakers show up - while Filipino, Malaysian and Singaporean users are often fluent English speakers whom learners elsewhere actively look for.',
      'Time zones spread widely. Bangkok, Jakarta and Ho Chi Minh City sit at UTC+7; Manila, Kuala Lumpur, Singapore and Shanghai at UTC+8; Tokyo and Seoul at UTC+9; Sydney at UTC+10 or +11; and Auckland at UTC+12 or +13. The practical effect is that the region rolls online from east to west through the evening: New Zealand first, then Australia, then Japan and Korea, then Southeast Asia.',
      'Voice suits the region for a familiar reason: typing Japanese, Korean, Thai or Vietnamese on a phone means switching input modes, and spoken conversation avoids that. Many users here are also noticeably more comfortable with voice than with video, which is the format TalkLive offers.',
    ],
    features: [
      { icon: 'globe', h: 'Language-exchange hub', p: 'Japanese, Korean and Mandarin learners meet native speakers and fluent English speakers here.' },
      { icon: 'users', h: 'English everywhere', p: 'The Philippines, Singapore, Malaysia, Australia and New Zealand bring fluent English to the queue.' },
      { icon: 'mic', h: 'No camera needed', p: 'Voice-only matching suits users who prefer not to appear on video.' },
      { icon: 'bolt', h: 'Rolling evenings', p: 'Evenings move west from Auckland to Bangkok, so the region stays busy across several hours.' },
      { icon: 'chat', h: 'Text alongside voice', p: 'Use in-call text to spell a word, share a romanisation or check a phrase.' },
      { icon: 'shield', h: 'Report and block', p: 'One tap ends a call and keeps that person from reaching you again.' },
    ],
    faq: [
      { q: 'Can I practise Japanese or Korean here?', a: 'Yes, but expect more learners than native speakers. Set a country preference for Japan or South Korea, be patient, and offer something in return - most Japanese and Korean users are here to practise English.' },
      { q: 'Is TalkLive available in China?', a: 'TalkLive is a website and works wherever it can be reached. Some networks in mainland China restrict foreign services, so availability there is not guaranteed.' },
      { q: 'When is the best time to find someone from Australia?', a: 'Australian evenings, roughly 8pm to midnight in Sydney, which is mid-morning in the UK and the previous evening on the US west coast.' },
      { q: 'Can I filter by city, such as Tokyo or Manila?', a: 'No. Matching uses country preferences only, and no location is verified. City notes on this page are background, not a filter.' },
      { q: 'Which languages does the app interface support in this region?', a: 'The interface is translated into Japanese, Korean, Chinese and Indonesian, among others. Calls themselves can be in any language you share with the other person.' },
    ],
    posts: ['how-to-practise-a-language-by-speaking', 'talking-to-strangers-in-another-language', 'best-time-to-use-random-chat'],
  },
  {
    slug: 'middle-east-africa',
    name: 'Middle East & Africa',
    countries: ['saudi-arabia', 'united-arab-emirates', 'egypt', 'morocco', 'iran', 'israel', 'nigeria', 'kenya', 'south-africa'],
    eyebrow: 'From Casablanca to Tehran to Cape Town',
    title: 'Talk to Strangers in the Middle East & Africa - Arabic, Persian, English | TalkLive',
    description: 'A guide to random voice chat across the Middle East and Africa: Arabic dialects, Persian, Hebrew, Swahili and English, plus when each country is online.',
    keywords: 'arabic voice chat, middle east chat, african chat, egyptian chat, saudi chat, nigerian chat, persian voice chat, talk to strangers arabic',
    h1: 'Talk to Strangers in the Middle East & Africa',
    lede: 'Nine countries, from the Gulf to West Africa. Arabic is the biggest shared language, but you will also hear Persian, Hebrew, Darija, Yoruba, Swahili, Afrikaans and a great deal of English.',
    intro: [
      'Arabic connects most of this region, but it is not one spoken language. Egyptian, Gulf and Moroccan Arabic differ enough that callers often adjust their speech mid-conversation, and Egyptian Arabic - familiar from decades of films and television - tends to be the variety everyone understands. Voice makes this easy to notice in a way text never does.',
      'The region spans UTC+0 in Morocco to UTC+4 in the UAE and UTC+3:30 in Iran, with Nigeria, Kenya and South Africa in between. Weekends differ too: much of the Gulf takes Friday and Saturday off, Israel Friday and Saturday, while most African countries follow a Saturday-Sunday weekend. Thursday night is a busy chat night in the Gulf for that reason.',
      'English is the common language between the African countries here and a frequent second language across the Gulf, where a large share of residents are expatriates. That mix makes the region a useful place to find conversation partners for English practice in both directions.',
    ],
    features: [
      { icon: 'globe', h: 'Arabic in many dialects', p: 'Gulf, Egyptian and Moroccan Arabic all show up, often in the same evening.' },
      { icon: 'users', h: 'Expat-heavy cities', p: 'Dubai and Riyadh bring callers from South Asia, Europe and Africa into the same queue.' },
      { icon: 'mic', h: 'Voice over video', p: 'Many users here strongly prefer not to appear on camera; voice keeps calls private.' },
      { icon: 'chat', h: 'English as a bridge', p: 'Nigeria, Kenya and South Africa use English daily, which makes matches across the region easy.' },
      { icon: 'phone', h: 'Low data use', p: 'Audio-only calls work on slower mobile connections and limited data plans.' },
      { icon: 'shield', h: 'Clear boundaries', p: 'Leave any call instantly, and report anyone who breaks the community guidelines.' },
    ],
    faq: [
      { q: 'Can I talk in Arabic?', a: 'Yes. Calls are ordinary voice conversations in any language you share. The app interface is also available in Arabic and Persian, with right-to-left layout.' },
      { q: 'When is the Gulf most active?', a: 'Late evening, roughly 10pm to 2am local time, with Thursday and Friday nights the busiest because of the regional weekend.' },
      { q: 'Can I choose to match only with people from one country?', a: 'You can set country preferences, but they are preferences, not guarantees. If nobody from your chosen countries is available, you may be matched with someone else. Free accounts can choose up to two countries per list.' },
      { q: 'Does TalkLive verify where people are?', a: 'No. Country is estimated from the network connection and can be wrong, especially behind a VPN. Treat anyone\'s stated location as unverified.' },
      { q: 'Is TalkLive suitable for anyone under 18?', a: 'No. TalkLive is for adults only, everywhere.' },
    ],
    posts: ['random-chat-safety-tips', 'is-random-voice-chat-safe-for-women', 'voice-chat-vs-video-chat'],
  },
  {
    slug: 'europe',
    name: 'Europe',
    countries: ['united-kingdom', 'ireland', 'germany', 'netherlands', 'france', 'spain', 'portugal', 'italy', 'greece', 'sweden', 'norway', 'poland', 'romania', 'ukraine', 'russia', 'turkey'],
    eyebrow: 'Sixteen countries, one continent',
    title: 'Talk to Strangers in Europe - UK, Germany, France, Spain, Turkey | TalkLive',
    description: 'A guide to random voice chat across sixteen European countries: languages, greetings, local peak hours and what people actually talk about, from Dublin to Istanbul.',
    keywords: 'europe chat, uk voice chat, german chat, french chat, spanish chat, turkish chat, russian voice chat, talk to strangers europe',
    h1: 'Talk to Strangers in Europe',
    lede: 'Europe packs more languages into fewer time zones than anywhere else on TalkLive. This guide covers sixteen countries, from the UK and Ireland to Turkey and Russia: who is online when, what they speak and what they talk about.',
    intro: [
      'Most of Europe sits within three hours of itself: the UK, Ireland and Portugal on UTC+0, most of the continent on UTC+1, Greece, Romania and Ukraine on UTC+2, and Turkey and western Russia on UTC+3. That compression means a European evening is a single busy block, roughly 8pm to midnight, and it is the best time to find a match in almost any European language.',
      'English is the shared second language for most callers under forty, especially in the Netherlands, Scandinavia and Portugal, where it is spoken very widely. But plenty of people come specifically to practise a language they are learning - Spanish, German, French and Italian are all popular - and voice is the fastest way to find out whether you can actually hold a conversation in one.',
      'Europe is also where expectations about privacy run highest. TalkLive does not record or store voice audio, does not ask for a phone number and lets you use it without an account. Other participants can still record on their own devices, so the usual rule applies: do not share anything you would not want repeated.',
    ],
    features: [
      { icon: 'globe', h: 'Dozens of languages', p: 'English, German, French, Spanish, Italian, Polish, Turkish, Russian and many more in one evening.' },
      { icon: 'bolt', h: 'One shared evening', p: 'Three time zones cover nearly the whole continent, so peak hours overlap.' },
      { icon: 'chat', h: 'Language practice', p: 'Find speakers of the language you are learning, or help someone practise yours.' },
      { icon: 'lock', h: 'Private by design', p: 'No account, no phone number and no stored voice audio.' },
      { icon: 'users', h: 'Students and night owls', p: 'University cities change who is online between term time and holidays.' },
      { icon: 'shield', h: 'Moderated', p: 'Report, block and repeated-report bans keep the queue respectful.' },
    ],
    faq: [
      { q: 'When is Europe most active?', a: 'Roughly 8pm to midnight local time. Because most of Europe is within two hours of Central European Time, peak hours overlap across nearly every country.' },
      { q: 'Can I practise German, French or Spanish here?', a: 'Yes. Set a country preference for a country where that language is spoken. Say early in the call that you are practising - most people are happy to slow down.' },
      { q: 'Does TalkLive store my conversations?', a: 'TalkLive does not record or store voice audio. Text chat messages are handled as described in the privacy policy. Another participant can always record on their own device, so share carefully.' },
      { q: 'Can I choose a city like London or Berlin?', a: 'No. Matching uses country preferences only and does not verify location. The city notes here are background about the places, not a matching option.' },
      { q: 'Is Turkey or Russia included in European matching?', a: 'There is no separate European pool. Country preferences work country by country, so you can choose Turkey, Russia or any other supported country directly.' },
    ],
    posts: ['how-to-practise-a-language-by-speaking', 'what-happened-to-omegle', 'how-anonymous-voice-chat-works'],
  },
  {
    slug: 'americas',
    name: 'The Americas',
    countries: ['united-states', 'canada', 'mexico', 'brazil', 'colombia', 'argentina'],
    eyebrow: 'North & South America',
    title: 'Talk to Strangers in the Americas - US, Canada, Mexico, Brazil | TalkLive',
    description: 'A guide to random voice chat across the United States, Canada, Mexico, Brazil, Colombia and Argentina: English, Spanish, Portuguese and French, and when each country is online.',
    keywords: 'american chat, usa voice chat, canada chat, mexican chat, brazilian chat, spanish voice chat, portuguese voice chat, talk to strangers usa',
    h1: 'Talk to Strangers in the Americas',
    lede: 'Four main languages - English, Spanish, Portuguese and French - across time zones from UTC-3 to UTC-10. This guide covers six countries and the best hours to find someone in each.',
    intro: [
      'The Americas run north to south more than east to west, which has a useful side effect: Buenos Aires and São Paulo are only one or two hours ahead of New York, so South American evenings overlap with North American ones. The United States itself spans six time zones, so as the east coast winds down after midnight, the west coast is still in its evening.',
      'Spanish is spoken across the region, from Mexico and Colombia to Argentina and a large share of the United States. Brazilian Portuguese is its own large community, and Canada adds French through Quebec. For learners elsewhere in the world, the US and Canada are the most-requested countries for English practice, and Mexico, Colombia and Argentina for Spanish.',
      'Random chat has a long history here: Omegle and Chatroulette both found their biggest audiences in North America. Many people arrive already knowing how the format works and what they want out of it. TalkLive keeps the spontaneity and drops the camera.',
    ],
    features: [
      { icon: 'globe', h: 'English, Spanish, Portuguese', p: 'Three of the most-spoken languages on the platform, plus French in Quebec.' },
      { icon: 'bolt', h: 'Long evenings', p: 'Six US time zones and South America\'s overlap keep the region busy for hours.' },
      { icon: 'chat', h: 'Most-requested for practice', p: 'Learners worldwide filter for the US and Canada for English, and Latin America for Spanish.' },
      { icon: 'mic', h: 'Camera-free', p: 'The spontaneity of random chat without the pressure or risk of video.' },
      { icon: 'users', h: 'Bilingual cities', p: 'Houston, Miami and Montreal regularly produce matches in two languages.' },
      { icon: 'shield', h: 'Adults only', p: 'TalkLive is 18+, with report, block and exit controls on every call.' },
    ],
    faq: [
      { q: 'When is the US most active?', a: 'Roughly 8pm to 1am local time, in waves: east coast first, west coast about three hours later. Late night on the west coast overlaps with morning in Australia and evening in Asia.' },
      { q: 'Can I practise Spanish or Portuguese here?', a: 'Yes. Choose Mexico, Colombia or Argentina for Spanish and Brazil for Portuguese as a country preference. Preferences are not guaranteed; availability depends on who is online.' },
      { q: 'Is TalkLive like Omegle?', a: 'It keeps the random one-tap matching but is voice- and text-only, adults-only and has report and block controls. Omegle closed in November 2023.' },
      { q: 'Can I filter by city or state?', a: 'No. Matching uses country preferences only, and no one\'s location is verified.' },
      { q: 'Is it free?', a: 'Core random voice and text matching is free and ad-supported. Optional Premium adds more country preferences and other filters.' },
    ],
    posts: ['what-happened-to-omegle', 'what-happened-to-chatroulette', 'best-random-chat-apps-2026'],
  },
];

const bySlug = new Map(COUNTRIES.map(c => [c.slug, c]));

// Every country in geo.js must belong to exactly one region, so a redirect
// from an old /countries/ or /cities/ URL always has somewhere to land.
const REGION_OF_COUNTRY = {};
for (const r of REGIONS) {
  for (const slug of r.countries) {
    if (!bySlug.has(slug)) throw new Error(`region-pages: unknown country "${slug}" in ${r.slug}`);
    if (REGION_OF_COUNTRY[slug]) throw new Error(`region-pages: "${slug}" is in two regions`);
    REGION_OF_COUNTRY[slug] = r.slug;
  }
}
for (const c of COUNTRIES) {
  if (!REGION_OF_COUNTRY[c.slug]) throw new Error(`region-pages: country "${c.slug}" has no region`);
}

const REGION_OF_CITY = {};
for (const c of COUNTRIES) {
  for (const city of c.cities) REGION_OF_CITY[city.slug] = REGION_OF_COUNTRY[c.slug];
}

function list(items) {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
function nm(c) { return c.the ? `the ${c.name}` : c.name; }

function countrySection(c) {
  const greetings = c.langs.map(l => `${l.name} (<em>${l.hello}</em>)`);
  const body = [
    c.context,
    `<strong>Languages you will hear:</strong> ${list(greetings)}. <strong>Local time:</strong> ${c.tz}, busiest around ${c.peak}. <strong>Common topics:</strong> ${list(c.topics)}.`,
    `<strong>Around ${nm(c)}:</strong> ${c.cities.map(city => `${city.name} - ${city.note}`).join('; ')}.`,
  ];
  return { h: `${c.name}`, body };
}

function regionPage(r) {
  const countries = r.countries.map(s => bySlug.get(s));
  return {
    slug: `regions/${r.slug}`,
    crumb: r.name,
    cluster: 'regions',
    eyebrow: r.eyebrow,
    title: r.title,
    description: r.description,
    keywords: r.keywords,
    h1: r.h1,
    lede: r.lede,
    cta: 'Start a Voice Chat',
    ctaChat: 'Start a Text Chat',
    featuresH: `What chatting in ${r.name} is like`,
    featuresIntro: `What sets ${r.name} apart on TalkLive, in short.`,
    features: r.features,
    stepsH: `How to meet people from ${r.name}`,
    stepsIntro: 'Country preferences shape who you are likely to meet. They never guarantee it.',
    steps: [
      { h: 'Open TalkLive', p: 'It runs in any modern browser on phone or computer. Nothing to install, no account needed.' },
      { h: 'Set country preferences', p: `Choose countries from ${r.name} in settings. Free accounts can choose up to two per list.` },
      { h: 'Pick the right hour', p: 'Go online during local evening hours, listed for each country below, when the most people are waiting.' },
      { h: 'Say hello', p: 'Open with a greeting in the local language - it is the fastest way to make a stranger smile.' },
    ],
    prose: [
      { h: `Random chat across ${r.name}`, body: r.intro },
      ...countries.map(countrySection),
      { h: 'What country preferences can and cannot do', body: [
        'TalkLive estimates each caller\'s country from their network connection and uses your preferences to favour matches from the countries you choose. It does not match by city, does not verify anyone\'s location, and cannot promise a match from a given country at a given moment - the live queue is whoever happens to be online. A VPN will also change the country you appear to be in.',
        'Whoever you meet, the same rules apply everywhere: TalkLive is for adults only, you can leave any call instantly, and you can block or report anyone who breaks the <a href="/community-guidelines">community guidelines</a>. See the <a href="/safety">safety centre</a> for what TalkLive protects and what it cannot.',
      ] },
    ],
    faq: r.faq,
    ctaBandH: `Say hello to ${r.name}`,
    ctaBandP: 'Set a country preference and join the live queue - voice or text, no sign-up.',
    posts: r.posts,
    relatedPages: ['regions/'].concat(REGIONS.filter(x => x.slug !== r.slug).map(x => `regions/${x.slug}`)),
  };
}

const HUB = {
  slug: 'regions/',
  crumb: 'Chat by Region',
  cluster: 'regions',
  eyebrow: '45 countries, 5 regions',
  title: 'Talk to Strangers by Region - Country Guides for Random Voice Chat | TalkLive',
  description: 'Regional guides to random voice and text chat on TalkLive: languages, greetings and peak hours for 45 countries across South Asia, Asia-Pacific, the Middle East & Africa, Europe and the Americas.',
  keywords: 'chat by country, talk to strangers by country, international voice chat, country chat, random chat countries, regional chat',
  h1: 'Talk to Strangers Around the World, Region by Region',
  lede: 'Five regional guides covering 45 countries: the languages people speak, how to greet them, when each country is online and what they like to talk about.',
  cta: 'Start a Voice Chat',
  ctaChat: 'Start a Text Chat',
  featuresH: 'Choose a region',
  featuresIntro: 'Each guide covers every country in the region in one place.',
  features: REGIONS.map(r => ({
    icon: 'world',
    h: `<a href="/regions/${r.slug}">${r.name}</a>`,
    p: `${list(r.countries.map(s => bySlug.get(s).name))}.`,
  })).concat([{ icon: 'globe', h: '<a href="/languages/">By language instead</a>', p: 'Looking for a language rather than a place? Browse the language guides.' }]),
  stepsH: 'How country matching works',
  stepsIntro: 'A short, honest version of what the country setting does.',
  steps: [
    { h: 'Your country is estimated', p: 'TalkLive estimates country from your network connection. It is not verified and a VPN changes it.' },
    { h: 'You choose preferences', p: 'Pick countries you would like to meet, or avoid. Free accounts can choose up to two per list.' },
    { h: 'Matching favours them', p: 'When someone from a preferred country is waiting, you are more likely to be paired with them.' },
    { h: 'No guarantees', p: 'If nobody fits, you may meet someone else rather than wait forever. Availability depends on who is online.' },
  ],
  prose: [
    { h: 'Why time zones matter more than filters', body: [
      'The most effective way to meet people from a particular country is not a filter - it is showing up when they are awake. Each regional guide lists the busiest local hours for every country. South Asia peaks late, often past midnight; Europe is busiest from about 8pm to midnight; the United States comes online in waves as each time zone reaches its evening.',
      'If you are practising a language, that means planning your calls around the other side\'s evening, not your own. A learner in Europe looking for Japanese speakers will do better on a weekday afternoon than at night.',
    ] },
    { h: 'Every country in the guides', body: REGIONS.map(r => `<strong><a href="/regions/${r.slug}">${r.name}</a>:</strong> ${list(r.countries.map(s => bySlug.get(s).name))}.`) },
  ],
  faq: [
    { q: 'Can I choose which country I talk to?', a: 'You can set country preferences. They make a match from those countries more likely but never guarantee one, because the queue is whoever is online at that moment.' },
    { q: 'Can I match by city?', a: 'No. TalkLive matches by country preference only and does not verify anyone\'s location.' },
    { q: 'What if my country is not listed?', a: 'You can still use TalkLive from anywhere it is reachable. The guides cover the countries we have written about in detail; matching is not limited to them.' },
    { q: 'Is TalkLive free in every country?', a: 'Core random voice and text matching is free and ad-supported everywhere. Optional Premium adds more country preferences and other filters.' },
  ],
  ctaBandH: 'Meet someone from the other side of the world',
  ctaBandP: 'One tap, one stranger, one live conversation - voice or text.',
  posts: ['best-time-to-use-random-chat', 'talking-to-strangers-in-another-language', 'how-random-matchmaking-works'],
  relatedPages: REGIONS.map(r => `regions/${r.slug}`).concat(['languages/', 'country-chat-guide']),
};

module.exports = [HUB].concat(REGIONS.map(regionPage));
module.exports.REGION_OF_COUNTRY = REGION_OF_COUNTRY;
module.exports.REGION_OF_CITY = REGION_OF_CITY;
