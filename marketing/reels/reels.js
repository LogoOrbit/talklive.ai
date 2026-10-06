// TalkLive Reels - 10 voiced motion-graphic ads, 1080x1920.
//
// Each reel is a list of beats. A beat = one voiceover line + one scene.
// build.js turns every `vo` into speech (with word timings) and lays the beats
// end to end; reel.html draws each scene as a pure function of time, keyed to
// the spoken words (`at: 'word'` = the moment that word is said in the beat).
// See README.md for the technique behind each reel.
(function (root) {
  const OUTRO = (tag, vo) => ({ vo, scene: { type: 'outro', tag }, cap: false });

  const REELS = {
    // 1. News-jacking + nostalgia + pattern interrupt (a funeral in the feed).
    'rip-omegle': {
      title: 'RIP Omegle', voice: 'en-US-AndrewMultilingualNeural', rate: '+6%', music: ['MusicForTalkLive.mp3', 3],
      beats: [
        { vo: 'Omegle died in 2023.', scene: { type: 'tomb' }, cap: true },
        { vo: 'But talking to strangers? That never died.', cap: false,
          scene: { type: 'slam', lines: [{ h: 'Talking to', at: 'talking' }, { h: '<span class="cy">strangers</span>', at: 'strangers' }, { h: 'never <span class="gr">died.</span>', c: 's', at: 'died' }] } },
        { vo: 'Every copy since wants your camera, an account, and your credit card.',
          scene: { type: 'list', title: 'Every copy since:', rows: [
            { ic: 'x', h: 'Camera on', at: 'camera' }, { ic: 'x', h: 'Make an account', at: 'account' }, { ic: 'x', h: 'Card details', at: 'credit' }] } },
        { vo: 'TalkLive is one tap. Voice only. No sign up.', punch: ['tap'],
          scene: { type: 'radar', connect: 'Voice', me: 'wolf', them: 'fox', place: '🇧🇷 São Paulo' } },
        OUTRO('Talk to strangers again.<br><span class="cy">Just your voice.</span>', 'Talk to strangers again. Talk Live dot app.'),
      ],
    },

    // 2. Reverse psychology + pharma-ad parody ("side effects may include").
    'dont-use': {
      title: "Don't use this app", voice: 'en-US-AvaMultilingualNeural', rate: '+8%', music: ['MusicForTalkLive.mp3', 38],
      beats: [
        { vo: 'Do not download this app.', cap: false, punch: ['not'], scene: { type: 'caution', h: 'DO <span class="rd">NOT</span><br>USE THIS APP', at: 'not' } },
        { vo: "Seriously. You'll end up talking to a stranger in Brazil at two in the morning.",
          scene: { type: 'slam', lines: [{ h: 'a stranger', c: 's', at: 'stranger' }, { h: 'in 🇧🇷 <span class="gr">Brazil</span>', c: 's', at: 'Brazil' }, { h: 'at <span class="pu">2 AM.</span>', at: 'two' }] } },
        { vo: "You'll laugh way too loud.",
          scene: { type: 'chat', who: ['fox', 'Fox · 🇧🇷'], msgs: [
            { s: 'l', h: 'wait you ALSO put ketchup on pasta??', at: 0.0 }, { s: 'r', h: 'HAHAHA no way 😭', at: 'laugh' }, { s: 'l', h: 'we are the same person', at: 'loud' }] } },
        { vo: 'Side effects may include: new friends, better English, and zero sleep.',
          scene: { type: 'list', title: '⚠ Side effects may include:', warn: true, rows: [
            { ic: '!', h: 'New friends', at: 'friends' }, { ic: '!', h: 'Better English', at: 'English' }, { ic: '!', h: 'Zero sleep', at: 'zero' }] } },
        OUTRO('You&#39;ve been <span class="rd">warned.</span>', "You've been warned. Talk Live dot app."),
      ],
    },

    // 3. Relatable POV + fake lock-screen notification (curiosity) + emotion.
    'pov-2am': {
      title: 'POV: 2AM', voice: 'en-US-BrianMultilingualNeural', rate: '+0%', music: ['Meditation.mp3', 18],
      beats: [
        { vo: "P O V. It's two A M, and you can't sleep.",
          scene: { type: 'notif', time: '2:07', items: [{ app: 'TalkLive', h: "Can't sleep? 🌙", b: 'Someone on the other side of the world is wide awake.', at: 'sleep' }] } },
        { vo: "But somewhere in the world, it's lunchtime.",
          scene: { type: 'clocks', rows: [['🇵🇰', 'Karachi', '2:07 AM', '🌙', 1], ['🇬🇧', 'London', '10:07 PM', '🌆'], ['🇺🇸', 'New York', '5:07 PM', '🌇'], ['🇯🇵', 'Tokyo', '6:07 AM', '🌅'], ['🇦🇺', 'Sydney', '8:07 AM', '☀️']] } },
        { vo: 'So you tap one button,', punch: ['tap'], scene: { type: 'button', tap: 'tap' } },
        { vo: 'and a voice from Tokyo says: hey, you up too?',
          scene: { type: 'radar', connect: 'voice', me: 'owl', them: 'panda', place: '🇯🇵 Tokyo' } },
        { vo: 'No faces. No names. Just two people who could not sleep.',
          scene: { type: 'wave', h: 'No faces.<br>No names.', at: 'names' } },
        OUTRO('Someone is always<br><span class="cy">awake.</span>', "Someone's always awake. Talk Live dot app."),
      ],
    },

    // 4. Challenge + countdown (urgency and proof of speed). Verify real match times before paid spend.
    'ten-seconds': {
      title: 'Ten-second challenge', voice: 'en-US-AndrewMultilingualNeural', rate: '+12%', music: ['MusicForTalkLive.mp3', 10],
      beats: [
        { vo: 'Can you talk to a total stranger in under ten seconds?', cap: false,
          scene: { type: 'slam', lines: [{ h: 'Talk to a', c: 's', at: 'talk' }, { h: '<span class="cy">stranger</span>', at: 'stranger' }, { h: 'in <span class="gr">10s?</span>', at: 'ten' }] } },
        { vo: 'Open Talk Live. Tap start. No sign up. No camera. Three, two, one.',
          scene: { type: 'countdown', from: 10, stop: 'one', label: 'seconds' } },
        { vo: 'Connected. Say hi.', punch: ['Connected'], scene: { type: 'radar', connect: 0, me: 'tiger', them: 'dolphin', place: '🇩🇪 Berlin' } },
        { vo: 'Some apps make you wait days for a reply.', cap: false,
          scene: { type: 'slam', lines: [{ h: 'Other apps:', c: 'xs', at: 0 }, { h: 'wait <span class="rd">days.</span>', at: 'days' }] } },
        OUTRO('TalkLive takes<br><span class="gr">seconds.</span>', 'Talk Live takes seconds. Talk Live dot app.'),
      ],
    },

    // 5. Enemy framing + side-by-side comparison.
    'versus': {
      title: 'Them vs TalkLive', voice: 'en-US-EmmaMultilingualNeural', rate: '+6%', music: ['MusicForTalkLive.mp3', 22],
      beats: [
        { vo: 'Why does every chat app want your face?', cap: false, punch: ['face'], scene: { type: 'glitch', h: 'Why does every app want your <span class="rd">face?</span>' } },
        { vo: 'Other apps: camera on, account first, filters everywhere. Talk Live: voice only, no sign up, one tap to block.',
          scene: { type: 'versus', rows: [['Camera on', 'camera', 'Voice only', 'voice'], ['Account first', 'account', 'No sign-up', 'sign'], ['Filters everywhere', 'filters', 'One-tap block', 'block']] } },
        { vo: 'Your voice is enough.', cap: false, scene: { type: 'wave', h: 'Your voice<br>is <span class="gr">enough.</span>', at: 'enough' } },
        OUTRO('No camera.<br><span class="cy">Just talk.</span>', 'Talk Live dot app.'),
      ],
    },

    // 6. Interactive "screenshot now" bait + comment bait + product hook (spirit animals).
    'spirit-animal': {
      title: 'Screenshot your spirit animal', voice: 'en-US-AvaMultilingualNeural', rate: '+6%', music: ['Meditation.mp3', 0],
      beats: [
        { vo: "Screenshot right now. Whatever animal you land on, that's who you are tonight.", scene: { type: 'roulette', land: 'tonight', final: 'penguin' } },
        { vo: 'Got it? Comment yours.', scene: { type: 'slam', lines: [{ h: '💬', at: 0 }, { h: 'Comment', c: 's', at: 'Comment' }, { h: '<span class="pu">yours.</span>', at: 'yours' }] }, cap: false },
        { vo: 'On Talk Live, every stranger shows up as a spirit animal, so you always have an opener.',
          scene: { type: 'radar', connect: 'stranger', me: 'cat', them: 'penguin', place: '🇨🇦 Toronto' } },
        { vo: 'Okay, why are you a penguin? Works every time.',
          scene: { type: 'chat', who: ['penguin', 'Penguin · 🇨🇦'], msgs: [{ s: 'r', h: 'ok why are you a penguin 🐧', at: 0 }, { s: 'l', h: 'long story. you got 10 minutes?', at: 'Works' }] } },
        OUTRO('Who will you<br><span class="pu">meet tonight?</span>', 'Who will you meet tonight? Talk Live dot app.'),
      ],
    },

    // 7. Emotional insight + stat counter (doom-scroll vs real connection).
    'stop-scrolling': {
      title: 'Stop scrolling', voice: 'en-US-BrianMultilingualNeural', rate: '+4%', music: ['Meditation.mp3', 40],
      beats: [
        { vo: 'Today, you scrolled past about four hundred strangers.', scene: { type: 'scroll', to: 400 } },
        { vo: 'You talked to zero of them.', punch: ['zero'], cap: false,
          scene: { type: 'counter', rows: [{ lbl: 'Strangers scrolled past', to: 400, from: 400, at: 0 }, { lbl: 'Actually talked to', to: 0, c: 'rd', at: 'zero', shake: true }] } },
        { vo: 'What if one of them was your next best friend?', cap: false,
          scene: { type: 'slam', lines: [{ h: 'What if one was', c: 's', at: 0 }, { h: 'your next', c: 's', at: 'next' }, { h: '<span class="cy">best friend?</span>', at: 'best' }] } },
        { vo: 'Talk Live puts a real voice in your ear. One tap. Free.',
          scene: { type: 'radar', connect: 'voice', me: 'bear', them: 'rabbit', place: '🇮🇳 Mumbai' } },
        OUTRO('Stop scrolling.<br><span class="gr">Start talking.</span>', 'Stop scrolling. Start talking.'),
      ],
    },

    // 8. Rapid-fire montage (one greeting per beat of music) + language-learning angle.
    'hello-world': {
      title: 'Say hello to the world', voice: 'en-US-AndrewMultilingualNeural', rate: '+0%', music: ['MusicForTalkLive.mp3', 50],
      beats: [
        { vo: 'Hola. Bonjour. Konnichiwa. Namaste. Merhaba. Salaam. Olá.', cap: false,
          scene: { type: 'hello', words: [['Hola', '🇪🇸'], ['Bonjour', '🇫🇷'], ['Konnichiwa', '🇯🇵'], ['Namaste', '🇮🇳'], ['Merhaba', '🇹🇷'], ['Salaam', '🇵🇰'], ['Olá', '🇧🇷']] } },
        { vo: 'Right now, someone, somewhere, wants to talk.', cap: false,
          scene: { type: 'slam', lines: [{ h: 'Right now,', c: 'xs', at: 0 }, { h: 'someone wants', c: 's', at: 'someone' }, { h: 'to <span class="cy">talk.</span>', at: 'talk' }] } },
        { vo: 'Practice a language with real people, or just make a friend on the other side of the planet.',
          scene: { type: 'list', rows: [{ ic: '🗣️', h: 'Practise a language', at: 'Practice' }, { ic: '🌍', h: 'Real people', at: 'real' }, { ic: '🤝', h: 'Friends worldwide', at: 'friend' }] } },
        OUTRO('Say hello to<br><span class="cy">the world.</span>', 'Say hello to the world. Talk Live dot app.'),
      ],
    },

    // 9. Audience call-out (identity targeting) + rule of three.
    'introverts': {
      title: 'Introverts, this is for you', voice: 'en-US-EmmaMultilingualNeural', rate: '+0%', music: ['Meditation.mp3', 60],
      beats: [
        { vo: "Introverts, this one's for you.", cap: false, scene: { type: 'slam', lines: [{ h: 'Introverts,', at: 0 }, { h: 'this one&#39;s', c: 's', at: 'this' }, { h: 'for <span class="pu">you.</span>', c: 's', at: 'you' }] } },
        { vo: 'No face. No name. No pressure.', cap: false,
          scene: { type: 'list', big: true, rows: [{ ic: '🙈', h: 'No face.', at: 'face' }, { ic: '🕶️', h: 'No name.', at: 'name' }, { ic: '🫶', h: 'No pressure.', at: 'pressure' }] } },
        { vo: "Don't feel like talking? Just text.",
          scene: { type: 'chat', who: ['koala', 'Koala · 🇬🇧'], msgs: [{ s: 'l', h: 'hii 👋 text or voice?', at: 0 }, { s: 'r', h: 'text pls, my roommate is asleep', at: 'text' }] } },
        { vo: 'Awkward? Tap next. No hard feelings.', punch: ['next'], scene: { type: 'button', tap: 'next', label: 'Next ⏭' } },
        OUTRO('Socialising,<br><span class="pu">on your terms.</span>', 'Socialising, on your terms. Talk Live dot app.'),
      ],
    },

    // 10. Problem-agitate-solve with sound design (the flatline, then the game).
    'awkward-silence': {
      title: 'Awkward silence?', voice: 'en-US-BrianMultilingualNeural', rate: '+6%', music: ['MusicForTalkLive.mp3', 64],
      beats: [
        { vo: 'You know that awkward silence when a conversation just... dies?', scene: { type: 'wave', h: '…', flat: 'dies' } },
        { vo: 'On Talk Live, you challenge them to a game.',
          scene: { type: 'ttt', moves: [[4, 'X', 'challenge'], [0, 'O', 'them'], [2, 'X', 'game']] } },
        { vo: 'Tic tac toe. Dots and boxes. Right inside the chat.',
          scene: { type: 'ttt', start: [[4, 'X'], [0, 'O'], [2, 'X']], moves: [[8, 'O', 'Dots'], [6, 'X', 'Right']], win: [2, 4, 6], winAt: 'chat' } },
        { vo: 'Loser picks the next topic.', cap: false, scene: { type: 'slam', lines: [{ h: 'Loser picks', c: 's', at: 0 }, { h: 'the next', c: 's', at: 'next' }, { h: '<span class="cy">topic.</span>', at: 'topic' }] } },
        OUTRO('Talk. Text.<br><span class="cy">Play.</span>', 'Talk. Text. Play. Talk Live dot app.'),
      ],
    },
  };

  if (typeof module !== 'undefined') module.exports = REELS; else root.REELS = REELS;
})(this);
