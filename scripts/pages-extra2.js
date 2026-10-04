'use strict';
/*
 * Voice chat vs video chat: the honest answer to anyone searching for random
 * video chat. TalkLive has no video, so the retired "video" landings 301 here
 * (scripts/data/retired.js) instead of promising a feature that does not exist.
 *
 * Same object shape as CORE_PAGES in build-seo.js. Prose bodies are emitted
 * unescaped, so internal links are written inline.
 */

const PAGES = [

  {
    slug: 'voice-chat-vs-video-chat',
    crumb: 'Voice vs Video Chat',
    eyebrow: 'Head to head',
    title: 'Voice Chat vs Video Chat: Privacy, Data and Comfort | TalkLive',
    description: 'Voice chat vs video chat compared: privacy, bandwidth, safety, and which one actually produces better conversations with someone new. An honest look at both.',
    keywords: 'voice chat vs video chat, audio chat vs video chat, is voice chat safer than video, voice or video chat, difference voice video chat, voice chat privacy',
    h1: 'Voice Chat vs Video Chat: Which Is Better for Meeting Someone New?',
    lede: 'Video looks like the richer medium and in most contexts it is. With strangers it is not, and the reasons are more interesting than "privacy".',
    cta: 'Try Voice Chat Free',
    featuresH: 'Where each one wins',
    featuresIntro: 'This is not a one-sided argument - video genuinely beats voice for some things.',
    features: [
      { icon: 'mic', h: 'Voice: lower stakes', p: 'No appearance, no room, no background. People say more and hedge less when they are not being looked at.' },
      { icon: 'shield', h: 'Voice: far less abuse', p: 'The dominant abuse pattern on video roulette has no equivalent in audio. Removing the camera removes the category.' },
      { icon: 'bolt', h: 'Voice: works on bad connections', p: 'Audio needs a fraction of the bandwidth. On a train, on 3G, on an old phone, voice connects where video stutters.' },
      { icon: 'users', h: 'Video: identity confidence', p: 'Seeing someone is genuine reassurance that they are who they say. For people you will meet later, that matters.' },
      { icon: 'heart', h: 'Video: non-verbal signal', p: 'Facial expression carries meaning that tone alone does not. With people you already know, video is better.' },
      { icon: 'chat', h: 'Text: still underrated', p: 'When you cannot talk out loud, text beats both. It is the right answer on a train or in a shared room.' },
    ],
    stepsH: 'How to choose for a given situation',
    stepsIntro: 'The right answer depends on who you are talking to and why.',
    steps: [
      { h: 'Stranger, first contact', p: 'Voice. High signal, low exposure, and if it goes wrong you have revealed nothing that persists.' },
      { h: 'Practising a language', p: 'Voice, decisively. Listening and speaking are the skills; a video feed adds nothing and adds pressure.' },
      { h: 'Someone you already know', p: 'Video. The privacy argument does not apply and you gain real expression.' },
      { h: 'Anywhere you cannot speak', p: 'Text. Not a compromise - the correct tool when the room is shared or the hour is wrong.' },
    ],
    prose: [
      { h: 'The disinhibition argument', body: [
        'There is a well-documented effect where people are more candid when they are less visible. It is the reason phone calls with strangers go somewhere real faster than video calls do, and it is why radio and podcasts feel intimate in a way television does not. Take away the face and people stop managing how they look and start listening to what is being said.',
        'On a random chat platform the effect is unusually strong, because the ordinary counterweight - reputation, the risk of being recognised - is absent in both formats. What is left is the difference in exposure, and it points one way.',
      ] },
      { h: 'The safety argument, precisely', body: [
        'The claim "voice is safer" is usually made vaguely. The specific version: the dominant abuse pattern on video roulette platforms is a stranger exposing themselves on camera, delivered instantly in the first frame, before any moderation system can intervene and before the other person can react. Every video-roulette platform of the last fifteen years has had this problem and none solved it.',
        'Audio has no equivalent. Somebody can be rude, offensive or crude out loud - but that is a conversation you can end in one tap, and it is a normal moderation problem with normal solutions: report, block, ban by device and IP. The difference is not that voice platforms moderate better. It is that they have a much smaller problem to moderate.',
        'The second-order effect matters too: you cannot be screenshotted. A video call with a stranger can be recorded and the recording is of your face. A voice call can be recorded, but a recording of your voice saying nothing identifying is worth very little to anyone.',
      ] },
      { h: 'What video is genuinely better at', body: [
        'It would be dishonest to pretend the trade is free. Video carries expression that tone does not - you lose the raised eyebrow, the half-smile that tells you a remark was a joke. Sarcasm is harder to land on voice than on video, though far easier than in text.',
        'Video also gives identity confidence. If you are talking to someone you may eventually meet, seeing them is worth a great deal. That is exactly why video makes sense for people you know and much less sense for a stranger you were matched with ten seconds ago and will probably never speak to again.',
      ] },
      { h: 'Bandwidth, batteries and old phones', body: [
        'A video call uses roughly ten to thirty times the data of a voice call and considerably more CPU, which on a mid-range phone means heat and a flattening battery. For a very large share of the world that is the deciding factor before privacy is even considered.',
        'Voice also degrades gracefully. A weak connection makes audio slightly rough; it makes video freeze, stutter and drop. On the train, on a rural connection, on a five-year-old handset, one of these formats works and the other does not.',
      ] },
      { h: 'The honest conclusion', body: [
        'For strangers: voice, with text as the fallback when you cannot speak. For people you know: video. For language practice: voice, and it is not close - the skill you are training is listening and speaking, and a camera adds only self-consciousness.',
        'TalkLive is built on that conclusion. It is ' + '<a href="/random-voice-chat">voice-first</a>' + ' with a complete ' + '<a href="/random-text-chat">anonymous text mode</a>' + ' and no camera at all. If you want video specifically, TalkLive is not the right tool, and this page will not pretend otherwise.',
      ] },
    ],
    faq: [
      { q: 'Is voice chat safer than video chat with strangers?', a: 'Structurally, yes. The dominant abuse pattern on video-roulette platforms - exposure on camera in the first frame - has no equivalent in audio. What remains is ordinary rudeness, which report and block handle in one tap.' },
      { q: 'Does voice chat use less data than video?', a: 'Substantially - roughly a tenth to a thirtieth, depending on video quality. Voice also holds up on weak connections where video freezes.' },
      { q: 'Do people open up more on voice than video?', a: 'Generally yes. Without being looked at, people stop managing their appearance and pay more attention to the conversation. It is the same reason phone calls with strangers tend to go somewhere faster than video calls.' },
      { q: 'Can someone record a voice chat?', a: 'Any audio can in principle be captured at the other end, on any platform. TalkLive itself never records - calls are peer-to-peer and audio does not pass through the server. The practical protection is not sharing identifying details, which is good advice on any medium.' },
      { q: 'Is video ever the better choice?', a: 'Yes - with people you already know, or where confirming someone\'s identity matters. Expression carries real information. The trade only favours voice when the other person is a stranger.' },
      { q: 'Does TalkLive have video chat?', a: 'No, deliberately. It is voice and text only. That is the single biggest reason people move here from the video-roulette platforms.' },
    ],
    ctaBandH: 'Hear a real voice in ten seconds',
    ctaBandP: 'No camera, no sign-up, no cost. Just a conversation.',
    posts: ['voice-chat-vs-video-chat', 'random-chat-safety-tips', 'how-anonymous-voice-chat-works'],
  },

  /* --- Situational intent -------------------------------------------------- */




];

module.exports = PAGES;
