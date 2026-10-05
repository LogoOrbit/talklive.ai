'use strict';
/*
 * Country guides at /countries/<slug>, restored in October 2026.
 *
 * The 45 templated country pages were retired on 2 October and their URLs sent
 * to long regional essays. Visitors from the countries that lost a page fell
 * hardest (Indonesia by three quarters, Bangladesh by half), so the eight
 * countries that bring TalkLive the most people come back at their original
 * URLs - and only those eight, each written by hand.
 *
 * What makes them worth indexing rather than doorway pages:
 *   - every section is written for that country alone: its languages and how
 *     people mix them, its clock and daylight-saving rules, its networks, the
 *     scams people there actually report, its crisis or reporting lines;
 *   - "when to find people" converts TalkLive's own measured traffic (below)
 *     into that country's local time, so the advice is specific and true;
 *   - nothing claims a guaranteed local match or invents a user count.
 *
 * BUSY and QUIET come from TalkLive's hourly analytics for 21 September to
 * 4 October 2026: matches per hour averaged 73-89 between 15:00 and 21:00 UTC
 * and 14-21 between 00:00 and 05:00 UTC. Update the prose if that shifts.
 *
 * Same object shape as CORE_PAGES in build-seo.js. Prose bodies are emitted
 * unescaped, so internal links are written inline.
 */

const UPDATED = '2026-10-05';
const MEASURED = 'Measured from TalkLive\'s own hourly match counts in late September and early October 2026.';

const COUNTRY_SLUGS = ['india', 'pakistan', 'bangladesh', 'united-states', 'united-kingdom', 'egypt', 'nigeria', 'indonesia'];
const others = (slug) => COUNTRY_SLUGS.filter((s) => s !== slug).map((s) => `countries/${s}`);

const PAGES = [

  {
    slug: 'countries/india',
    crumb: 'India',
    eyebrow: 'Hindi · English · and twenty more',
    title: 'Talk to Strangers in India - Free Voice Chat in Hindi and English | TalkLive',
    description: 'Free voice and text chat with people in India and Indians worldwide. Hindi, English or Hinglish, no sign-up, no camera. When India is busiest on TalkLive, in IST.',
    keywords: 'talk to strangers india, indian voice chat, chat with indians, hindi voice chat, random chat india, talk to indian people online',
    h1: 'Talk to Strangers in India - Voice Chat in Hindi, English or Both',
    lede: 'India is the single largest country in TalkLive\'s audience, which makes it one of the easiest places in the world to find someone to talk to. Speak Hindi, English, Hinglish or your own language, by voice or text, with no account and no camera.',
    cta: 'Talk to Someone in India',
    ctaChat: 'Text Someone in India',
    featuresH: 'Why voice chat suits India so well',
    featuresIntro: 'A phone-first country with more languages than keyboards can comfortably handle.',
    features: [
      { icon: 'mic', h: 'Speak, do not switch keyboards', p: 'Typing Devanagari, Tamil or Bengali script on a phone is slow. Speaking Hindi, Tamil or Hinglish is not.' },
      { icon: 'chat', h: 'Hinglish is normal', p: 'Most conversations mix Hindi and English mid-sentence. Nobody will correct you for it.' },
      { icon: 'users', h: 'TalkLive\'s largest audience', p: 'More people come to TalkLive from India than from any other country, so the queue is rarely empty in the evening.' },
      { icon: 'bolt', h: 'Built for mobile data', p: 'Audio-only calls use a fraction of the data of video and hold up on 4G and busy networks.' },
      { icon: 'globe', h: 'A Hindi interface', p: 'The whole app is available in Hindi at <a href="/hi/">/hi/</a>, alongside English.' },
      { icon: 'shield', h: 'No number, no camera', p: 'Calls run in the browser. Nobody sees your phone number, your face or your room.' },
    ],
    stepsH: 'How to talk to people in India on TalkLive',
    stepsIntro: 'You can match with anyone worldwide, or ask TalkLive to prefer India.',
    steps: [
      { h: 'Open Filters', p: 'Add India as a preferred country. The free plan allows up to two preferred and two avoided countries.' },
      { h: 'Tap to Talk or Tap to Chat', p: 'Voice asks for your microphone once. Text needs no permission at all.' },
      { h: 'Open with Namaste', p: 'Or Vanakkam, Namaskar, or a plain hello. Asking which city they are in is a good second line.' },
      { h: 'Next, or add a friend', p: 'Skip a conversation that is not working; keep one that is by adding each other as friends.' },
    ],
    prose: [
      { h: 'When to find people from India', body: [
        'TalkLive is busiest between 15:00 and 21:00 UTC, when it makes roughly four times as many matches an hour as in its quietest stretch. In India Standard Time that busy window is <strong>8:30 pm to 2:30 am IST</strong> - which matches what anyone who lives there already knows: the country comes online after dinner and stays up late. The quietest time is <strong>5:30 to 10:30 am IST</strong>. India does not use daylight saving, so these times hold all year. ' + MEASURED,
        'Calling from abroad? 9 pm in Delhi is 4:30 pm in London in summer (3:30 pm in winter) and late morning on the US East Coast, so Indian evenings are an afternoon call for most of Europe and a lunchtime one for North America.',
      ]},
      { h: 'One clock, many languages', body: [
        'India runs on a single time zone, UTC+5:30, across a country roughly three thousand kilometres wide, and its constitution recognises twenty-two scheduled languages. Hindi and English are the languages of the central government, and they are what most random matches settle into - often both at once. But a match from Chennai may prefer Tamil, one from Kolkata Bengali, one from Hyderabad Telugu or Urdu. Asking "which language is easiest for you?" is polite and usually welcomed.',
        'If you are learning Hindi, say so at the start. Many people are happy to slow down, and the shift between formal <em>aap</em> and familiar <em>tum</em> is the kind of thing you only really learn in conversation. Our long read on <a href="/blog/how-to-practise-a-language-by-speaking">why you understand more than you can say</a> has a four-week routine.',
      ]},
      { h: 'What people talk about', body: [
        'Cricket is the safest opener in the country, but films run it close - and not just Hindi cinema: Tamil, Telugu and Malayalam films have audiences of their own and strong opinions to match. Exams, job hunting and plans to study or work abroad come up constantly, because a large share of TalkLive\'s Indian users are students and young professionals. Food is a reliable bridge too; every region is convinced its version of a dish is the correct one.',
        'If you are not from India, curiosity goes a long way, and so does avoiding the obvious stereotypes. "What is a normal weekend like where you live?" gets a far better conversation than questions people have answered a hundred times.',
      ]},
      { h: 'Staying safe, the Indian way', body: [
        'Indian police have repeatedly warned about so-called "digital arrest" scams, where a caller pretends to be from the police, customs or a courier company and claims you are under investigation. No real officer will ever contact you through a random chat, and none will demand payment to "clear your name". The same goes for anyone who asks for an OTP, your UPI PIN or your Aadhaar number - never share them. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">field guide to chat scams</a> covers the other common scripts.',
        'If a conversation turns abusive, tap Report or Block - the person will not be matched with you again. In India you can report cyber fraud on the national helpline <strong>1930</strong> or at cybercrime.gov.in. If you are struggling and need to talk to a trained counsellor, the government\'s free Tele-MANAS line is <strong>14416</strong>.',
      ]},
      { h: 'Where to read more', body: [
        'The TalkLive Journal\'s <a href="/regions/south-asia">Why South Asia Talks After Midnight</a> looks at why India, Pakistan and Bangladesh share one long evening, and why voice beats typing across the region. If you want to compare with India\'s neighbours, see our guides to <a href="/countries/pakistan">Pakistan</a> and <a href="/countries/bangladesh">Bangladesh</a>.',
      ]},
    ],
    faq: [
      { q: 'Can I talk to people in India for free?', a: 'Yes. Voice calls and text chats are free, no account is needed, and preferring India in the country filter is free too.' },
      { q: 'Will I definitely be matched with someone in India?', a: 'Not always. A preference steers matching, but it depends on who is searching at that moment. India is TalkLive\'s largest audience, so evenings in IST are the best time to try.' },
      { q: 'Can I use TalkLive in Hindi?', a: 'Yes. The full interface is available in Hindi at talklive.app/hi/, and you can speak whichever language suits you and your match.' },
      { q: 'Does TalkLive work on Indian mobile networks?', a: 'Yes. Calls are audio-only and light on data. On networks that block direct connections, calls are relayed through TalkLive\'s TURN server automatically.' },
      { q: 'Is the country shown for a match accurate?', a: 'It is estimated from the network connection and is not verified. Treat it as a hint, not proof of where someone lives.' },
    ],
    ctaBandH: 'India is online tonight',
    ctaBandP: 'Start a voice call or text chat - prefer India in Filters, or match with the whole world.',
    cluster: 'countries',
    relatedPages: ['countries/pakistan', 'countries/bangladesh', 'regions/south-asia', 'country-chat-guide', 'practice-english-speaking'].concat(others('india')),
    updated: UPDATED,
    posts: ['how-to-practise-a-language-by-speaking', 'how-to-spot-a-bot-or-scam-in-random-chat', 'what-to-talk-about-with-a-stranger'],
  },

  {
    slug: 'countries/pakistan',
    crumb: 'Pakistan',
    eyebrow: 'Urdu · Punjabi · English',
    title: 'Talk to Strangers in Pakistan - Free Urdu and English Voice Chat | TalkLive',
    description: 'Free voice and text chat with people in Pakistan. Urdu, Punjabi or English, no sign-up, no camera, and an Urdu interface. When Pakistan is busiest on TalkLive, in PKT.',
    keywords: 'talk to strangers pakistan, pakistani chat, pakistan voice chat, urdu voice chat, chat with pakistanis, random chat pakistan',
    h1: 'Talk to Strangers in Pakistan - Voice Chat in Urdu, Punjabi or English',
    lede: 'Pakistan is one of TalkLive\'s largest audiences and one of its latest-night ones. Talk in Urdu, Punjabi or English - or all three in one sentence - by voice or text, with no account, no number and no camera.',
    cta: 'Talk to Someone in Pakistan',
    ctaChat: 'Text Someone in Pakistan',
    featuresH: 'Built for how Pakistan talks',
    featuresIntro: 'Late nights, mixed languages, and a strong preference for saying it rather than typing it.',
    features: [
      { icon: 'mic', h: 'Say it in Urdu', p: 'Typing Urdu in Nastaliq on a phone is slow, and Roman Urdu has no fixed spelling. Speaking it is effortless.' },
      { icon: 'globe', h: 'An Urdu interface', p: 'The whole app works in Urdu, right to left, at <a href="/ur/">/ur/</a>.' },
      { icon: 'users', h: 'A big Pakistani audience', p: 'Pakistan is consistently among the countries sending TalkLive the most people.' },
      { icon: 'bolt', h: 'Light on mobile data', p: 'Audio-only calls hold up on 4G and use a fraction of the data a video call needs.' },
      { icon: 'lock', h: 'Private by default', p: 'No phone number, no CNIC, no social login. A generated name is all anyone sees.' },
      { icon: 'heart', h: 'Keep good conversations', p: 'Add someone as a friend and call back another night, without exchanging numbers.' },
    ],
    stepsH: 'How to talk to people in Pakistan on TalkLive',
    stepsIntro: 'Match worldwide, or ask TalkLive to prefer Pakistan.',
    steps: [
      { h: 'Prefer Pakistan in Filters', p: 'The free plan allows up to two preferred and two avoided countries.' },
      { h: 'Tap to Talk or Tap to Chat', p: 'Voice asks for microphone access once; text needs no permission.' },
      { h: 'Start with Salam', p: '"Assalam-o-Alaikum" is the usual greeting; the reply is "Wa-alaikum-assalam".' },
      { h: 'Next, or add a friend', p: 'Move on whenever you like, or keep a good conversation going another night.' },
    ],
    prose: [
      { h: 'When to find people from Pakistan', body: [
        'TalkLive is busiest between 15:00 and 21:00 UTC. In Pakistan Standard Time (UTC+5, no daylight saving) that is <strong>8 pm to 2 am PKT</strong>, and Pakistani users keep the queue lively well past that - late night is genuinely late here. The quietest stretch is <strong>5 to 10 am PKT</strong>. ' + MEASURED,
        'For overseas Pakistanis: 10 pm in Karachi or Lahore is 6 pm in the UK in summer (5 pm in winter), 9 pm in Dubai and around 1 pm on the US East Coast. That overlap is why so many matches here are between people at home and family-age Pakistanis abroad.',
      ]},
      { h: 'Urdu, Punjabi and everything in between', body: [
        'Urdu is the national language and the one most matches settle into, even though it is the mother tongue of a minority of Pakistanis. Punjabi is the most widely spoken first language, and Pashto, Sindhi, Saraiki and Balochi are all common; English is an official language and turns up in a large share of conversations, especially with students. Switching between them mid-sentence is normal, and nobody expects you to stick to one.',
        'Hindi speakers from India understand spoken Urdu with little difficulty, and vice versa, which is why cross-border matches so often work smoothly by voice even though the two languages look nothing alike in writing. Our feature <a href="/regions/south-asia">Why South Asia Talks After Midnight</a> explores that shared spoken language.',
      ]},
      { h: 'What people talk about', body: [
        'Cricket comes first, as it always has. After that: university admissions and entry tests, freelancing and remote work for overseas clients, family, and food - endlessly, and with strong regional loyalties between Karachi, Lahore and Peshawar. Music and dramas are a reliable bridge with people from other countries, many of whom know Pakistani songs or serials without realising where they came from.',
        'If you are practising English, Pakistan is a good place to look: plenty of people here want speaking practice too, so you can trade - ten minutes in English, ten in Urdu. Our <a href="/practice-english-speaking">English speaking practice</a> guide explains how to make that work.',
      ]},
      { h: 'Staying safe', body: [
        'Never share your CNIC number, a bank or mobile-wallet PIN, or a one-time code with anyone you meet in a chat, whatever reason they give. Prize and lottery messages, "verification" requests and job offers that need an upfront fee are the most common scripts. Be just as careful with anyone who asks for photos or pushes to move to WhatsApp straight away. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">field guide to chat scams</a> lists the patterns.',
        'If anyone is abusive, tap Report or Block - blocked people are not matched with you again. Online harassment and fraud can be reported to the FIA\'s cybercrime wing, now part of the National Cyber Crime Investigation Agency.',
      ]},
    ],
    faq: [
      { q: 'Is there a free Pakistani chat site with voice calls?', a: 'Yes. TalkLive is free for voice and text, needs no account, and lets you prefer Pakistan in the country filter.' },
      { q: 'Can I use TalkLive in Urdu?', a: 'Yes. The full interface is available in Urdu, right to left, at talklive.app/ur/.' },
      { q: 'Do I have to speak Urdu?', a: 'No. Many matches are in English or Punjabi, and switching languages mid-conversation is completely normal.' },
      { q: 'Will I always be matched with someone in Pakistan?', a: 'Not always - it depends on who is searching at that moment. Evenings after 8 pm PKT are the busiest time.' },
      { q: 'Will anyone see my phone number?', a: 'No. Calls run in the browser over the internet, so no phone number is exchanged.' },
    ],
    ctaBandH: 'Pakistan is up late - join in',
    ctaBandP: 'Start a voice call or a text chat now. Prefer Pakistan in Filters, or talk to the whole world.',
    cluster: 'countries',
    relatedPages: ['countries/india', 'countries/bangladesh', 'regions/south-asia', 'country-chat-guide', 'practice-english-speaking'].concat(others('pakistan')),
    updated: UPDATED,
    posts: ['how-to-spot-a-bot-or-scam-in-random-chat', 'how-to-practise-a-language-by-speaking', 'why-talking-to-strangers-feels-easier'],
  },

  {
    slug: 'countries/bangladesh',
    crumb: 'Bangladesh',
    eyebrow: 'Bangla · English',
    title: 'Talk to Strangers in Bangladesh - Free Bangla Voice Chat | TalkLive',
    description: 'Free voice and text chat with people in Bangladesh and Bengali speakers worldwide. Bangla or English, no sign-up, no camera, with a Bangla interface. Best times in Bangladesh time.',
    keywords: 'talk to strangers bangladesh, bangladeshi chat, bangla voice chat, bengali voice chat, chat with bangladeshi, random chat bangladesh',
    h1: 'Talk to Strangers in Bangladesh - Voice Chat in Bangla or English',
    lede: 'Bangla is one of the ten most spoken languages on earth and still badly served by most chat apps. On TalkLive you can simply speak it - with someone in Dhaka, Kolkata, London or the Gulf - by voice or text, with no account and no camera.',
    cta: 'Talk to Someone in Bangladesh',
    ctaChat: 'Text Someone in Bangladesh',
    featuresH: 'Why Bangla speakers use voice',
    featuresIntro: 'A language that is a joy to speak and a chore to type on a phone.',
    features: [
      { icon: 'mic', h: 'Speak Bangla freely', p: 'Bengali script is slow to type on a phone. Speaking it needs no keyboard at all.' },
      { icon: 'globe', h: 'A Bangla interface', p: 'The whole app is available in Bangla at <a href="/bn/">/bn/</a>.' },
      { icon: 'world', h: 'Bengali speakers everywhere', p: 'Matches come from Bangladesh, West Bengal and a large diaspora in the UK, the Gulf and beyond.' },
      { icon: 'bolt', h: 'Light on data', p: 'Audio-only calls work on mobile data and hold up when the connection is weak.' },
      { icon: 'lock', h: 'No number, no NID', p: 'Nothing identifying is needed. You appear under a generated name.' },
      { icon: 'heart', h: 'Keep in touch safely', p: 'Add good conversations as friends and call back, without swapping numbers.' },
    ],
    stepsH: 'How to talk to people in Bangladesh on TalkLive',
    stepsIntro: 'Match with everyone, or prefer Bangladesh in Filters.',
    steps: [
      { h: 'Prefer Bangladesh', p: 'Up to two preferred and two avoided countries are free in Filters.' },
      { h: 'Tap to Talk or Tap to Chat', p: 'Voice needs microphone permission once; text needs none.' },
      { h: 'Say hello', p: '"Assalamu alaikum" or "Nomoshkar", then "Kemon acho?" - how are you?' },
      { h: 'Next, or add a friend', p: 'Skip whenever you want, or keep the good ones.' },
    ],
    prose: [
      { h: 'When to find people from Bangladesh', body: [
        'TalkLive is busiest between 15:00 and 21:00 UTC. In Bangladesh Standard Time (UTC+6, no daylight saving) that is <strong>9 pm to 3 am</strong>; the quietest stretch is <strong>6 to 11 am</strong>. ' + MEASURED + ' Note that Bangladesh Standard Time is also abbreviated BST - not to be confused with British Summer Time, which is five hours behind it in summer.',
        'Because Bangla speakers are spread across several time zones, there is often someone to talk to even outside Bangladesh\'s evening: 10 pm in Dhaka is 9:30 pm in Kolkata, 5 pm in London in summer and 8 pm in Dubai.',
      ]},
      { h: 'A language people fought for', body: [
        'Bangla carries a history few languages share. On 21 February 1952, students in Dhaka were killed while demonstrating for Bengali to be recognised as a state language. UNESCO later made that date International Mother Language Day, now marked around the world. It is not surprising that so many Bangladeshis prefer to talk in their own language when they can.',
        'Standard Bangla is understood everywhere, but regional speech varies a lot - Chittagonian and Sylheti are distinct enough that speakers from Dhaka notice immediately, and Sylheti is the variety many British Bangladeshis grew up with. If you are matched with someone whose accent surprises you, asking where it comes from is one of the best openers there is.',
      ]},
      { h: 'What people talk about', body: [
        'Cricket, inevitably. Studies and exams come up constantly, as do plans to work or study abroad and stories from family members who already have. Music and poetry are a real bridge here - Tagore and Nazrul are still quoted in ordinary conversation - and food, especially anything involving fish and rice, can fill an hour by itself.',
        'If you speak Bangla as a heritage language and feel rusty, TalkLive is a low-pressure place to practise: nobody you know is listening, and most people are kind about a mixed Bangla-English sentence.',
      ]},
      { h: 'Staying safe', body: [
        'Never share a mobile-wallet PIN or one-time code - for bKash, Nagad or any other service - with someone you meet online, and never send money to a stranger however urgent the story. Be careful with anyone who asks for your NID number, photos, or to move to another app straight away. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">field guide to chat scams</a> lists the common scripts.',
        'If anyone is abusive, tap Report or Block on the call or chat screen. Blocked people are not matched with you again. In an emergency in Bangladesh, the national emergency number is <strong>999</strong>.',
      ]},
    ],
    faq: [
      { q: 'Can I voice chat in Bangla on TalkLive?', a: 'Yes. Speak whichever language you and your match prefer. The interface is also available in Bangla at talklive.app/bn/.' },
      { q: 'Is TalkLive free in Bangladesh?', a: 'Yes. Voice calls and text chats are free and need no account. Normal mobile data charges apply if you are not on Wi-Fi.' },
      { q: 'Will I be matched with someone from Bangladesh?', a: 'If you prefer Bangladesh in Filters, TalkLive will try to, but it depends on who is searching. Evenings in Bangladesh time are the best chance.' },
      { q: 'Can I talk to Bengali speakers in India or the UK?', a: 'Yes. Prefer India or the United Kingdom in Filters, or match worldwide and ask - Bengali speakers are spread across many countries.' },
      { q: 'Does anyone see my number?', a: 'No. Calls run in the browser, so no phone number is exchanged.' },
    ],
    ctaBandH: 'Kotha bolun - start talking',
    ctaBandP: 'Start a voice call or text chat in Bangla or English. Free, no sign-up, no camera.',
    cluster: 'countries',
    relatedPages: ['countries/india', 'countries/pakistan', 'regions/south-asia', 'country-chat-guide', 'language-exchange'].concat(others('bangladesh')),
    updated: UPDATED,
    posts: ['how-to-practise-a-language-by-speaking', 'how-to-spot-a-bot-or-scam-in-random-chat', 'what-to-talk-about-with-a-stranger'],
  },

  {
    slug: 'countries/united-states',
    crumb: 'United States',
    eyebrow: 'Six time zones · English and Spanish',
    title: 'Talk to Strangers in the USA - Free American Voice Chat | TalkLive',
    description: 'Free voice and text chat with people in the United States. No sign-up, no camera, no phone number. When Americans are online and the best time to find a match from the US.',
    keywords: 'talk to strangers usa, american voice chat, chat with americans, talk to americans online, random chat usa, us voice chat',
    h1: 'Talk to Strangers in the USA - Voice Chat With Americans',
    lede: 'The United States is one of TalkLive\'s largest audiences and the place most English learners want to practise with. Talk by voice or text with Americans, or call the world from the US - free, with no account, no number and no camera.',
    cta: 'Talk to Someone in the US',
    ctaChat: 'Text Someone in the US',
    featuresH: 'What to know before you call',
    featuresIntro: 'A big country, six time zones and a long history with random chat.',
    features: [
      { icon: 'globe', h: 'Six time zones', p: 'From Eastern to Hawaii time, so someone in the US is almost always awake.' },
      { icon: 'chat', h: 'English and Spanish', p: 'Spanish is the second most spoken language in American homes. The app is also in Spanish at <a href="/es/">/es/</a>.' },
      { icon: 'users', h: 'A favourite for English practice', p: 'Learners worldwide prefer American matches to practise everyday English.' },
      { icon: 'phone', h: 'No number, no cost', p: 'Calls run over the internet, so international calls cost nothing and nobody sees your number.' },
      { icon: 'shield', h: 'Adults only', p: 'TalkLive is 18+, voice and text only, with block and report on every screen.' },
      { icon: 'heart', h: 'Friends, not followers', p: 'Add someone you clicked with and call back - no social accounts needed.' },
    ],
    stepsH: 'How to talk to people in the US on TalkLive',
    stepsIntro: 'Prefer the United States, or match worldwide from the US.',
    steps: [
      { h: 'Prefer the United States', p: 'Free plan: up to two preferred and two avoided countries in Filters.' },
      { h: 'Choose voice or text', p: 'Tap to Talk asks for the microphone once; Tap to Chat needs nothing.' },
      { h: 'Say where you are', p: 'Americans usually ask which state or city - asking them first is a good opener.' },
      { h: 'Next, or add a friend', p: 'Keep the conversations worth keeping.' },
    ],
    prose: [
      { h: 'When to find people from the United States', body: [
        'TalkLive is busiest between 15:00 and 21:00 UTC. For most of the year that is <strong>11 am to 5 pm Eastern</strong> and <strong>8 am to 2 pm Pacific</strong> (an hour earlier in winter, once clocks go back on the first Sunday of November). In other words, from the US the busiest time to search is late morning to afternoon, not evening. ' + MEASURED,
        'American evenings - roughly 8 pm to 1 am Eastern - fall in TalkLive\'s quietest worldwide hours, because South Asia and Europe are asleep. You will still find people, but expect longer waits; widening your filters or trying text chat helps. For people elsewhere who want an American match, the reverse is true: US evenings are when Americans are most likely to be searching, even if the queue as a whole is quieter.',
      ]},
      { h: 'Why so many people want an American match', body: [
        'For learners, a conversation with an American is practice in the English they hear in films, music and online - contractions, slang and all. If you are matched with a learner, slowing down a little and asking whether they want corrections makes the call better for both of you. Our <a href="/practice-english-speaking">English speaking practice</a> guide has suggestions for structuring a call.',
        'Many Americans also arrive with a memory of Omegle, which closed in 2023, and already know the format. If that is you, our <a href="/omegle-alternative">Omegle alternative</a> page explains what is different here - most notably, no camera.',
      ]},
      { h: 'Talking across a big country', body: [
        'The US runs across Eastern, Central, Mountain and Pacific time on the mainland, plus Alaska and Hawaii, and most states change their clocks for daylight saving while Hawaii and most of Arizona do not. Asking "what time is it there?" is a genuinely useful opener - TalkLive also shows your match\'s local time on the call screen. Sport, music, work, travel plans and whatever the internet is arguing about that week are all reliable topics; politics is best left until you know someone wants to go there.',
      ]},
      { h: 'Staying safe', body: [
        'The US Federal Trade Commission\'s advice applies perfectly to random chat: no real business or government agency will ever ask you to pay with gift cards, cryptocurrency or a wire transfer, and anyone who does is a scammer. Be careful with people who quickly profess strong feelings, ask for photos, or want to move the chat to another app. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">field guide to chat scams</a> covers the rest.',
        'Report or Block anyone abusive - they will not be matched with you again. Fraud can be reported to the FTC at ReportFraud.ftc.gov. If you or someone you are talking to is in crisis, call or text <strong>988</strong>, the Suicide and Crisis Lifeline, any time.',
      ]},
    ],
    faq: [
      { q: 'Can I talk to Americans for free?', a: 'Yes. Voice and text chat are free, need no account, and you can prefer the United States in the country filter for free.' },
      { q: 'What is the best time to find someone from the US?', a: 'Americans are most likely to be searching in their own evening, but TalkLive overall is busiest from late morning to afternoon US time, when waits are shortest.' },
      { q: 'Can I call the US from another country?', a: 'Yes, at no cost. Calls run over the internet in your browser, so there are no international charges and no phone numbers involved.' },
      { q: 'Is TalkLive available in Spanish?', a: 'Yes. The interface is available in Spanish at talklive.app/es/, and you can speak whichever language you and your match prefer.' },
      { q: 'Is TalkLive safe for adults in the US?', a: 'It is for adults 18+ only, has no video, never records audio, and has block and report on every screen. As with any online service, keep personal details private.' },
    ],
    ctaBandH: 'Say hi to someone across the Atlantic - or across the street',
    ctaBandP: 'Start a free voice call or text chat with people in the US and worldwide. No sign-up, no camera.',
    cluster: 'countries',
    relatedPages: ['countries/united-kingdom', 'regions/americas', 'practice-english-speaking', 'omegle-alternative', 'country-chat-guide'].concat(others('united-states')),
    updated: UPDATED,
    posts: ['what-happened-to-omegle', 'how-to-spot-a-bot-or-scam-in-random-chat', 'how-to-practise-a-language-by-speaking'],
  },

  {
    slug: 'countries/united-kingdom',
    crumb: 'United Kingdom',
    eyebrow: 'GMT and BST · England, Scotland, Wales, Northern Ireland',
    title: 'Talk to Strangers in the UK - Free British Voice Chat | TalkLive',
    description: 'Free voice and text chat with people in the UK. No sign-up, no camera, no phone number. Why UK evenings are the busiest time on TalkLive, and how to get the most from them.',
    keywords: 'talk to strangers uk, british voice chat, chat with british people, uk random chat, talk to someone uk, uk voice chat',
    h1: 'Talk to Strangers in the UK - Voice Chat With British People',
    lede: 'The UK is in the best seat in the house: TalkLive\'s busiest hours worldwide fall in the British evening. Talk by voice or text with people across England, Scotland, Wales and Northern Ireland - or with the world - free, with no account and no camera.',
    cta: 'Talk to Someone in the UK',
    ctaChat: 'Text Someone in the UK',
    featuresH: 'Why the UK is a good place to call from',
    featuresIntro: 'A timezone that overlaps with almost everyone, and more accents than any map suggests.',
    features: [
      { icon: 'globe', h: 'Your evening is peak time', p: 'TalkLive\'s busiest hours line up with after-work time in the UK, so waits are short.' },
      { icon: 'world', h: 'Overlaps with everyone', p: 'A UK evening is late night in South Asia and afternoon in the Americas - all at once.' },
      { icon: 'chat', h: 'Accents for days', p: 'Scouse, Geordie, Glaswegian, Welsh, Brummie - British matches are an accent education.' },
      { icon: 'users', h: 'A many-language country', p: 'Polish, Urdu, Punjabi and Bengali are among the languages spoken at home across the UK.' },
      { icon: 'shield', h: 'Adults only, no video', p: 'TalkLive is 18+, voice and text only, and never records audio.' },
      { icon: 'heart', h: 'Keep in touch', p: 'Add a good conversation as a friend and call back - no numbers swapped.' },
    ],
    stepsH: 'How to talk to people in the UK on TalkLive',
    stepsIntro: 'Prefer the United Kingdom, or make the most of your timezone and match worldwide.',
    steps: [
      { h: 'Prefer the United Kingdom', p: 'Up to two preferred and two avoided countries are free in Filters.' },
      { h: 'Choose voice or text', p: 'Voice asks for the microphone once; text needs nothing.' },
      { h: 'Open with "Alright?"', p: 'Or "Hiya", or just hello. Asking about someone\'s accent is a classic UK opener.' },
      { h: 'Next, or add a friend', p: 'Move on freely, or keep the good ones.' },
    ],
    prose: [
      { h: 'When to find people - and why UK evenings are ideal', body: [
        'TalkLive is busiest between 15:00 and 21:00 UTC. In British Summer Time that is <strong>4 pm to 10 pm</strong>; after the clocks go back on the last Sunday of October it becomes <strong>3 pm to 9 pm GMT</strong>. Either way it lands on the British afternoon and evening, which makes the UK one of the easiest places in the world to find a quick match. The quietest stretch is the small hours, roughly 1 am to 6 am. ' + MEASURED,
        'The reason is geography. At 8 pm in London it is 12:30 or 1:30 am in India, midnight-ish in Pakistan and Bangladesh, and afternoon in New York and Chicago - three of TalkLive\'s biggest audiences awake at once, with the UK in the middle.',
      ]},
      { h: 'More languages than you might expect', body: [
        'English is the language of almost every UK match, but it is far from the only one spoken at home. Welsh and Scottish Gaelic have long histories, and in the 2021 census for England and Wales the most common main languages after English were Polish, Romanian, Panjabi and Urdu, with Bengali close behind. A match from Birmingham, Bradford or east London may switch to Urdu, Punjabi or Sylheti if you share it.',
        'For learners, British English is its own adventure: "you alright?" is a greeting, not a welfare check, and "not bad" can mean genuinely good. If you are practising, tell your match - most people are happy to explain, and our <a href="/practice-english-speaking">English speaking practice</a> guide suggests how to structure the conversation.',
      ]},
      { h: 'What people talk about', body: [
        'Football, music and television carry a lot of conversations, along with university life in term time and the cost of living all year round. The weather really does come up - not because it is interesting, but because it is something everyone shares. Dry humour is the default, and a bit of self-deprecation goes a long way.',
      ]},
      { h: 'Staying safe', body: [
        'Keep personal details - your full name, address, workplace, school or social handles - out of conversations with people you have just met, and never send money or bank details to someone you met in a chat. Be wary of anyone who asks for photos or wants to move to another app straight away. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">field guide to chat scams</a> lists the common scripts.',
        'Tap Report or Block on anyone abusive; they will not be matched with you again. If you are struggling, Samaritans are free to call on <strong>116 123</strong>, day or night, from anywhere in the UK and Ireland. In an emergency, call <strong>999</strong>.',
      ]},
    ],
    faq: [
      { q: 'Can I talk to people in the UK for free?', a: 'Yes. Voice and text chat are free and need no account. Preferring the UK in the country filter is free too.' },
      { q: 'When is TalkLive busiest in the UK?', a: 'Roughly 4 pm to 10 pm in summer time and 3 pm to 9 pm GMT in winter - the British afternoon and evening.' },
      { q: 'Does TalkLive use my phone number or camera?', a: 'Neither. Calls run in the browser, there is no video, and no phone number is exchanged.' },
      { q: 'Can I find people who speak Urdu, Punjabi or Polish in the UK?', a: 'Often, yes. Prefer the UK and ask - many people in the UK speak another language at home and are happy to switch.' },
      { q: 'Is TalkLive suitable for under-18s?', a: 'No. TalkLive is for adults aged 18 and over only.' },
    ],
    ctaBandH: 'It is peak time somewhere - probably right now',
    ctaBandP: 'Start a voice call or text chat with people in the UK and around the world. Free, no sign-up, no camera.',
    cluster: 'countries',
    relatedPages: ['countries/united-states', 'regions/europe', 'practice-english-speaking', 'late-night-chat', 'country-chat-guide'].concat(others('united-kingdom')),
    updated: UPDATED,
    posts: ['what-to-talk-about-with-a-stranger', 'how-to-spot-a-bot-or-scam-in-random-chat', 'loneliness-what-actually-helps'],
  },

  {
    slug: 'countries/egypt',
    crumb: 'Egypt',
    eyebrow: 'Egyptian Arabic · English',
    title: 'Talk to Strangers in Egypt - Free Arabic Voice Chat | TalkLive',
    description: 'Free voice and text chat with people in Egypt. Egyptian Arabic or English, no sign-up, no camera, with an Arabic interface. When Egypt is busiest on TalkLive, in Cairo time.',
    keywords: 'talk to strangers egypt, egyptian chat, arabic voice chat, chat with egyptians, random chat egypt, egypt voice chat',
    h1: 'Talk to Strangers in Egypt - Voice Chat in Arabic or English',
    lede: 'Egyptian Arabic is the dialect the whole Arab world grew up hearing in films and on television, which makes Egypt one of the easiest places to start an Arabic conversation. Talk by voice or text, free, with no account, no number and no camera.',
    cta: 'Talk to Someone in Egypt',
    ctaChat: 'Text Someone in Egypt',
    featuresH: 'Why Egypt is a great place to talk',
    featuresIntro: 'A young, talkative country with the most widely understood Arabic dialect.',
    features: [
      { icon: 'chat', h: 'The Arabic everyone knows', p: 'Thanks to Egyptian film and TV, Masri is understood from Morocco to Iraq.' },
      { icon: 'globe', h: 'An Arabic interface', p: 'The whole app works in Arabic, right to left, at <a href="/ar/">/ar/</a>.' },
      { icon: 'users', h: 'A young audience', p: 'Egypt is one of the youngest large countries in the world, and its matches skew toward students.' },
      { icon: 'mic', h: 'Voice beats typing', p: 'Arabic script, Franco-Arabic or English? With voice, you do not have to choose.' },
      { icon: 'lock', h: 'Private by default', p: 'No phone number, no national ID, no camera. A generated name is all anyone sees.' },
      { icon: 'heart', h: 'Make a friend', p: 'Add someone you clicked with and call back - no numbers swapped.' },
    ],
    stepsH: 'How to talk to people in Egypt on TalkLive',
    stepsIntro: 'Prefer Egypt, or match with the whole Arabic-speaking world.',
    steps: [
      { h: 'Prefer Egypt in Filters', p: 'Up to two preferred and two avoided countries are free.' },
      { h: 'Tap to Talk or Tap to Chat', p: 'Voice asks for the microphone once; text needs no permission.' },
      { h: 'Say "Ezzayak?"', p: '"How are you?" in Egyptian Arabic - "ezzayek" to a woman. A plain "salam" works too.' },
      { h: 'Next, or add a friend', p: 'Skip freely, or keep a good conversation going another day.' },
    ],
    prose: [
      { h: 'When to find people from Egypt', body: [
        'TalkLive is busiest between 15:00 and 21:00 UTC. Egypt brought back daylight saving in 2023, so while summer time is in force (from the last Friday of April to the last Thursday of October, UTC+3) that window is <strong>6 pm to midnight</strong> in Cairo; in winter (UTC+2) it is <strong>5 pm to 11 pm</strong>. Egyptian users often stay on much later than that. The quietest stretch is the early morning, roughly 3 to 8 am. ' + MEASURED,
        'That evening overlaps neatly with the Gulf (level with Cairo in summer, an hour ahead in winter), with Europe\'s late afternoon and evening, and with South Asia\'s late night - so a match from Cairo could just as easily be with someone in Riyadh, Paris or Lahore.',
      ]},
      { h: 'Egyptian Arabic and why it travels', body: [
        'Modern Standard Arabic is what Egyptians read and write, but what they speak is Egyptian Arabic, or Masri. For decades Cairo was the capital of Arabic film, music and television, so people across the region absorbed its sounds and expressions without ever living there. In practice that means an Egyptian can usually be understood by an Arabic speaker anywhere, which is not true of every dialect.',
        'Learning Arabic? Egyptian is a popular dialect to learn for exactly that reason. Tell your match you are practising - many will happily slow down - and expect a few jokes along the way. Online, many Egyptians write Arabic in Latin letters with numbers for sounds English lacks (3 for ع, 7 for ح); by voice, you skip all that.',
      ]},
      { h: 'What people talk about', body: [
        'Football first, and the Al Ahly versus Zamalek rivalry is not something to pick a side in lightly. Films, series, comedians and music are the next safest ground. Exams, especially the final secondary-school year, and university come up often among younger users, along with work, family and plans to travel. Humour is a big part of Egyptian conversation - expect teasing, and feel free to give some back.',
      ]},
      { h: 'Staying safe', body: [
        'Keep personal details private: your full name, address, national ID number, workplace and social media accounts are not for strangers. Never share a bank card number, mobile-wallet PIN or one-time code, and be careful with anyone who asks for photos or wants to move to another app at once. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">field guide to chat scams</a> lists the common scripts.',
        'Tap Report or Block to deal with anyone abusive - blocked people are not matched with you again. TalkLive is for adults aged 18 and over only.',
      ]},
    ],
    faq: [
      { q: 'Can I voice chat in Arabic on TalkLive?', a: 'Yes. Speak whichever language you and your match prefer, and use the Arabic interface at talklive.app/ar/ if you like.' },
      { q: 'Is TalkLive free in Egypt?', a: 'Yes. Voice and text chat are free, need no account, and preferring Egypt in Filters is free.' },
      { q: 'What time is Egypt busiest?', a: 'Evenings in Cairo time - about 6 pm to midnight in summer and 5 pm to 11 pm in winter are TalkLive\'s busiest hours.' },
      { q: 'Can I practise Egyptian Arabic here?', a: 'Yes. Prefer Egypt, tell your match you are learning, and keep it relaxed. Voice is ideal because the dialect is rarely written formally.' },
      { q: 'Does anyone see my phone number?', a: 'No. Calls run in the browser over the internet; no number is exchanged.' },
    ],
    ctaBandH: 'Yalla - start talking',
    ctaBandP: 'Start a voice call or text chat with people in Egypt and the Arab world. Free, no sign-up, no camera.',
    cluster: 'countries',
    relatedPages: ['countries/nigeria', 'language-exchange', 'language-chat-guide', 'country-chat-guide'].concat(others('egypt')),
    updated: UPDATED,
    posts: ['how-to-practise-a-language-by-speaking', 'what-to-talk-about-with-a-stranger', 'how-to-spot-a-bot-or-scam-in-random-chat'],
  },

  {
    slug: 'countries/nigeria',
    crumb: 'Nigeria',
    eyebrow: 'English · Pidgin · Yoruba · Igbo · Hausa',
    title: 'Talk to Strangers in Nigeria - Free Nigerian Voice Chat | TalkLive',
    description: 'Free voice and text chat with people in Nigeria. English, Pidgin, Yoruba, Igbo or Hausa - no sign-up, no camera, light on data. When Nigeria is busiest on TalkLive, in WAT.',
    keywords: 'talk to strangers nigeria, nigerian chat, nigeria voice chat, chat with nigerians, random chat nigeria, talk to someone nigeria',
    h1: 'Talk to Strangers in Nigeria - Voice Chat in English, Pidgin and More',
    lede: 'Nigeria is Africa\'s most populous country and one of the youngest on earth, and it loves to talk. Chat by voice or text in English, Pidgin, Yoruba, Igbo or Hausa - free, with no account, no number, no camera and very little data.',
    cta: 'Talk to Someone in Nigeria',
    ctaChat: 'Text Someone in Nigeria',
    featuresH: 'Why Nigerians talk on TalkLive',
    featuresIntro: 'A country of five hundred languages and one unmistakable conversational energy.',
    features: [
      { icon: 'chat', h: 'English and Pidgin', p: 'English is the official language; Nigerian Pidgin is the one half the country actually jokes in.' },
      { icon: 'globe', h: 'Hundreds of languages', p: 'Yoruba, Igbo and Hausa are the biggest of more than five hundred - ask which one your match grew up with.' },
      { icon: 'bolt', h: 'Easy on data', p: 'Audio-only calls use a fraction of the data of video, which matters when every megabyte costs.' },
      { icon: 'users', h: 'Young and talkative', p: 'Nigeria is one of the youngest countries in the world, and conversations show it.' },
      { icon: 'lock', h: 'No number, no BVN, no NIN', p: 'Nothing identifying is needed to chat. You appear under a generated name.' },
      { icon: 'heart', h: 'Keep in touch', p: 'Add someone as a friend and call back later - no numbers swapped.' },
    ],
    stepsH: 'How to talk to people in Nigeria on TalkLive',
    stepsIntro: 'Prefer Nigeria, or match worldwide from Nigeria.',
    steps: [
      { h: 'Prefer Nigeria in Filters', p: 'Up to two preferred and two avoided countries are free.' },
      { h: 'Tap to Talk or Tap to Chat', p: 'Voice asks for the microphone once; text needs no permission.' },
      { h: 'Say "How far?"', p: 'The Pidgin hello. Or "Bawo ni" in Yoruba, "Kedu" in Igbo, "Sannu" in Hausa.' },
      { h: 'Next, or add a friend', p: 'Skip freely, or keep the good ones.' },
    ],
    prose: [
      { h: 'When to find people from Nigeria', body: [
        'TalkLive is busiest between 15:00 and 21:00 UTC. Nigeria keeps West Africa Time (UTC+1) all year with no daylight saving, so that is <strong>4 pm to 10 pm WAT</strong> - the end of the working day and the evening, when it is easiest to find a quick match. The quietest stretch is roughly <strong>1 am to 6 am</strong>. ' + MEASURED,
        'Being one hour ahead of GMT puts Nigeria in a useful middle position: a Lagos evening is the same evening in London and Paris, late night in India and Pakistan, and afternoon in New York.',
      ]},
      { h: 'English, Pidgin and five hundred more', body: [
        'English is Nigeria\'s official language and the one most matches start in. Nigerian Pidgin is spoken across the country and beyond, and many conversations slide into it once people relax - if you do not speak it, ask; most people enjoy explaining. Yoruba in the southwest, Igbo in the southeast and Hausa in the north are the largest of the country\'s more than five hundred languages.',
        'For English learners elsewhere, a Nigerian match is real-world practice with fast, expressive, idiomatic English - exactly the kind textbooks do not prepare you for. Our <a href="/practice-english-speaking">English speaking practice</a> guide has tips for keeping up.',
      ]},
      { h: 'What people talk about', body: [
        'Football is the universal opener, followed closely by music: Afrobeats is one of Nigeria\'s biggest exports, and most matches will have strong opinions about who is the best right now. Nollywood films, business ideas, school and work, faith and family all come up, along with a lot of good-natured banter. Expect energy - and match it.',
      ]},
      { h: 'Staying safe and saving data', body: [
        'Keep personal details to yourself: your full name, address, BVN, NIN, bank details and one-time codes should never be shared with someone you meet online. Be careful with anyone who asks for photos, offers a "business opportunity" that needs an upfront payment, or wants to move to another app straight away. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">field guide to chat scams</a> lists the common scripts.',
        'To save data, use voice rather than video apps and text rather than voice when your bundle is low - TalkLive\'s text chat uses very little. Tap Report or Block on anyone abusive; they will not be matched with you again. In an emergency in Nigeria, call <strong>112</strong>.',
      ]},
    ],
    faq: [
      { q: 'Is TalkLive free in Nigeria?', a: 'Yes. Voice and text chat are free and need no account. Normal data charges apply on mobile data, and audio-only calls keep that low.' },
      { q: 'Can I chat in Pidgin, Yoruba, Igbo or Hausa?', a: 'Yes. Speak whichever language you and your match share - the app does not limit what language you talk in.' },
      { q: 'When is Nigeria busiest on TalkLive?', a: 'Roughly 4 pm to 10 pm WAT, which lines up with TalkLive\'s busiest hours worldwide.' },
      { q: 'Will I always match with someone in Nigeria?', a: 'Not always. Preferring Nigeria steers matching, but it depends on who is searching at that moment.' },
      { q: 'Does anyone see my phone number?', a: 'No. Calls run in the browser over the internet; no number is exchanged.' },
    ],
    ctaBandH: 'How far? Start talking',
    ctaBandP: 'Start a voice call or a text chat with people in Nigeria and worldwide. Free, no sign-up, no camera.',
    cluster: 'countries',
    relatedPages: ['countries/egypt', 'countries/united-kingdom', 'practice-english-speaking', 'make-friends-online', 'country-chat-guide'].concat(others('nigeria')),
    updated: UPDATED,
    posts: ['what-to-talk-about-with-a-stranger', 'how-to-spot-a-bot-or-scam-in-random-chat', 'how-to-practise-a-language-by-speaking'],
  },

  {
    slug: 'countries/indonesia',
    crumb: 'Indonesia',
    eyebrow: 'Bahasa Indonesia · three time zones',
    title: 'Talk to Strangers in Indonesia - Free Indonesian Voice Chat | TalkLive',
    description: 'Free voice and text chat with people in Indonesia. Bahasa Indonesia or English, no sign-up, no app to install, no camera, and an Indonesian interface. Best times in WIB.',
    keywords: 'talk to strangers indonesia, indonesian chat, ngobrol dengan orang asing, chat indonesia, indonesian voice chat, random chat indonesia',
    h1: 'Talk to Strangers in Indonesia - Voice Chat in Bahasa Indonesia or English',
    lede: 'From Sumatra to Papua, Bahasa Indonesia lets people from opposite ends of seventeen thousand islands talk without missing a beat. Join them by voice or text - free, in your browser, with no app to install, no account and no camera.',
    cta: 'Talk to Someone in Indonesia',
    ctaChat: 'Text Someone in Indonesia',
    featuresH: 'Built for a mobile-first country',
    featuresIntro: 'For many Indonesians the phone is the only computer they own. TalkLive is built for that.',
    features: [
      { icon: 'bolt', h: 'Nothing to install', p: 'TalkLive runs in the phone\'s browser - no app store, no storage space, no updates.' },
      { icon: 'globe', h: 'An Indonesian interface', p: 'The whole app is available in Bahasa Indonesia at <a href="/id/">/id/</a>.' },
      { icon: 'chat', h: 'One language, many islands', p: 'Bahasa Indonesia is shared across the archipelago, alongside hundreds of regional languages.' },
      { icon: 'mic', h: 'Light on kuota', p: 'Audio-only calls use a fraction of the data of video, so your data package lasts.' },
      { icon: 'lock', h: 'No number, no NIK', p: 'Nothing identifying is needed. Nobody sees your phone number or WhatsApp.' },
      { icon: 'heart', h: 'Find a friend', p: 'Add someone you enjoyed talking to and call back - no numbers exchanged.' },
    ],
    stepsH: 'How to talk to people in Indonesia on TalkLive',
    stepsIntro: 'Prefer Indonesia, or match with the whole world.',
    steps: [
      { h: 'Prefer Indonesia in Filters', p: 'Up to two preferred and two avoided countries are free.' },
      { h: 'Tap to Talk or Tap to Chat', p: 'Voice asks for microphone permission once; text needs none.' },
      { h: 'Say "Halo, apa kabar?"', p: 'Hello, how are you? Asking which island or city they are from is a great second line.' },
      { h: 'Next, or add a friend', p: 'Move on whenever you like, or keep a good conversation.' },
    ],
    prose: [
      { h: 'When to find people from Indonesia', body: [
        'Indonesia spans three time zones: WIB (UTC+7) for Java and Sumatra, WITA (UTC+8) for Bali, Nusa Tenggara and Sulawesi, and WIT (UTC+9) for Maluku and Papua, with no daylight saving. TalkLive\'s busiest worldwide window, 15:00 to 21:00 UTC, is <strong>10 pm to 4 am WIB</strong> - late at night in Indonesia, because it lines up with the South Asian and European evening. ' + MEASURED,
        'In practice that means two good times to search from Indonesia: the late evening WIB, when the worldwide queue is busiest, and the early evening, when other Indonesians are most likely to be online. The quietest stretch for the whole site is <strong>7 am to noon WIB</strong>.',
      ]},
      { h: 'Bahasa Indonesia and the languages beside it', body: [
        'Bahasa Indonesia grew out of Malay, the old trading language of the archipelago, and was adopted in 1928 as a shared national language rather than Javanese, the language of the largest group. It worked: today it is spoken across the archipelago, even though most Indonesians grow up speaking a regional language first. Javanese has more native speakers than any other, and Sundanese, Madurese, Minangkabau and Balinese are just a few of the seven hundred or so others. Do not be surprised if your match switches to Javanese with a friend in the background.',
        'Learning Indonesian? It is often called one of the friendlier Asian languages to start with - no tones, a Latin alphabet and simple verb forms. Voice practice with a patient match is the fastest way to get comfortable. Our <a href="/language-exchange">language exchange</a> guide explains how to set one up.',
      ]},
      { h: 'What people talk about', body: [
        'Football and badminton - Indonesia has a proud badminton record - are safe openers. Music is huge, from dangdut to Indonesian pop and K-pop fandoms. Studies, plans to study or work abroad, food (every region claims the best rendang, sambal or bakso) and travel across the islands fill a lot of conversations. Religion and family matter to many people here; let your match lead on those topics.',
      ]},
      { h: 'Staying safe', body: [
        'Keep personal details private: your full name, address, NIK, bank or e-wallet details and one-time codes (OTP) should never be shared with someone you meet online. Be wary of anyone offering online "jobs" that pay for simple tasks but ask for a deposit first, anyone asking for photos, and anyone who wants to move to WhatsApp or Telegram immediately. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">field guide to chat scams</a> lists the common scripts.',
        'Tap Report or Block on anyone abusive - blocked people are not matched with you again. In an emergency in Indonesia, the national number is <strong>112</strong>.',
      ]},
    ],
    faq: [
      { q: 'Is TalkLive free in Indonesia?', a: 'Yes. Voice and text chat are free, need no account and no app. Normal data charges apply on mobile data.' },
      { q: 'Can I use TalkLive in Bahasa Indonesia?', a: 'Yes. The full interface is available in Indonesian at talklive.app/id/.' },
      { q: 'Do I need to download an app?', a: 'No. TalkLive works in the browser on Android and iPhone. You can add it to your home screen if you want an icon.' },
      { q: 'When is the best time to find someone?', a: 'TalkLive overall is busiest late at night WIB; other Indonesians are most often online in the evening. Try both.' },
      { q: 'Does anyone see my WhatsApp or phone number?', a: 'No. Calls run in the browser over the internet, so no number or messaging account is shared.' },
    ],
    ctaBandH: 'Ayo ngobrol - start talking',
    ctaBandP: 'Start a voice call or text chat with people in Indonesia and worldwide. Free, no app, no camera.',
    cluster: 'countries',
    relatedPages: ['countries/india', 'language-exchange', 'language-chat-guide', 'country-chat-guide'].concat(others('indonesia')),
    updated: UPDATED,
    posts: ['how-to-practise-a-language-by-speaking', 'what-to-talk-about-with-a-stranger', 'how-to-spot-a-bot-or-scam-in-random-chat'],
  },
];

module.exports = PAGES;
module.exports.COUNTRY_SLUGS = COUNTRY_SLUGS;
