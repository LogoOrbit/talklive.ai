// Starter examples for TalkGuard (server/talkguard.js). Hand-written so the
// model is useful on day one; the owner's own decisions are added on top and
// steadily outweigh these. Offensive by necessity: a filter has to be shown
// what it is filtering. Ordinary swearing, flirting between adults and
// "how old are you" are deliberately labelled fine - the site is for adults
// and those are not rule breaks.

const pick = (list, f) => list.flatMap(f);

const insults = ['idiot', 'stupid', 'dumb', 'loser', 'ugly', 'pathetic', 'worthless', 'trash', 'garbage', 'retard', 'moron', 'disgusting', 'fat pig', 'clown', 'freak', 'creep', 'bitch', 'whore', 'slut', 'piece of shit', 'dumbass', 'asshole', 'cunt', 'bastard'];
const ABUSE = [
  ...pick(insults, (w) => [`you are a ${w}`, `ur such a ${w}`, `shut up ${w}`, `${w} lol nobody likes you`]),
  ...pick(['kill yourself', 'kys', 'go die', 'end yourself', 'nobody would miss you', 'you should die', 'hang yourself', 'drink bleach'], (w) => [w, `just ${w}`, `${w} seriously`, `do everyone a favour and ${w}`]),
  ...pick(['i will kill you', 'i will find you', 'i know where you live', 'i will hurt you', 'i will beat you up', 'watch your back', 'i will rape you', 'im going to stab you'], (w) => [w, `${w} trust me`, `${w} bitch`]),
  ...pick(['nigger', 'nigga', 'faggot', 'fag', 'tranny', 'chink', 'paki', 'spic', 'kike', 'dirty muslim', 'terrorist arab', 'monkey'], (w) => [`shut up ${w}`, `you ${w}`, `go back to your country ${w}`, `${w}s are disgusting`]),
  'your mom is a whore', 'i hate people like you', 'you sound retarded', 'go back to your country', 'your voice is disgusting',
  'nobody wants to talk to you ugly', 'k y s', 'k.y.s', 'fuck you', 'fuck off and die', 'stfu you worthless piece of trash',
  'kill urself', 'kill your self', 'go kill urself', 'u r so ugly', 'ur ugly as hell', 'ur so fat and ugly', 'you are ugly af',
  'you deserve to be raped', 'women belong in the kitchen shut up', 'gay people are disgusting', 'go to hell you freak',
];

const SEXUAL = [
  'send nudes', 'send me nudes', 'show me your boobs', 'show tits', 'send pics of your body', 'wanna sext', 'lets sext',
  'are you horny', 'im so horny', 'i want to fuck you', 'suck my dick', 'show me your pussy', 'what are you wearing right now baby',
  'take off your clothes', 'do you want to see my dick', 'i want to see you naked', 'lets have cam sex', 'snap me nudes',
  'describe your body in bed', 'how big are your boobs', 'want to do something naughty', 'touch yourself for me', 'are you wet',
  'send a pic in your bra', 'moan for me', 'lets talk dirty', 'i am hard right now', 'bend over for me', 'send feet pics',
  'show me your ass', 'i want to lick you', 'can i see your body', 'nude pic for a nude pic', 'dick pic', 'send naked selfie',
  'r u horny', 'u horny', 'sext me', 'nudes?', 'show boobs pls', 'lets fuck', 'wanna fuck', 'i want sex with you',
];

const SPAM = [
  'earn 500 dollars a day from home', 'invest in bitcoin with me and double your money', 'send me money on cash app',
  'i need money please send to my paypal', 'buy cheap followers at my site', 'click my link for free gift cards',
  'join my telegram for crypto signals', 'subscribe to my onlyfans', 'check my onlyfans link in bio', 'dm me for paid content',
  'i sell premium snapchat', 'free robux click here', 'win an iphone today visit', 'western union me 100 dollars',
  'i can make you rich forex trading', 'send me a gift card and i will send pics', 'promo code for my store', 'visit my website for deals',
  'whatsapp me for investment opportunity', 'guaranteed profit crypto mining', 'add my telegram for nudes cheap', 'paid video calls message me',
  'i am a sugar daddy send your cashapp', 'buy my course to get rich', 'free money giveaway enter now', 'need a loan contact me',
];

const CLEAN = [
  'hi', 'hello', 'hey how are you', 'where are you from', 'im from india', 'what time is it there', 'nice to meet you',
  'how old are you', 'im 22', 'i am 19 and you', 'what do you do', 'i am a student', 'i work in it', 'what music do you like',
  'do you play games', 'i love football', 'have you seen the new movie', 'lol that is funny', 'haha same', 'that is crazy',
  'damn that is crazy', 'this is fucking awesome', 'shit happens lol', 'what the hell man', 'holy shit really', 'oh fuck i forgot',
  'i hate mondays', 'i hate rain', 'that game was so stupid haha', 'my boss is an idiot lol', 'this weather is killing me',
  'i could kill for a pizza right now', 'you killed it', 'that joke killed me', 'i am dying of laughter', 'stop it you are so funny',
  'you sound cute', 'you have a nice voice', 'can we be friends', 'add me as a friend', 'can i add you', 'do you have instagram',
  'what is your name', 'my name is alex', 'good night', 'bye take care', 'sorry i have to go', 'talk later', 'i am bored',
  'what are you doing', 'just chilling', 'eating dinner', 'are you a boy or girl', 'male', 'female', 'i am a girl',
  'what languages do you speak', 'i speak english and urdu', 'teach me some spanish', 'how is the weather', 'it is so hot here',
  'do you like anime', 'naruto is the best', 'what is your favourite food', 'biryani for sure', 'i like cats', 'my dog is sleeping',
  'are you on your phone', 'my internet is slow', 'can you hear me', 'your mic is cutting out', 'sorry i did not get that',
  'i miss my family', 'i am feeling sad today', 'that sucks i am sorry', 'you will be fine', 'want to play a game', 'truth or dare',
  'tell me a secret', 'what is your dream job', 'i want to travel to japan', 'have you been to london', 'i love your accent',
  'you are so kind', 'thanks for talking', 'you made my day', 'lol you are crazy', 'you are weird but nice', 'stupid autocorrect',
  'i feel dumb for asking', 'that was a dumb mistake i made', 'the bus driver was an idiot today', 'kill the lights', 'killer song',
  'skills', 'skillful player', 'sussex', 'essex', 'middlesex county', 'analysis', 'therapist', 'cocktail', 'scunthorpe', 'grape juice',
  'class assignment', 'assassin creed', 'pussycat', 'cockpit', 'hello kitty', 'peacock', 'hancock movie', 'manslaughter documentary',
  'i am married', 'do you have a boyfriend', 'are you single', 'i like your vibe', 'you are pretty funny', 'what do you look like',
  'whats your snapchat', 'lets talk on discord', 'my insta is alex22', 'i do not use whatsapp', 'my phone is dying',
  'are you a bot', 'why did you skip me', 'rude', 'okay bye', 'nah', 'yes', 'no', 'maybe', 'idk', 'lmao', 'bruh', 'sus',
  'money is tight these days', 'i lost money on crypto lol', 'bitcoin is crazy right now', 'i got paid today finally', 'i need a job',
  'do you have a girlfriend', 'sex education class was awkward', 'gender equality matters', 'that movie had a sex scene lol',
  'i am not comfortable with that', 'please stop', 'can we change the topic', 'i am reporting you', 'that is not nice',
  ...pick(['sweetheart', 'nice person', 'good listener', 'legend', 'funny guy', 'kind soul', 'smart girl', 'cool dude', 'great friend', 'genius', 'gentleman', 'cutie', 'sweet guy', 'good singer'], (w) => [`you are such a ${w}`, `ur such a ${w}`, `you are a ${w}`]),
  'shut up lol', 'shut up no way', 'oh shut up haha', 'shut up really', 'omg shut up you are funny', 'shut up and tell me more',
  'your mom sounds nice', 'my mom is calling me', 'your mom is cool', 'say hi to your mom', 'how are you doing today',
  'he called me a slur and i reported him', 'someone told me to kill myself yesterday it was awful', 'racism is disgusting',
];

module.exports = { ABUSE, SEXUAL, SPAM, CLEAN };
