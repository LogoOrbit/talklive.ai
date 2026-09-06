# TalkLive revenue model

Projected monthly ad revenue across traffic tiers and ad densities, and what
the density-versus-retention trade actually costs.

---

## Read this first: everything here is a projection

**There is no first-party revenue or traffic data in this repository.** No
Adsterra earnings export, no Search Console data, no analytics history — and
until the change in commit `bc51975`, 265 of 274 pages had no analytics tag at
all, so there is no history to recover either.

Every number below is therefore built from published vertical benchmarks and
stated assumptions. Each assumption is labelled `[A1]`…`[A9]` and listed in
§7 with what it would take to replace it with a measurement. The arithmetic is
shown in full so any assumption can be changed and the model re-run.

Treat this as a decision tool for *relative* comparisons — three slots versus
five, native versus banner — which is what it is good for. Do not treat the
absolute dollar figures as a forecast. The first month of real Adsterra
reporting will beat this entire document.

---

## 1. Inputs

### 1.1 CPM benchmarks — Adsterra's published rates

From Adsterra's own publisher documentation, gathered in Phase 2:

| Format | Published CPM range | Tier-1 / US |
|---|---|---|
| Popunder | $2 – $10 | disputed: $2.80 in one source, $6–$12 in another |
| Social Bar | $1 – $5 | ~$2.80 |
| Native | $0.50 – $3 | — |
| Banner | $0.10 – $1 | — |

**The order of magnitude is the finding.** Banners are the lowest-paying format
Adsterra sells. Native pays up to 3× as much, Social Bar up to 5×, popunder up
to 10×. Before Phase 5, 1,073 of this site's 1,075 slots were banners.

### 1.2 Audience geography `[A1]`

Adsterra CPMs vary several-fold by country. Assumed audience mix:

| Tier | Share | Basis |
|---|---|---|
| Tier-1 (US, UK, CA, AU, DE) | 15 % | — |
| Tier-2 (E. Europe, LATAM, TR, RU) | 25 % | — |
| Tier-3 (South Asia, SE Asia, Africa) | 60 % | — |

Skewed to Tier-3 deliberately. The site ships a dedicated `/pakistani-chat`
page, its city cluster leans toward Dhaka, Chittagong, Mumbai, Delhi,
Bangalore, Chennai, Cebu and Davao, and the whole product proposition —
voice-only, browser-based, low bandwidth, no app install — is strongest exactly
where data is metered and phones are older. Assuming a Tier-1-heavy audience
would roughly triple every figure here, and would probably be wrong.

### 1.3 Effective CPMs after the geography blend `[A2]`

Taking the conservative end of each published range per tier:

| Format | Tier-1 | Tier-2 | Tier-3 | **Blended** |
|---|---|---|---|---|
| Native | $1.50 | $0.60 | $0.25 | **$0.525** |
| Banner (728×90 / 468×60 / 320×50) | $0.50 | $0.20 | $0.08 | **$0.173** |
| Box (300×250) | $0.90 | $0.35 | $0.14 | **$0.297** |

Worked example for native:
`0.15 × 1.50 + 0.25 × 0.60 + 0.60 × 0.25 = 0.225 + 0.150 + 0.150 = $0.525`

### 1.4 Viewability by slot position `[A3]`

Not every slot on a page is seen. Slots deeper in the document are reached by
fewer readers, and `ads.js` only loads a slot as it approaches the viewport, so
an unreached slot is never even requested. Assumed fill-and-view rate by
position in document order:

| Slot | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Seen | 75 % | 65 % | 55 % | 45 % | 35 % |

This decay is why slot count and revenue are not proportional, and it is the
single most important mechanic in this model.

---

## 2. Revenue per 1,000 pageviews (RPM)

### 2.1 Content pages — the shipped 3-slot layout

Order after Phase 5: native (after prose) → leaderboard (after FAQ) → native
(before footer).

| Slot | Format | CPM | Seen | Impressions / 1,000 PV | Revenue |
|---|---|---|---|---|---|
| 1 | Native | $0.525 | 75 % | 750 | $0.394 |
| 2 | Banner | $0.173 | 65 % | 650 | $0.112 |
| 3 | Native | $0.525 | 55 % | 550 | $0.289 |
| | | | | | **$0.795** |

**Content RPM ≈ $0.79.**

### 2.2 App shell (`/` and `/call`)

Different shape: one pageview, a long session, four slots filling (the fifth is
held back by `maxSlotsPerPage: 4`), and nothing refreshing during a call.

| Slot | Format | CPM | Seen | Impressions / 1,000 sessions | Revenue |
|---|---|---|---|---|---|
| Setup leaderboard | Banner | $0.173 | 85 % | 850 | $0.147 |
| Call-panel leaderboard | Banner | $0.173 | 50 % | 500 | $0.087 |
| Call-panel box | Box | $0.297 | 45 % | 450 | $0.134 |
| SEO-section native | Native | $0.525 | 35 % | 350 | $0.184 |
| | | | | | **$0.552** |

**App RPM ≈ $0.55.**

Lower than a content page despite more slots, because three of the four are
banners and the deeper ones are below a long call UI. That is the argument for
the format-mix work in §6, not for adding a fifth slot.

### 2.3 Blended `[A4]`

Assume 80 % of pageviews are content pages (272 of 282 URLs are content) and
20 % are the app shell:

`0.80 × $0.795 + 0.20 × $0.552 = $0.636 + $0.110 =` **$0.746 blended RPM**

---

## 3. Monthly revenue by traffic tier

| Monthly pageviews | Content (80 %) | App (20 %) | **Monthly ad revenue** | Annualised |
|---|---|---|---|---|
| 25,000 | $15.90 | $2.76 | **$19** | $224 |
| 100,000 | $63.60 | $11.04 | **$75** | $896 |
| 250,000 | $159.00 | $27.60 | **$187** | $2,239 |
| 500,000 | $318.00 | $55.20 | **$373** | $4,478 |
| 1,000,000 | $636.00 | $110.40 | **$746** | $8,957 |
| 2,000,000 | $1,272.00 | $220.80 | **$1,493** | $17,914 |

### Sensitivity to the geography assumption

`[A1]` moves everything. Same traffic, different audience mix:

| Monthly pageviews | Tier-3 heavy (as modelled) | Even split across tiers | Tier-1 heavy (50/30/20) |
|---|---|---|---|
| 100,000 | $75 | $137 | $221 |
| 500,000 | $373 | $687 | $1,107 |
| 2,000,000 | $1,493 | $2,748 | $4,428 |

**A US/UK-weighted audience is worth roughly 3× a South-Asia-weighted one at
identical traffic.** That is not a reason to stop serving Tier-3 — it is most of
the addressable audience for a low-bandwidth voice product — but it does mean
Tier-1 content and rankings are worth disproportionately more per visit, which
is a real input to which keywords to chase next.

---

## 4. Density scenarios

Applying the same position-decay from `[A3]`. Slots added beyond the third are
assumed to be native, the best-paying format available to us.

| Scenario | Content slots | RPM | vs shipped | Verdict |
|---|---|---|---|---|
| **Lean** | 2 (native, leaderboard) | $0.506 | −36 % | Leaves money on the table |
| **Shipped** | 3 (native, leaderboard, native) | $0.795 | — | Current |
| **Heavy** | 4 (+ native) | $1.031 | +30 % | Viable, needs monitoring |
| **Aggressive** | 5 (+ native) | $1.215 | +53 % | Below the risk line — see §5 |
| **Aggressive + popunder** | 5 + popunder | ~$2.5 – $4 | +215 %+ | **Excluded, see §5.3** |

Slot-4 arithmetic: `450 impressions × $0.525 / 1000 = $0.236`, added to $0.795.
Slot-5: `350 × $0.525 / 1000 = $0.184`.

**Note the shape.** Slot 4 adds $0.236; slot 5 adds $0.184; a sixth would add
about $0.13. Position decay means each slot earns less than the last while
costing the same in page weight, clutter and risk. Revenue is concave in slot
count and risk is not.

Monthly revenue at each density:

| Monthly pageviews | Lean (2) | **Shipped (3)** | Heavy (4) | Aggressive (5) |
|---|---|---|---|---|
| 100,000 | $51 | **$75** | $93 | $108 |
| 500,000 | $256 | **$373** | $467 | $541 |
| 2,000,000 | $1,022 | **$1,493** | $1,867 | $2,163 |

---

## 5. Density versus retention

### 5.1 The gradual cost `[A5]`

Assumed, and not measured here: each content slot beyond the third costs about
3 % of returning sessions and 4 % of pages-per-session. Compounding over two
extra slots gives roughly `0.94 × 0.92 ≈ 0.865` — a 13.5 % reduction in
pageviews.

Applied to the aggressive scenario:

`$1.215 RPM × 0.865 traffic = $1.051 effective` versus `$0.795` shipped — still
**+32 %**.

**So on gradual retention effects alone, higher density wins.** Stating that
plainly matters, because the argument against it is not this one, and pretending
otherwise would be dishonest modelling in service of a conclusion.

### 5.2 The discontinuous cost — the real argument `[A6]`

The risk that matters is not a slow bleed. It is a step function:

* **Google's page-layout algorithm** demotes pages that are ad-heavy above the
  fold.
* **Google's Publisher Ads Audits** flags any page where ads exceed **30 % of
  viewport height** — a threshold originating with the Coalition for Better Ads.
* **Chrome can block every ad on a site** that repeatedly breaks the Better Ads
  Standards. Revenue goes to zero and stays there while the site is remediated.
* **Helpful-content signals** treat ad-to-content imbalance as a quality signal.

Expected-value comparison over twelve months, assuming a demotion costs 50 % of
organic traffic for six months plus a recovery period `[A6]`:

| Density | Annual revenue if nothing goes wrong | Assumed annual probability of a demotion or ad-filter flag | Expected annual revenue |
|---|---|---|---|
| Shipped (3) | $8,957 | 2 % | **$8,868** |
| Heavy (4) | $11,613 | 8 % | $11,148 |
| Aggressive (5) | $12,969 → $14,976 with retention drag applied | 25 % | $11,232 |
| Aggressive + popunder | ~$30,000 | 60 %+ | **negative once recovery cost is counted** |

At 1M pageviews per month, four slots is defensible and five is roughly a wash
with far more variance. Those probabilities are judgement, not data — but the
shape does not depend on their exact values, because ad revenue scales linearly
with density while catastrophic risk does not.

### 5.3 Why popunders and interstitials are excluded outright

They are the highest-CPM formats in §1.1 and they are not on the table:

1. The brief forbids intrusive interstitials.
2. They are what category roundups mean when they complain that Omegle
   alternatives are "overwhelmed by bots, aggressive monetization, or weak
   safety controls" — the reputational cost lands in exactly the comparison
   articles that drive discovery in this vertical.
3. **This site's entire acquisition strategy is organic search.** A Chrome
   ad-filter flag or a manual action removes the traffic that the ads monetise.
   Optimising the monetisation of traffic in a way that destroys the traffic is
   not a trade, it is a mistake.

### 5.4 The retention asset that is not in the table

Phase 5 removed a banner from inside the live call panel and another from the
live text-chat view. In this model those removals cost a little revenue.

They are worth more than they cost for a reason the RPM arithmetic cannot show:
a creative directly above a hang-up button produces accidental clicks, and
**invalid-traffic ratios are what get publisher accounts terminated.** The
downside is not a lower CPM on that unit; it is losing the Adsterra account and
with it all of the revenue in every table above.

---

## 6. Where the actual upside is

Not in more slots. In three things:

### 6.1 Format mix — the largest controllable lever

Blended native ($0.525) pays **3.0×** blended banner ($0.173). The app shell is
still three-quarters banner.

Converting the two call-panel banners to native and box formats, if it holds
viewability, moves app RPM from $0.552 toward roughly $0.85 — **+54 % on that
surface with no additional slots and no density risk.** Requires an A/B test
against real numbers, which requires §6.3 first.

### 6.2 The unused desktop rail

`skyscraper` (160×600 / 160×300) is implemented in `ads.js` and placed nowhere.
On the 251 long-form desktop pages, a sticky sidebar is the highest-viewability,
zero-CLS unit available — it never pushes content because it is not in the flow.

Not shipped in Phase 5: `seo.css` is a single-column layout, and converting 265
pages to a grid is a real change with real CLS risk that could not be verified
against field data in this environment. It is the best-value item in the
quarter column of `docs/action-plan.md`.

### 6.3 `ads.txt` — currently returning 404

`GET /ads.txt` serves `process.env.ADS_TXT` and 404s while that is unset, which
it is. Several demand partners read a missing `ads.txt` as unauthorised
inventory and bid lower or not at all.

**This is a five-minute task that plausibly raises every CPM in this document,
and it needs nothing but the seller lines from the Adsterra dashboard.** It is
the highest ratio of value to effort anywhere in this engagement.

### 6.4 Premium, for scale

`/pricing` advertises a $10/month ad-free tier that is not on sale — there is no
Stripe code in this repository. At 1M monthly pageviews and a 0.15 % conversion
`[A7]`, a subscription tier would be worth roughly $1,500/month against $746
from ads on the same traffic.

**Subscription revenue is likely the larger business.** It is out of scope here
(the brief puts Stripe off limits) but it belongs in any honest revenue picture,
and it changes the density calculus: every additional ad slot slightly reduces
the appeal of paying to remove ads.

---

## 7. Assumptions, and how to replace each one

| # | Assumption | Value used | How to replace it |
|---|---|---|---|
| A1 | Audience geography | 15/25/60 T1/T2/T3 | GA4 Countries report, ~30 days after `bc51975` |
| A2 | CPM by tier | Conservative end of Adsterra's published ranges | Adsterra dashboard, statistics by country |
| A3 | Viewability by slot position | 75/65/55/45/35 % | Adsterra impressions per slot ÷ GA4 pageviews |
| A4 | Content vs app pageview split | 80 / 20 | GA4 Pages report |
| A5 | Retention cost per extra slot | −3 % sessions, −4 % pages/session | A/B via `ADS_CONFIG` (§8) |
| A6 | Probability of demotion by density | 2 / 8 / 25 / 60 % | Judgement. Not measurable in advance |
| A7 | Premium conversion | 0.15 % | Requires a live checkout |
| A8 | Pages per session | Folded into the RPM basis | GA4 Engagement report |
| A9 | Fill rate vs viewability | Combined into A3 | Adsterra "impressions vs requests" |

`[A6]` is the one that cannot be resolved by measurement. Everything else
becomes a fact within about a month of real data.

---

## 8. Running the density test for real

`public/ads-config.json` and the `ADS_CONFIG` environment variable exist so that
`[A5]` can be measured rather than assumed, without a code change or a deploy:

```sh
# Two weeks at the shipped density — the baseline.
fly secrets unset ADS_CONFIG

# Two weeks one slot heavier.
fly secrets set ADS_CONFIG='{"maxSlotsPerPage":4}'

# If anything goes wrong, or a creative misbehaves:
fly secrets set ADS_CONFIG='{"enabled":false}'
```

Compare, from GA4 and Adsterra over identical windows: sessions, pages per
session, returning-visitor share, and Adsterra revenue. Total revenue is the
metric, not RPM — a density that raises RPM while lowering sessions can easily
be worse.

Run it for a fortnight per arm minimum. Ad revenue is noisy at low volume, and
a three-day read on this traffic tier is not a result.

---

## 9. Summary

* At 100k monthly pageviews the shipped layout projects **≈ $75/month**; at 1M,
  **≈ $746/month** — Tier-3-weighted, and roughly 3× that on a Tier-1-weighted
  audience.
* Phase 5 cut 1,075 slots to 805 and removed two units from live conversation
  UI. On this model that costs a little revenue and buys back layout stability
  and account safety, which is the right trade.
* **Adding slots is the worst available lever**: revenue is concave in slot
  count while risk is not, and the site's whole traffic supply depends on the
  search rankings that density puts at risk.
* **The best levers, in order:** fix `ads.txt` (five minutes, needs
  credentials); shift the app shell from banner to native (+54 % on that
  surface); add the desktop skyscraper rail; and get four weeks of real data so
  this document can be replaced with measurements.
