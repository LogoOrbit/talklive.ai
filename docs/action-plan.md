# TalkLive action plan

What to do next, ranked by impact against effort, with the exact file or
setting for every row.

Impact is scored against the two goals in the brief — organic search traffic
and ad revenue — using the projections in `docs/revenue-model.md` and the
findings in `docs/seo-audit.md`. Effort is engineering time for a developer who
knows this repository.

**Rows marked 🔑 need credentials or an account this repository does not have.**
They are not code tasks and cannot be closed from here, and several are the
highest-value items on the list.

---

## Already shipped in this engagement

For context on what the rows below build on. All pushed to `main`.

| Commit | What |
|---|---|
| `3208042` | `docs/seo-audit.md` — Phase 1 audit |
| `8104aac` | Sitemap split into a `<sitemapindex>` over six children |
| `bc51975` | GA4 on 265 previously untagged pages |
| `6c0aa62` | `ItemList` schema on the three geo hubs |
| `0589ca2` | Phase 3 record and page-speed measurements |
| `05932b6` | Nine blog articles and one landing page |
| `c944ebb` | Ad layout: 1,075 slots → 805, CLS 0.0112 → 0.0000, runtime config |

---

## This week

| # | Action | File or setting | Impact | Effort |
|---|---|---|---|---|
| 1 | 🔑 **Fill in `ads.txt`.** It 404s today, and several demand partners read that as unauthorised inventory and bid low or not at all. Copy the seller lines from Adsterra → Websites → ads.txt | `fly secrets set ADS_TXT='...'` — consumed by `server/index.js:501` | **High** — plausibly lifts every CPM in the revenue model | 5 min |
| 2 | 🔑 **Submit the new sitemap index.** The six child sitemaps are new; Search Console must be told, and this is what makes per-cluster coverage visible | Search Console → Sitemaps → `https://talklive.app/sitemap.xml` | **High** — the country and city clusters become individually monitorable | 10 min |
| 3 | 🔑 **Verify GA4 is receiving from the new pages.** 265 pages were tagged in `bc51975`; confirm they report before relying on any of it | GA4 Realtime, filtered to `/cities/`, `/countries/`, `/blog/` | **High** — gates every later decision | 10 min |
| 4 | 🔑 **Check Adsterra for policy warnings** after the layout change, and confirm the two removed in-call units are gone from reporting | Adsterra dashboard → Websites | Medium — confirms the invalid-traffic risk is closed | 10 min |
| 5 | **Confirm the deploy shipped clean.** Seven pushes to `main` since `72e0249`, each auto-deploying via `.github/workflows/fly-deploy.yml` | GitHub Actions → Deploy to Fly.io | **High** — a red build means none of this is live | 5 min |
| 6 | 🔑 **Re-run PageSpeed on a landing page and the app shell.** No Core Web Vitals could be measured in this session — the API quota was exhausted and CrUX needs a key. The CLS fix is verified in a local browser only | PageSpeed Insights on `/talk-to-strangers` and `/` | **High** — the one unverified claim in the ad work | 15 min |

---

## This month

| # | Action | File or setting | Impact | Effort |
|---|---|---|---|---|
| 7 | **Run the density A/B.** `[A5]` in the revenue model is assumed, not measured, and this is the whole reason the runtime config exists. Two weeks per arm, compare total revenue and sessions — not RPM | `fly secrets set ADS_CONFIG='{"maxSlotsPerPage":4}'`, then unset. Procedure in `docs/revenue-model.md` §8 | **High** — replaces the model's weakest assumption with a fact | 30 min + 4 weeks elapsed |
| 8 | **Shift the app shell from banner to native.** Three of its four slots are banners at $0.173 blended; native is $0.525. Projected +54 % on that surface with no extra slots | `public/index.html` — the `leaderboard` slots at the setup panel and under the video banner | **High** — the largest controllable revenue lever | 1 h + a fortnight to read |
| 9 | 🔑 **Create real social profiles, then add `sameAs`.** Deliberately absent because inventing URLs would assert ownership of accounts we do not control. It is the strongest entity signal still unused | `entityGraph()` in `scripts/build-seo.js`, and the `Organization` block in `public/index.html` | **High** — strongest remaining entity signal | 2 h once the profiles exist |
| 10 | 🔑 **Outreach for third-party coverage.** The largest genuine gap found in Phase 2. Earnable targets: `zegocloud.com/blog`, `trtc.io/blog` (both publish alternatives roundups as content marketing), `alternativeto.net` (free listing), independent reviewers like `geniusfirms.com`. Lead with the researched pages, not the commercial ones | No file — `marketing/LAUNCH-PLAN.md` has the channel list | **High** — nothing in this repo affects off-site authority | Ongoing |
| 11 | **Do not buy the alt-weekly placements.** `clevescene.com/partner-corner/` and `villagevoice.com/sites-like-omegle/` rank for our terms and are paid placements. Paid links that pass PageRank violate Google's link spam policy. If we ever appear in one, it must carry `rel="sponsored"` | — | Medium — avoids a manual action | 0 |
| 12 | **Add year-stamped titles to the evergreen guides.** AirTALK ranks with `…2026` titles; Chatsansar is losing ground with a stale `2025`. Needs a yearly refresh commitment, or it becomes the same liability | `title` fields in `scripts/build-seo.js` `CORE_BLOG`, `scripts/blog-extra.js`, `scripts/blog-extra3.js` | Medium | 1 h |
| 13 | **Gate ads behind Premium in the loader.** `ads.js` never consults premium state; `app.js` tracks `isPremiumUser` from the `premium-status` socket event. Harmless today because nothing is on sale — the day checkout ships, paying users see ads on the page that sold them an ad-free tier | `public/ads.js` — add a premium check to `eligible()` | Medium — a correctness bug waiting for a launch | 1 h |
| 14 | **Tune the native slot reservation with field data.** Every other reservation is exact; native is a deliberate over-estimate (250 px mobile / 180 px desktop) because its height depends on what the network returns | The `[data-ad="native"]` block in `seo.css`, `style.css`, `chat.css` | Medium — recovers whitespace, protects CLS | 30 min once CrUX data exists |
| 15 | **Translate the top 5–10 landing pages properly.** Only the 16 homepages are localized; the landing pages are English everywhere. Machine-translating 260 pages would be the thin content that gets sites demoted — translate the few that Search Console shows impressions for, with review | `scripts/locales.js`, extending it beyond homepages | Medium-High in those markets | 1–2 days + translator |

---

## This quarter

| # | Action | File or setting | Impact | Effort |
|---|---|---|---|---|
| 16 | **Add the desktop skyscraper rail.** `skyscraper` (160×600 / 160×300) is implemented in `ads.js` and placed nowhere. On 251 long-form desktop pages a sticky sidebar is the highest-viewability, zero-CLS unit available — it never pushes content because it is out of flow. Not shipped in Phase 5 because `seo.css` is single-column and converting 265 pages to a grid needs CLS verification against real field data | `.wrap`/`main` layout in `public/seo.css`, plus a slot in the landing and blog templates in `scripts/build-seo.js` | **High** — new inventory in the best-paying position, no density increase on mobile | 1–2 days |
| 17 | **Fix the orphaned generators, or formally retire them.** `scripts/geo-pages.js`, `pages-extra2.js` and `blog-extra2.js` produce 177+ pages that ship from disk and are no longer regenerated. Every sitewide change now needs a migration sweep — there are four (`migrate-schema`, `migrate-hub-schema`, `migrate-adsterra`, `migrate-analytics`) and each one is a workaround for this. `SEO.md` documents why the naive fix deletes 14–18 % of those pages' text | `scripts/geo-pages.js` and `pageHtml()` in `scripts/build-seo.js` | **High** structurally — removes the tax on every future change | 3–5 days, 177 pages of regression surface |
| 18 | **Add a comparison / roundup content cluster.** HereSay ranks for our head terms with its own category roundup; we have one comparison page. A researched, honestly-written roundup is also the most link-earning shape in this vertical | New entries in `scripts/blog-extra3.js` | Medium-High — rankings and links together | 2–3 days |
| 19 | 🔑 **Build a real review system, then restore rating schema.** `aggregateRating` was removed sitewide after being found fabricated — correct call, and it must not come back without real reviews. Two Search Console suggestions stay open until there is a genuine source | A new feedback surface, then `entityGraph()` in `scripts/build-seo.js` | Medium — rich-result stars in a competitive SERP | 1–2 weeks |
| 20 | **Split `app.js` and `style.css`.** 196 kB and 127 kB, unminified, serving `/` and `/call`. Left alone deliberately: it means touching WebRTC code the brief puts off limits, it is high regression risk on the screen that must never break, and it affects 2 URLs rather than the 272 carrying organic traffic. Worth doing eventually, on its own, with its own testing | `public/app.js`, `public/style.css` | Low for SEO, Medium for app UX | 1 week |
| 21 | **Decide on Premium.** `/pricing` advertises a $10/month ad-free tier with no checkout behind it. At 1M pageviews and 0.15 % conversion it would be worth roughly 2× the ad revenue on the same traffic. Out of scope here — the brief puts Stripe off limits — but it is probably the larger business, and every ad slot slightly reduces the appeal of paying to remove ads | Out of scope for this repo's current state | **High** commercially | Product decision |

---

## Deliberately not doing

| Not doing | Why |
|---|---|
| Popunders, interstitials, push ads | Highest CPM in the inventory and excluded on the brief. They are what roundups mean by "aggressive monetization", and a Chrome ad-filter flag would remove the organic traffic the ads exist to monetise |
| More than 4 ad slots per content page | Revenue is concave in slot count (`docs/revenue-model.md` §4) and risk is not. Slot 5 adds $0.18 RPM and a materially higher demotion probability |
| Buying links | Google link spam policy. See row 11 |
| Machine-translating 260 landing pages | Thin auto-generated content at scale is what gets sites demoted. Row 15 is the honest version |
| Reviving the orphaned generators with a one-line `concat` | Measured in `SEO.md`: strips 14–18 % of visible text and the entire footer link graph from 177 pages. Row 17 is the real version |
| A keyword-to-URL matrix like TalkWithStranger's | It works at their authority level and is also cannibalisation. Phase 2 flagged it as a pattern not to copy |
| Restoring `aggregateRating` without reviews | Fabricated review markup risks a manual action against the whole domain. Row 19 |
| Chasing `omegle alternative` as a head term | The SERP belongs to video products with app stores and years of authority. The voice-first terms are where the product genuinely wins |
| Positioning the late-night pages as support | 7 Cups, Supportiv and helpline directories own that SERP, Google treats it as YMYL, and it would be a bad thing to do. Target company and conversation, never counselling |

---

## Top five, if only five things happen

1. **Row 1** — `ads.txt`. Five minutes, needs only the Adsterra dashboard, plausibly lifts every CPM.
2. **Row 3** — confirm GA4 is reporting. Everything downstream depends on it.
3. **Row 7** — run the density A/B. The mechanism is already shipped and unused.
4. **Row 8** — banner → native on the app shell. The largest controllable revenue lever.
5. **Row 10** — third-party coverage. The largest SEO gap, and no commit can close it.

Three of those five need credentials rather than code.
