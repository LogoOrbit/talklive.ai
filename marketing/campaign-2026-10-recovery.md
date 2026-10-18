# Traffic recovery campaign - from 19 October 2026

Visits fell 22% week over week (16,296 vs 20,835). Nothing on the site is
broken: `robots.txt`, canonicals, sitemaps and the SEO audit are all clean,
and the 15 October release only touched the app UI. The fall continues the
search and AI decline that followed the October page retirements
(`docs/traffic-analysis-2026-10.md`). New pages take weeks to rank, so this
campaign adds outside traffic now while the content work compounds.

Every link below carries a `utm_source` the server counts (`acq_<source>` in
the owner dashboard). Do not change the values, or the visits are not counted.

## Shipped with this campaign

| What | URL |
|---|---|
| Research article: how many hours it takes to make a friend (50 / 90 / 200) | `/blog/how-many-hours-to-make-a-friend` |
| Chinese guide to free English speaking practice, linked from `/zh/` | `/blog/english-speaking-practice-guide-zh` |
| New counted sources: `alternativeto`, `pinterest`, `telegram`, `email`, `zhihu`, `xiaohongshu` | `server/index.js` |

## Week 1 checklist (in this order)

1. **Bing Webmaster Tools** (30 min): verify `talklive.app`, submit
   `https://talklive.app/sitemap.xml`, then run `npm run seo:ping` after the
   deploy so IndexNow pushes the two new URLs. Bing feeds ChatGPT search,
   DuckDuckGo and Yahoo, and sends as many visitors as Google.
2. **Google Search Console**: URL Inspection -> Request indexing for both new
   articles and `/zh/`.
3. **AlternativeTo listing** (copy below). Add TalkLive as an alternative to
   Omegle, OmeTV, Chatroulette, HelloTalk and Free4Talk.
4. **Post one short video a day** (schedule below), at 15:00-17:00 UTC, the
   start of the busiest window, so new arrivals find people online.
5. **Send the email** (below) to the confirmed subscriber list.
6. **Outreach**: email the authors of five "best Omegle alternatives 2026"
   articles (template below).
7. **Zhihu answer + Xiaohongshu note** for the Chinese guide.

## Short videos (TikTok, Instagram Reels, YouTube Shorts)

Files are in `marketing/`. Same video on all three platforms; only the link
changes. Put the link in the bio or the first comment.

| Day | File | Hook (first 2 seconds, on screen) | Caption |
|---|---|---|---|
| Mon | `TalkLive-Ad-pov.mp4` | POV: it's 2am and everyone you know is asleep | Somewhere it's 2pm. One tap, one real voice. No camera, no sign-up. |
| Tue | `TalkLive-Ad-language.mp4` | Practising English with a stranger from Egypt | 5 minutes a day of real conversation beats 50 flashcards. Free, in your browser. |
| Wed | `TalkLive-Ad-omegle.mp4` | Omegle is gone. This is what I use now | Voice only. No video, no account, nothing recorded. 18+. |
| Thu | `TalkLive-Ad-worldwide.mp4` | Karachi to Toronto in 3 seconds | Random voice chat with the whole world. Tap to talk. |
| Fri | `TalkLive-Ad-games.mp4` | Awkward silence? Play tic-tac-toe mid-call | Games inside the call so you're never stuck for words. |
| Sat | `TalkLive-Ad-animals.mp4` | Pick your spirit animal, then talk to a stranger | Your animal shows up on their screen instead of your face. |
| Sun | `TalkLive-Ad-texting.mp4` | Can't talk out loud? Text instead | Same instant match, text only. No mic needed. |
| Mon | `TalkLive-Motion-Ad.mp4` | 50 hours. That's how long a friendship takes | Hour one starts with a hello. (Link the friendship article.) |

Hashtags (pick 4-5): `#talktostrangers #omeglealternative #englishspeaking
#speakenglish #makefriendsonline #voicechat #languageexchange`

Links:

- TikTok: `https://talklive.app/?utm_source=tiktok`
- Instagram: `https://talklive.app/?utm_source=instagram`
- YouTube: `https://talklive.app/?utm_source=youtube`
- Pinterest (pin the posters in `marketing/posters/`): `https://talklive.app/?utm_source=pinterest`

## AlternativeTo / directory listing

Link: `https://talklive.app/?utm_source=alternativeto` (use
`?utm_source=producthunt` on Product Hunt).

> **TalkLive** - Free random voice chat with strangers. One tap connects you to
> a live audio call with a real person somewhere in the world. No video, no
> sign-up, no download; calls are peer-to-peer and never recorded. Text chat
> for when you can't talk out loud, an "English practice" interest that
> matches learners with each other, in-call games, and Add friend to talk
> again without swapping numbers. Interface in 17 languages. Adults 18+.
>
> Tags: random chat, voice chat, omegle alternative, language exchange,
> anonymous chat, talk to strangers, web app

## Outreach to listicle authors

Search: `best omegle alternatives 2026`, `apps to talk to strangers 2026`,
`practise english speaking with strangers free`. Pick posts updated in 2025-26
with a named author.

> Subject: A voice-only option for your Omegle alternatives list
>
> Hi [name],
>
> I read your [article title] - the point about [specific detail] was spot on.
>
> I run TalkLive (talklive.app), a free random chat that is voice-only: no
> video, no sign-up, calls peer-to-peer and never recorded, 18+. Readers who
> left Omegle because of what the camera turned it into tend to look for
> exactly that, and none of the apps on your list cover it yet.
>
> If it's useful for your next update, I'm happy to answer questions or share
> anything you need. No worries if it doesn't fit.
>
> Asad, founder, TalkLive

## Email to the subscriber list

Link source: `utm_source=email`.

> Subject: It takes about 50 hours to make a friend
>
> Hi,
>
> A researcher at the University of Kansas counted: roughly 50 hours together
> turns a stranger into a casual friend, 90 into a friend, and 200 into a
> close one. The first conversation usually goes better than you think, and
> we skip the follow-up anyway.
>
> We wrote up the research and what it means for making friends as an adult:
> https://talklive.app/blog/how-many-hours-to-make-a-friend?utm_source=email
>
> If someone on TalkLive made your day, tap Add friend next time. Talking to
> the same person again is how hour one becomes hour fifty.
>
> Talk soon,
> TalkLive

## Value-first community posts

Rules: post as yourself, say you built TalkLive, follow each community's
self-promotion rules, reply to every comment. Never post the same text twice.

**r/socialskills or r/MakeNewFriendsHere** - lead with the research, link the
article only if the sub allows it:

> Title: TIL it takes about 50 hours together to turn an acquaintance into a friend
>
> Jeffrey Hall (University of Kansas, 2018) asked adults who had just moved
> cities, and new students, how much time they had spent with people who became
> friends. About 50 hours for a casual friend, 90 for a friend, 200+ for a close
> one. Time you're obliged to spend together (like work) counted for less than
> time you choose. Made me realise why adult friendships stall: we never get
> past hour three. What helped you actually repeat contact with new people?

**Zhihu (知乎)** - answer questions like "怎样练英语口语" or "没有外国朋友怎么练口语":
summarise the four-week plan and the six phrase cards from the guide in your
own words, then link
`https://talklive.app/blog/english-speaking-practice-guide-zh?utm_source=zhihu`.
Say that you are the founder.

**Xiaohongshu (小红书)** - a 6-image note: cover "每天10分钟练英语口语", then
one image per week of the plan, then the phrase cards. Link source
`?utm_source=xiaohongshu`.

**Telegram** - only English-practice groups whose rules allow resource links;
link `?utm_source=telegram`. No mass posting.

## What to check next Sunday

- Owner dashboard: `acq_tiktok`, `acq_instagram`, `acq_youtube`,
  `acq_alternativeto`, `acq_email`, `acq_zhihu`, `acq_xiaohongshu`. Keep the
  channels that sent more than 20 visits; drop the rest.
- Search Console and Bing: are both new articles indexed?
- Total visits against 16,296. One week of promotion should cover the gap;
  search recovery from the new content takes 3-6 weeks.
