'use strict';
// /chatroulette-alternative: the original roulette, and the voice-only take on it.
module.exports = require('./alternative-kit').make({
  slug: 'chatroulette-alternative', key: 'cr', app: 'Chatroulette',
  paper: '#f7f6f3', ink: '#1d1a17', rule: '#dedad2', accent: '#c2410c', tint: '#fdf0e7',
  title: 'Chatroulette Alternative - Voice Chat, No Camera | TalkLive',
  description: 'A Chatroulette alternative for people who would rather be heard than seen: free random voice and text chat, no camera, no account. An honest comparison.',
  keywords: 'chatroulette alternative, sites like chatroulette, apps like chatroulette, chatroulette without camera, chat roulette voice, random chat sites',
  h1Line: 'A Chatroulette alternative you can use with the camera off. Always.',
  dek: 'Chatroulette made random chat famous in 2009, on video. TalkLive keeps the roulette and drops the camera: a voice call or a text chat with one stranger at a time. Free, no account.',
  what: [
    'Chatroulette is the site that started it. Launched in 2009, it paired two webcams at random and let either side press Next. Within months it was a worldwide curiosity, and nearly every random chat service since is a variation on it.',
    'It is still running, still video-first, and has added moderation and filters over the years to deal with the problem it became known for.',
  ],
  why: [
    'The idea was never the issue. Meeting someone you would not otherwise meet is still the whole appeal. The camera is what people get tired of: being looked at before you have said a word, and not knowing what you will be shown when the next person appears.',
    'Voice changes that. You are judged on what you say, the surprises are limited to an accent, and you can talk while cooking, walking or lying in the dark.',
  ],
  rows: [
    ['How you talk', 'Video, with text beside it', 'Voice call or text chat'],
    ['Camera', 'Needed', 'Never used'],
    ['What you see on connect', 'The other person\'s camera', 'A cartoon avatar and a country'],
    ['Works on a weak connection', 'Video struggles', 'Audio needs about 1MB a minute'],
    ['Keep in touch', 'Depends on swapping contacts', 'Add as a friend, call or message later'],
    ['Price', 'Free with paid extras', 'Free with an optional Plus plan'],
  ],
  stay: 'faces are the point for you. Chatroulette is the original for a reason, and TalkLive has no video at all.',
  faq: [
    { q: 'Is there a Chatroulette without video?', a: 'TalkLive works the same way, one random stranger at a time with a Next button, but by voice call or text chat. There is no camera.' },
    { q: 'Do I need to sign up?', a: 'No. Open TalkLive and tap Talk or Chat. There is no account, email or phone number involved.' },
    { q: 'Who is on TalkLive?', a: 'Adults from around the world, with the most people online from India, the United States, Pakistan, Bangladesh and the United Kingdom. It is for people aged 18 and over.' },
    { q: 'Are calls recorded?', a: 'No. Calls are not recorded, and they pass through a relay so the other person does not see your IP address.' },
  ],
});
