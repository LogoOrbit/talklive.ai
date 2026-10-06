# Traffic analysis and growth plan - October 2026

Source: dashboard export of 2026-10-05 (last 30/90 days). Numbers are rounded.

## What the data says

**Where people come from (arrivals with a known source, 90 days)**

| Source | Arrivals | Lands on |
|---|---|---|
| Direct | 1,731 | `/`, `/chat` |
| **ChatGPT** | **1,046** | `/languages/`, `/regions/south-asia`, `/regions/europe`, `/countries/*` |
| Google | 734 | `/`, `/regions/south-asia`, `/languages/` |
| Bing + DuckDuckGo + Yahoo + Ecosia | 723 | `/zh/` (Bing), `/`, `/es/`, `/fr/`, `/ru/` |
| Installed app (PWA) | 323 | `/` |
| Social (all) | ~20 | - |

1. **AI assistants are the #2 channel, ahead of Google.** ChatGPT cites the long,
   fact-dense Journal features (languages, regions, country guides), not the
   product pages. OpenAI crawled 1,075 times in 30 days; Perplexity 364;
   Anthropic 13.
2. **Bing-family search equals Google.** Bing also feeds ChatGPT search,
   DuckDuckGo, Yahoo and Ecosia, so Bing Webmaster Tools matters as much as
   Search Console.
3. **China is the 4th-largest country (8,082 visits) and arrives via Bing on
   `/zh/`.** Real queries: 匿名聊天, 免费匿名聊天网站, 匿名聊天网址.
4. **South Asia is ~40% of visits** (India 25.8k, Pakistan 9.7k, Bangladesh
   4.1k). "english", "speak", "hindi" are top chat words; the feedback asks
   for people who speak a given language ("can't speak English", "Tamil
   people", "someone who speaks French").
5. **Conversations leave the platform.** "telegram" (439), "number" (402),
   "whatsapp" (352) and "instagram" (348) are among the most-typed words. Each
   one is a user who stops coming back, and that move is also how most scams
   start.
6. **Retention is the bottleneck, not arrivals.** 85% of people are new; 59%
   of calls end within 10 seconds; thumbs-down outnumbers thumbs-up 884 to 604;
   peak concurrency is about 30. With so few people online, every returning
   user makes matches faster for everyone else.
7. Social traffic is close to zero although `marketing/` has 8 finished video
   ads.
8. 522 of 530 reports are unhandled.

## Shipped in this change

| Change | Why | Where |
|---|---|---|
| A once-per-session tip when a contact handle or number appears in a chat: use **Add friend** instead (17 languages). Nothing is blocked. | Keeps the relationship on TalkLive (returning users), and protects against the "move to WhatsApp" scam step | `public/app.js`, `public/chat.js`, `public/i18n*` |
| Matching breaks ties by **shared interface language** (worth less than one shared interest, never a filter, no added wait) | Feedback about language mismatch; Chinese, Arabic, French and Spanish speakers meet each other first | `server/index.js` `matchScore()` |
| **"English practice"** is the first interest quick-pick; `/practice-english-speaking` voice buttons start a search with it already picked (`/?interest=english`) | Biggest audience need; learners match learners | `public/app.js`, `scripts/topics/index.js` |
| `/zh/` title, description and three new FAQs target 匿名聊天 / 免费匿名聊天网站 / 练英语口语 | Matches what Chinese visitors actually search on Bing | `scripts/locales.js` |
| `llms.txt` gains "Common uses" and "Who uses TalkLive" sections with real, dated figures | AI engines quote concrete facts; these map onto questions people ask assistants | `scripts/build-seo.js` |
| `robots.txt` names the AI search crawlers explicitly (same rules as `*`) | Signals they are welcome | `public/robots.txt` |

## Next, ranked by expected impact

Probabilities are rough judgements of a measurable lift within 30 days.

1. **Clear the report queue and auto-act on repeat offenders** (~70%). 522
   open reports means bad actors stay, and they drive the 10-second skips and
   thumbs-down. Better first calls mean more return visits.
2. **Get listed where AI engines look** (~60%). ChatGPT and Perplexity lean
   heavily on AlternativeTo, Product Hunt, G2/Saashub-style directories,
   "best Omegle alternatives 2026" listicles and Reddit threads. List TalkLive
   on AlternativeTo (under Omegle, OmeTV, HelloTalk, Free4Talk), and email the
   authors of the top listicles. Answer genuinely on r/EnglishLearning,
   r/languagelearning and r/Omegle, saying you are the founder.
3. **Bing Webmaster Tools**: verify, submit the sitemap, check `/zh/` and
   `/languages/` coverage (~50%). It is a single afternoon of work for the
   channel that covers half of all search.
4. **Post the 8 finished videos as Shorts/Reels/TikTok** in the formats the
   data supports: "POV: practising English with a stranger from Egypt", "2 a.m.
   in Karachi, someone in Toronto is just finishing work" (~50%, high
   variance). Put `?utm_source=` on every link so the dashboard counts them.
5. **Make the first 10 seconds better**: show one icebreaker on the voice
   screen at connect, not only in text chat (~40%).
6. **"People are online now" push** at each user's local peak hour, only to
   people who opted in to notifications (~40%). This concentrates the few
   online users into the same hours, so waits get shorter.
7. **More Chinese and Arabic depth**: one long Journal feature in each language
   (like `/languages/`, which ChatGPT already cites) instead of more thin pages
   (~30%).
8. **Ask for a share after a thumbs-up call**, with the existing personal
   `?ref=` link (~30%). Telegram already sends a few visitors without being
   asked.

## What not to do

These would break AdSense or Google policy, or simply mislead users. They
also tend to backfire on a site this size:

- Fake "online now" counts, bots or AI personas posing as users (and certainly
  not posing as women), invented reviews or ratings.
- Mass keyword or city pages. AdSense already rejected the site once for this,
  and the October cleanups exist because of it (see `SEO.md`).
- Cloaking, hidden text, or serving crawlers different content from users.
- Spamming Reddit, Telegram groups or comment sections. Accounts get banned
  and the domain gets flagged.
- Placing ads beside the crisis-line content or inside the app screens.

Indirect marketing that works and stays within the rules: be the most quotable
source on a narrow question (the Journal does this), be present in the
directories and communities assistants read, and let happy users bring the
next ones.
