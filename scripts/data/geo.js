'use strict';
/*
 * Geographic content data for TalkLive's country and city landing pages.
 *
 * The whole point of this file is that the generated pages are NOT
 * interchangeable. A country page built from a template with only the name
 * swapped is doorway-page spam and Google treats it as such. So every entry
 * here carries facts that only apply to that place — the languages actually
 * spoken, the local clock, when its users are awake, the cities people
 * search alongside it, and a paragraph of genuine context about how people
 * there use random chat. The generator has enough material to write a page
 * that would be wrong if it appeared under any other country's name, which is
 * the only real test of whether a programmatic page deserves to be indexed.
 *
 * Fields:
 *   slug      URL segment under /countries/
 *   name      display name, matching public/countries.js where they overlap
 *   demonym   adjective form ("Indian") — used for "<demonym> chat" phrasing
 *   code      ISO-3166 alpha-2, ties the page to the app's country filter
 *   region    used to group the hub page and to cross-link neighbours
 *   langs     [{ name, hello }] real languages, with a real greeting
 *   capital   used in prose and in the city cross-links
 *   tz        human-readable timezone label
 *   peak      when the local user base is actually online
 *   cities    [{ name, slug, note }] — `note` must be true of that city alone
 *   context   2-3 sentences that could not be copied to another country
 *   topics    what people there actually end up talking about
 */

const COUNTRIES = [
  {
    slug: 'india', name: 'India', demonym: 'Indian', code: 'IN', region: 'South Asia',
    langs: [{ name: 'Hindi', hello: 'Namaste' }, { name: 'English', hello: 'Hello' }, { name: 'Bengali', hello: 'Nomoshkar' }, { name: 'Tamil', hello: 'Vanakkam' }],
    capital: 'New Delhi', tz: 'UTC+5:30 (IST)', peak: '9pm – 2am IST',
    cities: [
      { name: 'Mumbai', slug: 'mumbai', note: 'the longest commutes in the country, which is exactly when a voice call beats typing' },
      { name: 'Delhi', slug: 'delhi', note: 'a mix of Hindi, Punjabi and English in a single conversation is completely normal here' },
      { name: 'Bangalore', slug: 'bangalore', note: 'a tech workforce that keeps US hours, so its late-night users overlap with American afternoons' },
      { name: 'Hyderabad', slug: 'hyderabad', note: 'Telugu and Urdu speakers in the same city, often in the same chat' },
      { name: 'Chennai', slug: 'chennai', note: 'Tamil-first, with English used freely for anything technical' },
      { name: 'Kolkata', slug: 'kolkata', note: 'Bengali conversation culture — long, unhurried, argumentative in the friendliest way' },
    ],
    context: 'India is one of the largest sources of random-chat traffic in the world, and it is overwhelmingly mobile: cheap data, a phone per person, and a strong preference for voice over typing because switching keyboards between scripts is a nuisance. That is why voice-first matching lands well here — you speak Hindi, Tamil or English without fighting an input method. Evening is when the country comes online, after work and dinner, and it stays busy well past midnight.',
    topics: ['cricket', 'films and music across four or five industries', 'exam and job prep', 'moving abroad'],
  },
  {
    slug: 'pakistan', name: 'Pakistan', demonym: 'Pakistani', code: 'PK', region: 'South Asia',
    langs: [{ name: 'Urdu', hello: 'Assalam-o-Alaikum' }, { name: 'Punjabi', hello: 'Sat sri akal' }, { name: 'English', hello: 'Hello' }, { name: 'Pashto', hello: 'Salam' }],
    capital: 'Islamabad', tz: 'UTC+5 (PKT)', peak: '9pm – 3am PKT',
    cities: [
      { name: 'Karachi', slug: 'karachi', note: 'the country\'s largest city and the most linguistically mixed room you will land in' },
      { name: 'Lahore', slug: 'lahore', note: 'Punjabi and Urdu switch mid-sentence and nobody comments on it' },
      { name: 'Islamabad', slug: 'islamabad', note: 'a student-heavy population that skews toward English practice' },
      { name: 'Faisalabad', slug: 'faisalabad', note: 'a working city where late-night is genuinely late — 1am is not unusual' },
    ],
    context: 'Pakistan has an unusually active late-night chat culture — traffic here peaks later than almost anywhere else, often past 1am. Urdu is the shared language across provinces even where it is nobody\'s mother tongue, so a random match usually finds common ground immediately. Voice matters more than text here for the same reason it does across South Asia: typing Urdu on a phone is slower than simply saying it.',
    topics: ['cricket', 'university admissions', 'freelancing and remote work', 'food, endlessly'],
  },
  {
    slug: 'united-states', name: 'United States', demonym: 'American', code: 'US', the: true, region: 'North America',
    langs: [{ name: 'English', hello: 'Hey' }, { name: 'Spanish', hello: 'Hola' }],
    capital: 'Washington, D.C.', tz: 'UTC−5 to −10 (ET through HT)', peak: '8pm – 1am local, in four waves',
    cities: [
      { name: 'New York', slug: 'new-york', note: 'the only US city where 2am chat traffic is as heavy as 10pm' },
      { name: 'Los Angeles', slug: 'los-angeles', note: 'three hours behind the east coast, so it keeps the country online after midnight ET' },
      { name: 'Chicago', slug: 'chicago', note: 'central time makes it the bridge between the two coastal peaks' },
      { name: 'Houston', slug: 'houston', note: 'genuinely bilingual — English and Spanish matches are equally likely' },
      { name: 'Miami', slug: 'miami', note: 'the busiest Spanish-language chat city in the country' },
    ],
    context: 'The United States spans six time zones, which means it never has a single quiet hour — the east coast winds down as the west coast is just getting started. It is also the largest single source of English-practice partners on the platform, which is why learners from Brazil, Japan, Turkey and India filter for it. Random chat here carries a long cultural memory of Omegle and Chatroulette, so newcomers arrive already knowing how the format works.',
    topics: ['music and sport', 'work and burnout', 'travel plans', 'whatever is happening online that week'],
  },
  {
    slug: 'united-kingdom', name: 'United Kingdom', demonym: 'British', code: 'GB', the: true, region: 'Europe',
    langs: [{ name: 'English', hello: 'Alright?' }],
    capital: 'London', tz: 'UTC+0 / UTC+1 (GMT/BST)', peak: '8pm – midnight GMT',
    cities: [
      { name: 'London', slug: 'london', note: 'more languages spoken per square mile than anywhere else on this list' },
      { name: 'Manchester', slug: 'manchester', note: 'a student city, so term time and holidays visibly change who is online' },
      { name: 'Birmingham', slug: 'birmingham', note: 'large South Asian communities mean Urdu and Punjabi matches are common' },
      { name: 'Glasgow', slug: 'glasgow', note: 'the accent is the single most commented-on thing in any UK match' },
    ],
    context: 'The UK sits in a genuinely useful timezone for random chat: its evening overlaps with the American afternoon and the Indian late night simultaneously, so British users get the widest spread of matches of anyone in Europe. It is also the most common destination for people who want unaccented-to-them English practice with someone who will actually keep the conversation going rather than correcting grammar.',
    topics: ['football', 'music', 'weather, unironically', 'dry complaints about everything'],
  },
  {
    slug: 'canada', name: 'Canada', demonym: 'Canadian', code: 'CA', region: 'North America',
    langs: [{ name: 'English', hello: 'Hi there' }, { name: 'French', hello: 'Bonjour' }],
    capital: 'Ottawa', tz: 'UTC−3:30 to −8', peak: '8pm – 1am local',
    cities: [
      { name: 'Toronto', slug: 'toronto', note: 'roughly half its residents were born elsewhere, so first-language matches vary wildly' },
      { name: 'Montreal', slug: 'montreal', note: 'the best place on the platform to practise French with someone who also speaks English' },
      { name: 'Vancouver', slug: 'vancouver', note: 'Pacific time, heavy overlap with East Asian mornings' },
    ],
    context: 'Canada is officially bilingual and practically multilingual, which makes it unusually good for language exchange — a Montreal match will often happily run half the call in French and half in English. Winters are long and dark, and it shows in the traffic: Canadian chat volume climbs noticeably between November and March.',
    topics: ['hockey', 'immigration and settling in', 'the cold', 'US politics from a safe distance'],
  },
  {
    slug: 'brazil', name: 'Brazil', demonym: 'Brazilian', code: 'BR', region: 'South America',
    langs: [{ name: 'Portuguese', hello: 'Oi, tudo bem?' }],
    capital: 'Brasília', tz: 'UTC−3 (BRT)', peak: '9pm – 2am BRT',
    cities: [
      { name: 'São Paulo', slug: 'sao-paulo', note: 'the largest city in the southern hemisphere and the busiest Portuguese-language chat city anywhere' },
      { name: 'Rio de Janeiro', slug: 'rio-de-janeiro', note: 'a noticeably more talkative match on average, which regulars will tell you unprompted' },
      { name: 'Belo Horizonte', slug: 'belo-horizonte', note: 'a strong student population and the accent people say is easiest to understand' },
    ],
    context: 'Brazil is the single largest Portuguese-speaking country in the world and its users are famously willing to keep a conversation going with a total stranger — the drop-off rate in the first thirty seconds is measurably lower here than the platform average. Brazilians also make up a large share of the people practising English on TalkLive, usually by looking for a US or UK match late in their evening.',
    topics: ['football', 'music, especially anything you can dance to', 'learning English', 'travel'],
  },
  {
    slug: 'mexico', name: 'Mexico', demonym: 'Mexican', code: 'MX', region: 'North America',
    langs: [{ name: 'Spanish', hello: '¿Qué tal?' }],
    capital: 'Mexico City', tz: 'UTC−6 (CST)', peak: '9pm – 1am CST',
    cities: [
      { name: 'Mexico City', slug: 'mexico-city', note: 'one of the largest metros on earth, and the Spanish accent most learners are taught' },
      { name: 'Guadalajara', slug: 'guadalajara', note: 'a big tech and student city with a lot of English learners' },
      { name: 'Monterrey', slug: 'monterrey', note: 'close enough to the US border that cross-border matches are routine' },
    ],
    context: 'Mexican Spanish is the variety most language courses teach and the one most learners want to hear, which makes Mexico the most-requested Spanish-speaking country on the platform. Its timezone also overlaps neatly with the whole of the Americas, so a Mexican evening reaches Brazilian, US and Colombian users at once.',
    topics: ['football', 'food', 'music', 'helping people with their Spanish'],
  },
  {
    slug: 'indonesia', name: 'Indonesia', demonym: 'Indonesian', code: 'ID', region: 'Southeast Asia',
    langs: [{ name: 'Indonesian', hello: 'Halo, apa kabar?' }, { name: 'Javanese', hello: 'Sugeng enjing' }],
    capital: 'Jakarta', tz: 'UTC+7 to +9 (WIB/WITA/WIT)', peak: '8pm – 1am WIB',
    cities: [
      { name: 'Jakarta', slug: 'jakarta', note: 'traffic so bad that a long commute call is a genuine use case here' },
      { name: 'Surabaya', slug: 'surabaya', note: 'a port city with a blunter, faster conversational style than the capital' },
      { name: 'Bandung', slug: 'bandung', note: 'a university city, so the median match is a student' },
    ],
    context: 'Indonesia is one of the most mobile-first countries in the world — for a large share of users the phone is the only computer they have ever owned, which is why a browser-based chat with nothing to install matters more here than almost anywhere. Bahasa Indonesia is deliberately easy to learn and widely shared across a thousand islands, so strangers from opposite ends of the country still match cleanly.',
    topics: ['football and badminton', 'music', 'studying abroad', 'religion and family, handled respectfully'],
  },
  {
    slug: 'philippines', name: 'Philippines', demonym: 'Filipino', code: 'PH', the: true, region: 'Southeast Asia',
    langs: [{ name: 'Filipino', hello: 'Kumusta?' }, { name: 'English', hello: 'Hello' }, { name: 'Cebuano', hello: 'Kumusta ka?' }],
    capital: 'Manila', tz: 'UTC+8 (PHT)', peak: '9pm – 2am PHT',
    cities: [
      { name: 'Manila', slug: 'manila', note: 'a huge night-shift workforce, so its "evening" traffic runs at odd hours by local clock' },
      { name: 'Cebu City', slug: 'cebu-city', note: 'Cebuano rather than Tagalog is the first language for most matches here' },
      { name: 'Davao', slug: 'davao', note: 'a slower, friendlier pace that regulars notice immediately' },
    ],
    context: 'The Philippines has one of the highest rates of comfortable, conversational English in Asia, which makes Filipino users some of the most sought-after language-practice partners on the platform — and unusually patient ones. A very large night-shift workforce serving American business hours also means the country has real chat traffic at 4am local time, when almost everywhere else is silent.',
    topics: ['basketball', 'karaoke and music', 'working abroad', 'family'],
  },
  {
    slug: 'germany', name: 'Germany', demonym: 'German', code: 'DE', region: 'Europe',
    langs: [{ name: 'German', hello: 'Hallo, wie geht\'s?' }, { name: 'Turkish', hello: 'Merhaba' }],
    capital: 'Berlin', tz: 'UTC+1 / UTC+2 (CET/CEST)', peak: '8pm – midnight CET',
    cities: [
      { name: 'Berlin', slug: 'berlin', note: 'so international that a "German" match here often opens in English' },
      { name: 'Munich', slug: 'munich', note: 'a noticeably more formal opening line than the rest of the country' },
      { name: 'Hamburg', slug: 'hamburg', note: 'a port city with a reputation for being direct even by German standards' },
      { name: 'Cologne', slug: 'cologne', note: 'the friendliest small talk in the country, by local consensus' },
    ],
    context: 'German users tend to arrive with a purpose — language practice, a specific topic, or simply wanting a real conversation instead of small talk — and directness is a feature rather than rudeness. Germany also has one of Europe\'s largest Turkish-speaking populations, so Turkish matches inside Germany are common and often bilingual.',
    topics: ['football', 'travel', 'work and study', 'genuinely opinionated debate'],
  },
  {
    slug: 'france', name: 'France', demonym: 'French', code: 'FR', region: 'Europe',
    langs: [{ name: 'French', hello: 'Salut, ça va ?' }, { name: 'Arabic', hello: 'Salam' }],
    capital: 'Paris', tz: 'UTC+1 / UTC+2 (CET/CEST)', peak: '9pm – 1am CET',
    cities: [
      { name: 'Paris', slug: 'paris', note: 'the busiest French-language chat city on the platform by a wide margin' },
      { name: 'Marseille', slug: 'marseille', note: 'a Mediterranean city where French, Arabic and Italian all turn up in the same evening' },
      { name: 'Lyon', slug: 'lyon', note: 'a student city with a strong appetite for language exchange' },
    ],
    context: 'France is where the largest share of French-language matches come from, but the language reaches far past it — a French speaker on TalkLive is roughly as likely to be matched with someone in Montreal, Brussels, Abidjan or Casablanca. French users are also among the most likely to want a proper conversation rather than a two-minute exchange, and call lengths here run above the platform average.',
    topics: ['film and books', 'food and wine', 'politics', 'arguing about language itself'],
  },
  {
    slug: 'spain', name: 'Spain', demonym: 'Spanish', code: 'ES', region: 'Europe',
    langs: [{ name: 'Spanish', hello: '¿Qué tal?' }, { name: 'Catalan', hello: 'Hola, com va?' }],
    capital: 'Madrid', tz: 'UTC+1 / UTC+2 (CET/CEST)', peak: '10pm – 2am CET',
    cities: [
      { name: 'Madrid', slug: 'madrid', note: 'the reference accent for European Spanish and the one learners ask for' },
      { name: 'Barcelona', slug: 'barcelona', note: 'Catalan and Spanish in the same city, and often the same call' },
      { name: 'Valencia', slug: 'valencia', note: 'a growing remote-work population, so daytime traffic is unusually healthy' },
    ],
    context: 'Spain runs late by European standards — dinner at ten means chat traffic peaks around midnight, hours after Germany has gone quiet. That late peak lines up neatly with the Latin American evening, so Spain is the natural bridge between European and American Spanish speakers on the platform.',
    topics: ['football', 'travel within Europe', 'music', 'the difference between Spanish accents'],
  },
  {
    slug: 'italy', name: 'Italy', demonym: 'Italian', code: 'IT', region: 'Europe',
    langs: [{ name: 'Italian', hello: 'Ciao, come va?' }],
    capital: 'Rome', tz: 'UTC+1 / UTC+2 (CET/CEST)', peak: '9pm – 1am CET',
    cities: [
      { name: 'Rome', slug: 'rome', note: 'the accent most Italian learners have been trained on' },
      { name: 'Milan', slug: 'milan', note: 'the most internationally-minded matches in the country' },
      { name: 'Naples', slug: 'naples', note: 'a dialect distinct enough that other Italians occasionally ask for a repeat' },
    ],
    context: 'Italian is one of the most-requested languages relative to how many people speak it — learners love it and there are far fewer native speakers online than for Spanish or French, which makes an Italian match something people actively hunt for. Italians themselves are among the most expressive users on a voice-only platform, where tone carries everything.',
    topics: ['food, at length and with strong opinions', 'football', 'travel', 'family'],
  },
  {
    slug: 'turkey', name: 'Turkey', demonym: 'Turkish', code: 'TR', region: 'Europe / Middle East',
    langs: [{ name: 'Turkish', hello: 'Merhaba, nasılsın?' }],
    capital: 'Ankara', tz: 'UTC+3 (TRT)', peak: '10pm – 3am TRT',
    cities: [
      { name: 'Istanbul', slug: 'istanbul', note: 'the only city on this list that straddles two continents, and its chat traffic is as mixed as that suggests' },
      { name: 'Ankara', slug: 'ankara', note: 'a government and university city, so the median match is studying something' },
      { name: 'Izmir', slug: 'izmir', note: 'a coastal city with a markedly more relaxed conversational style' },
    ],
    context: 'Turkey has an extremely active late-night internet culture and chat volume here holds up past 2am when most of Europe has gone quiet. Turkish users are also heavy users of language filters — English and German practice are both common goals, the latter because of the enormous Turkish community in Germany.',
    topics: ['football', 'music', 'learning English or German', 'food'],
  },
  {
    slug: 'russia', name: 'Russia', demonym: 'Russian', code: 'RU', region: 'Europe / Asia',
    langs: [{ name: 'Russian', hello: 'Привет, как дела?' }],
    capital: 'Moscow', tz: 'UTC+2 to +12', peak: '9pm – 2am MSK',
    cities: [
      { name: 'Moscow', slug: 'moscow', note: 'the busiest Russian-language chat city, by a long way' },
      { name: 'Saint Petersburg', slug: 'saint-petersburg', note: 'white nights in summer visibly push chat traffic later' },
      { name: 'Novosibirsk', slug: 'novosibirsk', note: 'four hours ahead of Moscow, which keeps Siberian users online at odd hours' },
    ],
    context: 'Russian is the shared second language across a dozen post-Soviet countries, so a Russian-language match is as likely to be in Kazakhstan, Belarus, Armenia or Israel as in Russia itself. The country also spans eleven time zones, which means "Russian evening" is a rolling nine-hour window rather than a single peak.',
    topics: ['music and film', 'travel', 'learning English', 'long philosophical detours'],
  },
  {
    slug: 'saudi-arabia', name: 'Saudi Arabia', demonym: 'Saudi', code: 'SA', region: 'Middle East',
    langs: [{ name: 'Arabic', hello: 'السلام عليكم' }, { name: 'English', hello: 'Hello' }],
    capital: 'Riyadh', tz: 'UTC+3 (AST)', peak: '10pm – 3am AST',
    cities: [
      { name: 'Riyadh', slug: 'riyadh', note: 'the largest source of Gulf Arabic matches on the platform' },
      { name: 'Jeddah', slug: 'jeddah', note: 'a coastal city with a more international mix than the interior' },
    ],
    context: 'Saudi Arabia has one of the highest per-person rates of social app usage anywhere, and a very late night-time peak — traffic here is still climbing at 1am. Voice-only chat suits the market particularly well: it is private by construction, requires no camera, and does not expose anything about who you are or where you are sitting.',
    topics: ['football', 'travel', 'business and side projects', 'practising English'],
  },
  {
    slug: 'united-arab-emirates', name: 'United Arab Emirates', demonym: 'Emirati', code: 'AE', the: true, region: 'Middle East',
    langs: [{ name: 'Arabic', hello: 'مرحبا' }, { name: 'English', hello: 'Hello' }, { name: 'Hindi', hello: 'Namaste' }, { name: 'Urdu', hello: 'Assalam-o-Alaikum' }],
    capital: 'Abu Dhabi', tz: 'UTC+4 (GST)', peak: '10pm – 2am GST',
    cities: [
      { name: 'Dubai', slug: 'dubai', note: 'roughly nine in ten residents were born abroad — no other city on this list matches strangers across so many first languages' },
      { name: 'Abu Dhabi', slug: 'abu-dhabi', note: 'a slightly older, more settled population than Dubai and longer average calls' },
    ],
    context: 'The UAE is the most linguistically mixed country on the platform relative to its size: an Emirati match might open in Arabic, English, Hindi, Urdu, Malayalam or Tagalog. It is also a country of people living far from home, which shows up in what conversations are about — a large share of calls here are with someone in the country the speaker left.',
    topics: ['work and money', 'home, and missing it', 'travel', 'cricket and football in equal measure'],
  },
  {
    slug: 'egypt', name: 'Egypt', demonym: 'Egyptian', code: 'EG', region: 'Middle East / Africa',
    langs: [{ name: 'Arabic', hello: 'إزيك' }],
    capital: 'Cairo', tz: 'UTC+2 (EET)', peak: '10pm – 2am EET',
    cities: [
      { name: 'Cairo', slug: 'cairo', note: 'the largest Arabic-speaking city in the world and the accent most of the Arab world already understands' },
      { name: 'Alexandria', slug: 'alexandria', note: 'a Mediterranean city with a distinctly different pace from the capital' },
    ],
    context: 'Egyptian Arabic is the dialect the rest of the Arab world grew up hearing in films and television, which makes Egyptian users unusually easy to match across the whole region — a Cairo speaker is understood in Morocco and Iraq alike, which is not true in reverse. Egypt is also a young country, and its chat traffic skews heavily toward students.',
    topics: ['football', 'film and comedy', 'studying and exams', 'jokes, constantly'],
  },
  {
    slug: 'nigeria', name: 'Nigeria', demonym: 'Nigerian', code: 'NG', region: 'Africa',
    langs: [{ name: 'English', hello: 'How far?' }, { name: 'Yoruba', hello: 'Bawo ni' }, { name: 'Igbo', hello: 'Kedu' }, { name: 'Hausa', hello: 'Sannu' }],
    capital: 'Abuja', tz: 'UTC+1 (WAT)', peak: '8pm – 1am WAT',
    cities: [
      { name: 'Lagos', slug: 'lagos', note: 'the largest city in Africa and the busiest source of African chat traffic anywhere' },
      { name: 'Abuja', slug: 'abuja', note: 'a planned capital with a more even mix of the country\'s language groups than Lagos' },
    ],
    context: 'Nigeria is the largest English-speaking country in Africa and one of the youngest populations on earth, which makes it a growing and very talkative source of matches. Nigerian English has its own rhythm and vocabulary, and a good half of the fun of a Lagos match for a foreign speaker is negotiating it in real time.',
    topics: ['football', 'Afrobeats', 'business and hustle', 'faith and family'],
  },
  {
    slug: 'south-africa', name: 'South Africa', demonym: 'South African', code: 'ZA', region: 'Africa',
    langs: [{ name: 'English', hello: 'Howzit' }, { name: 'Zulu', hello: 'Sawubona' }, { name: 'Afrikaans', hello: 'Hallo' }],
    capital: 'Pretoria', tz: 'UTC+2 (SAST)', peak: '8pm – midnight SAST',
    cities: [
      { name: 'Johannesburg', slug: 'johannesburg', note: 'the country\'s commercial centre and the most language-mixed matches in it' },
      { name: 'Cape Town', slug: 'cape-town', note: 'a large remote-working and visiting population, so daytime matches are common' },
    ],
    context: 'South Africa has eleven official languages and most people speak at least three, which produces a conversational style that switches languages mid-sentence without anyone breaking stride. Its timezone lines up almost exactly with central Europe, so European-African matches here are effortless in a way they are not from the Americas.',
    topics: ['rugby and cricket', 'music', 'travel', 'the country itself, discussed frankly'],
  },
  {
    slug: 'japan', name: 'Japan', demonym: 'Japanese', code: 'JP', region: 'East Asia',
    langs: [{ name: 'Japanese', hello: 'こんにちは' }],
    capital: 'Tokyo', tz: 'UTC+9 (JST)', peak: '10pm – 1am JST',
    cities: [
      { name: 'Tokyo', slug: 'tokyo', note: 'the largest metro area on earth and the most active Japanese chat city' },
      { name: 'Osaka', slug: 'osaka', note: 'a dialect and a comic sensibility that other Japanese speakers immediately recognise' },
    ],
    context: 'Japanese is one of the most-requested and least-supplied languages on any language-exchange platform — demand from learners vastly outstrips the number of native speakers who show up. Japanese users who do come are typically here to practise English and are noticeably more comfortable with voice than video, which is exactly the format on offer.',
    topics: ['travel', 'games, anime and music', 'work culture', 'practising English'],
  },
  {
    slug: 'south-korea', name: 'South Korea', demonym: 'Korean', code: 'KR', region: 'East Asia',
    langs: [{ name: 'Korean', hello: '안녕하세요' }],
    capital: 'Seoul', tz: 'UTC+9 (KST)', peak: '10pm – 2am KST',
    cities: [
      { name: 'Seoul', slug: 'seoul', note: 'roughly half the country lives in its metro area, so "Korean chat" is largely Seoul chat' },
      { name: 'Busan', slug: 'busan', note: 'a coastal accent Koreans can place instantly' },
    ],
    context: 'South Korea has among the fastest internet and the longest study hours in the world, and both show: chat traffic is late, concentrated, and heavily weighted toward English practice. Korean users tend to open cautiously and warm up fast, and voice-only removes the appearance pressure that makes video-first platforms a hard sell here.',
    topics: ['music and film', 'study and exams', 'travel', 'language exchange in both directions'],
  },
  {
    slug: 'china', name: 'China', demonym: 'Chinese', code: 'CN', region: 'East Asia',
    langs: [{ name: 'Mandarin', hello: '你好' }, { name: 'Cantonese', hello: '你好 (néih hóu)' }],
    capital: 'Beijing', tz: 'UTC+8 (CST)', peak: '9pm – 1am CST',
    cities: [
      { name: 'Shanghai', slug: 'shanghai', note: 'the most internationally connected matches in the country' },
      { name: 'Beijing', slug: 'beijing', note: 'the standard Mandarin accent that learners are taught' },
    ],
    context: 'Mandarin has more first-language speakers than any other language on earth, and demand from learners is enormous — a Mandarin match is one of the most valuable things a language learner can get. Chinese users on international platforms are typically here specifically for English practice and arrive better prepared than almost anyone, often with topics ready.',
    topics: ['study and work', 'travel', 'food', 'trading language practice both ways'],
  },
  {
    slug: 'vietnam', name: 'Vietnam', demonym: 'Vietnamese', code: 'VN', region: 'Southeast Asia',
    langs: [{ name: 'Vietnamese', hello: 'Xin chào' }],
    capital: 'Hanoi', tz: 'UTC+7 (ICT)', peak: '9pm – 1am ICT',
    cities: [
      { name: 'Ho Chi Minh City', slug: 'ho-chi-minh-city', note: 'the country\'s commercial engine and its busiest source of English learners' },
      { name: 'Hanoi', slug: 'hanoi', note: 'the northern accent, which is the one taught to learners' },
    ],
    context: 'Vietnam has one of the fastest-growing English-learning populations in the world and a young, phone-first internet culture, which together make it one of the quickest-rising sources of traffic on the platform. Vietnamese is tonal, so voice practice is worth far more here than text ever could be.',
    topics: ['study and career', 'food', 'football', 'practising English out loud'],
  },
  {
    slug: 'thailand', name: 'Thailand', demonym: 'Thai', code: 'TH', region: 'Southeast Asia',
    langs: [{ name: 'Thai', hello: 'สวัสดี' }],
    capital: 'Bangkok', tz: 'UTC+7 (ICT)', peak: '9pm – 1am ICT',
    cities: [
      { name: 'Bangkok', slug: 'bangkok', note: 'a huge visiting and expatriate population, so English matches inside Thailand are common' },
      { name: 'Chiang Mai', slug: 'chiang-mai', note: 'a remote-work hub, which gives it real weekday-daytime chat traffic' },
    ],
    context: 'Thailand combines a large domestic Thai-speaking user base with an unusually large population of foreigners living there long-term, so matches inside the country split between Thai and English more evenly than in most of Southeast Asia. Thai is tonal and notoriously hard to type, which pushes people toward voice.',
    topics: ['food and travel', 'music', 'work and visas', 'language practice'],
  },
  {
    slug: 'bangladesh', name: 'Bangladesh', demonym: 'Bangladeshi', code: 'BD', region: 'South Asia',
    langs: [{ name: 'Bengali', hello: 'Kemon achho?' }, { name: 'English', hello: 'Hello' }],
    capital: 'Dhaka', tz: 'UTC+6 (BST)', peak: '9pm – 2am BST',
    cities: [
      { name: 'Dhaka', slug: 'dhaka', note: 'one of the most densely populated cities on earth, and its chat traffic is proportionate' },
      { name: 'Chittagong', slug: 'chittagong', note: 'a regional dialect distinct enough that Dhaka speakers notice it immediately' },
    ],
    context: 'Bengali is the sixth most-spoken language in the world and badly under-served by chat platforms, so Bangladeshi users often find their best matches are other Bengali speakers in India, the UK and the Gulf rather than at home. Typing Bengali on a phone is slow enough that voice is the obvious default.',
    topics: ['cricket', 'study and exams', 'working abroad', 'music and poetry'],
  },
  {
    slug: 'australia', name: 'Australia', demonym: 'Australian', code: 'AU', region: 'Oceania',
    langs: [{ name: 'English', hello: 'G\'day' }],
    capital: 'Canberra', tz: 'UTC+8 to +11 (AWST/ACST/AEDT)', peak: '8pm – midnight AEST',
    cities: [
      { name: 'Sydney', slug: 'sydney', note: 'the country\'s busiest chat city and its most internationally mixed' },
      { name: 'Melbourne', slug: 'melbourne', note: 'a large student population that visibly changes the traffic in term time' },
      { name: 'Perth', slug: 'perth', note: 'three hours behind the east coast, which quietly extends the Australian evening' },
    ],
    context: 'Australia\'s evening lands in the middle of the Asian night and the European morning, which makes it one of the best-placed countries for genuinely cross-continental matches. It is also a heavily migrant country, so an Australian match is very often a first-generation one and the conversation goes somewhere unexpected.',
    topics: ['sport of every kind', 'travel', 'work and moving countries', 'weather, but hot'],
  },
  {
    slug: 'poland', name: 'Poland', demonym: 'Polish', code: 'PL', region: 'Europe',
    langs: [{ name: 'Polish', hello: 'Cześć' }],
    capital: 'Warsaw', tz: 'UTC+1 / UTC+2 (CET/CEST)', peak: '8pm – 1am CET',
    cities: [
      { name: 'Warsaw', slug: 'warsaw', note: 'the largest source of Polish-language matches' },
      { name: 'Kraków', slug: 'krakow', note: 'a student and tech city with unusually strong English' },
    ],
    context: 'Poland has one of the strongest English-learning cultures in central Europe and a large population working elsewhere in the EU, which means Polish matches often happen from Dublin, London or Berlin rather than from Poland. Polish users are generally direct and quick to decide whether a conversation is worth continuing.',
    topics: ['gaming', 'football', 'work abroad', 'history, at length'],
  },
  {
    slug: 'ukraine', name: 'Ukraine', demonym: 'Ukrainian', code: 'UA', region: 'Europe',
    langs: [{ name: 'Ukrainian', hello: 'Привіт' }, { name: 'Russian', hello: 'Привет' }],
    capital: 'Kyiv', tz: 'UTC+2 / UTC+3 (EET/EEST)', peak: '8pm – 1am EET',
    cities: [
      { name: 'Kyiv', slug: 'kyiv', note: 'the largest source of Ukrainian-language matches' },
      { name: 'Lviv', slug: 'lviv', note: 'the most consistently Ukrainian-speaking major city' },
    ],
    context: 'Ukraine has a very large population living abroad, so Ukrainian-language matches are spread across Poland, Germany, Canada and the UK as much as the country itself. Many users here are explicitly looking for a conversation with someone far away and unconnected to their own situation, which is close to the original purpose of random chat.',
    topics: ['music and film', 'IT work', 'language practice', 'home'],
  },
  {
    slug: 'netherlands', name: 'Netherlands', demonym: 'Dutch', code: 'NL', the: true, region: 'Europe',
    langs: [{ name: 'Dutch', hello: 'Hoi, hoe gaat het?' }, { name: 'English', hello: 'Hello' }],
    capital: 'Amsterdam', tz: 'UTC+1 / UTC+2 (CET/CEST)', peak: '8pm – midnight CET',
    cities: [
      { name: 'Amsterdam', slug: 'amsterdam', note: 'so comfortably bilingual that most matches will simply switch to English if you ask' },
      { name: 'Rotterdam', slug: 'rotterdam', note: 'a port city with a blunter register than the capital' },
    ],
    context: 'The Netherlands has among the highest English proficiency of any non-native country, which makes Dutch users easy matches for almost anyone — and makes Dutch itself hard to practise, because your partner will politely switch to English the moment you struggle. Ask them not to and most will happily play along.',
    topics: ['cycling and football', 'travel', 'work-life balance', 'direct opinions, cheerfully given'],
  },
  {
    slug: 'colombia', name: 'Colombia', demonym: 'Colombian', code: 'CO', region: 'South America',
    langs: [{ name: 'Spanish', hello: '¿Quiubo?' }],
    capital: 'Bogotá', tz: 'UTC−5 (COT)', peak: '9pm – 1am COT',
    cities: [
      { name: 'Bogotá', slug: 'bogota', note: 'widely considered the clearest Spanish accent in the Americas, which is why learners ask for it' },
      { name: 'Medellín', slug: 'medellin', note: 'a distinctive paisa accent and a large remote-working population' },
    ],
    context: 'Colombian Spanish — Bogotá\'s in particular — has a reputation among learners as the clearest and most neutral in the Americas, which makes Colombia one of the most-filtered-for countries by Spanish students. Colombians are also, by a comfortable margin, among the most patient partners for a learner who is still slow.',
    topics: ['music and dancing', 'football', 'helping people with Spanish', 'travel'],
  },
  {
    slug: 'argentina', name: 'Argentina', demonym: 'Argentine', code: 'AR', region: 'South America',
    langs: [{ name: 'Spanish', hello: '¿Cómo andás?' }],
    capital: 'Buenos Aires', tz: 'UTC−3 (ART)', peak: '10pm – 3am ART',
    cities: [
      { name: 'Buenos Aires', slug: 'buenos-aires', note: 'a Spanish so distinctive — sh sounds, vos instead of tú — that learners treat it as its own dialect' },
      { name: 'Córdoba', slug: 'cordoba', note: 'a student city with a sing-song accent Argentines can spot in one sentence' },
    ],
    context: 'Argentina runs the latest clock in the Americas — dinner at ten, chat traffic peaking near midnight — and its Spanish is different enough from the rest of the continent that learners either seek it out specifically or avoid it entirely. Long calls are the norm here; the average Argentine conversation on the platform runs well past the median.',
    topics: ['football, seriously', 'music', 'travel', 'long philosophical conversations at 2am'],
  },
  {
    slug: 'malaysia', name: 'Malaysia', demonym: 'Malaysian', code: 'MY', region: 'Southeast Asia',
    langs: [{ name: 'Malay', hello: 'Apa khabar?' }, { name: 'English', hello: 'Hello' }, { name: 'Mandarin', hello: '你好' }, { name: 'Tamil', hello: 'Vanakkam' }],
    capital: 'Kuala Lumpur', tz: 'UTC+8 (MYT)', peak: '9pm – 1am MYT',
    cities: [
      { name: 'Kuala Lumpur', slug: 'kuala-lumpur', note: 'four languages in routine daily use, and matches here reflect all four' },
      { name: 'Penang', slug: 'penang', note: 'a smaller, food-obsessed city with a distinct Hokkien-inflected English' },
    ],
    context: 'Malaysia is one of the few countries where a single person will comfortably switch between Malay, English, Mandarin and Tamil in one conversation, and Malaysian English has enough of its own grammar to be its own thing. That makes Malaysian matches unusually adaptable — they will find a shared language with almost anyone.',
    topics: ['food, above all else', 'football and badminton', 'work and study', 'travel around the region'],
  },
  {
    slug: 'singapore', name: 'Singapore', demonym: 'Singaporean', code: 'SG', region: 'Southeast Asia',
    langs: [{ name: 'English', hello: 'Hello lah' }, { name: 'Mandarin', hello: '你好' }, { name: 'Malay', hello: 'Apa khabar?' }, { name: 'Tamil', hello: 'Vanakkam' }],
    capital: 'Singapore', tz: 'UTC+8 (SGT)', peak: '9pm – 1am SGT',
    cities: [{ name: 'Singapore', slug: 'singapore-city', note: 'a city and a country at once, with four official languages inside it' }],
    context: 'Singapore is small, dense and four-language official, which produces some of the most efficiently multilingual matches on the platform. Its position also makes it a natural crossroads: a Singaporean evening reaches India, China, Australia and Southeast Asia simultaneously.',
    topics: ['food', 'work and study', 'travel', 'the region\'s politics, carefully'],
  },
  {
    slug: 'iran', name: 'Iran', demonym: 'Iranian', code: 'IR', region: 'Middle East',
    langs: [{ name: 'Persian', hello: 'سلام، حالت چطوره' }],
    capital: 'Tehran', tz: 'UTC+3:30 (IRST)', peak: '10pm – 2am IRST',
    cities: [
      { name: 'Tehran', slug: 'tehran', note: 'the overwhelming majority of Persian-language chat traffic starts here' },
      { name: 'Mashhad', slug: 'mashhad', note: 'a large city with a noticeably different accent from the capital' },
    ],
    context: 'Persian speakers are spread far beyond Iran — Afghanistan, Tajikistan, and very large communities in Los Angeles, Toronto and Europe — so a Persian match frequently crosses continents. Iranian users are among the most enthusiastic language-exchange partners on the platform and the most likely to want a long conversation rather than a quick one.',
    topics: ['poetry and music', 'film', 'study and emigration', 'food'],
  },
  {
    slug: 'morocco', name: 'Morocco', demonym: 'Moroccan', code: 'MA', region: 'Africa / Middle East',
    langs: [{ name: 'Arabic', hello: 'Salam, labas?' }, { name: 'French', hello: 'Salut' }, { name: 'Amazigh', hello: 'Azul' }],
    capital: 'Rabat', tz: 'UTC+1', peak: '9pm – 2am',
    cities: [
      { name: 'Casablanca', slug: 'casablanca', note: 'the country\'s commercial centre and the busiest source of Moroccan matches' },
      { name: 'Marrakesh', slug: 'marrakesh', note: 'a tourist city where French and English turn up in Moroccan matches constantly' },
    ],
    context: 'Moroccans routinely hold a conversation in Darija, French and a little English at once, which makes them some of the most flexible matches anywhere — and Moroccan Arabic is distinct enough from Gulf and Egyptian Arabic that other Arabic speakers occasionally need a moment. France is the other end of a large share of Moroccan calls.',
    topics: ['football', 'music', 'France and family there', 'food'],
  },
  {
    slug: 'kenya', name: 'Kenya', demonym: 'Kenyan', code: 'KE', region: 'Africa',
    langs: [{ name: 'Swahili', hello: 'Habari?' }, { name: 'English', hello: 'Hello' }],
    capital: 'Nairobi', tz: 'UTC+3 (EAT)', peak: '8pm – midnight EAT',
    cities: [
      { name: 'Nairobi', slug: 'nairobi', note: 'East Africa\'s tech centre, with the strongest mobile-first internet culture on the continent' },
      { name: 'Mombasa', slug: 'mombasa', note: 'a coastal city where Swahili dominates over English far more than inland' },
    ],
    context: 'Kenya has one of Africa\'s most developed mobile internet cultures — people have been doing everything from a phone here for longer than most of the world — so a browser chat with nothing to install fits naturally. Swahili is the shared language of East Africa, so Kenyan matches connect easily into Tanzania and Uganda.',
    topics: ['football', 'music', 'business and tech', 'politics, energetically'],
  },
  {
    slug: 'portugal', name: 'Portugal', demonym: 'Portuguese', code: 'PT', region: 'Europe',
    langs: [{ name: 'Portuguese', hello: 'Olá, tudo bem?' }],
    capital: 'Lisbon', tz: 'UTC+0 / UTC+1 (WET/WEST)', peak: '9pm – 1am WET',
    cities: [
      { name: 'Lisbon', slug: 'lisbon', note: 'a large international remote-working population alongside the local one' },
      { name: 'Porto', slug: 'porto', note: 'a northern accent that Brazilians will tell you is harder to follow than Lisbon\'s' },
    ],
    context: 'European Portuguese and Brazilian Portuguese are different enough that speakers of each occasionally have to slow down for the other, and the platform matches them constantly — for learners that is a feature, not a problem. Portugal\'s timezone also sits an hour behind the rest of Western Europe, extending the evening.',
    topics: ['football', 'music', 'travel', 'the differences with Brazilian Portuguese'],
  },
  {
    slug: 'ireland', name: 'Ireland', demonym: 'Irish', code: 'IE', region: 'Europe',
    langs: [{ name: 'English', hello: 'How\'s it going?' }, { name: 'Irish', hello: 'Dia dhuit' }],
    capital: 'Dublin', tz: 'UTC+0 / UTC+1 (GMT/IST)', peak: '8pm – 1am GMT',
    cities: [
      { name: 'Dublin', slug: 'dublin', note: 'a young, heavily international city — a Dublin match is often not Irish at all' },
      { name: 'Cork', slug: 'cork', note: 'an accent that other Irish people enjoy imitating and foreigners rarely place' },
    ],
    context: 'Ireland punches far above its population in chat traffic, partly because it is young and partly because conversation is genuinely a national pastime — the average call length from Ireland is among the highest on the platform. It is also home to large Polish, Brazilian and Indian communities, so an Irish match is frequently a bilingual one.',
    topics: ['music and stories', 'football and hurling', 'travel', 'slagging, affectionately'],
  },
  {
    slug: 'romania', name: 'Romania', demonym: 'Romanian', code: 'RO', region: 'Europe',
    langs: [{ name: 'Romanian', hello: 'Salut, ce faci?' }],
    capital: 'Bucharest', tz: 'UTC+2 / UTC+3 (EET/EEST)', peak: '9pm – 1am EET',
    cities: [
      { name: 'Bucharest', slug: 'bucharest', note: 'the largest source of Romanian-language matches' },
      { name: 'Cluj-Napoca', slug: 'cluj-napoca', note: 'a university and tech city with very strong English' },
    ],
    context: 'Romanian is a Romance language surrounded by Slavic ones, which surprises people mid-call more often than you would expect — Spanish and Italian speakers frequently find they can follow more than they thought. Romania also has one of Europe\'s strongest tech workforces and correspondingly confident English.',
    topics: ['gaming and tech', 'football', 'travel and working abroad', 'language similarities'],
  },
  {
    slug: 'greece', name: 'Greece', demonym: 'Greek', code: 'GR', region: 'Europe',
    langs: [{ name: 'Greek', hello: 'Γεια σου' }],
    capital: 'Athens', tz: 'UTC+2 / UTC+3 (EET/EEST)', peak: '10pm – 2am EET',
    cities: [
      { name: 'Athens', slug: 'athens', note: 'roughly a third of the country lives in its metro area' },
      { name: 'Thessaloniki', slug: 'thessaloniki', note: 'a student city with a reputation for staying out later than the capital' },
    ],
    context: 'Greece keeps Mediterranean hours — the peak is close to midnight — and Greek is spoken by few enough people that Greek-to-Greek matches feel disproportionately like running into a neighbour. That makes the diaspora, particularly in Australia, the US and Germany, a big part of Greek-language traffic.',
    topics: ['football and basketball', 'food', 'travel', 'politics, loudly and warmly'],
  },
  {
    slug: 'israel', name: 'Israel', demonym: 'Israeli', code: 'IL', region: 'Middle East',
    langs: [{ name: 'Hebrew', hello: 'שלום, מה קורה' }, { name: 'Arabic', hello: 'مرحبا' }, { name: 'Russian', hello: 'Привет' }, { name: 'English', hello: 'Hi' }],
    capital: 'Jerusalem', tz: 'UTC+2 / UTC+3 (IST/IDT)', peak: '9pm – 1am IST',
    cities: [
      { name: 'Tel Aviv', slug: 'tel-aviv', note: 'the busiest and most international source of matches in the country' },
      { name: 'Haifa', slug: 'haifa', note: 'a genuinely mixed city where Hebrew and Arabic matches are equally likely' },
    ],
    context: 'Israel is a country of immigrants and it shows in the languages on a random match — Hebrew, Russian, Arabic, English and French all appear regularly, often from the same person. English proficiency is high, which makes Israeli users easy matches for almost anyone on the platform.',
    topics: ['tech and startups', 'travel', 'music', 'argument as a form of affection'],
  },
  {
    slug: 'new-zealand', name: 'New Zealand', demonym: 'New Zealander', code: 'NZ', region: 'Oceania',
    langs: [{ name: 'English', hello: 'Kia ora' }, { name: 'Māori', hello: 'Kia ora' }],
    capital: 'Wellington', tz: 'UTC+12 / UTC+13 (NZST/NZDT)', peak: '8pm – midnight NZST',
    cities: [
      { name: 'Auckland', slug: 'auckland', note: 'the largest Polynesian city in the world, which shapes who you meet in it' },
      { name: 'Wellington', slug: 'wellington', note: 'small, creative and disproportionately talkative' },
    ],
    context: 'New Zealand is the first country in the world into a new day, which gives it a genuinely odd position on a global chat platform: a New Zealand evening is an American morning and a European night. Kiwis are used to being far from everywhere, and a good share of matches here are explicitly about somewhere else.',
    topics: ['rugby', 'the outdoors', 'travel', 'being mistaken for Australian'],
  },
  {
    slug: 'sweden', name: 'Sweden', demonym: 'Swedish', code: 'SE', region: 'Europe',
    langs: [{ name: 'Swedish', hello: 'Hej, hur mår du?' }, { name: 'English', hello: 'Hello' }],
    capital: 'Stockholm', tz: 'UTC+1 / UTC+2 (CET/CEST)', peak: '8pm – midnight CET',
    cities: [
      { name: 'Stockholm', slug: 'stockholm', note: 'the busiest Nordic chat city and among the most English-fluent anywhere' },
      { name: 'Gothenburg', slug: 'gothenburg', note: 'a west-coast accent Swedes describe as friendlier than the capital\'s' },
    ],
    context: 'Sweden has near-universal English fluency, so Swedish users match easily with anyone — and Swedish itself is hard to practise for the same reason the Dutch problem exists. Winter darkness is long here and chat traffic climbs measurably through it, which is not a coincidence anyone in Sweden would dispute.',
    topics: ['music', 'gaming', 'the weather and the dark', 'travel somewhere warm'],
  },
  {
    slug: 'norway', name: 'Norway', demonym: 'Norwegian', code: 'NO', region: 'Europe',
    langs: [{ name: 'Norwegian', hello: 'Hei, hvordan går det?' }, { name: 'English', hello: 'Hello' }],
    capital: 'Oslo', tz: 'UTC+1 / UTC+2 (CET/CEST)', peak: '8pm – midnight CET',
    cities: [
      { name: 'Oslo', slug: 'oslo', note: 'the largest source of Norwegian matches and the most international city in the country' },
      { name: 'Bergen', slug: 'bergen', note: 'a dialect distinct enough that other Norwegians comment on it immediately' },
    ],
    context: 'Norway has an unusual relationship with its own language — dialects vary enormously and everyone writes in one of two official written standards — so Norwegians are used to adapting mid-conversation, which makes them patient matches. English fluency is near-universal.',
    topics: ['the outdoors', 'music', 'travel', 'winter, at length'],
  },
];

/* ---------------------------------------------------------------------------
 * Language pages.
 *
 * Distinct from countries on purpose: "practise Spanish" and "chat with people
 * in Spain" are different searches with different intent, and a language is
 * not a country — Spanish belongs to twenty of them. These pages target the
 * language-learning intent specifically.
 * ------------------------------------------------------------------------ */
const LANGUAGES = [
  {
    slug: 'english', name: 'English', native: 'English', hello: 'Hello',
    speakers: '1.5 billion including second-language speakers',
    countries: ['united-states', 'united-kingdom', 'india', 'nigeria', 'philippines', 'canada', 'australia', 'ireland'],
    why: 'English is the language people most often want to practise out loud and least often get to. Classrooms teach grammar; what is missing is the unrehearsed half — being asked something you did not prepare for and answering it before you have translated it in your head.',
    hard: 'The hard part of English is almost never vocabulary. It is speed, contractions and the fact that native speakers do not pronounce half of what they write. Fifteen minutes of live conversation does more for that than an hour of exercises.',
    tip: 'Say up front that you are practising. Almost nobody minds, most people slow down, and a surprising number will offer to swap — their language for yours.',
  },
  {
    slug: 'spanish', name: 'Spanish', native: 'Español', hello: 'Hola',
    speakers: 'about 500 million first-language speakers',
    countries: ['spain', 'mexico', 'colombia', 'argentina'],
    why: 'Spanish is the second most-spoken first language on earth and spread across twenty countries that do not sound alike. Practising with one random speaker after another is the fastest way to stop being thrown by an accent you were not trained on.',
    hard: 'Subjunctive, speed, and the gap between the textbook Spanish of a course and the actual Spanish of a person in Bogotá or Buenos Aires. The second is only fixable by talking to people.',
    tip: 'Use the country filter deliberately. Colombian and Mexican Spanish are the gentlest starting points; Argentine and Chilean Spanish will humble you, which is also useful.',
  },
  {
    slug: 'french', name: 'French', native: 'Français', hello: 'Bonjour',
    speakers: 'about 300 million across five continents',
    countries: ['france', 'canada', 'morocco'],
    why: 'French is spoken natively across Europe, West and North Africa, and Canada, and those varieties differ enough that learners trained only on Parisian French get stuck the first time they meet a Québécois or Ivorian speaker.',
    hard: 'Listening. French written down and French spoken aloud are nearly different languages — liaison, elision and a lot of silent letters. Reading well tells you nothing about whether you can follow a conversation.',
    tip: 'Ask your match to repeat things rather than switching to English. Most French speakers would far rather slow down than give up on the language.',
  },
  {
    slug: 'german', name: 'German', native: 'Deutsch', hello: 'Hallo',
    speakers: 'about 95 million first-language speakers',
    countries: ['germany'],
    why: 'German rewards conversation practice more than most languages because so much of the difficulty is structural — where the verb lands, which case a preposition takes — and structure only becomes automatic through use.',
    hard: 'Cases and word order under time pressure. You can conjugate perfectly on paper and still freeze when a sentence has to come out in real time.',
    tip: 'Germans are famously direct about corrections and this is genuinely a gift. Ask to be corrected and you will get exactly what you asked for.',
  },
  {
    slug: 'portuguese', name: 'Portuguese', native: 'Português', hello: 'Olá',
    speakers: 'about 260 million, most of them in Brazil',
    countries: ['brazil', 'portugal'],
    why: 'Portuguese has two major varieties that sound markedly different, and Brazil alone accounts for the large majority of speakers. Random matching exposes you to both without you having to choose in advance.',
    hard: 'European Portuguese swallows vowels in a way Brazilian Portuguese does not, so learners trained on one often cannot follow the other at first. Nasal vowels take a while for everyone.',
    tip: 'Brazilian speakers are among the most encouraging partners on the platform for a beginner. Start there, then try Portugal once you are comfortable.',
  },
  {
    slug: 'arabic', name: 'Arabic', native: 'العربية', hello: 'مرحبا',
    speakers: 'about 400 million across more than twenty countries',
    countries: ['egypt', 'saudi-arabia', 'morocco', 'united-arab-emirates'],
    why: 'Arabic is really a family of spoken dialects sitting under one written standard, and no course can prepare you for all of them. Talking to actual speakers from different countries is not optional here — it is the only way the language becomes usable.',
    hard: 'The distance between Modern Standard Arabic, which is what gets taught, and the dialect anyone actually speaks. A learner with three years of MSA can still be lost in a Cairo conversation.',
    tip: 'Pick a dialect and use the country filter to stay near it. Egyptian is the most widely understood across the region; Gulf and Levantine are the next most useful.',
  },
  {
    slug: 'hindi', name: 'Hindi', native: 'हिन्दी', hello: 'Namaste',
    speakers: 'about 350 million first-language speakers',
    countries: ['india'],
    why: 'Hindi is spoken by hundreds of millions of people who are online in the evening and very willing to talk, and it is a language where the spoken register drifts a long way from the formal one.',
    hard: 'Everyday Hindi is heavily mixed with English and with Urdu vocabulary, so the pure textbook version can sound stilted. Only conversation teaches you which register fits where.',
    tip: 'Do not worry about the script. Voice chat sidesteps it entirely, which is why so many learners make faster progress speaking than reading.',
  },
  {
    slug: 'urdu', name: 'Urdu', native: 'اردو', hello: 'Assalam-o-Alaikum',
    speakers: 'about 230 million including second-language speakers',
    countries: ['pakistan', 'india', 'united-arab-emirates'],
    why: 'Urdu and Hindi are close enough in speech that learning one gives you most of the other, and Urdu is the shared language across Pakistan even where it is nobody\'s mother tongue.',
    hard: 'Register. Formal Urdu leans on Persian and Arabic vocabulary that everyday speech does not use, so learners often sound far more literary than they intend.',
    tip: 'Pakistani late-night traffic is heavy, so if you are in Europe or the Americas your evening lines up well with theirs.',
  },
  {
    slug: 'russian', name: 'Russian', native: 'Русский', hello: 'Привет',
    speakers: 'about 255 million including second-language speakers',
    countries: ['russia', 'ukraine', 'israel'],
    why: 'Russian works as a lingua franca across a dozen countries, so a Russian-language match may be in Kazakhstan, Georgia, Latvia or Tel Aviv. That range is exactly what makes it worth practising live.',
    hard: 'Cases, verbs of motion, and aspect. All three are things you can know cold and still get wrong at conversational speed.',
    tip: 'Russian speakers tend to open reserved and warm up considerably once a conversation has somewhere to go. Give it more than thirty seconds.',
  },
  {
    slug: 'japanese', name: 'Japanese', native: '日本語', hello: 'こんにちは',
    speakers: 'about 125 million',
    countries: ['japan'],
    why: 'Japanese has enormous learner demand and comparatively few native speakers on international platforms, which makes every real conversation valuable. It is also a language where politeness level changes the grammar, so context matters more than vocabulary.',
    hard: 'Choosing a register in real time, plus listening speed. Reading kanji is a separate skill that voice chat lets you set aside completely.',
    tip: 'Offer an exchange explicitly — most Japanese users on the platform are here to practise English, so a straight swap is an easy sell.',
  },
  {
    slug: 'chinese', name: 'Chinese (Mandarin)', native: '中文', hello: '你好',
    speakers: 'about 940 million first-language speakers',
    countries: ['china', 'singapore', 'malaysia'],
    why: 'Mandarin is tonal, which means text practice is close to useless for the part that actually breaks comprehension. Voice is not a nice extra here; it is the whole skill.',
    hard: 'Tones under pressure, and the gap between careful textbook Mandarin and fast conversational speech.',
    tip: 'Ask your partner to correct your tones specifically. Most learners are corrected on vocabulary and left to fossilise bad tones for years.',
  },
  {
    slug: 'korean', name: 'Korean', native: '한국어', hello: '안녕하세요',
    speakers: 'about 80 million',
    countries: ['south-korea'],
    why: 'Korean has one of the fastest-growing learner populations in the world and a native-speaker base that is very active online late at night, which makes matching straightforward if your hours line up.',
    hard: 'Speech levels and honorifics — the same sentence has several forms depending on who you are talking to, and getting it wrong is more noticeable than a grammar slip.',
    tip: 'Say you are learning at the start. Korean speakers will usually pick a comfortable register and stay in it rather than switching around you.',
  },
  {
    slug: 'italian', name: 'Italian', native: 'Italiano', hello: 'Ciao',
    speakers: 'about 65 million',
    countries: ['italy'],
    why: 'Italian has far more learners than it has native speakers online, so finding a real conversation partner is genuinely competitive — and Italians are among the most expressive speakers you will be matched with, which makes listening practice enjoyable rather than a chore.',
    hard: 'Speed and regional variation. Standard Italian is taught; what you meet is Roman, Neapolitan or Milanese Italian at full pace.',
    tip: 'Italian rewards attempting it badly. Speakers respond warmly to effort in a way that makes the first stumbling conversations much easier than they should be.',
  },
  {
    slug: 'turkish', name: 'Turkish', native: 'Türkçe', hello: 'Merhaba',
    speakers: 'about 85 million',
    countries: ['turkey', 'germany'],
    why: 'Turkish is agglutinative — meaning gets stacked onto the end of a word — which is unlike anything most learners have seen and only becomes intuitive with live use.',
    hard: 'Building and parsing long suffixed words at speed, and vowel harmony, which native speakers do without thinking and learners have to compute.',
    tip: 'Turkey\'s very late peak means European and Middle Eastern learners can find partners well past midnight.',
  },
  {
    slug: 'indonesian', name: 'Indonesian', native: 'Bahasa Indonesia', hello: 'Halo',
    speakers: 'about 200 million including second-language speakers',
    countries: ['indonesia'],
    why: 'Indonesian is widely considered one of the easiest major languages for an English speaker to start speaking — no tones, no cases, no verb conjugation — which makes it unusually rewarding to practise conversationally from week one.',
    hard: 'The gap between formal Indonesian and the casual, slang-heavy version people actually speak, which no textbook covers well.',
    tip: 'Because the grammar is simple, you can hold a real conversation far earlier than in most languages. Start talking sooner than feels comfortable.',
  },
  {
    slug: 'bengali', name: 'Bengali', native: 'বাংলা', hello: 'Nomoshkar',
    speakers: 'about 235 million',
    countries: ['bangladesh', 'india'],
    why: 'Bengali is the sixth most-spoken language in the world and badly under-served by chat platforms, so both learners and native speakers looking for a conversation in it find the supply thin everywhere else.',
    hard: 'Two distinct registers — the literary form and the spoken one — plus regional variation between Bangladesh and West Bengal that surprises learners.',
    tip: 'Bengali speakers are concentrated in Dhaka and Kolkata but the diaspora in the UK and the Gulf is large, so matches come from further afield than you would guess.',
  },
];

module.exports = { COUNTRIES, LANGUAGES };
