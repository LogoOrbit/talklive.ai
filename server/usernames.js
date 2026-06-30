const ADJECTIVES = [
  'Swift', 'Calm', 'Bold', 'Lucky', 'Silent', 'Bright', 'Cosmic', 'Gentle',
  'Wild', 'Clever', 'Sunny', 'Mighty', 'Quiet', 'Brave', 'Witty', 'Lone',
  'Golden', 'Frosty', 'Electric', 'Velvet',
];

const NOUNS = [
  'Falcon', 'Tiger', 'Comet', 'Otter', 'Phoenix', 'Wolf', 'Panda', 'Raven',
  'Dolphin', 'Lynx', 'Eagle', 'Fox', 'Sparrow', 'Panther', 'Whale', 'Hawk',
  'Maple', 'River', 'Storm', 'Ember',
];

function generateUsername() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${adj}${noun}${num}`;
}

module.exports = { generateUsername };
