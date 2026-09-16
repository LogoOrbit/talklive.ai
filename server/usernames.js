// Random display names for people who never typed one.
//
// Goals, in order: make someone smile, never look repetitive, never offend.
// The old generator was one shape - Adjective + Animal + two digits - over 20
// adjectives and 20 nouns, so every name in a room looked like a sibling of
// the last one and the trailing digits made all of them read as throwaway.
//
// This version drops the digits, writes names as separate words ("Cosmic Fox",
// not "CosmicFox31"), and mixes a dozen sentence shapes across large word
// banks - including plain one-word names, which often land best. The banks
// live in username-words.js and are rebuilt by scripts/build-username-words.js.

const W = require('./username-words');

// Two words of ~10 letters plus a space is about all the UI gives us before
// names start eliding, so anything longer is rerolled rather than truncated.
const MAX_LENGTH = 22;

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Every "noun" bank, for shapes that just want a concrete thing.
const NOUNS = [].concat(W.CREATURES, W.FOODS, W.THINGS);

function noun() {
  return pick(NOUNS);
}

// Each shape is one joke structure. Weights decide how often each turns up:
// the two-word adjective shapes carry the bulk because they read cleanly at a
// glance, single words stay frequent enough to feel like a real option, and
// the odder templates are rare so they land as a surprise instead of a habit.
const SHAPES = [
  // Cosmic Fox · Soggy Corgi · Existential Waffle
  { weight: 24, build: () => `${pick(W.ADJECTIVES)} ${noun()}` },
  // Bamboozle · Wombat · Jetlag
  { weight: 16, build: () => pick(W.SOLO) },
  // Feral Accountant · Undercover Plumber · Retired Gremlin
  { weight: 13, build: () => `${pick(W.ADJECTIVES)} ${pick(W.OCCUPATIONS)}` },
  // Pigeon Enthusiast · Soup Truther · Gravy Sommelier
  { weight: 9, build: () => `${noun()} ${pick(W.FANDOM)}` },
  // Fights Deadlines · Alphabetizes Snacks · Fears Escalators
  { weight: 9, build: () => `${pick(W.VERBS)} ${pick(W.VERB_OBJECTS)}` },
  // Captain Pickle · Baron Corgi · Auntie Chaos
  { weight: 8, build: () => `${pick(W.HONORIFICS)} ${noun()}` },
  // Waffle Wizard · Cabbage Bandit · Toaster Overlord
  { weight: 7, build: () => `${noun()} ${pick(W.ROLES)}` },
  // Professionally Confused · Barely Awake · Aggressively Casual
  { weight: 5, build: () => `${pick(W.QUALIFIERS)} ${pick(W.ADJECTIVES)}` },
  // Definitely Not Bees · Not A Raccoon
  { weight: 3, build: () => (Math.random() < 0.5
    ? `Definitely Not ${pick(W.PLURALS)}`
    : `Not A ${noun()}`) },
  // Three Raccoons · Several Wizards
  { weight: 3, build: () => `${pick(W.COUNTS)} ${pick(W.PLURALS)}` },
  // Mildly Feral Goose · Legally Sleepy Otter
  { weight: 2, build: () => `${pick(W.QUALIFIERS)} ${pick(W.ADJECTIVES)} ${noun()}` },
  // Sir Naps A Lot · Dame Snacks A Lot
  { weight: 1, build: () => `${pick(W.HONORIFICS)} ${pick(W.VERBS)} A Lot` },
];

const TOTAL_WEIGHT = SHAPES.reduce((sum, shape) => sum + shape.weight, 0);

function pickShape() {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const shape of SHAPES) {
    roll -= shape.weight;
    if (roll < 0) return shape;
  }
  return SHAPES[0];
}

function generateUsername() {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const name = pickShape().build();
    if (name.length <= MAX_LENGTH) return name;
  }
  return pick(W.SOLO);
}

module.exports = { generateUsername };
