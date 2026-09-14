// Random display names for people who never typed one.
//
// Goals, in order: make someone smile, never repeat, never offend.
// The old version was Adjective + Animal + 2 digits (~36k combos, and every
// name felt like a cousin of the last one). This one mixes several sentence
// shapes across large word banks, so the space is in the millions and two
// people in the same room are very unlikely to look related.
//
// Rules for anything added here: keep it PG (strangers talk to strangers on
// this app), keep it short (names render in tight UI), and keep it funny on
// its own — a word that is merely neutral drags the whole combination down.

// Modifiers that turn an ordinary word absurd.
const ADJECTIVES = [
  'Feral', 'Soggy', 'Sleepy', 'Grumpy', 'Sneaky', 'Chaotic', 'Anxious', 'Smug',
  'Confused', 'Suspicious', 'Reckless', 'Dramatic', 'Clumsy', 'Nervous', 'Bored', 'Hungry',
  'Caffeinated', 'Unhinged', 'Retired', 'Undercover', 'Feisty', 'Crispy', 'Damp', 'Fluffy',
  'Chunky', 'Wobbly', 'Squeaky', 'Sticky', 'Lumpy', 'Fuzzy', 'Tiny', 'Enormous',
  'Invisible', 'Discount', 'Expired', 'Refurbished', 'Vintage', 'Emotional', 'Existential', 'Optimistic',
  'Doomed', 'Blessed', 'Cursed', 'Haunted', 'Rogue', 'Rebel', 'Runaway', 'Escaped',
  'Wanted', 'Unlicensed', 'Certified', 'Unqualified', 'Overqualified', 'Freelance', 'Part-Time', 'Off-Duty',
  'Nocturnal', 'Aggressive', 'Passive', 'Reluctant', 'Enthusiastic', 'Casual', 'Formal', 'Spicy',
  'Salty', 'Sweet', 'Bitter', 'Stale', 'Fresh', 'Frozen', 'Melted', 'Toasted',
  'Deep-Fried', 'Microwaved', 'Gluten-Free', 'Organic', 'Radioactive', 'Magnetic', 'Electric', 'Solar',
  'Lunar', 'Cosmic', 'Interstellar', 'Medieval', 'Prehistoric', 'Futuristic', 'Illegal', 'Legendary',
  'Mythical', 'Forgotten', 'Misplaced', 'Lost', 'Found', 'Returned', 'Recycled', 'Regifted',
  'Borrowed', 'Stolen', 'Rented', 'Leased', 'Sponsored', 'Unpaid', 'Underpaid',
];

// Standalone modifiers that read like a disclaimer. Used in front of roles.
const QUALIFIERS = [
  'Barely', 'Mildly', 'Overly', 'Slightly', 'Vaguely', 'Technically', 'Allegedly', 'Legally',
  'Briefly', 'Mostly', 'Almost', 'Nearly', 'Professionally', 'Aggressively', 'Emotionally', 'Suspiciously',
  'Casually', 'Accidentally', 'Deliberately', 'Reluctantly', 'Enthusiastically', 'Quietly', 'Loudly', 'Secretly',
  'Publicly', 'Locally', 'Globally', 'Formerly', 'Currently', 'Permanently', 'Temporarily', 'Chronically',
  'Occasionally', 'Frequently', 'Rarely', 'Genuinely', 'Ironically', 'Unironically', 'Objectively', 'Statistically',
  'Historically', 'Spiritually', 'Financially', 'Legendarily',
];

// Concrete things. Animals, snacks, objects — the funnier the picture, the better.
const NOUNS = [
  'Goose', 'Pigeon', 'Raccoon', 'Possum', 'Ferret', 'Llama', 'Alpaca', 'Capybara',
  'Hedgehog', 'Walrus', 'Manatee', 'Narwhal', 'Pufferfish', 'Catfish', 'Shrimp', 'Crab',
  'Lobster', 'Squid', 'Octopus', 'Jellyfish', 'Axolotl', 'Newt', 'Toad', 'Iguana',
  'Gecko', 'Chameleon', 'Tortoise', 'Sloth', 'Lemur', 'Meerkat', 'Mongoose', 'Badger',
  'Weasel', 'Otter', 'Beaver', 'Chipmunk', 'Squirrel', 'Hamster', 'Gerbil', 'Bunny',
  'Donkey', 'Goat', 'Sheep', 'Cow', 'Pig', 'Duck', 'Chicken', 'Turkey',
  'Ostrich', 'Emu', 'Flamingo', 'Pelican', 'Puffin', 'Penguin', 'Toucan', 'Parrot',
  'Owl', 'Crow', 'Magpie', 'Moth', 'Beetle', 'Snail', 'Slug', 'Waffle',
  'Pancake', 'Bagel', 'Donut', 'Muffin', 'Crouton', 'Pretzel', 'Noodle', 'Dumpling',
  'Meatball', 'Pickle', 'Olive', 'Avocado', 'Mango', 'Papaya', 'Banana', 'Coconut',
  'Peanut', 'Cashew', 'Biscuit', 'Custard', 'Pudding', 'Toast', 'Butter', 'Gravy',
  'Ketchup', 'Mustard', 'Salsa', 'Nacho', 'Taco', 'Burrito', 'Ramen', 'Sushi',
  'Kebab', 'Falafel', 'Samosa', 'Curry', 'Espresso', 'Latte', 'Kombucha', 'Teapot',
  'Spatula', 'Toaster', 'Blender', 'Kettle', 'Mop', 'Broom', 'Ladder', 'Stapler',
  'Clipboard', 'Lampshade', 'Doorknob', 'Sofa', 'Beanbag', 'Hammock', 'Umbrella', 'Sandal',
  'Sock', 'Mitten', 'Scarf', 'Helmet', 'Monocle', 'Trombone', 'Kazoo', 'Banjo',
  'Bagpipe', 'Tuba', 'Cowbell', 'Harmonica', 'Accordion', 'Volcano', 'Glacier', 'Swamp',
  'Puddle', 'Boulder', 'Cactus', 'Fern', 'Mushroom', 'Tumbleweed', 'Meteor', 'Comet',
  'Moonrock', 'Cloud', 'Thunder', 'Drizzle',
];

// Jobs, titles and life choices. These carry most of the punchline.
const ROLES = [
  'Goblin', 'Gremlin', 'Menace', 'Wizard', 'Sorcerer', 'Druid', 'Bard', 'Knight',
  'Pirate', 'Bandit', 'Outlaw', 'Sheriff', 'Deputy', 'Detective', 'Spy', 'Agent',
  'Intern', 'Manager', 'Consultant', 'Analyst', 'Accountant', 'Lawyer', 'Notary', 'Barista',
  'Bartender', 'Chef', 'Baker', 'Butler', 'Janitor', 'Plumber', 'Electrician', 'Mechanic',
  'Farmer', 'Shepherd', 'Fisherman', 'Lifeguard', 'Librarian', 'Archivist', 'Historian', 'Philosopher',
  'Scientist', 'Alchemist', 'Inventor', 'Astronaut', 'Pilot', 'Captain', 'Admiral', 'General',
  'Sergeant', 'Referee', 'Coach', 'Champion', 'Runner-Up', 'Rookie', 'Veteran', 'Legend',
  'Influencer', 'Podcaster', 'Blogger', 'Critic', 'Reviewer', 'Curator', 'Collector', 'Hoarder',
  'Enthusiast', 'Hobbyist', 'Apprentice', 'Understudy', 'Roommate', 'Neighbour', 'Tourist', 'Wanderer',
  'Nomad', 'Hermit', 'Monk', 'Oracle', 'Prophet', 'Guru', 'Mentor', 'Skeptic',
  'Believer', 'Witness', 'Overlord', 'Underlord', 'Duke', 'Baron', 'Emperor', 'Peasant',
  'Jester', 'Gladiator', 'Ninja', 'Samurai', 'Cowboy', 'Astrologer', 'Fortune-Teller', 'Cryptid',
  'Ghost', 'Vampire', 'Werewolf', 'Zombie', 'Mummy', 'Gargoyle',
];

// Third-person verbs. Paired with an object below to make a tiny biography.
const VERBS = [
  'Eats', 'Fears', 'Dodges', 'Fights', 'Hoards', 'Ignores', 'Collects', 'Loses',
  'Steals', 'Returns', 'Reviews', 'Rates', 'Judges', 'Counts', 'Sorts', 'Folds',
  'Chases', 'Avoids', 'Forgets', 'Remembers', 'Misplaces', 'Denies', 'Blames', 'Trusts',
  'Doubts', 'Befriends', 'Interviews', 'Negotiates', 'Bribes', 'Wrestles', 'Outruns', 'Outsmarts',
  'Overthinks', 'Underestimates', 'Googles', 'Photographs', 'Narrates', 'Explains', 'Organizes', 'Alphabetizes',
  'Rearranges', 'Repairs', 'Breaks', 'Unplugs', 'Reboots', 'Sells', 'Buys', 'Rents',
  'Adopts', 'Guards',
];

// What the verb happens to. Mundane on purpose.
const OBJECTS = [
  'Deadlines', 'Emails', 'Mondays', 'Meetings', 'Receipts', 'Taxes', 'Paperwork', 'Pigeons',
  'Seagulls', 'Squirrels', 'Wasps', 'Spiders', 'Geese', 'Cats', 'Dogs', 'Waffles',
  'Leftovers', 'Snacks', 'Cereal', 'Sandwiches', 'Soup', 'Ice', 'Socks', 'Umbrellas',
  'Batteries', 'Chargers', 'Keys', 'Passwords', 'Stairs', 'Escalators', 'Elevators', 'Doors',
  'Traffic', 'Parking', 'Puddles', 'Gravity', 'Physics', 'Alarms', 'Naps', 'Mornings',
  'Bedtimes', 'Spoilers', 'Sequels', 'Subtitles', 'Playlists', 'Podcasts', 'Group-Chats', 'Small-Talk',
  'Eye-Contact', 'Voicemail', 'Notifications', 'Updates', 'Cookies',
];

// Names that work alone. No modifier, no noun, just one funny word.
const SOLO = [
  'Bamboozle', 'Kerfuffle', 'Shenanigan', 'Malarkey', 'Balderdash', 'Poppycock', 'Hogwash', 'Flapdoodle',
  'Codswallop', 'Tomfoolery', 'Hullabaloo', 'Brouhaha', 'Ruckus', 'Rumpus', 'Fiasco', 'Debacle',
  'Blunder', 'Mishap', 'Oopsie', 'Whoopsie', 'Yikes', 'Oof', 'Nope', 'Maybe',
  'Probably', 'Whatever', 'Anyway', 'Meanwhile', 'Regardless', 'Nevertheless', 'Furthermore', 'Honestly',
  'Frankly', 'Doodle', 'Noodle', 'Squiggle', 'Wiggle', 'Jiggle', 'Wobble', 'Bobble',
  'Snuggle', 'Scuffle', 'Shuffle', 'Kerplunk', 'Kaboom', 'Bonk', 'Clonk', 'Thud',
  'Splat', 'Blorp', 'Bloop', 'Zonk', 'Zoinks', 'Yeet', 'Skedaddle', 'Scram',
  'Gizmo', 'Doohickey', 'Thingamajig', 'Whatsit', 'Widget', 'Gadget', 'Contraption', 'Meatball',
  'Breadstick', 'Dumpling', 'Croissant', 'Marshmallow', 'Gumdrop', 'Jellybean', 'Butterscotch', 'Pumpernickel',
  'Cinnamon', 'Paprika', 'Oregano', 'Wasabi', 'Sriracha', 'Guacamole', 'Tapioca', 'Tiramisu',
  'Baklava', 'Churro', 'Pickles', 'Beans', 'Toastie', 'Crumpet', 'Scone', 'Biscuits',
  'Gravy', 'Mothman', 'Bigfoot', 'Nessie', 'Chupacabra', 'Yeti', 'Kraken', 'Gremlin',
  'Goblin', 'Wombat', 'Quokka', 'Platypus', 'Pangolin', 'Tapir', 'Okapi', 'Aardvark',
  'Armadillo', 'Marmot', 'Wallaby', 'Puffin', 'Dodo', 'Kiwi', 'Nimbus', 'Cumulus',
  'Vortex', 'Eclipse', 'Solstice', 'Equinox', 'Monsoon', 'Avalanche', 'Quicksand', 'Sinkhole',
  'Pothole', 'Speedbump', 'Roundabout', 'Buffering', 'Loading', 'Offline', 'Airplane-Mode', 'Low-Battery',
  'Do-Not-Disturb', 'Unsubscribe', 'Undo', 'Ctrl-Z', 'Autocorrect', 'Typo', 'Reply-All', 'Spam',
  'Deadline', 'Overtime', 'Payday', 'Sabbatical', 'Layover', 'Jetlag', 'Snoozer', 'Insomnia',
  'Caffeine', 'Decaf', 'Espresso', 'Nap', 'Yawn', 'Hiccup', 'Sneeze', 'Wanderlust',
  'Deja-Vu', 'Plot-Twist', 'Cliffhanger', 'Side-Quest', 'Main-Quest', 'Respawn', 'Checkpoint', 'Speedrun',
  'Glitch', 'Lag', 'Ping', 'Noob', 'Sidekick',
];

const MAX_LENGTH = 20;

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Each shape is a way of building a name. Weights control how often each turns
// up: single-word names are common because they read cleanly, and the longer
// three-part shapes stay rare so they land as a surprise rather than a pattern.
const SHAPES = [
  { weight: 26, build: () => pick(SOLO) },
  { weight: 22, build: () => pick(ADJECTIVES) + pick(NOUNS) },
  { weight: 18, build: () => pick(ADJECTIVES) + pick(ROLES) },
  { weight: 12, build: () => pick(VERBS) + pick(OBJECTS) },
  { weight: 8, build: () => pick(QUALIFIERS) + pick(ROLES) },
  { weight: 6, build: () => pick(NOUNS) + pick(ROLES) },
  { weight: 5, build: () => pick(QUALIFIERS) + pick(ADJECTIVES) + pick(NOUNS) },
  { weight: 4, build: () => pick(ADJECTIVES) + pick(NOUNS) + pick(ROLES) },
  { weight: 3, build: () => pick(QUALIFIERS) + pick(ADJECTIVES) + pick(ROLES) },
  { weight: 4, build: () => pick(SOLO) + pick(ROLES) },
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
  // Long combinations get squeezed in the UI, so reroll instead of truncating.
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const name = pickShape().build();
    if (name.length <= MAX_LENGTH) return name;
  }
  return pick(SOLO);
}

module.exports = { generateUsername };
