'use strict';
// /ometv-alternative: for people who want random chat without the camera.
module.exports = require('./alternative-kit').make({
  slug: 'ometv-alternative', key: 'ot', app: 'OmeTV',
  paper: '#f6f8f5', ink: '#12241b', rule: '#d6dfd8', accent: '#178a4c', tint: '#e9f6ee',
  title: 'OmeTV Alternative Without a Camera - Free Voice Chat',
  description: 'Looking for an OmeTV alternative? TalkLive is random chat by voice or text instead of video: no camera, no account, free. How the two compare, honestly.',
  keywords: 'ometv alternative, apps like ometv, sites like ometv, ometv without camera, ometv voice chat, random chat without camera, ometv similar apps',
  h1Line: 'An OmeTV alternative without the camera',
  dek: 'OmeTV pairs you with strangers on video. TalkLive does the same thing by voice or text, so nobody sees your face, your room or you in your pyjamas. Free, with no account.',
  what: [
    'OmeTV is a random video chat service: you open it, allow your camera and microphone, and are paired face to face with a stranger. Swipe to move to the next person. It runs on the web and as mobile apps, and it is one of the best-known successors to the roulette-style video chat sites of the 2010s.',
    'It is built around being seen. The camera is the product.',
  ],
  why: [
    'Most people who search for an alternative are not unhappy with random chat. They are tired of the camera. Video means checking how you look, where you are sitting and what is behind you, and it means seeing whatever the other person chooses to show you the moment the call connects.',
    'Others want something that works on a weak connection, since video needs far more data than audio, or do not want to sign in with a social account just to talk to someone for five minutes.',
  ],
  rows: [
    ['How you talk', 'Video, with text beside it', 'Voice call or text chat'],
    ['Camera', 'Needed', 'Never used'],
    ['Account', 'A sign-in is asked for', 'None needed'],
    ['Data per minute', 'High: it is video', 'About 1MB for a voice call'],
    ['Keep in touch', 'Depends on swapping contacts', 'Add as a friend, call or message later'],
    ['Price', 'Free with paid extras', 'Free with an optional Plus plan'],
  ],
  stay: 'you want to see who you are talking to. That is what it is for, and TalkLive will never do it.',
  faq: [
    { q: 'Is there an app like OmeTV without video?', a: 'Yes. TalkLive matches you with a random person for a voice call or a text chat. There is no camera at any point.' },
    { q: 'Do I need an account?', a: 'No. Open TalkLive, tap Talk or Chat and you are matched. An account is optional and only needed to keep friends across devices.' },
    { q: 'Is TalkLive free?', a: 'Yes. Voice calls and text chats are free and unlimited. An optional Plus plan adds extra filters and cosmetic perks.' },
    { q: 'Can the other person see my IP address?', a: 'No. Calls on TalkLive go through a relay, so neither side learns the other one\'s IP address.' },
  ],
});
