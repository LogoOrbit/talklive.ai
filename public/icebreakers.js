// ============================================================================
// TalkLive - "Break the ice" question deck for a freshly connected chat.
//
// Two sources, mixed: a hand-written list, and "this or that" questions built
// from same-category pairs (coffee or tea, beach or mountains...), which adds
// several hundred more without shipping several hundred more strings. Drawn
// without repeats for the life of the tab, so the next stranger never gets the
// batch the last one did; the deck reshuffles once everything has been shown.
// ============================================================================
(function () {
  'use strict';

  var QUESTIONS = [
    ['📷', 'Last photo you took?'], ['🎬', 'Last movie that wrecked you?'], ['🎤', 'Your go-to karaoke song?'],
    ['🧃', 'Weirdest food combo you love?'], ['🌍', 'Where in the world are you?'], ['🛌', 'Your ideal lazy Sunday?'],
    ['🦦', 'If you were any animal, which one?'], ['🦸', 'If you had one superpower?'], ['🎃', 'Best costume you ever wore?'],
    ['🎧', 'What song is stuck in your head?'], ['📺', 'Show you could rewatch forever?'], ['🍕', 'Best pizza topping, go.'],
    ['✈️', 'Dream trip if money was no issue?'], ['📚', 'Last book you actually finished?'], ['🎮', 'Game you sank the most hours into?'],
    ['☕', 'How do you take your coffee?'], ['🌙', 'Night owl or early bird?'], ['🏆', 'Something you are secretly proud of?'],
    ['🧠', 'Weirdest fact you know?'], ['😂', 'Last thing that made you laugh out loud?'], ['🎂', 'Best birthday you ever had?'],
    ['🍜', 'Comfort food that fixes everything?'], ['🐶', 'Dogs, cats, or neither?'], ['🎵', 'First concert you went to?'],
    ['🗺️', 'Place you want to visit next?'], ['💼', 'What do you do all day?'], ['🎨', 'Hobby you picked up recently?'],
    ['🧳', 'Most memorable trip so far?'], ['📱', 'App you open the most?'], ['🌮', 'Food you could eat every day?'],
    ['🎭', 'Role you would play in a heist movie?'], ['🏝️', 'Three things for a desert island?'], ['⏰', 'What time is it where you are?'],
    ['🌦️', 'What is the weather like there?'], ['🎁', 'Best gift you ever got?'], ['🍳', 'Can you cook? Signature dish?'],
    ['🧩', 'Something you are weirdly good at?'], ['🎯', 'Goal you are working on right now?'], ['📝', 'What is on your to-do list today?'],
    ['👻', 'Do you believe in ghosts?'], ['👽', 'Do you think aliens exist?'], ['🔮', 'Where do you see yourself in 5 years?'],
    ['🚀', 'Would you go to Mars if you could?'], ['🕰️', 'Which decade would you live in?'], ['🦖', 'Favorite animal as a kid?'],
    ['🎢', 'Rollercoasters: love or nope?'], ['🌶️', 'How spicy can you handle?'], ['🍦', 'Favorite ice cream flavor?'],
    ['🎸', 'Instrument you wish you could play?'], ['🗣️', 'How many languages do you speak?'], ['📖', 'A word you love in your language?'],
    ['🏠', 'What is your hometown known for?'], ['🧸', 'Childhood toy you still remember?'], ['🍿', 'Best snack for movie night?'],
    ['🏃', 'Do you work out? What kind?'], ['⚽', 'Do you follow any sport?'], ['🎲', 'Favorite board or card game?'],
    ['🎤', 'Artist you would see live tomorrow?'], ['🌅', 'Sunrise or sunset person?'], ['🛍️', 'Last thing you bought online?'],
    ['💡', 'Best advice you ever got?'], ['🤔', 'Unpopular opinion you hold?'], ['🙈', 'Most embarrassing moment you can share?'],
    ['🧙', 'Hogwarts house, if you had to pick?'], ['🦄', 'Favorite mythical creature?'], ['🤖', 'Would you trust a robot to cook for you?'],
    ['📼', 'A show from your childhood you miss?'], ['🎡', 'Best day of your year so far?'], ['🌱', 'Something new you learned this week?'],
    ['🛸', 'If you could teleport anywhere right now?'], ['🍫', 'Chocolate: dark, milk or white?'], ['🧁', 'Sweet tooth or salty snacker?'],
    ['🏔️', 'Mountains or ocean?'], ['🏙️', 'City life or countryside?'], ['🌧️', 'Rainy days: cozy or gloomy?'],
    ['🦋', 'Something that always cheers you up?'], ['🎹', 'Song that always makes you dance?'], ['📸', 'Most beautiful place you have seen?'],
    ['🕹️', 'Retro game you loved?'], ['🧊', 'Hot drink or cold drink?'], ['🥘', 'Best dish from your country?'],
    ['🗼', 'A city you would love to live in?'], ['🏖️', 'Perfect vacation: adventure or relaxing?'], ['🧗', 'Scariest thing you have ever done?'],
    ['🎓', 'What did you study, or want to?'], ['🧑‍🍳', 'Dish you want to learn to cook?'], ['📦', 'Something you own but never use?'],
    ['🐾', 'Do you have a pet? Name?'], ['🌟', 'Who do you look up to?'], ['🎈', 'What are you looking forward to?'],
    ['🎬', 'Favorite movie of all time?'], ['🍉', 'Favorite fruit?'], ['🥤', 'What are you drinking right now?'],
    ['🛏️', 'How many hours did you sleep last night?'], ['🧦', 'Socks with sandals: yes or crime?'], ['🍍', 'Pineapple on pizza: yes or no?'],
    ['🐉', 'If you could have any pet, even fictional?'], ['🎬', 'Actor who would play you in a movie?'], ['📀', 'Album you know every word to?'],
    ['👟', 'What does your perfect weekend look like?'], ['🥳', 'Best party you have been to?'], ['🧭', 'Are you good with directions?'],
    ['🌌', 'Ever seen the Milky Way in person?'], ['🌋', 'Most adventurous thing on your bucket list?'], ['🪐', 'Favorite planet and why?'],
    ['📬', 'Last message you sent before this?'], ['💬', 'What made you open TalkLive today?'], ['🎧', 'Podcast you would recommend?'],
    ['🎞️', 'Movie you think is overrated?'], ['🧃', 'Favorite childhood snack?'], ['🍩', 'Best dessert you have ever had?'],
    ['🦉', 'What keeps you up at night?'], ['🧘', 'How do you unwind after a long day?'], ['🎤', 'Would you ever sing on stage?'],
    ['🚗', 'Dream car?'], ['🚲', 'Best way to get around your city?'], ['🗳️', 'If you ran a country, first new law?'],
    ['🎰', 'What would you do if you won the lottery?'], ['🏡', 'Describe your dream house.'], ['📅', 'Favorite day of the week?'],
    ['❄️', 'Favorite season?'], ['🎄', 'Favorite holiday or festival?'], ['🍲', 'Best home-cooked meal you grew up with?'],
    ['🧑‍🚀', 'Childhood dream job?'], ['🏅', 'If you could be world-class at one thing?'], ['⌛', 'If you could relive one day?'],
    ['🎥', 'Would you rather star in a movie or direct one?'], ['🧞', 'Three wishes, go.'], ['🕵️', 'Guess where I am from?'],
    ['🎙️', 'Voice or text, which do you prefer?'], ['🤳', 'Selfie person or behind the camera?'], ['🎻', 'Music genre you secretly like?'],
    ['🔥', 'Hottest take you have right now?'], ['🧠', 'Something you changed your mind about recently?'], ['🌊', 'Can you swim?'],
    ['🍣', 'Sushi: love it or skip it?'], ['🥐', 'Breakfast: sweet or savory?'], ['🍔', 'Best burger you ever had?'],
    ['🐧', 'Cutest animal, final answer?'], ['🐍', 'Animal you are afraid of?'], ['🕷️', 'Biggest fear?'],
    ['🎬', 'Favorite movie genre?'], ['👾', 'Favorite video game character?'], ['📺', 'Anime, cartoons, or neither?'],
    ['🚂', 'Longest journey you have been on?'], ['🌐', 'How many countries have you visited?'], ['🛫', 'Window or aisle seat?'],
    ['🧳', 'Do you pack light or pack everything?'], ['🧽', 'Clean freak or organized chaos?'], ['⌨️', 'Fast typer or voice notes?'],
    ['😴', 'Best nap you ever took?'], ['🌞', 'Morning routine in three words?'], ['📣', 'Something you want the world to know?'],
    ['🎤', 'If your life had a theme song?'], ['🧁', 'Best thing you ever baked?'], ['🏕️', 'Camping: fun or torture?'],
    ['🎠', 'Best childhood memory?'], ['🎒', 'Favorite subject in school?'], ['🎪', 'Best live show you have seen?'],
    ['✍️', 'Left-handed or right-handed?'], ['🧩', 'Puzzles, riddles or trivia?'], ['🔭', 'Would you rather explore space or the deep sea?'],
    ['🌮', 'Street food you would recommend in your city?'], ['🗿', 'A wonder of the world you want to see?'], ['💃', 'Can you dance? Honestly.'],
    ['🎊', 'Most random thing on your bucket list?'], ['📚', 'Book everyone should read?'], ['🧘', 'Tea or meditation for stress?'],
    ['🌹', 'Romantic or practical?'], ['🎨', 'Favorite color and why?'], ['🧶', 'Something you made with your hands?'],
    ['🎯', 'What are you really good at?'], ['🐢', 'Slow and steady or fast and furious?'], ['🧇', 'Waffles or pancakes?'],
    ['🎤', 'Who would you invite to a dream dinner?'], ['📱', 'How much screen time today, honestly?'], ['🪴', 'Plants: green thumb or plant killer?'],
  ];

  // "A or B?" built from two different items in one category. Lower case
  // unless a proper noun; the first word is capitalized when the pair is built.
  var PAIRS = [
    ['☕', ['coffee', 'tea', 'hot chocolate', 'matcha', 'energy drinks', 'just water']],
    ['🏖️', ['beach', 'mountains', 'desert', 'forest', 'big city', 'small village', 'lake house']],
    ['🍕', ['pizza', 'burgers', 'sushi', 'tacos', 'biryani', 'pasta', 'ramen', 'shawarma', 'dumplings']],
    ['🎬', ['movies', 'TV series', 'YouTube', 'books', 'podcasts', 'video games', 'anime']],
    ['🐾', ['dogs', 'cats', 'birds', 'rabbits', 'fish', 'hamsters']],
    ['❄️', ['summer', 'winter', 'spring', 'autumn']],
    ['🌙', ['sunrise', 'sunset', 'midnight', 'noon']],
    ['✈️', ['plane', 'train', 'road trip', 'cruise', 'motorbike']],
    ['🎵', ['pop', 'rock', 'hip-hop', 'classical', 'jazz', 'EDM', 'Lo-fi', 'K-pop', 'Bollywood']],
    ['🍦', ['ice cream', 'cake', 'cookies', 'donuts', 'chocolate', 'fruit']],
    ['📱', ['call', 'text', 'voice note', 'video call', 'meet in person']],
    ['🏠', ['stay in', 'go out', 'road trip', 'house party']],
    ['🎮', ['PC', 'console', 'mobile games', 'board games', 'no games']],
    ['🦸', ['flying', 'invisibility', 'teleportation', 'mind reading', 'time travel', 'super strength']],
    ['🌶️', ['sweet', 'spicy', 'salty', 'sour']],
    ['🏃', ['gym', 'running', 'yoga', 'swimming', 'football', 'cricket', 'nap']],
    ['🧳', ['Paris', 'Tokyo', 'New York', 'Istanbul', 'Dubai', 'Bali', 'Rome', 'Seoul', 'Cairo']],
    ['🕰️', ['past', 'future']],
    ['📚', ['fiction', 'non-fiction', 'comics', 'poetry']],
    ['🥞', ['breakfast', 'lunch', 'dinner', 'midnight snack']],
  ];

  var WOULD_YOU_RATHER = [
    'Would you rather read minds or be invisible?', 'Would you rather never use social media again or never watch TV again?',
    'Would you rather live without music or without movies?', 'Would you rather always be 10 minutes late or 20 minutes early?',
    'Would you rather talk to animals or speak every language?', 'Would you rather explore space or the deep ocean?',
    'Would you rather have a rewind button or a pause button for life?', 'Would you rather be famous or be rich?',
    'Would you rather live 100 years in the past or 100 in the future?', 'Would you rather lose your phone or your wallet?',
    'Would you rather be the funniest or the smartest person in the room?', 'Would you rather eat only pizza or only rice forever?',
    'Would you rather never sleep or never eat?', 'Would you rather have free flights or free food for life?',
    'Would you rather know how you die or when you die?', 'Would you rather only whisper or only shout?',
  ];

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function buildPool() {
    var pool = QUESTIONS.map(function (q) { return { emoji: q[0], text: q[1] }; });
    PAIRS.forEach(function (cat) {
      var items = cat[1];
      for (var i = 0; i < items.length; i++) {
        for (var j = i + 1; j < items.length; j++) {
          // Random order so the same item is not always on the left.
          var ab = Math.random() < 0.5 ? [items[i], items[j]] : [items[j], items[i]];
          pool.push({ emoji: cat[0], text: ab[0].charAt(0).toUpperCase() + ab[0].slice(1) + ' or ' + ab[1] + '?' });
        }
      }
    });
    WOULD_YOU_RATHER.forEach(function (q) { pool.push({ emoji: '🤔', text: q }); });
    return shuffle(pool);
  }

  var deck = [];
  // Next `n` questions, never repeating until the whole deck has been shown.
  function draw(n) {
    var out = [];
    while (out.length < n) {
      if (!deck.length) deck = buildPool();
      out.push(deck.pop());
    }
    return out;
  }

  window.TalkLiveIcebreakers = { draw: draw };
})();
