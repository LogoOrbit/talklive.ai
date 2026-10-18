'use strict';
/*
 * Search snippets: the <title> and meta description each page shows in search
 * results, kept apart from the page's own headline and standfirst.
 *
 * Why a separate table: the hand-written pages use their `title` and
 * `description` fields in other places too - the Journal index prints each
 * description as a teaser, llms.txt lists them, and some run to 240
 * characters on purpose. Google cuts titles at about 600px (~60 characters)
 * and descriptions at about 155-160, and every SEO checker flags anything
 * longer (Semrush: "too much text within the title tags"). So the long copy
 * stays where people read it, and this table holds the short version for the
 * results page.
 *
 * Rules, enforced by scripts/audit-seo.js on every built page:
 *   title       <= 60 characters, unique across the site
 *   description 70-160 characters, unique across the site
 * Lead with the phrase people search for; keep "TalkLive" in when it fits.
 */
const SNIPPETS = {
  '/': {
    description: 'Talk to strangers free by voice or text. TalkLive pairs you with another adult for a one-to-one call or chat: no camera, no sign-up, block and report anytime.',
  },

  // Product pages and hubs (scripts/topics/)
  '/talk-to-strangers': {
    title: 'Talk to Strangers Online - Free Voice & Text Chat | TalkLive',
    description: 'Talk to strangers online by voice or text, free and with no account. What the first five minutes with someone new are really like, and what research says.',
  },
  '/random-voice-chat': {
    title: 'Random Voice Chat - Free Audio Chat with Strangers',
    description: 'Free random voice chat with strangers: one tap to talk to someone new, audio only, no camera or account. Why a voice carries more than text or video.',
  },
  '/random-text-chat': {
    title: 'Random Text Chat with Strangers - Free, No Sign-Up',
    description: 'Free one-to-one text chat with people worldwide. Tap to chat and get paired with someone new: no microphone, no sign-up, adults 18+ only.',
  },
  '/anonymous-chat': {
    title: 'Anonymous Chat - Free Online Chat, No Account | TalkLive',
    description: 'Free anonymous chat online with strangers by voice or text: no account, phone number or camera. What the other person sees, and what TalkLive keeps.',
  },
  '/random-call': {
    title: 'Random Call App - Free Live Calls with Strangers',
    description: 'Make a free random call to another adult from your browser: no phone number, no app, no credit. How the call connects and how much data it uses.',
  },
  '/talk-to-someone': {
    title: 'Need Someone to Talk To? Talk to Someone Free | TalkLive',
    description: 'Need someone to talk to right now? Have a free, anonymous voice or text conversation with another adult, no sign-up, and find urgent support if you need it.',
  },
  '/late-night-chat': {
    title: 'Late Night Chat - Talk to Someone at Any Hour | TalkLive',
    description: "Can't sleep? Free late night voice and text chat with people around the world, no account. Where it is still evening at 2 a.m., and how to look after yourself.",
  },
  '/make-friends-online': {
    title: 'Make Friends Online - Meet New People by Voice | TalkLive',
    description: 'Make friends online through real conversations, not profiles. How many hours a friendship takes, and how to keep the people you click with. Free to start.',
  },
  '/practice-english-speaking': {
    title: 'Practice English Speaking Online Free with Real People',
    description: 'Practise speaking English free in real conversations with people worldwide. Why speaking builds fluency, a phrase bank for calls, and how to use five minutes.',
  },
  '/language-exchange': {
    title: 'Language Exchange - Free Speaking Practice | TalkLive',
    description: 'Free language exchange by voice or text: trade ten minutes of your language for ten of theirs. The two tandem rules, a ready script, and how to correct well.',
  },
  '/voice-chat-vs-video-chat': {
    title: 'Voice Chat vs Video Chat: Privacy and Comfort | TalkLive',
    description: 'Voice chat vs video chat, round by round: privacy, data, fatigue, safety with strangers and emotion. An honest scorecard, including where video wins.',
  },
  '/omegle-alternative': {
    title: 'Best Omegle Alternative - Free Chat, No Camera | TalkLive',
    description: 'Omegle closed in November 2023. Six checks to judge any Omegle alternative, and how TalkLive, free voice and text chat for adults with no camera, measures up.',
  },
  '/how-it-works': {
    title: 'How TalkLive Works - Matching, Voice and Text Chat',
    description: 'How TalkLive connects two strangers: live queues, matching preferences, encrypted WebRTC audio, how text is delivered and what "not recorded" means.',
  },
  '/safety': {
    title: 'TalkLive Safety Center - Privacy, Reporting, Blocking',
    description: 'How to stay safe on TalkLive: five rules, what to do if a chat goes wrong, what is and is not recorded, how reporting and blocking work, and where to get help.',
  },
  '/language-chat-guide': {
    title: 'TalkLive in 17 Languages - Chat in Your Own Language',
    description: 'Use TalkLive in 17 languages, including right-to-left Arabic, Persian and Urdu. Find people who speak your language, and tips for talking across languages.',
  },
  '/country-chat-guide': {
    title: 'Talk to Strangers by Country - 30 Guides | TalkLive',
    description: 'Guides to talking with people in 30 countries, from India, the US and Pakistan to Egypt, the UK, Brazil and Japan, and how country matching works.',
  },
  '/resources': {
    title: 'TalkLive Guides - Voice Chat, Safety and Conversation',
    description: 'Every TalkLive guide in one place: talking to strangers, voice and text chat, safety and privacy, making friends, languages and country guides.',
  },

  // Country guides (scripts/countries/)
  '/countries/india': {
    title: 'Talk to Strangers in India - Hindi & English Voice Chat',
    description: 'Free voice and text chat with people in India in Hindi, English or Hinglish. No sign-up, no camera. How India talks to strangers, and when it is online (IST).',
  },
  '/countries/pakistan': {
    title: 'Talk to Strangers in Pakistan - Urdu Voice Chat, Free',
    description: 'Free voice and text chat with people in Pakistan in Urdu, Punjabi or English, with an Urdu interface. No sign-up, no camera. When Pakistan is online (PKT).',
  },
  '/countries/bangladesh': {
    title: 'Talk to Strangers in Bangladesh - Bangla Voice Chat',
    description: 'Free voice and text chat with people in Bangladesh and Bangla speakers worldwide, with a Bangla interface. No sign-up, no camera. Adda, and when BD is online.',
  },
  '/countries/united-states': {
    title: 'Talk to Strangers in the USA - Free Voice Chat | TalkLive',
    description: "Free voice and text chat with people in the United States. No sign-up, camera or phone number. America's love of talking to strangers, and when it is online.",
  },
  '/countries/united-kingdom': {
    title: 'Talk to Strangers in the UK - Free Voice Chat | TalkLive',
    description: 'Free voice and text chat with people in the UK. No sign-up, camera or phone number. Why British evenings are our busiest hours, and the weather-talk ritual.',
  },
  '/countries/egypt': {
    title: 'Talk to Strangers in Egypt - Free Arabic Voice Chat',
    description: 'Free voice and text chat with people in Egypt in Egyptian Arabic or English, with an Arabic interface. No sign-up, no camera. When Egypt is online (Cairo time).',
  },
  '/countries/nigeria': {
    title: 'Talk to Strangers in Nigeria - Free Voice Chat | TalkLive',
    description: 'Free voice and text chat with people in Nigeria in English, Pidgin, Yoruba, Igbo or Hausa. No sign-up, no camera, light on data. When Nigeria is online (WAT).',
  },
  '/countries/indonesia': {
    title: 'Talk to Strangers in Indonesia - Free Voice Chat',
    description: 'Free voice and text chat with people in Indonesia in Bahasa Indonesia or English. No sign-up, app or camera. Basa-basi, nongkrong and when Indonesia is online.',
  },
  '/countries/germany': {
    title: 'Talk to Strangers in Germany - German Voice Chat',
    description: 'Free voice and text chat with people in Germany in German or English, with a German interface. No sign-up, no camera. Feierabend, du or Sie, and peak hours.',
  },
  '/countries/saudi-arabia': {
    title: 'Talk to Strangers in Saudi Arabia - Arabic Voice Chat',
    description: 'Free voice and text chat with people in Saudi Arabia in Arabic or English, with an Arabic interface. No sign-up, no camera. The majlis and Ramadan nights.',
  },
  '/countries/morocco': {
    title: 'Talk to Strangers in Morocco - Darija & French Chat',
    description: 'Free voice and text chat with people in Morocco in Darija, French, Arabic or English. No sign-up, no camera. Mint tea, and when Morocco is online.',
  },
  '/countries/united-arab-emirates': {
    title: 'Talk to Strangers in the UAE - Dubai Voice Chat, Free',
    description: 'Free voice and text chat with people in the UAE in English, Arabic, Hindi, Urdu or Tagalog. No sign-up, no camera. Who lives in Dubai, and when it is online.',
  },
  '/countries/canada': {
    title: 'Talk to Strangers in Canada - Free Voice Chat | TalkLive',
    description: 'Free voice and text chat with people in Canada in English or French. No sign-up, no camera. Six time zones, two official languages, and when Canada is online.',
  },
  '/countries/philippines': {
    title: 'Talk to Strangers in the Philippines - Free Voice Chat',
    description: 'Free voice and text chat with people in the Philippines in Filipino, English, Taglish or Bisaya. No sign-up, no camera. Kwentuhan, and when the PH is online.',
  },
  '/countries/malaysia': {
    description: 'Free voice and text chat with people in Malaysia in Malay, English, Mandarin or Tamil. No sign-up, no camera. Mamak nights, Manglish, and peak hours.',
  },
  '/countries/south-africa': {
    title: 'Talk to Strangers in South Africa - Free Voice Chat',
  },
  '/countries/france': {
    title: 'Talk to Strangers in France - Chat Vocal Gratuit',
    description: 'Parler à des inconnus, en français ou en anglais. Free voice and text chat with people in France, no sign-up, no camera. Slang, apéro hours and openers.',
  },
  '/countries/iran': {
    title: 'Talk to Strangers in Iran - Free Persian Voice Chat',
    description: 'چت تصادفی رایگان بدون ثبت نام. Free voice and text chat with people from Iran in Persian or English. No account, no camera. Slang, best hours and safety tips.',
  },
  '/countries/italy': {
    title: 'Talk to Strangers in Italy - Chat Vocale Gratis',
    description: 'Chat con sconosciuti, gratis e senza registrazione. Free voice and text chat with people in Italy in Italian or English. Slang, aperitivo hours and openers.',
  },
  '/countries/algeria': {
    title: 'Talk to Strangers in Algeria - Tchat DZ Gratuit',
    description: 'Tchat Algérie gratuit, en darja, en français ou en arabe. Free voice and text chat with people in Algeria, no account, no camera. Darja slang and best hours.',
  },
  '/countries/singapore': {
    title: 'Talk to Strangers in Singapore - Free Voice Chat',
  },
  '/countries/australia': {
    title: 'Talk to Strangers in Australia - Free Voice Chat',
    description: 'Free random voice and text chat with people in Australia and worldwide. No account, no camera, no app. Aussie slang, the best hours to call and staying safe.',
  },
  '/countries/iraq': {
    title: 'Talk to Strangers in Iraq - Free Iraqi Voice Chat',
    description: 'دردشة عراقية مجانية. Free voice and text chat with people in Iraq in Iraqi Arabic, Kurdish or English. No account, no camera. Slang, best hours and safety.',
  },
  '/countries/netherlands': {
    title: 'Talk to Strangers in the Netherlands - Gratis Chatten',
    description: 'Chatten met vreemden, gratis en zonder account. Free voice and text chat with people in the Netherlands in Dutch or English. Slang, best hours and openers.',
  },
  '/countries/japan': {
    description: 'Free voice and text chat with people in Japan in Japanese or English. No sign-up, no camera. Phrases, aizuchi, what to talk about, and when Japan is online.',
  },

  // Journal features (scripts/journal/)
  '/regions/africa': {
    title: 'How Africa Talks: Nigeria, Kenya, Ghana, South Africa',
    description: 'The missed call that means "call me back", money sent by text, Swahili and Pidgin, and the youngest population on Earth. How Africa talks, and why voice wins.',
  },
  '/regions/americas': {
    title: 'How the Americas Share an Evening | TalkLive Journal',
    description: 'New York and São Paulo are 7,700 km and one hour apart. How the Americas share an evening, and why Brazilians understand Spanish better than the reverse.',
  },
  '/regions/europe': {
    title: 'Europe in Four Time Zones: Languages and Peak Hours',
    description: 'Spain keeps Berlin time for a reason dating to 1940, and the EU never stopped changing the clocks. How 16 European countries share one evening.',
  },
  '/regions/middle-east': {
    title: 'Middle East & North Africa: Weekends, Arabic, Ramadan',
    description: 'Saudi Arabia moved its weekend in 2013, the UAE in 2022. Arabic is one written language and many spoken ones. Why MENA talks on a different week, late at night.',
  },
  '/regions/south-asia': {
    title: 'Why South Asia Talks After Midnight | TalkLive Journal',
    description: 'One time zone across India, three scripts that are slow to type, and one spoken language split by a border. Why South Asia talks late, and out loud.',
  },
  '/regions/southeast-asia': {
    title: 'How Southeast Asia Talks: Time Zones and Languages',
    description: 'Malaysia and Singapore moved their clocks in 1982. Indonesia spans three time zones. The Philippines once led the world in texting. How the region talks.',
  },
  '/languages/': {
    title: 'Seventeen Ways to Say Hello: 17 Languages Compared',
    description: 'A research feature on the 17 languages used on TalkLive: scripts, word order, how long each takes to learn, and why speaking lags understanding.',
  },
  '/blog/': {
    title: 'The TalkLive Journal - Research on Conversation',
  },
  '/blog/why-talking-to-strangers-feels-easier': {
    title: 'Why It Is Easier to Tell a Stranger the Truth | TalkLive',
    description: 'People tell strangers on trains things they never tell their friends. A sociologist noticed this in 1908. What is going on, and where it stops working.',
  },
  '/blog/what-happened-to-omegle': {
    title: 'What Happened to Omegle? The Rise and Fall of Omegle',
    description: 'An 18-year-old built Omegle in his bedroom in 2009. It closed in November 2023, citing cost, misuse and stress. How it got there, and what it left behind.',
  },
  '/blog/science-of-talking-to-strangers': {
    title: 'The Science of Talking to Strangers: What Studies Found',
    description: 'Commuters, coffee queues and first conversations: experiments show we underestimate how much we will enjoy talking to strangers. Six studies, and their limits.',
  },
  '/blog/loneliness-what-actually-helps': {
    title: 'Loneliness: What Actually Helps, According to Research',
    description: 'You can be lonely in a full house and content on your own. What loneliness really is, why it makes people pull away, and which kinds of help work best.',
  },
  '/blog/how-random-matchmaking-works': {
    title: 'How Random Chat Matchmaking Works: Queues and WebRTC',
    description: 'A plain-English tour of a random voice match: the waiting queue, why filters make you wait, the browser handshake, and the relay that carries audio when needed.',
  },
  '/blog/how-to-be-a-good-listener': {
    title: 'How to Be a Good Listener: Ten Questions, Answered',
    description: 'Why we interrupt, the "shift response" that quietly steals conversations, and the one listening habit research says makes people like you more.',
  },
  '/blog/phone-anxiety-how-to-get-comfortable-talking': {
    title: 'Phone Anxiety: Why Calls Feel Hard and How to Cope',
    description: 'Why phone calls are genuinely harder than texting, the habit that keeps phone anxiety alive, and a step-by-step ladder to get comfortable talking again.',
  },
  '/blog/how-to-practise-a-language-by-speaking': {
    title: 'How to Practise a Language by Speaking | TalkLive',
    description: 'Most learners understand far more than they can say. Why speaking is its own skill, the fear that blocks it, and a four-week routine to close the output gap.',
  },
  '/blog/how-to-spot-a-bot-or-scam-in-random-chat': {
    title: 'How to Spot a Bot or Scam in Random Chat | TalkLive',
    description: 'Romance-to-crypto schemes, image blackmail, the "send me the code" trick and bots. Seven common chat scams, how to recognise each, and the rule that beats them.',
  },
  '/blog/what-to-talk-about-with-a-stranger': {
    title: 'What to Talk About With a Stranger: 30 Questions',
    description: 'In 1997 a psychologist made strangers feel close in 45 minutes with a list of questions. Why "what do you do?" stalls, and 30 better questions in three tiers.',
  },
  '/blog/why-am-i-so-bored': {
    title: 'Why Am I So Bored? The Psychology of Boredom',
    description: 'People chose electric shocks over fifteen minutes alone with their thoughts. What boredom really is, why scrolling rarely fixes it, and what does help.',
  },
  '/blog/how-to-end-a-conversation': {
    title: 'How to End a Conversation Politely, Without Being Rude',
    description: 'Almost no conversation ends when both people want it to. What research says about good goodbyes, and exact words to end a chat in person, on a call or online.',
  },
  '/blog/introvert-guide-to-talking-to-strangers': {
    title: "The Introvert's Guide to Talking to Strangers | TalkLive",
    description: 'Introverts enjoy talking to strangers more than they predict, and pay for it later. What research on acting extraverted shows, and a gentle way to start.',
  },
  '/blog/small-talk-around-the-world': {
    title: 'Small Talk Around the World: What to Say in 12 Countries',
    description: 'Why "Have you eaten?" means hello in China, why Finns are fine with silence, and why Koreans ask your age. Greetings, safe openers and topics in 12 countries.',
  },
  '/blog/why-a-call-beats-texting': {
    title: 'Calling vs Texting: Why a Voice Builds Connection',
    description: 'We text because we expect calls to be awkward. Experiments say we are wrong: a voice builds more connection and carries tone that text loses.',
  },
  '/blog/lonely-after-moving-abroad': {
    title: 'Lonely After Moving Abroad? Culture Shock and What Helps',
    description: 'Loneliness is one of the most common things people who move abroad share. The shape of culture shock, two kinds of loneliness, and a plan for the first months.',
  },
  '/blog/why-we-dont-give-compliments': {
    title: 'Why We Hold Back Compliments, and Why We Shouldn’t',
    description: 'You notice something good about someone and say nothing. Experiments show we badly underestimate how much compliments land, and why that keeps us quiet.',
  },
  '/blog/spotlight-effect-nobody-noticed': {
    title: 'The Spotlight Effect: You Look Less Awkward Than You Feel',
    description: 'You stumble over a word on a call and feel it for an hour. Experiments show others notice our slips, nerves and accents far less than we think.',
  },
  '/blog/why-we-laugh-in-conversation': {
    title: 'Why We Laugh in Conversation, According to Research',
    description: 'Most laughter does not follow anything funny. Studies show we laugh to connect, speakers laugh more than listeners, and anyone can hear friendship in a laugh.',
  },
  '/blog/how-many-hours-to-make-a-friend': {
    title: 'How Many Hours Does It Take to Make a Friend? | TalkLive',
    description: 'About 50 hours makes a casual friend, 90 a friend and over 200 a close friend, according to Jeffrey Hall. What counts, and how adults can make friends faster.',
  },
};

// The title and description a page shows in search results: its entry here
// when it has one, otherwise the page's own fields.
function snippet(path, title, description) {
  const s = SNIPPETS[path] || {};
  return { title: s.title || title, description: s.description || description };
}

module.exports = { SNIPPETS, snippet };
