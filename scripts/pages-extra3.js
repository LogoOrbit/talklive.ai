'use strict';
/*
 * Landing pages added from the Phase 2 keyword research in docs/seo-audit.md.
 *
 * Same object shape as CORE_PAGES in build-seo.js. Required by build-seo.js
 * and regenerated on every build - unlike scripts/pages-extra2.js, which is
 * orphaned (see SEO.md).
 *
 * There is exactly one page here, and that is deliberate. The research found
 * the commercial keyword space already covered by the 74 existing landing
 * pages: /random-call, /random-voice-chat, /free-voice-chat,
 * /international-calls, /practice-english-speaking, /chat-without-registration
 * and the rest between them own the head terms this site can realistically
 * win. Adding /random-audio-call beside /random-call, or
 * /speak-english-with-strangers beside /practice-english-speaking, would be
 * keyword cannibalisation - the same pattern the research flagged on a
 * competitor and explicitly recommended against copying. The genuine content
 * gap was informational, and it is filled by scripts/blog-extra3.js.
 *
 * The one real structural gap was this: the existing 13 "X alternative" pages
 * all compare against video roulette services, and none reaches the
 * language-practice SERP (englishbooth, hilokal, free4talk, strangr) that
 * /practice-english-speaking and /language-exchange compete in.
 *
 * This page is written against durable structural facts about the *format* -
 * public group rooms you browse and join, versus one-to-one pairing you are
 * matched into - and not against any competitor's current features, prices or
 * feature list, per the policy documented in scripts/pages-extra.js. Those
 * change without notice; the format does not.
 */

module.exports = [
  {
    slug: 'free4talk-alternative',
    crumb: 'Free4Talk Alternative',
    eyebrow: 'One-to-one, by voice',
    title: 'Free4Talk Alternative - 1-on-1 Voice Practice | TalkLive',
    description: 'Want a Free4Talk alternative without group rooms? TalkLive pairs you one-to-one by voice for language practice - no room to join, no camera, free core matching.',
    keywords: 'free4talk alternative, sites like free4talk, language practice chat, speaking practice online, one on one language practice, voice chat language exchange',
    h1: 'A Free4Talk Alternative for One-to-One Speaking Practice',
    lede: 'Group rooms are great for listening and hard for speaking - in a room of six, you talk for a sixth of the time. TalkLive pairs you with exactly one person by voice, so every minute of the call is practice.',
    cta: 'Start Practising Free',
    featuresH: 'What one-to-one practice changes',
    featuresIntro: 'The format decides how much you actually speak, and speaking is the part that is hard to get.',
    features: [
      { icon: 'mic', h: 'You talk half the time', p: 'A two-person call splits speaking time evenly. A six-person room does not, and the quietest person stays quiet.' },
      { icon: 'bolt', h: 'No room to choose', p: 'Nothing to browse, join or wait inside. Press once and you are matched with someone who is also waiting.' },
      { icon: 'shield', h: 'Nobody is watching', p: 'A one-to-one call has no audience. Making mistakes in front of one person is easier than in front of five.' },
      { icon: 'globe', h: 'Optional country preference', p: 'Aim at a region if you want to. It changes the odds; it does not guarantee a native speaker.' },
      { icon: 'lock', h: 'No camera, ever', p: 'TalkLive contains no camera code. Voice practice needs your microphone and nothing else.' },
      { icon: 'next', h: 'Move on freely', p: 'If a match is not a useful practice partner, end it and search again. No room etiquette to navigate.' },
    ],
    stepsH: 'Practising a language on TalkLive',
    stepsIntro: 'From opening the page to speaking takes under ten seconds.',
    steps: [
      { h: 'Open TalkLive', p: 'Any browser on any device. Nothing to install and no account screen.' },
      { h: 'Allow your microphone', p: 'Only the microphone. There is no camera permission because there is no camera.' },
      { h: 'Say what you are practising', p: 'Open with it: "I am learning English, can we speak in English?" It sets expectations and filters fast.' },
      { h: 'Talk, then move on', p: 'Keep going while it is useful. When it is not, end the call and get a new partner.' },
    ],
    compare: {
      h: 'Group rooms vs one-to-one calls',
      intro: 'Both formats are legitimate and they are good at different things. This compares the formats, not any particular service - features and pricing change, the structure does not.',
      them: 'Group rooms',
      rows: [
        { label: 'Shape', them: 'A public room you browse a list for and join', us: 'A one-to-one pairing you are matched into' },
        { label: 'Your speaking time', them: 'Divided among everyone present', us: 'Roughly half the call' },
        { label: 'Getting started', them: 'Find a room at your level, in your language, with space', us: 'One tap, no list to read' },
        { label: 'Audience', them: 'Everyone in the room hears every mistake', us: 'One person' },
        { label: 'Leaving', them: 'Leaving a small room is visible to the group', us: 'Ending a call is between the two of you' },
        { label: 'Camera', them: 'Often available, sometimes expected', us: 'None - TalkLive has no camera at all' },
        { label: 'Best for', them: 'Listening to natural multi-person conversation, lurking while you build confidence', us: 'Forcing yourself to produce language under real-time pressure' },
        { label: 'Cost', them: 'Check the service\'s current pricing', us: 'Core voice and text matching is free; optional Premium adds advanced filters' },
      ],
    },
    prose: [
      { h: 'Why the format matters more than the platform', body: [
        'Language learners usually plateau in the same place: comprehension keeps improving and production does not. You can follow a podcast, read the news and understand a film, and still freeze when a person expects a sentence from you. Only one thing fixes that, and it is producing language in real time with someone who is not waiting patiently for you to finish.',
        'Group rooms are excellent for the first half of that problem. Sitting in a room where four people are talking naturally is genuinely good listening practice, and it is comfortable, because nobody requires anything from you. That comfort is also the catch - the format lets you stay quiet, and staying quiet is the thing you are trying to stop doing.',
        'A one-to-one call removes the option. There is no one else to fill a silence, so you fill it. That is harder, and it is the point.',
      ]},
      { h: 'What a random pairing gets you that a scheduled partner does not', body: [
        'Arranged language exchanges have real advantages: you know the person, you can build on previous conversations, and they have agreed to help you. They also take organising, and organising is where most people\'s practice quietly stops.',
        'Random pairing has the opposite trade. You get nobody\'s commitment and no continuity - but you get a conversation right now, at whatever hour you happen to be free, without messaging anyone first. For daily practice that difference decides whether it happens at all.',
        'It also exposes you to variety you would not choose. Different accents, different speeds, different vocabulary, and people who will not slow down for you. That is uncomfortable and it is exactly the condition real conversation happens under.',
      ]},
      { h: 'Being clear about what this is not', body: [
        'Nobody on TalkLive is a teacher. Participants are not vetted, language ability is not verified, and a country preference does not guarantee a native speaker or any particular person at all. Some will correct you well, some will correct you wrongly, and most will not correct you unless you ask.',
        'So this is the conversation half of a practice routine, not the whole of it. Grammar and vocabulary still come from structured study; this is where you find out which of it you can actually use at speed.',
        'The usual stranger-chat rules apply regardless of how educational the purpose is: share nothing identifying, nothing financial, and end anything uncomfortable. TalkLive is 18+.',
      ]},
    ],
    faq: [
      { q: 'Is TalkLive a good Free4Talk alternative?', a: 'If what you want is speaking time, yes - one-to-one pairing gives you roughly half of every call instead of a share of a room. If what you specifically want is a group room to listen in on, no: TalkLive pairs two people and does not have rooms.' },
      { q: 'Do I need an account?', a: 'No. Core voice and text matching is free and needs no sign-up. An optional free account exists only if you want to keep friends between sessions.' },
      { q: 'Can I choose the language?', a: 'There is no language filter. You can set an optional country preference, which changes the odds without guaranteeing anything, and the reliable move is to say in your first sentence which language you want to practise.' },
      { q: 'Will people correct my mistakes?', a: 'Only if you ask, and even then it varies - participants are ordinary users, not tutors. Say what you want at the start: "stop me when I make a mistake" and "tell me at the end" produce very different calls.' },
      { q: 'Is there video?', a: 'No. TalkLive contains no camera code at all. It asks for your microphone and nothing else.' },
      { q: 'Is my voice recorded?', a: 'TalkLive does not record or store voice audio. Calls use encrypted WebRTC over TalkLive\'s production TURN relay; another participant could still record on their own device, which is true of any voice platform.' },
    ],
    ctaBandH: 'Practise speaking, one person at a time',
    ctaBandP: 'Core matching is free and needs no sign-up. A match depends on someone compatible being in the live queue.',
    posts: ['talking-to-strangers-in-another-language', 'how-to-practise-a-language-by-speaking', 'practice-english-speaking-online-free'],
  },
];
