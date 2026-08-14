# TalkLive SEO

How search visibility is built here, what is automated, and the short list of
things that still need a human with credentials.

Everything in `public/` that is a landing page, a blog post, a localized
homepage, a sitemap, `llms.txt` or the IndexNow key file is **generated**. Do
not hand-edit those files — run `npm run build:seo` and edit the source:

| Source | Produces |
|---|---|
| `scripts/build-seo.js` | the page/blog/locale templates, all schema, sitemaps, RSS, `llms.txt` |
| `scripts/data/geo.js` | country + city + language facts |
| `scripts/geo-pages.js` | `/countries/*`, `/cities/*`, `/languages/*` and their hubs |
| `scripts/pages-extra.js`, `pages-extra2.js` | hand-written landing pages |
| `scripts/blog-extra.js`, `blog-extra2.js` | hand-written articles |
| `scripts/locales.js` | the 16 localized homepages |
| `scripts/seo-lastmod.json` | committed `lastmod` manifest (see below) |

Hand-maintained pages that the builder does **not** touch: `index.html`,
`chat.html`, `landing.html`, `about.html`, `contact.html`, `pricing.html`,
`privacy.html`, `terms.html`, `refund.html`.

---

## The three domains

We own `talklive.app`, `talklive.xyz` and `talklive.site`.

**Only `talklive.app` is a website.** The other two 301 to it, preserving path
and query, with or without `www`. That is not a limitation — it is the correct
configuration, and the alternative is actively harmful. Three domains serving
the same pages is three sites competing with each other for the same queries,
splitting inbound links three ways and giving Google a duplicate-content
problem to resolve on its own. Consolidating means every link to any of the
three credits one origin.

How it is enforced, in two layers:

- `fly.toml` sets `ALIAS_HOSTS = 'talklive.xyz,talklive.site'`, and
  `server/index.js` 301s any request whose host is an alias (or `www.` of the
  canonical) to `https://talklive.app` + the original path.
- Any host that is not the canonical one is additionally served
  `X-Robots-Tag: noindex, nofollow`, which covers `*.fly.dev` preview
  hostnames.

Verified working, single hop each:

```
talklive.xyz/pricing      301 -> https://talklive.app/pricing
www.talklive.xyz/pricing  301 -> https://talklive.app/pricing
talklive.site/pricing     301 -> https://talklive.app/pricing
www.talklive.site/pricing 301 -> https://talklive.app/pricing
www.talklive.app/pricing  301 -> https://talklive.app/pricing
```

**Do not** "activate" the other two domains by serving content on them, and do
not change `CANONICAL_HOST`. Both would deindex or fragment the site.

**Do** add all three domains to Google Search Console and Bing Webmaster Tools
as separate properties even though two of them only redirect — that is how you
see whether anyone still links to the old domains and whether the redirects are
being followed.

---

## What is on the site

| Cluster | URLs | Sitemap |
|---|---|---|
| Homepage, 16 localized homepages, policy pages | 23 | `sitemap-main.xml` |
| Hand-written landing pages + guides hub | 43 | `sitemap-pages.xml` |
| 45 country pages + hub | 46 | `sitemap-countries.xml` |
| 113 city pages + hub | 114 | `sitemap-cities.xml` |
| 16 language pages + hub | 17 | `sitemap-languages.xml` |
| 22 blog posts + index | 23 | `sitemap-blog.xml` |

**266 indexable URLs**, up from 76.

`/sitemap.xml` is a **sitemap index** pointing at those six. Search Console
reports indexing coverage per submitted sitemap, so splitting them is what
turns "612 of 700 indexed" into knowing *which cluster* is being dropped.

### On programmatic pages

The country, city and language pages are generated from data, which is the
format Google is most suspicious of — the usual version is one template with a
name swapped in, which is a doorway page. The defence is in `scripts/data/geo.js`:
every entry carries facts true of exactly one place (languages actually spoken,
local timezone and peak hours, cities searched alongside it, a paragraph of
genuine context). No two generated pages share a paragraph of body copy, and
every page would be *wrong* under any other heading. That is the real test.

If you add countries or cities, hold to that standard. A city whose `note` could
be pasted onto another city should not get a page.

---

## Structured data

Every generated page emits one JSON-LD `@graph` with stable `@id`s:

- `#organization` and `#website` — identical on every page, so search engines
  consolidate them into one entity instead of 260 unrelated publisher blocks.
- `#app` — one `WebApplication` for the whole site, not one per page.
- `#primaryimage` — the shared `ImageObject`, referenced by `@id`.
- Per page: `WebPage` (with `speakable`), `BreadcrumbList`, `FAQPage`, `HowTo`.

Breadcrumbs are emitted **twice** — as `BreadcrumbList` and as visible markup —
because structured data describing navigation the user cannot see is the exact
mismatch Google's guidelines warn about.

### Removed: fabricated review ratings

Every landing page previously claimed `aggregateRating: 4.7 from 2,840 ratings`.
No review system ever produced that number. Fabricated review markup violates
Google's structured data policies, risks a manual action against the whole
domain, and gets rich results pulled site-wide. It has been removed from all 37
pages that carried it.

If real ratings are ever collected, they can go back — sourced from real
reviews, displayed on the page, visible to the user. Do not reintroduce them
otherwise.

---

## Accurate `lastmod`

`scripts/seo-lastmod.json` is committed and maps each URL to a hash of its
**source data** plus the date that hash last changed. A build only moves a
page's `lastmod` when its content actually changed.

This matters: previously every deploy stamped all ~700 URLs with the build date,
telling Google the whole site had changed every time. Google's guidance is that
it starts ignoring `lastmod` entirely from sites that do that — and `lastmod` is
the signal that gets a genuinely updated page recrawled quickly.

The hash is taken over the page's source object, not its rendered HTML, because
the rendered HTML embeds the build date and would always differ.

---

## Multilingual

16 localized homepages at `/<code>/`, plus English at `/`. Every member of the
cluster lists the full hreflang set including `x-default`, as Google requires,
and reciprocity is verified by the checks below.

The localized pages are also linked from the footer of every English page, with
`hreflang` on each anchor. Before that they were reachable only through hreflang
annotations and the sitemap — neither of which is a link — so all 16 were
orphans. That is the worst thing you can do to a multilingual setup, because
those pages are exactly the ones with no other discovery path in their market.

**Not done:** translated *landing pages*. Only the homepages are localized. The
honest reason is that machine-translating 260 pages into 16 languages produces
precisely the thin auto-generated content that gets a site demoted, and there is
nobody to review the output. The localized homepages link into the English pages
under a heading, in each language, that says the linked pages are in English.

The right next step is to translate the highest-traffic 5–10 landing pages
properly, per language, prioritised by which markets Search Console shows
impressions in.

---

## Performance

`server/compress.js` Brotli/gzips every text response. Before it existed, Fly
passed bodies through untouched and Express compressed nothing, so every cold
visit transferred everything raw:

| Asset | Was | Now (br) |
|---|---|---|
| `style.css` | 121.8 kB | 26.3 kB |
| `app.js` | 189.0 kB | 48.5 kB |
| homepage HTML | 112.3 kB | 26.9 kB |
| a landing page | ~24 kB | ~8 kB |
| `sitemap.xml` | 37.6 kB | 1.0 kB |

Implemented on Node's built-in `zlib` rather than the `compression` package: no
new dependency on a repo that deploys via `npm ci`, and `compression` still
cannot do Brotli, which beats gzip by another 15–20% on HTML and CSS. Compressed
static bodies are cached by ETag so a repeat hit costs a map lookup.

`loading.js` also no longer runs on the ~260 server-rendered pages as a
render-blocking script painting an opaque full-viewport curtain. Those pages
arrive fully rendered with one stylesheet — there is no flash to hide, so the
curtain could only ever delay the paint it was covering. It now loads with
`defer` and `data-mode="nav-only"` there, keeping the click-to-navigate feedback.
The app shells at `/` and `/chat` are unchanged; they build their UI in
JavaScript and genuinely need it.

Measured on a landing page: **CLS 0**, single render-blocking resource
(`seo.css`, which is the one you want).

---

## Verification

Run the server locally and check, before any deploy that touches SEO:

```sh
npm run build:seo
node server/index.js            # then, against it:
```

- **Broken links / orphans** — crawl from `/` and compare against files on disk.
  Current state: 0 broken, 0 orphans across 268 pages.
- **Canonicals** — every page self-canonical except `/landing`, which
  deliberately canonicalises to `/` (it is an alternate rendering of the
  homepage served on `LANDING_HOST`).
- **hreflang reciprocity** — if A lists B, B must list A.
- **Sitemap parity** — every indexable page in exactly one sitemap, and no
  `noindex` page in any of them. `/chat` is `noindex` and correctly excluded.
- **SERP budgets** — titles ≤ 60 chars, descriptions ≤ 158. `fitTitle` and
  `fitDescription` in `build-seo.js` enforce this at emit time, trimming at the
  brand suffix, then a dash clause, then a sentence, then a word.
- **Accessibility** — skip link, one `h1`, no heading-level jumps, `<main>`
  landmark, accessible names on all links and buttons, no duplicate ids.
- **JSON-LD** — all blocks must parse. Paste a page into
  <https://validator.schema.org/> and Google's Rich Results Test.

---

## Still needs a human with credentials

These cannot be done from the repo. Roughly in order of value.

### 1. Search Console + Bing Webmaster Tools

Add all three domains as properties. Submit `https://talklive.app/sitemap.xml`.
Bing Webmaster Tools can import directly from Search Console.

Then watch the per-sitemap coverage: the country and city clusters are the ones
worth monitoring, because if Google decides they are thin it will show up there
first as "Crawled – currently not indexed".

### 2. `sameAs` — social profiles

The single strongest entity signal available, and it is deliberately **absent**
from the schema. `sameAs` must point at profiles that genuinely belong to us,
and inventing plausible URLs would assert ownership of accounts we do not
control.

Create real profiles (X, Instagram, TikTok, YouTube, Reddit, LinkedIn — the
first three are where this category's audience actually is; see
`marketing/GLOBAL-GROWTH.md`), then add them to `entityGraph()` in
`scripts/build-seo.js` and to the `Organization` block in `public/index.html`.

### 3. Google Business Profile — not applicable, and that is the right answer

GBP requires either a physical storefront customers visit or a defined
service area where staff travel to customers. TalkLive is a global digital
product with neither. Creating a profile with an address that is not a real
place of business is a policy violation and gets the listing suspended.

The genuine equivalents for a product like this are already built: a strong
`Organization` entity with a stable `@id`, and geographic relevance through the
country and city pages rather than through a map pin. If a registered business
address ever exists and customers can visit it, revisit this — otherwise the
correct action is to not create one.

### 4. Backlinks

Nothing in this repo affects off-site authority, and it is the largest remaining
lever. `marketing/LAUNCH-PLAN.md` and `marketing/POST-KIT.md` cover the
channels. The pages most likely to earn links on merit are the researched ones —
`/blog/what-happened-to-omegle`, `/omegle-vs-chatroulette`,
`/blog/how-random-matchmaking-works`, `/blog/science-of-talking-to-strangers` —
rather than the commercial landing pages.

### 5. Real ratings

If you want rating stars in results, collect actual reviews. See the removal
note above; do not shortcut this.

---

## IndexNow

`server/indexnow.js` pushes every sitemap URL to Bing, Yandex, Seznam and Naver
about a minute after boot, so every deploy re-submits automatically. Manual run:
`npm run seo:ping`.

It follows the sitemap **index** one level down into the child sitemaps. Reading
`/sitemap.xml` alone would submit six sitemap URLs and zero pages — a silent
no-op. If you change the sitemap structure, check this still resolves to page
URLs.
