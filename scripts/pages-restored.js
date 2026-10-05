'use strict';
/*
 * Five landing pages restored in October 2026 at their original URLs.
 *
 * /talk-to-strangers, /anonymous-chat, /random-call and /talk-to-someone were
 * retired on 4 October and /omegle-alternative on 2 October, each with a 301
 * to a broader page. Search arrivals into the app halved within a day: these
 * URLs held rankings for the queries people actually type, and a redirect to
 * a page about something else does not inherit them. They come back here
 * rewritten, each answering the one question its URL asks rather than
 * restating the voice chat page with a different keyword:
 *
 *   talk-to-strangers   what talking to someone new is like, and how to do it well
 *   anonymous-chat      exactly what is and is not anonymous, item by item
 *   random-call         the phone-call model: no number, data use, call quality
 *   talk-to-someone     wanting to be heard, and where a chat app stops
 *   omegle-alternative  what Omegle was, why it closed, what is different here
 *
 * Same object shape as CORE_PAGES in build-seo.js. Prose bodies are emitted
 * unescaped, so internal links are written inline.
 */

const UPDATED = '2026-10-05';

const PAGES = [

  {
    slug: 'talk-to-strangers',
    crumb: 'Talk to Strangers',
    eyebrow: 'Voice or text · no sign-up',
    title: 'Talk to Strangers - Free Voice and Text Chat, No Sign-Up | TalkLive',
    description: 'Talk to strangers online for free by voice or text. One tap pairs you with another adult for a one-to-one conversation - no camera, no account, leave any time.',
    keywords: 'talk to strangers, talk to strangers online, chat with strangers, stranger chat, talk to random people, meet strangers online',
    h1: 'Talk to Strangers Online - by Voice or Text',
    lede: 'Most of the best conversations start with someone you have never met. TalkLive pairs you with another adult for a one-to-one voice call or text chat - no camera, no profile to fill in, and a Next button whenever you want a different conversation.',
    cta: 'Talk to a Stranger',
    ctaChat: 'Text a Stranger',
    featuresH: 'What a conversation with a stranger is actually like here',
    featuresIntro: 'No feed, no followers, no photos. Two people, one conversation, and both of you free to end it.',
    features: [
      { icon: 'users', h: 'One to one, never a room', p: 'Every match is a private conversation between two people. There is no audience, no group to perform for and nobody reading over your shoulder.' },
      { icon: 'mic', h: 'Voice without a camera', p: 'You are heard, not seen. Nobody judges your room, your face or your outfit, which is why people relax so quickly.' },
      { icon: 'chat', h: 'Or type, if you prefer', p: 'Tap to Chat pairs you with someone who also wants to text. No microphone permission is needed.' },
      { icon: 'next', h: 'No awkward exits', p: 'If it is not working, tap Next. Nobody is owed an explanation, and the other person gets a fresh match too.' },
      { icon: 'shield', h: 'Block and report everywhere', p: 'Every call and chat screen has Report and Block. A blocked person is not matched with you again.' },
      { icon: 'heart', h: 'Keep the good ones', p: 'When a conversation clicks, both of you can add each other as friends and call back later - no phone numbers swapped.' },
    ],
    stepsH: 'How to talk to a stranger on TalkLive',
    stepsIntro: 'From this page to a live conversation usually takes a few seconds, depending on who is in the queue.',
    steps: [
      { h: 'Choose voice or text', p: 'Tap to Talk for a voice call, or Tap to Chat to type. Voice asks for microphone permission once.' },
      { h: 'Wait for a match', p: 'TalkLive pairs you with another adult who is searching at the same moment. Busy hours mean shorter waits.' },
      { h: 'Say hello first', p: 'A greeting and one real question - "where are you calling from?" - gets most conversations going.' },
      { h: 'Stay, add, or move on', p: 'Talk as long as you both like, add them as a friend, or tap Next for someone new.' },
    ],
    prose: [
      { h: 'Why talking to strangers is better than it sounds', body: [
        'People consistently predict that a conversation with a stranger will be awkward, short and not much fun - and then rate the real conversation as more enjoyable than they expected. Researchers have found that gap again and again, on trains, in waiting rooms and online. The <a href="/blog/science-of-talking-to-strangers">TalkLive Journal has a long read on those studies</a>, but the short version is that we are bad at predicting how much other people want to talk.',
        'There is also a particular kind of honesty that only happens with someone outside your life. A stranger has no history with you, no mutual friends to tell and no reason to judge you by what you said last year. Sociologists noticed this more than a century ago; we wrote about <a href="/blog/why-talking-to-strangers-feels-easier">why it is sometimes easier to tell a stranger the truth</a>.',
      ]},
      { h: 'Opening lines that actually work', body: [
        'The first ten seconds decide most matches. A plain "hi" followed by silence puts the whole job on the other person; a greeting plus a question gives them something to answer. Questions that work well with someone new are concrete and easy: what time is it where they are, what they were doing before they pressed the button, what they would recommend eating in their city.',
        'Questions that tend to end conversations early are the ones that feel like a form - age, gender and location in the first line - or anything that pushes for personal details. Let people decide how much to share. If you want more ideas, the Journal has <a href="/blog/what-to-talk-about-with-a-stranger">thirty questions that get past small talk</a>, sorted from easy to deep.',
      ]},
      { h: 'Good stranger etiquette', body: [
        'Treat the conversation as something you are both building. Listen as much as you talk, ask follow-up questions, and when someone says they are not comfortable with a topic, change it. Background noise matters on voice: headphones stop echo, and a muted microphone while you are eating or typing is a kindness.',
        'Ending is part of the etiquette too. A short "nice talking to you, I am heading off" before you tap Next costs nothing. And if someone is rude, sexual without consent, or asking for money, you do not need to be polite about it - Report them and leave. That is exactly what the buttons are for.',
      ]},
      { h: 'Staying safe without being paranoid', body: [
        'Talking to strangers is safe when you keep the stranger part intact. Do not share your full name, address, school, workplace, social media handles or photos with someone you have just met, and never send money or codes to anyone, however good the story. TalkLive does not ask for your real name to match you, so there is nothing to give away unless you volunteer it.',
        'TalkLive does not record or store call audio. The other person can still record on their own device, so speak as if what you say could be repeated. The <a href="/safety">Safety Center</a> covers the details, and <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">our field guide to chat scams</a> explains the patterns worth recognising.',
      ]},
    ],
    faq: [
      { q: 'Is it free to talk to strangers on TalkLive?', a: 'Yes. Random voice calls and text chats are free, and no account is needed for a basic match. The site is supported by ads.' },
      { q: 'Do I need to make an account?', a: 'No. You can be matched straight away. An optional account lets you keep friends and call them back on another visit.' },
      { q: 'Will the stranger see my face or my number?', a: 'No. TalkLive has no video at all, and calls run in the browser, so no phone number is exchanged in either direction.' },
      { q: 'Who will I be matched with?', a: 'Another adult who is searching at the same moment. You can set country and other preferences, but the match depends on who is online, and nobody\'s identity, age or location is verified.' },
      { q: 'What if a stranger is rude or inappropriate?', a: 'Tap Report or Block on the call or chat screen. Blocked people are not matched with you again, and reports are reviewed by the TalkLive team.' },
      { q: 'Is TalkLive for teenagers?', a: 'No. TalkLive is for adults aged 18 and over only.' },
    ],
    ctaBandH: 'Someone new is one tap away',
    ctaBandP: 'Start a voice call or a text chat now. No sign-up, no camera, and you can leave whenever you like.',
    cluster: 'core',
    relatedPages: ['random-voice-chat', 'random-text-chat', 'anonymous-chat', 'random-call', 'talk-to-someone', 'make-friends-online', 'safety'],
    updated: UPDATED,
    posts: ['science-of-talking-to-strangers', 'what-to-talk-about-with-a-stranger', 'why-talking-to-strangers-feels-easier'],
  },

  {
    slug: 'anonymous-chat',
    crumb: 'Anonymous Chat',
    eyebrow: 'No name · no number · no camera',
    title: 'Anonymous Chat - No Account, No Phone Number, No Camera | TalkLive',
    description: 'Anonymous voice and text chat with no account, phone number or camera. Exactly what TalkLive does and does not know about you, in plain English.',
    keywords: 'anonymous chat, anonymous voice chat, anonymous text chat, chat anonymously, anonymous chat without registration, private chat online',
    h1: 'Anonymous Chat - and Exactly What "Anonymous" Means Here',
    lede: 'You can talk or text with someone new without giving TalkLive a name, an email address or a phone number, and without a camera. Anonymous chat should still come with honest small print, so this page lists exactly what the other person sees, what TalkLive keeps, and for how long.',
    cta: 'Start Anonymous Voice Chat',
    ctaChat: 'Start Anonymous Text Chat',
    featuresH: 'What stays private',
    featuresIntro: 'A basic match needs nothing that identifies you. Here is what that covers.',
    features: [
      { icon: 'lock', h: 'No account to start', p: 'No email, no password, no phone number and no social login are needed to be matched. You can open the site and press a button.' },
      { icon: 'mic', h: 'No camera, ever', p: 'TalkLive has no video mode at all, so there is no face, room or background to give anything away.' },
      { icon: 'users', h: 'A generated display name', p: 'You appear under a generated name and a spirit-animal avatar, not your real name. You can change it, but never have to.' },
      { icon: 'phone', h: 'No number exchanged', p: 'Voice calls run in the browser over WebRTC. Neither side sees the other\'s phone number.' },
      { icon: 'shield', h: 'Audio is never recorded', p: 'TalkLive does not record, store or archive call audio. When a call ends, there is nothing of it on our servers.' },
      { icon: 'next', h: 'Leave without a trace in the chat', p: 'Tap Next or close the tab and the conversation is over. The other person cannot follow you to a profile, because there is none.' },
    ],
    stepsH: 'How to chat anonymously on TalkLive',
    stepsIntro: 'Anonymity is the default. The steps below are about keeping it that way.',
    steps: [
      { h: 'Open TalkLive and skip sign-up', p: 'Press Tap to Talk or Tap to Chat. There is no form in between.' },
      { h: 'Keep the generated name', p: 'If you change your display name, avoid your real name or any handle you use elsewhere.' },
      { h: 'Talk about anything but your details', p: 'Share opinions, stories and jokes. Keep your surname, address, workplace and social accounts to yourself.' },
      { h: 'Block, report or leave', p: 'If anyone pushes for personal information, end the chat. You owe a stranger nothing.' },
    ],
    prose: [
      { h: 'What the other person can see', body: [
        'The other person sees your display name and spirit animal, any interests you added, the country your connection appears to come from (estimated from your network, not verified) and the local time where you are, so they know whether it is morning or midnight for you. In a voice call they hear your voice; in a text chat they read your messages. They do not see your email, your phone number, your IP address, your city or a profile page.',
        'Your voice is the one thing anonymity cannot hide in a call. If being recognised by voice worries you, use <a href="/random-text-chat">text chat</a> instead - it needs no microphone at all.',
      ]},
      { h: 'What TalkLive itself processes', body: [
        'Running a chat service and keeping it free of abusers means processing some technical data. Like almost every website, TalkLive receives your IP address and basic browser and device information when you connect, and uses it to route the conversation, count visits, and enforce bans so that someone who is banned cannot simply reload the page.',
        'Typed chat messages are kept for a short, rolling period so that reports can be reviewed, then they expire. Call audio is never recorded or stored. If you create an optional account, TalkLive keeps what you give it - for example your friends list - so that it works next time. All of this is set out in the <a href="/privacy">Privacy Policy</a>; this page is a summary, not a replacement for it.',
      ]},
      { h: 'Anonymous does not mean consequence-free', body: [
        'Anonymity protects people who want to talk freely. It does not protect people who want to harass, threaten or exploit others. Every screen has Report and Block, reports are reviewed by the TalkLive team, and a ban applies to the device and network rather than to a name, because there is no name to ban.',
        'That balance - private by default, accountable when someone causes harm - is what makes anonymous chat usable at all. Services that dropped the second half did not last.',
      ]},
      { h: 'The one rule that keeps you anonymous', body: [
        'The most common way people lose their anonymity in a chat is by giving it away: a surname, an Instagram handle, a photo with a recognisable street behind it. A friendly conversation makes this feel natural. Wait. If a connection is real it will survive a few more conversations, and TalkLive\'s friends feature lets you stay in touch without exchanging any contact details at all.',
        'Be especially careful with anyone who moves quickly towards money, gift cards, crypto, or "verification" codes. Our <a href="/blog/how-to-spot-a-bot-or-scam-in-random-chat">field guide to chat scams</a> lists the common scripts.',
      ]},
    ],
    faq: [
      { q: 'Is TalkLive really anonymous?', a: 'Other users cannot see your name, email, phone number or IP address, and no account is needed. TalkLive itself processes technical data such as your IP address to run the service and enforce bans, as described in the Privacy Policy.' },
      { q: 'Are anonymous chats recorded?', a: 'Call audio is never recorded or stored by TalkLive. Typed messages are kept for a short rolling period for moderation and then expire. The other participant could still record or screenshot on their own device.' },
      { q: 'Can someone find out who I am?', a: 'Not from TalkLive. The other person only sees your display name, avatar and anything you choose to tell them. The usual risk is information you share yourself, so keep personal details private.' },
      { q: 'Can I chat anonymously without a microphone?', a: 'Yes. Tap to Chat starts a text conversation and never asks for microphone permission.' },
      { q: 'Does anonymous mean anything goes?', a: 'No. TalkLive is for adults 18+ and has community guidelines. Harassment, sexual content without consent, threats and scams lead to bans.' },
    ],
    ctaBandH: 'Say what you think, keep who you are',
    ctaBandP: 'Start an anonymous voice call or text chat - no name, number or camera needed.',
    cluster: 'core',
    relatedPages: ['talk-to-strangers', 'random-text-chat', 'random-voice-chat', 'safety', 'how-it-works', 'random-call'],
    updated: UPDATED,
    posts: ['how-to-spot-a-bot-or-scam-in-random-chat', 'why-talking-to-strangers-feels-easier', 'how-random-matchmaking-works'],
  },

  {
    slug: 'random-call',
    crumb: 'Random Call',
    eyebrow: 'Browser calling · no number',
    title: 'Random Call - Call a Random Person Online for Free | TalkLive',
    description: 'Make a free random call to another adult from your browser. No phone number, no app, no credit - just a voice call over Wi-Fi or mobile data. How it works and what it uses.',
    keywords: 'random call, random call app, call random people, random phone call online, free random call, call a stranger online',
    h1: 'Random Call - a Free Voice Call With Someone New',
    lede: 'A random call on TalkLive works like a phone call with one difference: you do not choose who answers. It runs in your browser over Wi-Fi or mobile data, so there is no phone number to share, no calling credit to spend and no app to install.',
    cta: 'Make a Random Call',
    ctaChat: 'Text Instead',
    featuresH: 'A phone call, minus the phone number',
    featuresIntro: 'Everything you need to know about how a random call is placed, carried and ended.',
    features: [
      { icon: 'phone', h: 'No number on either side', p: 'The call is set up inside the browser. Neither person ever sees the other\'s phone number.' },
      { icon: 'globe', h: 'International at no cost', p: 'A call to the other side of the world costs the same as one across the street: nothing beyond your normal data.' },
      { icon: 'bolt', h: 'Light on data', p: 'Audio-only calls use a small fraction of the data a video call needs, so they work on mobile data and weaker connections.' },
      { icon: 'lock', h: 'Encrypted in transit', p: 'Calls use WebRTC, which encrypts audio between the two browsers. TalkLive never records or stores it.' },
      { icon: 'next', h: 'Hang up or redial', p: 'Next ends this call and starts searching for the next one. Hang Up ends calling altogether.' },
      { icon: 'heart', h: 'Call them back later', p: 'If you both add each other as friends, you can call back directly on another day without exchanging numbers.' },
    ],
    stepsH: 'How to make a random call',
    stepsIntro: 'The first call takes one permission prompt. After that it is a single tap.',
    steps: [
      { h: 'Tap to Talk', p: 'Press the button on the TalkLive homepage. Your browser asks once for microphone access.' },
      { h: 'Allow the microphone', p: 'Choose Allow. TalkLive only uses the microphone during a call.' },
      { h: 'Get connected', p: 'TalkLive finds another adult who is searching and connects the call - usually within seconds at busy times.' },
      { h: 'Talk, then Next or Hang Up', p: 'Stay as long as you like. Next finds a new person; Hang Up stops.' },
    ],
    prose: [
      { h: 'How a browser call actually reaches the other person', body: [
        'When both of you are matched, your browsers use WebRTC - the same open standard behind most web calling - to agree on the best route for the audio. Often that is a direct connection. On strict networks, such as many mobile carriers, offices and university Wi-Fi, a direct route is blocked, so the call is relayed through TalkLive\'s TURN server instead. Either way the audio is encrypted in transit, and neither route records it.',
        'This is why a random call does not need a phone number, a SIM card or calling credit. It is ordinary internet traffic, which also means it works the same in every country where the site loads. The Journal explains the whole process step by step in <a href="/blog/how-random-matchmaking-works">what happens in the two seconds after you press Start</a>.',
      ]},
      { h: 'How much data does a random call use?', body: [
        'Voice is compressed with the Opus codec, which is designed for speech and adapts to your connection. A typical call uses somewhere in the region of tens of megabytes per hour - a fraction of what a video call of the same length needs. If you are on a limited mobile plan, voice is the cheapest way to have a real-time conversation online, and text chat uses less still.',
      ]},
      { h: 'If the call will not connect or you cannot hear anything', body: [
        '<strong>No microphone prompt, or "permission denied":</strong> open your browser\'s site settings for talklive.app and set Microphone to Allow, then reload. On iPhone and iPad, also check Settings, then Safari (or your browser), then Microphone.',
        '<strong>You can hear them but they cannot hear you:</strong> another app may be holding the microphone. Close other calling or recording apps, and check that the right input is selected if you use a headset.',
        '<strong>Echo:</strong> use headphones. Echo almost always means the other person\'s voice is coming out of your speaker and back into your microphone.',
        '<strong>Silence on both sides:</strong> tap Next. Very restrictive networks occasionally block even relayed calls; switching between Wi-Fi and mobile data usually fixes it.',
      ]},
      { h: 'Call etiquette for a call you did not plan', body: [
        'Random calls are spontaneous on both ends, so give the other person a second to settle - they may still be putting headphones in. Start with your greeting, and a quick "can you hear me okay?" saves a lot of confusion. Mute yourself if you need to step away, rather than leaving someone listening to a television.',
        'Nervous about calls in general? That is common, and it gets easier with practice. <a href="/blog/phone-anxiety-how-to-get-comfortable-talking">Why your heart races when the phone rings</a> is a gentle place to start.',
      ]},
    ],
    faq: [
      { q: 'Is a random call free?', a: 'Yes. Calls are free on TalkLive and use your internet connection, so there are no calling charges, international or otherwise. Normal mobile data rates apply if you are not on Wi-Fi.' },
      { q: 'Will the other person get my phone number?', a: 'No. Calls run inside the browser over WebRTC. No phone number is involved on either side.' },
      { q: 'Do I need to install an app?', a: 'No. TalkLive works in any modern browser on Android, iPhone, Windows, Mac and Linux. You can add it to your home screen if you want an app-like icon.' },
      { q: 'Are random calls recorded?', a: 'TalkLive does not record or store call audio. The other participant could record on their own device, so avoid sharing sensitive information.' },
      { q: 'Can I choose who I call?', a: 'Not for a random call - that is the point. You can set preferences such as country, and you can call friends you have added directly.' },
    ],
    ctaBandH: 'Pick up a call from somewhere new',
    ctaBandP: 'One tap, one microphone permission, and you are calling someone you have never met. No number, no cost.',
    cluster: 'voice',
    relatedPages: ['random-voice-chat', 'talk-to-strangers', 'voice-chat-vs-video-chat', 'how-it-works', 'anonymous-chat'],
    updated: UPDATED,
    posts: ['how-random-matchmaking-works', 'phone-anxiety-how-to-get-comfortable-talking', 'how-to-be-a-good-listener'],
  },

  {
    slug: 'talk-to-someone',
    crumb: 'Talk to Someone',
    eyebrow: 'When you just need to be heard',
    title: 'Talk to Someone Now - Free, Anonymous Voice or Text Chat | TalkLive',
    description: 'Need to talk to someone right now? Have a free, anonymous conversation by voice or text with another adult. No sign-up. Plus where to find real support if it is urgent.',
    keywords: 'talk to someone, someone to talk to, need to talk to someone, talk to someone now, someone to listen, talk to someone online free',
    h1: 'Need to Talk to Someone? Start a Conversation Now',
    lede: 'Sometimes you do not need advice, you need a voice on the other end. TalkLive connects you with another adult for a free, anonymous voice call or text chat, with nothing to sign up for. If you are in danger or thinking about harming yourself, please contact a crisis line first - the links are further down this page.',
    cta: 'Talk to Someone Now',
    ctaChat: 'Message Someone Now',
    featuresH: 'What TalkLive can and cannot be',
    featuresIntro: 'Honesty first: these are ordinary people, not counsellors. That is often exactly what helps.',
    features: [
      { icon: 'users', h: 'Another person, not a bot', p: 'Every match is a real adult who pressed the same button you did, usually because they also wanted to talk.' },
      { icon: 'lock', h: 'No one you know', p: 'You can say what you cannot say to friends or family, because this person is outside your life entirely.' },
      { icon: 'chat', h: 'Text if speaking is hard', p: 'If you cannot talk out loud - a shared room, a late hour, a tight throat - Tap to Chat lets you type instead.' },
      { icon: 'next', h: 'Not the right person? Next', p: 'Not every match will be a good listener. You can move on at any moment without explaining.' },
      { icon: 'heart', h: 'Keep the people who helped', p: 'If someone was kind, you can both add each other as friends and talk again another day.' },
      { icon: 'shield', h: 'Not a crisis service', p: 'Strangers are not trained to help in an emergency. For urgent help, use a crisis line - listed below.' },
    ],
    stepsH: 'How to get the most from talking to someone new',
    stepsIntro: 'A few small things make it much more likely that you leave the conversation feeling better.',
    steps: [
      { h: 'Pick voice or text', p: 'Voice feels closer; text is easier when you are tired, upset or not alone.' },
      { h: 'Say what you want', p: '"I have had a rough day and just want to chat" tells the other person how to help.' },
      { h: 'Keep your details private', p: 'You can share feelings without sharing your name, school, workplace or location.' },
      { h: 'Leave when it stops helping', p: 'If a conversation drains you, tap Next or close the tab. You are allowed to.' },
    ],
    prose: [
      { h: 'If it is urgent, please start here', body: [
        'If you are thinking about suicide or self-harm, or you are in danger, please contact a trained crisis service now rather than a random chat. In the United States you can call or text <strong>988</strong> (Suicide and Crisis Lifeline). In the UK and Ireland, Samaritans answer on <strong>116 123</strong>, free, any time. In India, the government\'s Tele-MANAS line is <strong>14416</strong>. Anywhere else, <a href="https://findahelpline.com" rel="noopener" target="_blank">findahelpline.com</a> lists free, confidential helplines by country. In an emergency, call your local emergency number.',
      ]},
      { h: 'Why talking to a stranger can help', body: [
        'Saying something out loud changes it. A worry that loops in your head for hours often shrinks once it is put into sentences, and a stranger is the easiest person to say it to: they do not know your family, they will not bring it up next week, and they have no stake in what you decide.',
        'Loneliness is also not the same as being alone. You can be surrounded by people and still feel that nobody is really listening. The TalkLive Journal looks at <a href="/blog/loneliness-what-actually-helps">what actually helps with loneliness</a>, and one of the consistent findings is that small, warm interactions with people outside your circle matter more than they seem to.',
      ]},
      { h: 'How to ask for the kind of conversation you need', body: [
        'The person you are matched with cannot read your mind, and most people default to small talk. If you want to vent, say so: "Can I just tell you about my day? I do not need advice." If you want distraction, say that instead: "I am stressed - tell me something good about where you live." Most people are glad to be given a clear role.',
        'If you would rather listen than talk, that works too. Plenty of people on TalkLive want someone to hear them out, and being that person for a few minutes can be its own relief. <a href="/blog/how-to-be-a-good-listener">Listening is a skill</a>, and it is one worth practising.',
      ]},
      { h: 'Protecting yourself when you are feeling low', body: [
        'When you are upset, it is easier to overshare and easier to be taken advantage of. Keep your name, address, workplace, social media and photos to yourself. Be wary of anyone who becomes intensely close very fast, asks to move to another app straight away, or brings up money. Kind people do not need any of those things to keep talking to you.',
        'If someone is cruel, end it. Tap Report or Block - it takes a second, the other person is not told why, and you will not be matched with them again. Then, if you still want to talk, try someone else.',
      ]},
    ],
    faq: [
      { q: 'Is there someone I can talk to right now for free?', a: 'Yes. TalkLive matches you with another adult for a free voice call or text chat, usually within seconds at busy times. No account is needed.' },
      { q: 'Are the people on TalkLive counsellors or therapists?', a: 'No. They are ordinary adults using the same app as you. For mental-health support or a crisis, use a trained helpline such as 988 in the US, Samaritans on 116 123 in the UK and Ireland, or findahelpline.com elsewhere.' },
      { q: 'Can I talk to someone anonymously?', a: 'Yes. You do not need to give a name, email or phone number, and there is no video. The other person only knows what you choose to tell them.' },
      { q: 'What if I do not want to talk out loud?', a: 'Use Tap to Chat. It starts a text conversation and never asks for microphone permission.' },
      { q: 'What time is it easiest to find someone?', a: 'TalkLive is busiest between roughly 15:00 and 21:00 UTC, but people are online around the clock. If a search takes a while, it is worth waiting a minute or trying text chat.' },
    ],
    ctaBandH: 'You do not have to sit with it alone',
    ctaBandP: 'Start a voice call or a text chat with someone new. Free, anonymous, and you can stop whenever you like.',
    cluster: 'discovery',
    relatedPages: ['late-night-chat', 'talk-to-strangers', 'random-text-chat', 'make-friends-online', 'safety'],
    updated: UPDATED,
    posts: ['loneliness-what-actually-helps', 'how-to-be-a-good-listener', 'why-talking-to-strangers-feels-easier'],
  },

  {
    slug: 'omegle-alternative',
    crumb: 'Omegle Alternative',
    eyebrow: 'Omegle closed in November 2023',
    title: 'Omegle Alternative - Free Voice and Text Chat Without a Camera | TalkLive',
    description: 'Omegle shut down on 8 November 2023. TalkLive is a free alternative for adults: random one-to-one voice and text chat, no camera, no sign-up, with block and report on every screen.',
    keywords: 'omegle alternative, omegle, sites like omegle, apps like omegle, omegle replacement, omegle without camera, omegle voice chat',
    h1: 'An Omegle Alternative for Adults - Voice and Text, No Camera',
    lede: 'Omegle closed on 8 November 2023 after fourteen years. If what you miss is the simple part - press a button, talk to someone new - TalkLive does that by voice or text. What it deliberately does not do is video, and this page explains why, along with everything else that is different.',
    cta: 'Try TalkLive Voice Chat',
    ctaChat: 'Try TalkLive Text Chat',
    featuresH: 'What carries over from Omegle, and what does not',
    featuresIntro: 'The good idea survives. The parts that made Omegle impossible to run do not.',
    features: [
      { icon: 'bolt', h: 'Still one tap to a stranger', p: 'No profile, no lobby, no swiping. Press Tap to Talk or Tap to Chat and you are matched with whoever is searching.' },
      { icon: 'chat', h: 'Text chat, like the original', p: 'Omegle started as text-only in 2009. Tap to Chat is the same idea, with no microphone needed.' },
      { icon: 'mic', h: 'Voice instead of webcam', p: 'TalkLive has no video. Voice keeps the spontaneity and drops the abuse pattern that defined Omegle\'s video mode.' },
      { icon: 'shield', h: 'Adults only', p: 'Omegle allowed 13-year-olds with parental permission. TalkLive is for adults 18 and over only.' },
      { icon: 'next', h: 'Block, report and bans', p: 'Every screen has Report and Block. Bans apply to the device and network, not a username that can be changed.' },
      { icon: 'heart', h: 'Friends, if you want them', p: 'Omegle had no way to find someone again. On TalkLive both people can add each other and call back.' },
    ],
    stepsH: 'Switching from Omegle in four steps',
    stepsIntro: 'If you used Omegle, you already know how this works.',
    steps: [
      { h: 'Open TalkLive', p: 'It runs in the browser on phone or computer, like Omegle did. Nothing to install.' },
      { h: 'Choose voice or text', p: 'Tap to Talk for a voice call, Tap to Chat for text. There is no video option.' },
      { h: 'Add interests if you like', p: 'Optional interests and country preferences steer matching, much like Omegle\'s interest tags.' },
      { h: 'Next, or keep in touch', p: 'Next finds someone new. Add a friend to talk again later.' },
    ],
    compare: {
      h: 'Omegle and TalkLive, side by side',
      intro: 'Omegle as it worked before it closed, compared with TalkLive today.',
      them: 'Omegle (2009-2023)',
      rows: [
        { label: 'Status', them: 'Closed on 8 November 2023', us: 'Open, free core matching' },
        { label: 'How you talk', them: 'Text, then webcam video from 2010', us: 'Voice calls and text chat - no video' },
        { label: 'Minimum age', them: '18, or 13 with parental permission', us: '18 and over only' },
        { label: 'Account needed', them: 'No', us: 'No - optional account for friends' },
        { label: 'Matching by interest', them: 'Interest tags', us: 'Interests and country preferences' },
        { label: 'Finding someone again', them: 'Not possible', us: 'Add as friend and call back' },
        { label: 'Block a person', them: 'Disconnect only', us: 'Block on every screen; never matched again' },
      ],
    },
    prose: [
      { h: 'Why Omegle shut down', body: [
        'Omegle was launched in March 2009 by Leif K-Brooks, then an 18-year-old in Vermont. It began as text chat between two randomly paired strangers, added webcam video in 2010, and at its peak was one of the best-known sites on the internet. When K-Brooks closed it on 8 November 2023, the farewell letter on the homepage said that operating it was no longer sustainable, financially or psychologically, and described a constant fight against people misusing it to harm others.',
        'The core problem was the camera. Random video between anonymous strangers, with minors allowed in, attracted exactly the behaviour you would expect, and no amount of moderation kept up with it. We tell the longer story in <a href="/blog/what-happened-to-omegle">The Rise and Fall of Omegle</a>.',
      ]},
      { h: 'Why TalkLive has no video', body: [
        'The abuse that dominated random video chat - people exposing themselves to strangers - has no equivalent in an audio call. Removing the camera removes that category of harm outright, rather than trying to catch it after the fact. It also changes the conversation itself: without a face to judge, people talk longer and say more, which is what most people loved about early Omegle anyway.',
        'If you specifically want video, TalkLive is not the right tool, and that is a deliberate choice rather than a missing feature. <a href="/voice-chat-vs-video-chat">Voice chat vs video chat</a> sets out the trade-offs honestly, including where video genuinely wins.',
      ]},
      { h: 'What to look for in any Omegle alternative', body: [
        'Plenty of sites now borrow Omegle\'s name. Before you use one, check four things. Is there an age requirement, and is it 18? Does every screen have a way to block and report? Does the privacy policy say what happens to your messages and calls? And does the site ask for money, a phone number or app installs before you can talk? A random chat should not need any of those.',
        'Be wary of sites that promise "girls online now" or show counters and photos of people waiting. Those are marketing, not matchmaking, and often lead to paid cam sites. On TalkLive, nobody\'s identity, gender or location is verified, and we do not pretend otherwise.',
      ]},
      { h: 'Moving from Omegle habits to TalkLive', body: [
        'The muscle memory transfers. "Hi" and "where are you from" still open most conversations, and Next still ends one. Two things are different. First, voice is more personal than typing, so a little more warmth goes a long way - our guide to <a href="/blog/what-to-talk-about-with-a-stranger">getting past small talk</a> helps. Second, you can keep the good ones: if a conversation goes well, add each other as friends instead of losing them to the next click.',
      ]},
    ],
    faq: [
      { q: 'Is Omegle coming back?', a: 'There has been no announcement. Omegle closed on 8 November 2023 and its homepage now shows only the founder\'s farewell letter. Sites using the Omegle name today are not affiliated with the original.' },
      { q: 'Is TalkLive affiliated with Omegle?', a: 'No. TalkLive is an independent service. It shares the idea of random one-to-one conversation, not ownership, code or users.' },
      { q: 'Does TalkLive have video like Omegle?', a: 'No. TalkLive is voice and text only, by design. Removing the camera removes the main kind of abuse that made random video chat unsafe.' },
      { q: 'Is TalkLive free like Omegle was?', a: 'Yes. Random voice and text matching is free and does not require an account. The site is supported by ads.' },
      { q: 'Can I use TalkLive on my phone?', a: 'Yes. It runs in the browser on Android and iPhone, with nothing to install, and you can add it to your home screen.' },
    ],
    ctaBandH: 'The good part of Omegle, without the camera',
    ctaBandP: 'Press one button and talk or text with someone new. Free, adults only, with block and report on every screen.',
    cluster: 'core',
    relatedPages: ['talk-to-strangers', 'voice-chat-vs-video-chat', 'random-text-chat', 'random-voice-chat', 'safety', 'anonymous-chat'],
    updated: UPDATED,
    posts: ['what-happened-to-omegle', 'how-to-spot-a-bot-or-scam-in-random-chat', 'what-to-talk-about-with-a-stranger'],
  },
];

module.exports = PAGES;
