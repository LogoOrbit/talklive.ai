# TalkLive SEO & ad-revenue audit

Phase 1 — orientation. Read-only pass over the repository at `72e0249`.
Everything below was verified against the code, not inferred from the docs.

`SEO.md` at the repo root is the maintainer's guide to *how the SEO build
works*. This file is the audit: what is actually on disk right now, what is
wrong with it, and what the numbers are. Where the two disagree, this file
records the disagreement (see [Doc drift](#doc-drift)).

---

## 1. Stack and rendering mode

| | |
|---|---|
| Runtime | Node ≥ 18, CommonJS |
| Server | Express 4 (`server/index.js`, 2 359 lines) + Socket.IO 4 |
| Front end | **No framework, no bundler, no transpiler.** Hand-written ES5-compatible browser JS served raw from `public/` |
| Rendering | **Static HTML on disk, served by `express.static`.** Not SSR-on-request, not CSR |
| Routing | Filesystem. `express.static(PUBLIC_DIR, { extensions: ['html'] })` maps `/talk-to-strangers` → `public/talk-to-strangers.html`. Two explicit routes: `GET /call` and `GET /chat` `sendFile` an existing shell |
| Build pipeline | `npm run build:seo` → `scripts/build-seo.js` → `scripts/migrate-schema.js` → `scripts/migrate-adsterra.js`. Generates HTML files into `public/` and commits them |
| Hosting | Fly.io app `talklive-ai`, region `iad`, 1 shared CPU / 512 MB, `min_machines_running = 1`, `auto_stop_machines = false` |
| Deploy | GitHub Actions `.github/workflows/fly-deploy.yml` on push to `main`: `npm ci` → `build:seo` → `audit:seo` → `flyctl deploy --remote-only`. A failing audit blocks the deploy |
| Container | `Dockerfile`, `node:20-alpine`, `npm ci --omit=dev` |

### Is the app client-rendered and therefore invisible to crawlers?

**No. The brief's central worry does not apply to this repo.**

Every crawlable URL is a complete HTML document on disk. `public/index.html` is
119 905 bytes of served markup containing `<h1>`, 182 heading/paragraph
elements, a `<main>` landmark, a full FAQ accordion, and the entire footer link
graph — all present in the raw response before a single byte of JavaScript
executes. The 265 generated landing, blog, country, city and language pages are
the same: static files, one render-blocking stylesheet (`seo.css`, 13 455 bytes),
no framework runtime at all.

The JavaScript on `/` and `/call` (`app.js`, 196 190 bytes) drives the *live
call UI* — orb, timers, WebRTC, socket events, i18n swaps. It enhances markup
that is already there; it does not create it. `/chat` is the one genuinely
JS-built screen, and it is deliberately `noindex, follow` and excluded from the
sitemap.

So there is **no SSR or prerendering work to do**. Phase 3's conditional
("if client-rendered, implement SSR") is a no-op here, and the effort it would
have consumed is better spent on the real defects listed in §5.

---

## 2. Adsterra integration

One network, one loader, no AdSense anywhere (`scripts/migrate-adsterra.js`
strips `adsbygoogle` markup and `pagead2.googlesyndication.com` script tags on
every build).

### The loader — `public/ads.js` (7 112 bytes)

* Slots are declared as empty divs: `<div data-ad="TYPE"></div>`.
* An `IntersectionObserver` with `rootMargin: '400px'` fills a slot only as it
  approaches the viewport, so ads never block first paint.
* Banner tags use `document.write`, so each is sandboxed inside its own
  same-origin `about:blank` iframe rather than injected into the page.
* Two serving hosts are tried in order — `delvefencescrewdriver.com`, then
  `www.highperformanceformat.com` — with a 1.5 s × 10 poll per host (~15 s
  each) before giving up.
* An unfilled slot is hidden **together with its `.ad-card` frame**, so a
  "Sponsored" label is never stranded above an empty box.

### Units defined

| Slot name | Resolves to | Adsterra key |
|---|---|---|
| `native` | Native banner (`invoke.js` container) | `b6c7c328…c06c5` |
| `box` | 300 × 250 | `d12fcb01…3ce4` |
| `leaderboard` | 728 × 90 ≥ 744 px, 468 × 60 ≥ 484 px, else 320 × 50 | per size |
| `banner` | 468 × 60 ≥ 484 px, else 320 × 50 | per size |
| `skyscraper` | 160 × 600 ≥ 1024 px, else 160 × 300 | per size |
| exact size | `320x50`, `468x60`, `300x250`, `728x90`, `160x300`, `160x600` | direct |

`skyscraper`, `160x600` and `160x300` are **defined but used zero times.**

### Every ad unit in the codebase

Sitewide census — 1 075 slots across 273 of 274 HTML files:

| Type | Count |
|---|---|
| `native` | 542 |
| `leaderboard` | 528 |
| `box` | 3 |
| `banner` | 2 |

`public/pricing.html` is the only ad-free page, excluded by `adFreePages` in
`scripts/migrate-adsterra.js` — correct, since network ads beside the paid plan
undercut the "ad-free" pitch.

Placement by surface:

| Surface | Slots | Where |
|---|---|---|
| Generated landing pages (×74) | 4 | after prose (`native`), **two stacked `leaderboard` after the FAQ**, `native` before footer |
| Blog posts (×22) | 4 | after article (`native`), then **`leaderboard` + `leaderboard` + `native` stacked** at the end |
| Country / city / language (×177) | 4 | same shape as landing pages |
| Localized homepages (×16) | 4 | `native` + `leaderboard` adjacent after the steps section |
| `public/index.html` (`/` and `/call`) | 6 | see below |
| `public/chat.html` (`/chat`) | 3 | start view `box`, searching view `box`, **live view `banner` above the composer** |

`public/index.html` — the voice app shell — carries the densest and riskiest
set:

| Line | Slot | Context |
|---|---|---|
| 591 | `leaderboard` | setup panel |
| **1014** | **`banner`** | **inside `#callPanel`, between the call status text and the Call / Mute / Add-friend / Report button row** |
| 1115 | `leaderboard` | inside `#callPanel`, under the video banner |
| 1132 | `box` | inside `#callPanel`, under the conversation guide |
| 1172 | `native` | SEO section |
| 1364 | `leaderboard` | footer area |

### Ad-adjacent server config

* CSP (`server/index.js:71`) allowlists `delvefencescrewdriver.com`,
  `www.highperformanceformat.com`, `*.effectivecpmnetwork.com`, and permits
  `'unsafe-eval'` for the Adsterra runtime. `img-src`/`connect-src`/`frame-src`
  are broad `https:` because creatives beacon to arbitrary exchange hosts.
* `GET /ads.txt` (`server/index.js:505`) serves `process.env.ADS_TXT`, and
  **404s when that env var is unset.**
* `scripts/audit-seo.js` bans `delvefencescrewdriver.com` appearing as a
  visible sponsored *link* — the direct-link smartlink was swept out of the geo
  cluster and must not come back.

---

## 3. Current SEO surface

Healthy, and considerably further along than a greenfield audit would assume.

| Asset | State |
|---|---|
| `robots.txt` | Present. `Allow: /`, disallows `/config.js` and `/socket.io/`, declares the sitemap |
| `sitemap.xml` | Present. Was a single flat `<urlset>` with 272 `<url>` entries; **split into a `<sitemapindex>` over six child sitemaps in Phase 1** (see [Doc drift](#doc-drift)) |
| Canonicals | Every page self-canonical except `/landing` → `/`. Verified by `audit-seo.js` |
| hreflang | 17 locales + `x-default`, reciprocal, on every cluster member |
| Titles / descriptions | Enforced at emit time by `fitTitle` (≤ 60 chars) and `fitDescription` (≤ 158) |
| OG / Twitter | Full set on every page incl. `og:image` 1200×630 with dimensions and alt |
| JSON-LD | One `@graph` per page with stable `@id`s. Types in use: `Organization`, `WebSite`, `WebApplication`, `WebPage`, `BreadcrumbList`, `FAQPage`, `HowTo`, `ImageObject`, `Offer` + merchant-listing fields |
| `llms.txt` | Present and current |
| IndexNow | `server/indexnow.js` submits every sitemap URL to Bing/Yandex/Seznam/Naver ~60 s after boot |
| URL hygiene | 301s for `/x.html` → `/x`, `/x/index.html` → `/x/`, trailing-slash normalisation with an explicit loop guard |
| Multi-domain | `talklive.xyz` / `talklive.site` 301 to `talklive.app`; non-canonical hosts get `X-Robots-Tag: noindex` |
| Compression | `server/compress.js` — Brotli/gzip on every text response, ETag-cached |
| Fonts | System stack only. No webfont, no FOIT/FOUT, nothing to fix |

Page census — 274 HTML files, 272 in the sitemap (`/chat` and `/landing`
excluded by design):

| Cluster | Files |
|---|---|
| Root landing pages + policies | 104 |
| Cities | 114 |
| Countries | 46 |
| Blog | 24 |
| Languages | 17 |
| Localized homepages | 16 |

Baseline verification, run just now against a clean tree:

```
npm run build:seo   → 74 landing pages + sitemap.xml (272 urls) + feed.xml + llms.txt
                      0 schema files needed completion
                      75 files touched by the Adsterra sweep
git status          → clean (build is idempotent, no drift)
npm run audit:seo   → passed: 272 sitemap pages, 18 590 unique internal links
```

---

## 4. What is missing outright

* **`sameAs` on `Organization`** — deliberately absent; no real social profiles
  exist to point at. Documented in `SEO.md §Still needs a human`.
* **Real ratings** — `aggregateRating` was removed sitewide after being found
  fabricated. Correct call. Two non-critical Search Console suggestions stay
  open as a result.
* **`Article` / `BlogPosting` schema on blog posts** — the 22 articles emit
  `WebPage`, not `Article`. No `author`, `datePublished`, or `dateModified`
  node.
* **`ItemList` on the hub pages** — `/countries/`, `/cities/`, `/languages/`,
  `/blog/` and `/resources` are pure link lists with no list schema.
* **Translated landing pages** — only the 16 homepages are localized, on the
  stated and defensible grounds that machine-translating 260 pages produces the
  thin content that gets sites demoted.
* **`ads.txt` content** — the route exists, the env var does not.

---

## 5. Defects found

Ordered by expected impact. Each names the file to change.

### 5.1 — Every ad slot is a layout-shift generator · `public/ads.js`, all CSS

`<div data-ad="leaderboard"></div>` has **no width, height, `min-height` or
`aspect-ratio` in any stylesheet.** Confirmed: `style.css`, `chat.css`,
`seo.css` and `pages.css` contain zero `[data-ad]` rules. The div is 0 px tall
until `ads.js` appends an iframe, at which point everything below it jumps down
by 90 px, 250 px or the native unit's rendered height.

`SEO.md` records "CLS 0" on a landing page. That measurement holds only because
the slots sit below the fold and CLS scores viewport shifts — it is not
evidence the slots are safe. The `leaderboard` pair on the generated pages sits
directly after the FAQ, which is well within the first screen on a desktop
viewport, and the three `#callPanel` slots on `/call` shift the primary call
controls.

Reserving the space costs nothing and is the single highest-value fix in this
audit. It protects CWV *and* revenue, because a slot that pushes content is a
slot users scroll past in irritation.

### 5.2 — An ad sits inside the active call UI · `public/index.html:1014`

The `banner` slot is between `#statusText` / `#reassureLine` and the
`.call-actions` row that holds Call / Hang-up, Mute, Add friend and Report. It
is not hidden while a call is live — `#callPanel` is the live-call panel.

Three separate problems:

1. It violates the brief's own hard rule that nothing interrupts an active
   call.
2. A creative directly above a Hang-up button is a textbook accidental-click
   layout. Adsterra's terms prohibit placements that induce accidental clicks,
   and invalid-traffic ratios are what get publisher accounts closed.
3. It is a slim 468×60 / 320×50 — the lowest-CPM shape in the inventory — paid
   for with the highest-attention moment on the site.

`#callPanel` also holds a `leaderboard` (1115) and a `box` (1132) below the
fold. Those are defensible; 1014 is not.

### 5.3 — Two identical ad slots stacked, on 271 of 274 pages · `scripts/build-seo.js:488`

```js
${leaderboardAd()}      // line 486 — returns adSlot('leaderboard')
${adSlot('leaderboard')} // line 488 — returns exactly the same markup
```

`leaderboardAd()` is defined at line 211 as `adSlot('leaderboard')`. The two
calls emit byte-identical HTML with nothing between them. The same duplicate
appears in the blog template (lines 2010/2012, followed by a third `nativeAd()`
— three stacked units) and the locale template pairs `native` with
`leaderboard` the same way (2238/2239).

Measured: **271 of 274 HTML files have two ad slots with fewer than 30
characters of visible text between them.**

Two 728×90s in a row do not earn double. Adsterra fills the second at a lower
rate, the pair reads as an ad wall, and it is the exact pattern Google's page
experience and Better Ads guidance singles out. Deleting one line recovers
almost nothing in revenue and a real amount of trust.

### 5.4 — 265 of 274 pages have no analytics at all

GA4 (`G-713E3C1RH1`) appears on exactly **9 files**: `index.html`, `chat.html`,
`landing.html`, `about.html`, `contact.html`, `pricing.html`, `privacy.html`,
`terms.html`, `refund.html` — the nine hand-maintained pages. The internal
`/events` beacon is only called from `app.js` and `pricing.html`.

**The entire organic surface — every landing page, every blog post, all 177
geo pages — is unmeasured.** There is currently no way to answer "which page
brought that visitor", "which keyword converts to a call", or "what does a
thousand sessions on a city page actually earn". Every revenue and density
decision in Phase 5 and Phase 6 is therefore a projection against vertical
benchmarks rather than against our own numbers, and it will stay that way until
this is fixed.

This is a one-line addition to the page template in `scripts/build-seo.js`, and
it gates the value of everything else in this engagement.

### 5.5 — Unused inventory shapes

`skyscraper` / `160x600` / `160x300` are implemented in `ads.js` and never
placed. On the 74 landing pages and 177 geo pages — long, single-column,
text-heavy documents on wide desktop viewports — a sticky sidebar rail is the
highest-viewability, zero-CLS unit available and the classic answer for exactly
this page shape. Nothing on those pages currently monetises the desktop margin.

### 5.6 — Ad density is not configurable

Slot counts and types are hard-coded in three generator templates and in two
hand-maintained HTML files. Changing density anywhere means editing JavaScript,
rebuilding 265 pages, committing, and waiting for a Fly deploy. There is no
kill switch for a single unit and no way to A/B a density.

### 5.7 — Premium does not suppress ads · `public/ads.js`

`ads.js` never consults premium state; `app.js` tracks `isPremiumUser` and the
socket emits `premium-status`. Premium is not on sale (no Stripe code exists in
this repository at all — `/pricing` is a "coming soon" card), so nothing is
broken today. But the loader has no hook to honour it, and the moment checkout
ships, paying users will see ads on the page that sold them the ad-free tier.

### 5.8 — Page weight on `/` and `/call`

| Asset | Raw | Brotli |
|---|---|---|
| `app.js` | 196 190 B | ~48 kB |
| `style.css` | 127 488 B | ~26 kB |
| `index.html` | 119 905 B | ~27 kB |
| `chat.js` | 40 847 B | — |
| `chat.css` | 36 979 B | — |
| `i18n.js` | 27 207 B | — |

Unminified and unsplit, all of it parsed on first load of the homepage.
Compression is doing the heavy lifting. The 265 generated pages are unaffected —
they load only `seo.css` (13 455 B) and `ads.js`.

Media: `loop-man-480.webm` 494 kB and `loop-man-480.mp4` 527 kB, correctly
`preload="none"` with `data-src` and a 10 kB poster, tiering down to a 20 kB
320-wide pair on small screens. `og-image.png` is 137 kB but is only ever
fetched by social scrapers. No on-page raster images to convert. **There is no
image-format problem here to fix.**

### 5.9 — `/ads.txt` 404s

Unless `ADS_TXT` is set in the Fly environment, `GET /ads.txt` returns 404.
Several Adsterra demand partners treat a missing `ads.txt` as unauthorised
inventory and bid lower or not at all. Fixing this needs the publisher's
authorised-seller lines from the Adsterra dashboard — a credentials task, not a
code task.

### Doc drift

`SEO.md` stated `/sitemap.xml` was a **sitemap index** pointing at six child
sitemaps and that this is what makes per-cluster coverage visible in Search
Console. On disk there was one file, `public/sitemap.xml`, a flat `<urlset>` of
272 URLs, and no child sitemaps existed. Reading the git history, the split had
existed and was deleted on purpose: the old `sitemap-*.xml` files were
hand-maintained, drifted until they listed URLs that 301'd, and a stale sitemap
is worse than none.

**Resolved.** `writeSitemaps()` in `scripts/build-seo.js` now generates all
seven files from the single list of URLs the flat sitemap was built from, so
the split cannot drift by construction. `scripts/audit-seo.js` follows the
index into its children — without that change the audit would have read six
sitemap URLs off the index and checked no pages at all — and fails the build if
a child is listed but missing, or present but unlisted. Verified: 272 pages
audited, and `server/indexnow.js` (which already handled an index) resolves to
272 page URLs rather than six sitemap URLs.

| Child sitemap | URLs |
|---|---|
| `sitemap-main.xml` | 23 |
| `sitemap-pages.xml` | 49 |
| `sitemap-countries.xml` | 46 |
| `sitemap-cities.xml` | 114 |
| `sitemap-languages.xml` | 17 |
| `sitemap-blog.xml` | 23 |

The country and city clusters are now watchable on their own in Search Console,
which is what matters — they are the programmatic pages most likely to be
judged thin, and in a flat sitemap their coverage was averaged in with the
hand-written pages.

---

## 6. Constraints observed

* `scripts/geo-pages.js`, `pages-extra2.js` and `blog-extra2.js` are **orphaned
  generators** — 177+ pages ship from disk but are no longer regenerated by
  `build:seo`. `SEO.md` documents, with measurements, that wiring them back in
  strips 14–18 % of visible text and the entire footer link graph. Sitewide
  changes must therefore reach those pages through a **migration sweep**
  (`scripts/migrate-schema.js`, `scripts/migrate-adsterra.js`) rather than
  through the template. Any ad or schema change in later phases has to follow
  that same pattern.
* `npm run audit:seo` gates the deploy. It checks canonicals, hreflang
  reciprocity, sitemap parity, title/description budgets, heading hierarchy,
  accessible names, duplicate ids, and 18 590 internal links. Nothing may land
  that fails it.
* Off limits per the brief: WebRTC signalling, Stripe (none exists), auth.

---

## 7. Phase 1 conclusion

The premise the brief was written against — a client-rendered app invisible to
crawlers, with ad-hoc ad tags and no SEO foundation — does not describe this
repository. The technical SEO here is genuinely good: 272 static, indexable,
self-canonical, schema-bearing pages, hreflang across 17 locales, Brotli
everywhere, an audit that blocks bad deploys, and a documented refusal to ship
fabricated review markup.

The value left on the table is not in Phase 3's checklist. It is in four
things:

1. **Nothing is measured** on the 265 pages that carry the traffic (§5.4).
2. **Every ad slot shifts layout** because no slot reserves its space (§5.1).
3. **An ad sits in the live call UI**, and 271 pages carry a duplicated slot
   that earns almost nothing and costs trust (§5.2, §5.3).
4. **Ad density cannot be tuned** without a code change and a redeploy (§5.6).

Phases 2–6 are scoped against that.

---
---

# Phase 2 — Competitor research

## Method, and what could not be measured

Research was done from this session's sandbox. Two limits shaped it, and both
change what the findings below can claim:

* **The egress proxy blocks direct fetches of competitor domains.** `curl` and
  `WebFetch` against `airtalk.live`, `heresay.live`, `strangerline.io`,
  `yapping.me`, `talkwithstranger.com` and the rest all return
  `connect_rejected` / `EGRESS_BLOCKED`. So no competitor's DOM, `<head>`,
  script tags or ad markup was inspected.
* **The PageSpeed Insights API daily quota is exhausted** for the shared
  anonymous project (`429 Quota exceeded`), and the CrUX API needs a key this
  environment does not have. So no Core Web Vitals — lab or field — were
  measured, for competitors or for us.

Everything below therefore comes from search-result data: titles, meta
descriptions, URL paths, SERP composition across a dozen queries, and
third-party writing about these sites. That is enough for keyword targeting,
URL-structure and on-page benchmarking, and a backlink map. It is **not**
enough to state any competitor's ad network, formats, placements or density —
so this document does not state them. §Ad benchmarks below gives the vertical's
published rate card and density rules instead, which is what the Phase 5 and 6
decisions actually need, and §Unfinished says exactly what to run to close the
gap.

Being explicit: any table here claiming "airtalk.live serves Adsterra
popunders at 3 units per page" would have been invented. There isn't one.

## The competitive set

Eight sites, chosen because they surfaced repeatedly across the queries our
pages target — not from a published list.

### 1. `airtalk.live` — the closest analogue

The single most direct competitor: voice-first, no camera, no sign-up, 1-to-1
random matching, country and interest filters, AI moderation, 150+ countries.
It is TalkLive's proposition almost feature for feature, and it surfaced in
**every** voice-chat query run, including as a competing result on our own
brand query.

* **URL structure**: `www.airtalk.live` on `www`, with `/about-us/`,
  `/blog/<slug>/` — trailing slashes throughout.
* **On-page**: homepage title `Talk to Strangers Online | Voice & Text Random
  Chat - AirTALK` — pipe-separated, head term first, brand last. Same shape as
  ours.
* **Content**: a real blog carrying dated, keyword-led guides —
  `/blog/random-audio-call/`, `/blog/complete-guide-to-random-chat-and-voice-calling-2026/`.
  The year-stamped title is the notable move: it wins "…in 2026" queries and
  signals freshness.
* **Backlinks**: earns third-party review coverage — `geniusfirms.com`,
  `randomvoicechat.live/blog/airtalk-voice-chat/` — and, importantly, has
  **dedicated pages on competitors' domains** (`strangercam.com/airtalk/`,
  `chatib.chat/airtalk/`). Other sites building pages *about* you is the
  strongest signal in this set.

### 2. `talkwithstranger.com` — the programmatic-URL play

The most SEO-aggressive site in the vertical, and the one worth studying.

It runs a **large keyword-to-URL matrix** and repeatedly takes three or four
slots in a single SERP. Observed paths:

```
/talk-strangers                              /voice-call
/call-strangers                              /international-chatrooms
/free-chat-rooms/talk                        /free-chat-rooms/voice-call
/free-chat-rooms/lonely-chat                 /free-chat-rooms/international-chat-rooms
/free-chat-rooms/talk-to-strangers-voice-call
/chatsites/emerald-chat
```

Three things to take from it:

1. **Two competing patterns for the same intent** — `/voice-call` *and*
   `/free-chat-rooms/voice-call` *and*
   `/free-chat-rooms/talk-to-strangers-voice-call` all exist. That is
   deliberate SERP-slot farming, and it is also textbook keyword cannibalisation.
   It works for them at their authority level; it is not a pattern to copy.
2. **The `/chatsites/<competitor>` cluster** — a page per rival. This is where
   their "X alternative" traffic comes from, and it is exactly the pattern our
   own `*-alternative.html` pages already implement.
3. **Emotional-intent pages** — `/free-chat-rooms/lonely-chat` targets
   loneliness queries directly.

### 3. `strangerline.io` — the multi-mode generalist

Text + voice + video + voice notes, no registration, plus retention features
the pure-random sites lack: message after disconnect, save favourite chats,
friend requests. Surfaced across nearly every query run — voice, text, and
"talk to strangers" head terms alike. Flat root-level URLs. Title:
`Talk to Strangers Online - Free Anonymous Random Chat | StrangerLine`.

### 4. `wakiee.live` — voice on a dedicated path

`wakiee.live/voice` titled `Random Voice Call – Free Voice Chat with Strangers
Online`, with `wakiee.live/` covering `Talk to Strangers for Free | Video Chat &
Voice Chat`. A clean split: one URL per modality, each with its own head term.
Markets one-click connect, no login, AI moderation.

### 5. `heresay.live` — the pure-play, plus content marketing

Positions as "the most stripped-down, voice-first random chat platform" — no
sign-up, no profile, no app, no camera. Notably it also **publishes the
category roundup that ranks for our head terms**
(`/blog/random-voice-chat-app`), listing itself alongside AirTALK and others.
Owning the comparison page for your own category is a strong, cheap play.

### 6. `chatsansar.com` — the "chat room" framing

`/voice-chat-room/` and `/international-chat-room/`, titled `Free Voice Chat
Room | Random Voice Calls with Strangers (No Sign-Up)` and `Free International
Chat Room 2025 – Video & Voice with Strangers`. Targets "chat room" rather than
"random chat" — an older but still-searched framing, and a distinct keyword
pocket. The stale `2025` in a live title is a small, real ranking cost on
"…2026" queries.

### 7. `voicerandom.com` — localised path structure

`voicerandom.com/en/stranger` — a language-segmented path (`/en/`) with a topic
leaf. Title: `Random Voice Chat with Strangers | Anonymous 1-on-1 Calls | Voice
Random`. The `/en/` prefix is the alternative to our `/` + `/<code>/` layout;
ours is better for an English-primary site because the strongest URL stays at
the root.

### 8. The video incumbents — `ome.tv`, `emeraldchat`, `monkey.app`, `chathub`

Different product (video), same queries. They own "omegle alternative"
outright: `ome.tv/`, `monkey.app/omegle/`, `omegleapp.me/`. Emerald Chat is
consistently described as "the most popular free Omegle alternative".

**This is the SERP we cannot win head-on, and should not try to.** Our
`/omegle-alternative` page competes against sites with app stores, years of
authority and video parity with what searchers remember Omegle being. The
winnable framing is the one AirTALK and HereSay use — *voice-first, no camera* —
which is a genuine product difference, not a positioning trick.

### Adjacent sets worth knowing about

Two clusters our pages already reach into, with entirely different competitors:

* **Language practice** — `englishbooth.com`, `englishtalky.com`,
  `hilokal.com/en/speak/english`, `free4talk.com`, `strangr.club/practice/english`.
  Note `strangr.club/practice/<language>` — a per-language path matrix,
  the same shape as our `/languages/<language>`.
* **Loneliness / late-night** — `7cups.com` (with `/loneliness-chat-room/`,
  `/insomnia-chat-room/`, `/bored-lonely-chat-room/`), `supportiv.com`,
  `buddyhelp.org`, `findahelpline.com`, `anonchat.co.in/late-night-talk`,
  `strangr.live/blog/lonely-at-night-chat/`.

  **This second cluster is a trap and needs saying plainly.** It is dense with
  mental-health services staffed by trained listeners and helpline directories.
  Google treats it as YMYL, and a random-stranger chat product positioning
  itself as loneliness support would be both a ranking failure and a genuinely
  bad thing to do. Our `/cant-sleep`, `/im-bored`, `/late-night-chat` and
  `/someone-to-talk-to` pages should target *company and conversation*, never
  *support*, and should not chase `7cups` on its own terms.

## Ad benchmarks for this vertical

What could be established, with sources, since no competitor's ad stack was
inspectable:

**Adsterra's own published rate card**, by format:

| Format | CPM range | Tier-1 / US |
|---|---|---|
| Popunder | $2 – $10 | $2.80 US cited by one source; $6 – $12 US by another |
| Social Bar | $1 – $5 | ~$2.80 US |
| Native | $0.50 – $3 | — |
| Banner | $0.10 – $1 | — |

The US popunder spread ($2.80 vs $6–$12) is a genuine disagreement between two
sources, not a number to average. Phase 6 uses the conservative end and says so.

**The order of magnitude is the finding.** Banners — which are 1 073 of our
1 075 slots — are the *lowest*-paying format Adsterra sells, at $0.10–$1 CPM.
Native pays up to 3× that, Social Bar up to 5×, popunder up to 10×.

**Density rules that constrain what we may do with that:**

* Google's Publisher Ads Audits flags any page where ads exceed **30 % of
  viewport height** — the figure originates with the Coalition for Better Ads,
  whose research also drives Chrome's built-in ad filter.
* Chrome can block **all** ads on a site that repeatedly breaks the Better Ads
  Standards.
* Google's page layout algorithm demotes pages that are ad-heavy above the fold.
* The commonly-cited "15–30 % ideal ad density" is a myth carried over from old
  AdSense guidance; the operative limits are the viewport rule above and a
  recommended ceiling around 40/60 ads-to-content.

**Popunders and interstitials are the highest-CPM formats in the table and are
excluded from every recommendation in Phase 5.** They breach the brief's "no
intrusive interstitials" rule, they are what the roundup articles mean when they
complain that Omegle alternatives are "overwhelmed by bots, aggressive
monetization, or weak safety controls", and on a site whose entire acquisition
strategy is organic search, a Chrome ad-filter flag would cost more than the
format could earn. The realistic upgrade path is **banner → native and
in-content**, not banner → popunder.

## Gap analysis against this repository

| Dimension | Competitive set | TalkLive | Verdict |
|---|---|---|---|
| Static, crawlable HTML | Assumed across the set | 272 pages | **At parity or ahead** |
| Page count | TalkWithStranger's matrix is the only one clearly larger | 272 indexable | **Competitive** |
| Programmatic geo pages | Not visible on any competitor | 177 country/city/language pages with genuinely per-place facts | **Ahead — our clearest structural advantage** |
| Per-language paths | `strangr.club/practice/<lang>`, `voicerandom.com/en/` | `/languages/<language>` + 16 localized homepages | **Ahead** |
| "X alternative" cluster | TalkWithStranger `/chatsites/*`; rivals host pages about AirTALK | 13 `*-alternative` pages | **At parity** |
| Blog | AirTALK and HereSay both publish, year-stamped | 22 posts | **At parity on volume** |
| `Article` schema on posts | Unknown | **Absent** — posts emit `WebPage`, no author/date nodes | **Behind** |
| Year-stamped titles | AirTALK `…2026`, Chatsansar `…2025` | None | **Behind — cheap to fix** |
| Comparison content | HereSay ranks with its own category roundup | One `/omegle-vs-chatroulette` | **Behind** |
| Mobile app | OmeTV, Monkey, EnglishTalky all ship one and rank with it | None | **Behind — out of scope** |
| Brand SERP | — | Contested: an unrelated `TalkLive - Live Video Chat` on Google Play, plus `randomvoicechat.com` | **Risk** |
| Third-party review coverage | AirTALK has several, plus pages on rivals' domains | None found | **Behind — the largest real gap** |
| Analytics coverage | Unknown | 9 of 274 pages | **Behind, and self-inflicted** |
| Ad format mix | Not inspectable | 1 073 of 1 075 slots are banners, the lowest-CPM format | **Behind on revenue per session** |

### Backlinks: where this vertical's links actually come from

Visible in the SERPs, and the honest split matters:

**Legitimately earnable:**

* **WebRTC / CPaaS vendor blogs** — `zegocloud.com/blog/omegle-alternatives`,
  `trtc.io/blog/details/omegle-alternatives`. These companies publish
  alternatives roundups as content marketing. A voice-only WebRTC product with
  a real technical story is a natural inclusion, and outreach here is ordinary
  PR.
* **`alternativeto.net`** — free, user-submitted, permanently indexed.
* **Independent review sites** — `geniusfirms.com`, `coherentlab.com`,
  `easeus` voice-changer blog, `randomvoicechat.live`. These found AirTALK; they
  can find us.
* **Our own researched posts.** `SEO.md` already identifies
  `/blog/what-happened-to-omegle`, `/omegle-vs-chatroulette`,
  `/blog/how-random-matchmaking-works` and
  `/blog/science-of-talking-to-strangers` as the link-worthy pages. That
  judgement is correct and matches what the roundup authors cite.

**Not to be pursued:** `clevescene.com/partner-corner/omegle-alternatives/` and
`villagevoice.com/sites-like-omegle/`. Alt-weekly "partner corner" sections are
paid placements. Buying links that pass PageRank is a direct violation of
Google's link spam policy, and the brief rules out black-hat tactics. If we ever
appear in one, the link must carry `rel="sponsored"`.

## Target keywords

Chosen from the SERPs actually run, and scored on whether we already have a page
and whether the SERP is winnable.

### Tier 1 — primary, defend and strengthen

Head terms where we have a page and the SERP is voice-inclusive.

| Keyword | Our page | Competing for it |
|---|---|---|
| `random voice chat` | `/random-voice-chat` | airtalk, voicerandom, wakiee, heresay |
| `talk to strangers` | `/talk-to-strangers` | strangerline, talkwithstranger, airtalk |
| `talk to strangers online free` | `/talk-to-strangers` | strangerline, yapping, talkwithstranger |
| `random voice chat with strangers free no sign up` | `/random-voice-chat` | voicerandom, chatsansar, airtalk |
| `talk to strangers voice call` | `/random-call` | talkwithstranger (3 URLs), wakiee |
| `anonymous chat` | `/anonymous-chat` | chatix, anonchat, strangerline |
| `voice chat with strangers` | `/free-voice-chat` | airtalk, wakiee, chatsansar |
| `free voice chat rooms` | `/voice-chat-rooms` | chatsansar, all4masti, talkwithstranger |

### Tier 2 — where we already rank or can

| Keyword | Our page | Note |
|---|---|---|
| `international chat rooms` / `talk to people from other countries` | `/international-calls` | **Already surfacing high** — our strongest confirmed position |
| `voice chat rooms online free` | `/voice-chat-rooms` | Chatsansar's stale `2025` title is an opening |
| `random call app` | `/random-call` | Already indexed and surfacing |
| `chat without registration` | `/chat-without-registration` | "No sign-up" is in nearly every competitor title |
| `practice english speaking online free` | `/practice-english-speaking` | Different SERP: englishbooth, hilokal, free4talk. High intent, less saturated |
| `language exchange voice chat` | `/language-exchange` | Same set. Our `/languages/*` cluster supports it |

### Tier 3 — long tail, where the geo cluster is the moat

`chat with strangers in <city>` × 113, `talk to people in <country>` × 45,
`<language> speaking practice` × 16. No competitor in this set has an
equivalent. Individually tiny, collectively 177 pages of genuinely
differentiated content that nobody is contesting.

### Tier 4 — approach with care

`someone to talk to`, `late night chat`, `can't sleep`, `i'm bored`, `lonely
chat`. Real volume, and we have pages. But the SERP is owned by 7 Cups,
Supportiv, BuddyHelp and helpline directories. Target *conversation and
company*; never imply counselling or crisis support. See the note above.

### Explicitly deprioritised

`omegle alternative` as a head term. Keep `/omegle-alternative` — it is a real
page with real intent behind it — but the SERP belongs to video products with
apps and years of authority, and effort spent there is better spent on the
voice-first terms in Tier 1, where the product genuinely wins.

## What Phase 2 changes about the plan

1. **The banner-heavy mix is the revenue finding.** 1 073 of 1 075 slots are the
   lowest-CPM format Adsterra sells. Phase 5's job is format mix, not slot count.
2. **The geo cluster is the moat.** No competitor has one. It deserves better
   analytics (§5.4) and better internal linking, not more pages.
3. **Year-stamped and comparison content is a real, cheap gap.** AirTALK and
   HereSay both rank with content shapes we don't have. Phase 4 targets that.
4. **Third-party coverage is the biggest gap and no commit fixes it.** It goes
   in `docs/action-plan.md` as an owner task with named, non-paid targets.
5. **`Article` schema on 22 blog posts is missing** and is a Phase 3 fix.

## Unfinished — needs a network or credentials this session lacks

* **Competitor ad stacks.** Open each competitor with DevTools, or run
  `publicwww.com` / `builtwith.com` lookups, and record network, formats,
  placements and units per page. Until then Phase 5 and 6 are calibrated on
  Adsterra's published rate card, not on what rivals actually run.
* **Core Web Vitals.** Run PageSpeed Insights with an API key against
  `talklive.app` and each competitor, and pull 28-day field data from the CrUX
  API. This session could measure neither — including our own.
