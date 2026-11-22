# Off-site SEO plan

What the owner has to do outside the repo. On-site work (pages, schema, sitemaps,
robots.txt) is done; see `SEO.md`. Tick things off in order.

## 1. Webmaster tools (one hour, do first)

- [ ] **Google Search Console.** Add `talklive.app` as a Domain property (DNS TXT
  verification). Also add `talklive.xyz` and `talklive.site` so you can see
  whether the redirects are followed and who still links to them.
  - Submit `https://talklive.app/sitemap.xml` (the index; it lists the child sitemaps).
  - URL Inspection -> Request indexing for: `/`, `/what-is-talklive`, `/how-it-works`,
    `/omegle-alternative`, `/random-voice-chat`, `/talk-to-strangers`, `/pricing`.
  - Check Pages -> "Why pages aren't indexed" weekly for the first month.
- [ ] **Bing Webmaster Tools.** Import the site from Search Console (one click), or
  verify by DNS. Submit the same sitemap. Bing data also feeds ChatGPT search,
  Copilot and DuckDuckGo, so this matters more than its traffic share suggests.
- [ ] **IndexNow.** Already wired: `server/indexnow.js` pushes every sitemap URL about
  a minute after each production boot, and the key file is
  `public/da08ff957496484fa2f72ae732a40179.txt`. Manual push: `npm run seo:ping`.
  In Bing Webmaster Tools -> IndexNow, confirm submissions show as accepted.
  If it shows errors, the key file is not reachable at the site root.
- [ ] **Robots check.** Open `https://talklive.app/robots.txt` and confirm it lists
  Googlebot, Bingbot, GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot,
  Google-Extended and Applebot as allowed. Use the robots.txt report in Search Console.
- [ ] Optional: Yandex Webmaster and Naver Search Advisor. IndexNow already reaches them.

## 2. Directories and lists to submit to

Submit the same short description everywhere (below). Prefer lists that people
actually read over bulk "submit to 500 directories" services, which do nothing.

Description to reuse:
> TalkLive is a free random voice and text chat for adults. One tap pairs you with
> a stranger; no account, no camera. Works in the browser and as an Android app.

Where:

- [ ] **"Omegle alternatives" roundups.** Search Google for `omegle alternatives`,
  `sites like omegle`, `apps like omegle`, `omegle alternative without camera`. For
  each article on page 1 to 3, find the author's contact or "suggest a tool" form and
  send a short, factual pitch (what it is, what is different: audio-only, no signup,
  18+, link to `/omegle-alternative`). Offer a free Plus pass for them to test.
- [ ] **Product and tool directories:** Product Hunt (launch properly, do not just
  list), AlternativeTo (add TalkLive as an alternative to Omegle, OmeTV, Chatroulette,
  Emerald Chat, Monkey), SaaSHub, Slant, G2 and Capterra (free listings), BetaList,
  Indie Hackers product page, Crunchbase (profile already referenced in schema `sameAs`).
- [ ] **App stores:** make sure the Google Play listing links to `https://talklive.app`
  and uses the same name and description. The store page is itself an indexed listing.
- [ ] **Review sites:** Trustpilot (claim the profile), Sitejabber. Ask real users to
  review; never write or buy reviews. Do not add `aggregateRating` markup until there
  are real ratings (see `SEO.md`).
- [ ] **Social profiles** already in `sameAs`: keep names, bio and link consistent
  (Instagram, Facebook, X, TikTok, YouTube, Pinterest). Add a LinkedIn company page and
  a GitHub or Medium presence if you want more entity signals.
- [ ] **Wikipedia/Wikidata:** do not self-edit a promotional article. A Wikidata item is
  allowed once there are independent sources about TalkLive.

## 3. Reddit approach (genuine participation only)

Reddit is cited heavily by AI answer engines, so honest presence there pays off.
Spam gets accounts banned and the domain blocked.

- Use a real account with history. Spend two to four weeks answering questions in
  r/OmegleAlternative-type threads, r/language_exchange, r/lonely, r/CasualConversation,
  r/Introverts, r/malaysia style country subs, and r/SideProject without linking anything.
- Read each sub's rules first. Many ban self-promotion; ask the mods before posting.
- When a thread asks "what replaced Omegle?" or "voice chat with strangers, no camera?",
  answer the actual question, say you built TalkLive, name two or three alternatives
  fairly (including ones that fit better), and mention limits (no video, 18+, cannot
  verify anyone). One link at most, no tracking parameters.
- Aim for roughly 10 helpful comments for every 1 mention. Never use multiple accounts,
  upvote rings or scripted replies.
- Post a founder "Show" or "I built" thread once, in the subs that allow it
  (r/SideProject, r/webdev, r/indiehackers), with what you learned about matching and
  moderation. Respond to every comment.
- Same rules for Quora (answer "best Omegle alternative" questions with real detail)
  and Hacker News (a Show HN only if there is something technical to show).

## 4. Earning mentions and links

- [ ] **Publish things worth citing:** original data from your own anonymised stats
  (for example "what countries talk to each other most", peak hours), a "what happened
  to Omegle" explainer (the Journal already has one), a safety guide. Journalists and
  bloggers link to numbers.
- [ ] **Pitch** tech and safety writers covering the post-Omegle space; offer a quote on
  why audio-only changes moderation. Use HARO-style services (Qwoted, Featured,
  Help a B2B Writer) for relevant requests.
- [ ] **Language-learning and loneliness angles:** pitch language bloggers, ESL teachers
  and mental-health newsletters on `/practice-english-speaking` and `/talk-to-someone`.
- [ ] **YouTube and TikTok:** short screen recordings of the product (no real users'
  voices or faces without consent). Link to the site in the description.
- [ ] **Guest posts** on relevant blogs, on a topic they asked for, not a link drop.
- [ ] Fix unlinked mentions: set a Google Alert for `"talklive.app"` and `"TalkLive"
  chat`, and ask sites that name you without a link to add one.
- Avoid: paid link packages, PBNs, mass directory blasts, exact-match anchor swaps.

## 5. Tracking

- [ ] Search Console: weekly check of queries, impressions, average position for
  `omegle alternative`, `random voice chat`, `talk to strangers`, `what is talklive`.
  Annotate dates when you ship a change.
- [ ] Bing Webmaster Tools: same queries plus the AI Performance / Copilot citations
  report if available in your account.
- [ ] **AI visibility, monthly (15 minutes):** ask ChatGPT, Perplexity, Gemini and Claude
  the same ten questions ("what is TalkLive", "best Omegle alternative without camera",
  "random voice chat with strangers", "is TalkLive safe"). Record in a sheet whether
  TalkLive is mentioned, which URL is cited, and what is said wrong. Fix wrong facts on
  the site first, then on third-party pages.
- [ ] Analytics: `utm_source=seo` is already counted by the server; add
  `utm_source=<site>` to links you place yourself so referrals are separable.
- [ ] Server logs: confirm GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot and Bingbot
  are fetching pages (200s, not 403/429). Rate limits or Cloudflare bot rules can block
  them even when robots.txt allows them.
- [ ] Track referring domains monthly (Search Console -> Links, or Bing). Goal: steady
  growth in unique linking sites, not a spike.

## 6. Cadence

| When | What |
|---|---|
| Week 1 | Section 1 complete; AlternativeTo, Crunchbase, Play listing, Trustpilot |
| Weeks 1-4 | Reddit participation without links; pitch 10 roundup authors |
| Month 2 | Product Hunt launch; first data post; first mention pitch round |
| Monthly | AI-visibility check; Search Console review; one new pitch batch |
