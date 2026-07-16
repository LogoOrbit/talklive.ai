# TalkLive — Global Growth Plan

Written 2026-07-16, based on the last 30 days of the owner dashboard.

## 1. Read the dashboard honestly

- **Real audience today is US + Pakistan.** Karachi alone is 1,143 visits; the
  next "cities" — Ashburn, Santa Clara, The Dalles, Frankfurt, Singapore,
  Ha Kwai Chung — are data-center locations. That traffic is crawlers, uptime
  bots and scrapers, not people. Most of RU/SG/DE/NL/HK country traffic is the
  same.
- So the honest baseline: **two real markets, everything else is noise.**
  Global growth means winning real users in new countries, not celebrating
  bot visits.
- Suggestion: filter known data-center ASNs/cities out of the visits chart so
  decisions are made on human traffic.

## 2. What shipped on-site (this branch)

The biggest technical blocker was that every hreflang tag pointed at
`?lang=xx` URLs that return **identical English HTML** (translation happens in
client-side JS). Google saw duplicate English pages and had nothing native to
rank in any non-English market.

- Real localized homepages now exist at `/es/ /pt/ /fr/ /de/ /ru/ /tr/ /ar/
  /hi/ /ur/ /id/ /zh/ /ja/ /ko/ /it/ /fa/ /bn/` — statically rendered native
  copy (title, description, hero, features, FAQ), RTL for ar/fa/ur, each
  linking into the app with `?lang=` so the UI matches.
- hreflang clusters are path-based and bidirectional (page head + sitemap),
  x-default = `/`. The fake `?lang=` alternates were removed everywhere.
- Sitemap includes all 16 locale pages; llms.txt lists them for AI answer
  engines; every locale page cross-links every other via a language switcher.

After deploy: resubmit the sitemap in Google Search Console and run
`npm run seo:ping` (IndexNow → Bing/Yandex/Naver/Seznam).

## 3. Where to aim (pick 3 markets, not 30)

Best-fit markets for a free, anonymous, voice-first stranger chat with no
sign-up (mobile-browser friendly, big Omegle-gap demand, low CPC):

1. **India (hi/en)** — same time zones as your PK liquidity, huge
   "talk to strangers" search volume. Your existing user pool can actually
   answer calls from India *today*, which matters for a liquidity product.
2. **Indonesia (id)** — massive mobile-web audience, very active in random
   chat categories, cheap paid tests.
3. **Brazil (pt)** — largest Omegle-refugee market in the West; Portuguese
   page now exists.

Then Turkey (tr) and Mexico/Colombia (es) as the next ring. Chase markets
adjacent in time zone to where you already have users — a stranger-chat app
with nobody online at your hour churns instantly.

## 4. Channel playbook (per market, in order of cost)

1. **SEO (now unblocked)** — the locale pages target "talk to strangers"
   head terms. Next content step: translate the top 3 landing pages
   (omegle-alternative, random-voice-chat, talk-to-strangers) into hi/id/pt.
2. **TikTok / Reels / Shorts** — the entire category (OmeTV, Monkey) grows on
   reaction-style clips of funny/wholesome stranger calls. Voice-only is a
   twist: subtitle the audio. Post per-market with local-language captions and
   hashtags; 3–5 clips/week. This is the single highest-leverage free channel.
3. **Reddit / Discord / Telegram** — r/MakeNewFriendsHere, r/Omegle,
   language-exchange Discords ("practice English with strangers" angle for
   PK/IN/ID/BR is your strongest hook — you already have the
   /practice-english-speaking page). Be a participant, not a spammer.
4. **Product-led loops** — add a post-call "share this app" moment and a
   referral link with the friend system; localized share text per language.
5. **Paid (only after liquidity)** — small TikTok/Meta tests in ID/BR/IN
   (CPMs are cents), targeting evenings local time so new users hit a full
   queue. Don't buy US traffic yet; it's expensive and you'll leak it to
   churn while the queue is thin off-peak.

## 5. Liquidity guardrail

Growth order matters more than channel: **one market at a time, deep enough
that a new user matches within seconds at local evening hours.** Use the
country filter data to check match latency per region before and after each
push. If matches are slow in a market, more traffic there makes retention
worse, not better.

## 6. Measure

- Segment GA4 by country + language page (`utm_campaign=home-<lang>`).
- Watch: visit → mic-permission → first match → 2nd-day return, per market.
- Search Console: impressions/clicks per locale URL (`/es/`, `/hi/`, …) —
  expect first movement in 2–6 weeks after indexing.
