#!/usr/bin/env node
// Regenerates server/username-words.js, the word banks behind random display
// names. Run with `npm run build:usernames` after editing the curated lists
// below; the corpus slices are fetched fresh each time.
//
// Corpus source: dariusk/corpora (CC0). We pull small, safe slices — animals,
// dog and cat breeds, vegetables, fruits, condiments, herbs and spices, pizza
// toppings, household objects, flowers, occupations — and keep only single
// ASCII words of a usable length. Anything bleak, medical or weapon-shaped is
// dropped: these names land on strangers, so they have to be harmless first
// and funny second.

const fs = require('fs');
const path = require('path');

const CORPORA = 'https://raw.githubusercontent.com/dariusk/corpora/master/data';

const DROP_THINGS = `bonesaw dagger whip sword crowbar knife pocketknife multitool nail screw
  food clothes floor water money light spring thing beef milk conditioner shampoo deodorant
  lotion perfume soap outlet chain rope needle thread lace canvas chalk paper card cars trucks
  teddies keys carrots bananas flowers shoes socks pants glasses spectacles stockings`.split(/\s+/);

const DROP_OCCUPATIONS = `embalmer escort gynecologist mortician obstetrician psychiatrist
  slaughterer undertaker jailer priest hunter trapper blaster orderly internist urologist
  waitress hostess movers model host offbearer faller caster taper shaper scaler sampler
  checker cutter trimmer weigher solderer brazer etcher molder sorter tester tuner`.split(/\s+/);

// --- curated banks: this is where the jokes actually live --------------------

const words = (block) => block.trim().split(/\s+/);

const CURATED_ADJECTIVES = words(`
  Feral Soggy Sleepy Grumpy Sneaky Chaotic Anxious Smug Confused Suspicious Reckless Dramatic
  Clumsy Nervous Bored Hungry Caffeinated Unhinged Retired Undercover Feisty Crispy Damp Fluffy
  Chunky Wobbly Squeaky Sticky Lumpy Fuzzy Tiny Enormous Invisible Discount Expired Refurbished
  Vintage Emotional Existential Optimistic Doomed Blessed Cursed Haunted Rogue Rebel Runaway
  Escaped Wanted Unlicensed Certified Unqualified Overqualified Freelance Nocturnal Reluctant
  Enthusiastic Casual Formal Spicy Salty Sweet Bitter Stale Fresh Frozen Melted Toasted
  Radioactive Magnetic Electric Solar Lunar Cosmic Interstellar Medieval Prehistoric Futuristic
  Legendary Mythical Forgotten Misplaced Lost Recycled Regifted Borrowed Rented Sponsored Unpaid
  Underpaid Bulletproof Waterproof Fireproof Organic Artisanal Handmade Imported Wholesale
  Seasonal Limited Deluxe Premium Budget Generic Knockoff Bootleg Hypothetical Theoretical
  Unverified Unsupervised Untrained Barefoot Sunburnt Windswept Bewildered Perplexed Baffled
  Startled Alarmed Delighted Amused Unimpressed Concerned Determined Distracted Devoted Restless
  Sluggish Zany Whimsical Wistful Nostalgic Skeptical Gullible Stubborn Bashful Jolly Giddy
  Cranky Grouchy Peckish Woozy Dizzy Itchy Sweaty Muddy Dusty Rusty Creaky Squelchy
`);

const CURATED_ROLES = words(`
  Goblin Gremlin Menace Wizard Sorcerer Druid Bard Knight Pirate Bandit Outlaw Sheriff Deputy
  Spy Overlord Underlord Duke Baron Emperor Peasant Jester Gladiator Ninja Samurai Cowboy
  Cryptid Ghost Vampire Werewolf Zombie Mummy Gargoyle Oracle Prophet Guru Mentor Skeptic Hermit
  Monk Nomad Wanderer Tourist Roommate Neighbour Champion Rookie Veteran Legend Sidekick Henchman
  Mastermind Apprentice Understudy Enthusiast Hoarder Collector Critic Influencer Podcaster
  Wrangler Whisperer Warlord Chieftain Commodore Ambassador Delegate Bureaucrat Middleman
  Freeloader Bystander Witness Suspect Culprit Accomplice Mascot Overthinker Napper Snacker
  Rambler Meddler Lurker Ranter
`);

const QUALIFIERS = words(`
  Barely Mildly Overly Slightly Vaguely Technically Allegedly Legally Briefly Mostly Almost
  Nearly Professionally Aggressively Emotionally Suspiciously Casually Accidentally Deliberately
  Reluctantly Quietly Loudly Secretly Locally Globally Formerly Currently Permanently Temporarily
  Chronically Occasionally Rarely Genuinely Ironically Unironically Objectively Statistically
  Historically Spiritually Financially Legendarily Openly Habitually Gently Firmly Politely
  Rudely Frankly Honestly Somehow Weirdly Oddly Notoriously Famously
`);

const VERBS = words(`
  Eats Fears Dodges Fights Hoards Ignores Collects Loses Steals Returns Reviews Rates Judges
  Counts Sorts Folds Chases Avoids Forgets Remembers Misplaces Denies Blames Trusts Doubts
  Befriends Interviews Negotiates Bribes Wrestles Outruns Outsmarts Overthinks Underestimates
  Googles Photographs Narrates Explains Organizes Alphabetizes Rearranges Repairs Breaks Unplugs
  Reboots Sells Buys Rents Adopts Guards Questions Sniffs Inspects Approves Rejects Postpones
  Rehearses Interrupts Applauds Investigates
`);

const VERB_OBJECTS = words(`
  Deadlines Emails Mondays Meetings Receipts Taxes Paperwork Pigeons Seagulls Squirrels Wasps
  Spiders Geese Cats Dogs Waffles Leftovers Snacks Cereal Sandwiches Soup Socks Umbrellas
  Batteries Chargers Keys Passwords Stairs Escalators Elevators Doors Traffic Puddles Gravity
  Physics Alarms Naps Mornings Bedtimes Spoilers Sequels Subtitles Playlists Podcasts Voicemail
  Notifications Updates Cookies Ghosts Rumours Statistics Vegetables Instructions Warranties
  Contracts Neighbours Toasters Compliments
`);

const SOLO = words(`
  Bamboozle Kerfuffle Shenanigan Malarkey Balderdash Poppycock Hogwash Flapdoodle Codswallop
  Tomfoolery Hullabaloo Brouhaha Ruckus Rumpus Fiasco Debacle Blunder Mishap Oopsie Whoopsie
  Skedaddle Scram Gizmo Doohickey Thingamajig Whatsit Widget Gadget Contraption Doodle Noodle
  Squiggle Wiggle Jiggle Wobble Bobble Snuggle Scuffle Shuffle Kerplunk Kaboom Bonk Clonk Thud
  Splat Blorp Bloop Zonk Zoinks Yeet Meatball Breadstick Dumpling Croissant Marshmallow Gumdrop
  Jellybean Butterscotch Pumpernickel Tapioca Tiramisu Baklava Churro Crumpet Scone Mothman
  Bigfoot Nessie Chupacabra Yeti Kraken Wombat Quokka Platypus Pangolin Tapir Okapi Aardvark
  Armadillo Marmot Wallaby Puffin Dodo Nimbus Cumulus Vortex Eclipse Solstice Equinox Monsoon
  Avalanche Quicksand Sinkhole Pothole Speedbump Roundabout Buffering Loading Offline Unsubscribe
  Autocorrect Typo Spam Deadline Overtime Payday Sabbatical Layover Jetlag Insomnia Caffeine
  Decaf Espresso Hiccup Sneeze Yawn Wanderlust Cliffhanger Respawn Checkpoint Speedrun Glitch
  Ping Chaos Vibes Mayhem Nonsense Whimsy Mischief Trouble Bother Fuss Panic Drizzle Thunder
  Tumbleweed Moonrock Meteor Volcano Glacier Swamp Puddle Cactus Snorkel Kazoo Trombone Bagpipe
  Cowbell Accordion Harmonica Banjo Tuba Ukulele Pickle Waffle Bagel Donut Muffin Crouton Pretzel
  Custard Gravy Nacho Ramen Sushi Falafel Samosa Kombucha Toaster Spatula Beanbag Hammock Monocle
  Doorknob
`);

const HONORIFICS = words(`
  Sir Dame Lord Lady Captain Admiral Baron Baroness Count Countess Duke Duchess Chief Doctor
  Professor Mayor Sergeant Colonel Judge Elder Uncle Auntie Cousin Big Little Old Young Saint
  Comrade Agent Officer Master Apprentice
`);

const FANDOM = words(`
  Enthusiast Apologist Truther Skeptic Fan Historian Whisperer Wrangler Collector Connoisseur
  Analyst Correspondent Advocate Denier Believer Scholar Curator Sommelier Aficionado Devotee
  Hobbyist Purist Reviewer Archivist
`);

// Plural creatures and objects, for the "Definitely Not ..." / "Two ..." shapes.
const PLURALS = words(`
  Bees Wasps Geese Raccoons Pigeons Ferrets Otters Goblins Gremlins Squirrels Ducks Frogs Toads
  Crabs Owls Bats Moths Snails Llamas Alpacas Penguins Puffins Hamsters Possums Badgers Weasels
  Beavers Chipmunks Lemurs Meerkats Wombats Capybaras Hedgehogs Sloths Iguanas Parrots Crows
  Magpies Seagulls Pelicans Flamingos Walruses Ghosts Wizards Interns Toddlers Accountants
  Lawyers Pirates Ninjas Clowns Mimes Bagpipers Roommates Neighbours Tourists Detectives Barbers
  Waffles Meatballs Dumplings Pickles Bagels Croissants Marshmallows Potatoes Onions Cabbages
  Pumpkins Mushrooms Coconuts Bananas Toasters Umbrellas
`);

const COUNTS = ['Two', 'Three', 'Four', 'Five', 'Several', 'Numerous'];

// --- corpus plumbing ---------------------------------------------------------

async function corpus(file, key) {
  const res = await fetch(`${CORPORA}/${file}.json`);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data[key])) throw new Error(`${file}: no "${key}" array`);
  return data[key];
}

function keepSimple(list, { min = 3, max = 12, drop = [] } = {}) {
  const dropped = new Set(drop.map((w) => w.toLowerCase()));
  return list
    .map((w) => String(w).trim())
    .filter((w) => /^[A-Za-z]+$/.test(w))
    .filter((w) => w.length >= min && w.length <= max)
    .filter((w) => !dropped.has(w.toLowerCase()))
    .map((w) => w[0].toUpperCase() + w.slice(1));
}

function dedupe(...lists) {
  const seen = new Set();
  const out = [];
  for (const word of lists.flat()) {
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(word);
  }
  return out;
}

function serialize(banks) {
  const head = `// Word banks for random display names — GENERATED by
// scripts/build-username-words.js. Edit the curated lists in that script and
// re-run \`npm run build:usernames\` rather than editing this file by hand.
//
// Sources: hand-written humour banks plus filtered slices of the public-domain
// dariusk/corpora word lists (CC0).
`;
  const blocks = Object.entries(banks).map(([name, list]) => {
    const lines = [];
    let line = ' ';
    for (const word of list) {
      const piece = ` '${word}',`;
      if (line.length + piece.length > 96) {
        lines.push(line);
        line = ' ';
      }
      line += piece;
    }
    if (line.trim()) lines.push(line);
    return `const ${name} = [\n${lines.join('\n')}\n];\n`;
  });
  const exports = `module.exports = {\n${Object.keys(banks).map((n) => `  ${n},`).join('\n')}\n};\n`;
  return [head, ...blocks, exports].join('\n');
}

async function main() {
  const [animals, dogs, cats, vegetables, fruits, condiments, spices, herbs, toppings, objects,
    flowers, occupations] = await Promise.all([
    corpus('animals/common', 'animals'),
    corpus('animals/dogs', 'dogs'),
    corpus('animals/cats', 'cats'),
    corpus('foods/vegetables', 'vegetables'),
    corpus('foods/fruits', 'fruits'),
    corpus('foods/condiments', 'condiments'),
    corpus('foods/herbs_n_spices', 'spices'),
    corpus('foods/herbs_n_spices', 'herbs'),
    corpus('foods/pizzaToppings', 'pizzaToppings'),
    corpus('objects/objects', 'objects'),
    corpus('plants/flowers', 'flowers'),
    corpus('humans/occupations', 'occupations'),
  ]);

  const banks = {
    ADJECTIVES: dedupe(CURATED_ADJECTIVES),
    QUALIFIERS: dedupe(QUALIFIERS),
    CREATURES: dedupe(
      keepSimple(animals),
      keepSimple(dogs, { max: 11 }),
      keepSimple(cats, { max: 11 }),
    ),
    FOODS: dedupe(
      keepSimple(vegetables, { drop: ['legume', 'tubers'] }),
      keepSimple(fruits, { drop: ['nut'] }),
      keepSimple(condiments, { drop: ['dip', 'salt'] }),
      keepSimple(spices, { drop: ['salt', 'rose', 'zest', 'hemp'] }),
      keepSimple(herbs, { drop: ['hemp'] }),
      keepSimple(toppings),
    ),
    THINGS: dedupe(keepSimple(objects, { drop: DROP_THINGS }), keepSimple(flowers)),
    OCCUPATIONS: dedupe(keepSimple(occupations, { max: 13, drop: DROP_OCCUPATIONS }), CURATED_ROLES),
    ROLES: dedupe(CURATED_ROLES),
    VERBS: dedupe(VERBS),
    VERB_OBJECTS: dedupe(VERB_OBJECTS),
    SOLO: dedupe(SOLO),
    HONORIFICS: dedupe(HONORIFICS),
    FANDOM: dedupe(FANDOM),
    PLURALS: dedupe(PLURALS),
    COUNTS: dedupe(COUNTS),
  };

  const target = path.join(__dirname, '..', 'server', 'username-words.js');
  fs.writeFileSync(target, serialize(banks));
  for (const [name, list] of Object.entries(banks)) {
    console.log(`${name.padEnd(14)} ${list.length}`);
  }
  console.log(`\nwrote ${path.relative(process.cwd(), target)}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
