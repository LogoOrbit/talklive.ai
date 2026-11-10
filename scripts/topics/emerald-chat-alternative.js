'use strict';
// /emerald-chat-alternative: same idea of calmer random chat, voice instead of video.
module.exports = require('./alternative-kit').make({
  slug: 'emerald-chat-alternative', key: 'em', app: 'Emerald Chat',
  paper: '#f3f8f7', ink: '#0f2a2a', rule: '#d0e0de', accent: '#0f766e', tint: '#e3f4f1',
  title: 'Emerald Chat Alternative - Free Voice Chat, No Login',
  description: 'An Emerald Chat alternative with no login: free random voice and text chat, no camera, matched by country or interests. How the two compare.',
  keywords: 'emerald chat alternative, sites like emerald chat, apps like emerald chat, emerald chat without login, emerald chat voice, random chat no login',
  h1Line: 'An Emerald Chat alternative with no login and no camera',
  dek: 'Emerald Chat set out to make random chat friendlier. TalkLive is after the same thing by a different route: voice and text only, no sign-in, and you are talking within seconds.',
  what: [
    'Emerald Chat is a random chat site with text, video and group rooms. It asks you to sign in, lets you match by interests, and uses a reputation system so that people who behave well are matched with each other.',
    'It is one of the more thoughtful Omegle successors, and the comparison here is between two takes on the same goal.',
  ],
  why: [
    'The usual reasons are the sign-in step and the camera. Some people want to be talking within ten seconds of opening a page, without creating anything. Others want voice, which Emerald\'s one-to-one mode does not centre on: it is text or video.',
    'TalkLive sits in the gap between them. More human than typing, less exposed than video.',
  ],
  rows: [
    ['How you talk', 'Text, video and group rooms', 'One-to-one voice call or text chat'],
    ['Camera', 'Used for video mode', 'Never used'],
    ['Sign-in', 'Asked for', 'None needed'],
    ['Matching', 'Interests and reputation', 'Country, language and interests'],
    ['Keep in touch', 'Friends list', 'Friends list, with calls and messages'],
    ['Price', 'Free with a paid tier', 'Free with an optional Plus plan'],
  ],
  stay: 'you like group rooms or video. TalkLive is one-to-one and has neither.',
  faq: [
    { q: 'Is there a site like Emerald Chat without login?', a: 'TalkLive needs no login. Open it, tap Talk or Chat and you are matched with one person.' },
    { q: 'Does TalkLive have voice chat?', a: 'Yes. Voice calls are the main way people use it, with text chat as the other option. There is no video.' },
    { q: 'Can I choose who I am matched with?', a: 'You can prefer countries and add interests for free. Plus adds more filters.' },
    { q: 'How is bad behaviour handled?', a: 'Every call and chat has Report and Block, automated checks watch for spam and scripted accounts, and people who are reported repeatedly are warned and then removed.' },
  ],
});
