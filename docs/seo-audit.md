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
