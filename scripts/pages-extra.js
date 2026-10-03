'use strict';
/*
 * Additional TalkLive landing pages.
 *
 * Same object shape as CORE_PAGES in build-seo.js, plus two optional fields:
 *   compare: { h, intro, them, rows:[{label, them, us}] }  → comparison table
 *   posts:   ['blog-slug', …]                              → related articles
 *
 * Competitor comparisons are deliberately written against structural facts
 * (video-first vs voice-first, browser vs app store, what sits behind a
 * paywall) rather than specific prices or feature lists, which change without
 * notice and would quietly rot into inaccuracies.
 */

module.exports = [
  // --- Category / intent pages ------------------------------------------------




  {
    slug: 'language-exchange',
    crumb: 'Language Exchange',
    eyebrow: 'Speaking practice',
    title: 'Language Exchange - Free Speaking Practice by Voice | TalkLive',
    description: 'Free core voice matching for language practice with people worldwide. No sign-up; language, fluency, availability and learning outcomes are not guaranteed.',
    keywords: 'language exchange, language exchange app, free language exchange, speaking practice online, language partner, conversation practice, practice speaking with native speakers',
    h1: 'Language Exchange That Is Actually Speaking Practice',
    lede: 'TalkLive lets you search for live voice practice with another participant. Conversation can complement study, but language, fluency, availability and learning outcomes are not guaranteed.',
    cta: 'Find a Speaking Partner',
    featuresH: 'Built for speaking, not messaging',
    featuresIntro: 'Reading and writing are the easy parts. This is for the part that actually stalls.',
    features: [
      { icon: 'mic', h: 'Live voice practice', p: 'Search for an unscripted voice conversation when another compatible participant is available.' },
      { icon: 'globe', h: 'Potential accent variety', p: 'Matches may expose you to different speakers and regions, but country, language and fluency are not guaranteed.' },
      { icon: 'bolt', h: 'No booked lesson', p: 'Search when you have time rather than scheduling a class; wait time still depends on live availability.' },
      { icon: 'shield', h: 'No camera required', p: 'A temporary display name and no camera may lower pressure, but they do not guarantee identity, anonymity or safety.' },
      { icon: 'next', h: 'End practice anytime', p: 'Next ends the match. Typed context may be retained under the Privacy Policy, and another participant may record on their device.' },
      { icon: 'users', h: 'Keep the good partners', p: 'Add a regular as a friend and build a recurring practice without swapping contact details.' },
    ],
    stepsH: 'How to use TalkLive for language exchange',
    stepsIntro: 'A repeatable routine beats an occasional heroic session.',
    steps: [
      { h: 'Set an interest filter', p: 'Flag language practice so you are steered toward people who want the same thing.' },
      { h: 'Tap to Talk', p: 'Search for a compatible participant, then ask whether they want to practise the same language. A match or willingness to help is not guaranteed.' },
      { h: 'Set a small practice goal', p: 'Aim for a short exchange, but leave immediately if the conversation feels unsafe or the other person does not share the same goal.' },
      { h: 'Note one phrase, then repeat', p: 'After the call, write down one thing you did not know. Then do it again tomorrow.' },
    ],
    prose: [
      { h: 'Why traditional language exchange stalls', body: [
        'A language-exchange app may begin with text and never progress to a scheduled call, especially across time zones. Text can still help writing and vocabulary; voice adds listening and spontaneous speaking when a compatible participant is available.',
        'Text practice can improve reading, vocabulary and writing. Voice adds a different skill: producing and understanding speech in real time.',
      ]},
      { h: 'Speaking is a motor skill, not knowledge', body: [
        'Real-time speaking can practise recall, listening and pronunciation in ways that written exercises do not. It works best as one part of a broader learning plan rather than a replacement for study, feedback or qualified teaching.',
        'Random voice chat can provide unscripted practice when the other person shares the goal. It cannot replace structured teaching, guarantee correction or ensure variety in language, accent or proficiency.',
      ]},
      { h: 'Anonymity is the underrated part', body: [
        'The single biggest barrier to speaking practice is not opportunity - it is embarrassment. Learners avoid speaking because sounding incompetent in front of someone is genuinely unpleasant, particularly for adults who are competent at everything else in their lives.',
        'A temporary display name and no camera may reduce some social pressure, but they do not guarantee anonymity, safety or faster progress. The other participant may record on their own device, and typed messages or context may be retained on a rolling basis under the Privacy Policy.',
      ]},
      { h: 'One possible 30-day routine', body: [
        'One possible routine is to begin with short calls, note one useful phrase after a session, then gradually try longer conversations if that feels productive. Ask before requesting corrections and remember that a country preference does not guarantee a language, accent or native speaker.',
        'Progress varies by learner and depends on the wider study plan. Use short conversations to complement, not replace, vocabulary, listening, reading, feedback and professional instruction when needed.',
      ]},
      { h: 'It goes both ways', body: [
        'Language exchange means exchange. If you speak a language confidently, a willing partner may value patient conversation, but nobody is entitled to another participant\'s time or correction.',
        'The etiquette is simple: correct sparingly and only when asked or when meaning breaks, slow down rather than simplify into baby talk, and let silences run a little longer than feels comfortable - the other person is assembling a sentence.',
      ]},
    ],
    faq: [
      { q: 'Is core matching free for language practice?', a: 'Yes. Core voice matching is free without lesson fees or per-call credits. Matching is instant for everyone; optional Premium adds advanced filters.' },
      { q: 'Can I choose which language I practise?', a: 'You can use country and interest filters to steer matching toward speakers of a given language. Matching is not guaranteed to a specific language, so many learners flag language practice in their opener instead.' },
      { q: 'Is this a substitute for a tutor?', a: 'No, and it is not trying to be. A tutor gives structure, correction and a curriculum. TalkLive gives volume - the unscripted speaking hours that tutoring is usually too expensive to cover. They work best together.' },
      { q: 'I am a beginner. Will this be too hard?', a: 'Difficulty varies. Start with a short goal, prepare a few openers and explain that you are learning. The other participant is not a tutor and may not want to practise or provide corrections.' },
      { q: 'What if I want to end the practice?', a: 'Tap Next to end the match; the search starts again immediately. TalkLive does not record voice, but another participant could record on their own device.' },
      { q: 'Will people help me practise?', a: 'Some may, but willingness, language and skill are not guaranteed. Ask first; if goals differ, end the match respectfully - the next search starts immediately.' },
    ],
    ctaBandH: 'Start speaking today, not next week',
    ctaBandP: 'Search for a live speaking partner with free core matching. Availability and language are not guaranteed.',
    posts: ['practice-english-speaking-online-free', 'how-to-start-a-conversation-with-a-stranger', 'science-of-talking-to-strangers'],
  },


];
