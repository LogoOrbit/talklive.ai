'use strict';
// /monkey-app-alternative: for adults who want random chat that is not a video feed.
module.exports = require('./alternative-kit').make({
  slug: 'monkey-app-alternative', key: 'mk', app: 'Monkey',
  paper: '#fbf8ee', ink: '#231d0c', rule: '#e6dfc6', accent: '#a16207', tint: '#fbf3d6',
  title: 'Monkey App Alternative for Adults - Voice Chat | TalkLive',
  description: 'A Monkey app alternative for adults: random voice and text chat with no camera and no account. What Monkey is, why people move on, and how TalkLive differs.',
  keywords: 'monkey app alternative, apps like monkey, sites like monkey, monkey app without camera, monkey chat alternative, random chat apps for adults',
  h1Line: 'A Monkey app alternative for adults who would rather talk',
  dek: 'Monkey is fast random video chat. TalkLive is slower on purpose: a voice call or a text chat with one adult at a time, no camera, no account, free.',
  what: [
    'Monkey is a random video chat app: short, fast video calls with strangers, built for a young audience and for moving quickly from one person to the next. It runs in the browser and as an app.',
    'Like the rest of the roulette family, it starts with the camera on.',
  ],
  why: [
    'Adults who try it often want two things it is not designed for: a conversation that lasts longer than a few seconds, and a room with only other adults in it. Short video calls reward looks and speed. They do not leave much room to actually talk.',
    'TalkLive is for people aged 18 and over, asks for a date of birth before the first call, and has no video, which removes most of what makes fast video chat tiring.',
  ],
  rows: [
    ['How you talk', 'Short video calls', 'Voice call or text chat, as long as you like'],
    ['Camera', 'Needed', 'Never used'],
    ['Who it is for', 'A young audience', 'Adults, 18 and over'],
    ['Account', 'A sign-in is asked for', 'None needed'],
    ['Keep in touch', 'Add inside the app', 'Add as a friend, call or message later'],
    ['Price', 'Free with paid extras', 'Free with an optional Plus plan'],
  ],
  stay: 'you want quick video and the pace that comes with it. TalkLive is voice and text only, and calmer.',
  faq: [
    { q: 'Is there an app like Monkey for adults?', a: 'TalkLive is random chat for people aged 18 and over. It pairs you with one adult for a voice call or text chat, with no camera.' },
    { q: 'Is TalkLive free?', a: 'Yes. Calls and chats are free and unlimited, with no account. A Plus plan is optional.' },
    { q: 'Do I have to show my face?', a: 'No. There is no video on TalkLive. The other person sees a cartoon avatar and the country you are in.' },
    { q: 'Is there an Android app?', a: 'Yes, and it also runs in any phone or computer browser without installing anything.' },
  ],
});
