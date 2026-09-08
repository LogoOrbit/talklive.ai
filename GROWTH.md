# TalkLive growth and monetisation

What the competition actually does, what TalkLive is missing, what has now been
built, and what to do next in priority order.

SEO is not covered here - the search surface is already comprehensive and is
documented in **[SEO.md](SEO.md)**. This is about the two things SEO cannot fix
on its own: **turning visitors into repeat users**, and **turning users into
revenue**.

---

## 1. The honest diagnosis

Before this change set, the product was in an unusual position: the *hard*
things were done well and the *easy* things were missing.

**Genuinely strong already:**

- The core product works and is differentiated. Voice-only, peer-to-peer,
  no sign-up, no camera. That is the right wedge (see §2).
- 169 indexed pages, full schema graph, hreflang across 17 languages,
  IndexNow, generated sitemaps, an internal link graph of ~8,900 links.
  This is a better search surface than most competitors in the category.
- Real moderation and safety machinery: reports, blocks, auto-bans, an owner
  dashboard, audit log.
- Retention *features* exist - friends, friend chat, call-backs, hearts,
  rematching - which is more than most random-chat sites have.

**What was missing, and it was the whole business:**

| Gap | Consequence |
|---|---|
| No payment path at all | `/pricing` said "coming soon". Revenue was **$0 by construction**, no matter how much traffic arrived. |
| Premium grants could not expire | Even a manual sale would have been a permanent grant. Subscriptions were impossible. |
| No way to reach a user who closed the tab | A friendship made on the site was only reachable while both tabs were open. No email, no phone, no push - so no way to bring anyone back. |
| Not installable | No home-screen icon, no app-like presence, no offline shell. Every visit had to be re-earned from search. |
| Referral link was a dead string | The share button emitted `?ref=invite` - identical for every user, attributable to nobody, rewarding nobody. |
| Call duration was never measured | "Did anyone actually have a conversation?" was invisible. A two-second skip and a twenty-minute call counted identically. |

Traffic without retention is a leaky bucket, and traffic without a payment path
is a leaky bucket with no tap. Both are now fixed in code; §5 lists what still
needs credentials.

---

## 2. How the competitors work

### AirTalk (airtalk.live) - the closest comparable

Same wedge as TalkLive: browser-based, voice-only random matching, no video, no
sign-up for the basic loop. Their published positioning:

- Free: random voice matching for everyone.
- Free account: unlocks a **country filter**.
- **Paid**: unlocks a **gender filter**, marketed as "AI voice-pattern based".
- Safety framing leans hard on "no camera, AI moderation, one-tap block".
- They publish a content blog and rank for the same alternative-to-Omegle
  cluster TalkLive targets.

Two things worth copying and one worth beating:

- **Copy the ladder.** They gate country behind a free account and gender behind
  payment. That is a deliberate two-step: the account capture is paid for with a
  filter, and the filter people actually want most is the one behind money.
  TalkLive currently gates gender behind premium and gives country away free -
  same instinct, but it skips the account-capture rung.
- **Copy the framing.** "AI gender filter" is a better product name than "gender
  filter" for the same feature. Naming the mechanism sells it.
- **Beat them on returning.** Neither they nor the rest of the category solve
  re-engagement: it is a browser tab you visit once. Push notifications plus an
  installable app is the one structural advantage available here, and it is what
  §3 builds.

### The wider category (Omegle successors, Monkey, Azar, Holla, Chatspin, OmeTV)

Two revenue models dominate, and they are worth understanding precisely because
TalkLive should pick one deliberately rather than drift into both.

**Model A - the coin economy** (Azar, Monkey, most mobile-first apps).
Users buy coins ("gems"). Coins buy gender filters, region filters, "super
matches", profile boosts, and the ability to reconnect with someone. Free users
earn a trickle of coins by watching rewarded video ads and by daily streaks.

- *Why it earns:* it converts intent at the exact moment of desire ("I want to
  talk to *her*, now") and it monetises non-payers through ad views.
- *Why it is dangerous here:* a coin economy on an anonymous voice product
  drags the whole thing toward transactional, borderline-dating behaviour,
  which is what got the previous generation of these apps deplatformed. It also
  needs a mobile app to work properly, since the ad networks that pay for
  rewarded video are app-first.

**Model B - the subscription** (Chatspin/Chatrandom Plus, Camsurf Premium).
A flat monthly fee removes ads and unlocks all filters.

- *Why it earns:* far lower support burden, no store cut on the web, predictable
  MRR, and it is honest - which matters for a product whose whole promise is
  "we are the safe one".
- *Why it fits TalkLive:* the free tier is already designed as a subscription
  free tier (3 countries, 10 friends, gender locked). The plumbing was the only
  thing missing.

**The recommendation: Model B as the core, with one borrowed mechanic from A.**
Subscription is the spine. The one coin-economy idea worth taking is
**earn-it-free**: let a user unlock a temporary pass through effort rather than
payment - watching an ad, or inviting a friend. That converts the ~97% who will
never pay into either ad revenue or new users, and it makes the paid tier feel
generous rather than extractive. The referral reward built in §3 is exactly
this mechanic.

### Revenue math to plan against

Category benchmarks for a free web product of this type:

- Free-to-paid conversion: **0.5%-2%** of monthly actives. Anything above 2%
  on an anonymous no-signup product would be exceptional.
- Display ad RPM on this kind of inventory: **$0.30-$2.00** per thousand
  page views, heavily dependent on traffic geography. Tier-1 traffic (US, UK,
  DE, AU) is worth 5-20x tier-3 traffic for the same page view.

That ratio is the single most important number in this business. At a $5/month
subscription, **one subscriber is worth roughly as much as 3,000-15,000 ad
impressions**. Every design decision should therefore favour the subscription
over ad density, and every SEO decision should favour tier-1 English-language
intent over raw volume. The existing country and city page programme should be
weighted accordingly - the same effort spent on "random voice chat US" is worth
many times the same effort spent on a page that ranks in a $0.10-RPM market.

---

## 3. What has been built

All of it is env-gated: with no keys configured the site behaves exactly as it
did before, so nothing here can break production on deploy.

### Payments - `server/billing.js`

Stripe Checkout with a signed webhook, no `stripe` npm dependency (two REST
calls and an HMAC).

- The identity carried through Stripe is the browser's persistent `clientId` -
  the same key premium is stored under - so **someone can subscribe without
  ever making an account**. That is essential: the product's promise is
  "no sign-up", and a paywall that demands one contradicts the pitch.
- `checkout.session.completed` grants a 24-hour holding period immediately, so
  a paying customer is premium before the first invoice event lands.
  `invoice.paid` then extends to Stripe's own `current_period_end`.
- Cancellation needs no cron: a cancelled subscription simply stops sending
  renewals and the last granted period runs out. `cancel_at_period_end` does
  **not** revoke early - they paid for the rest of the month and keep it.
- The webhook verifies signature *and* timestamp, so a captured request cannot
  be replayed.
- `npm run test:billing` covers signature forgery, replay, tampering, and every
  event-to-decision mapping.

### Premium that expires - `server/store.js`

`setPremium` now honours `expiresAt`, evaluated at read time so nothing has to
sweep. A grant without one stays permanent, which is what every pre-existing
grant is, so old records are untouched. `extendPremium(clientId, days)` stacks
rewards from whichever is later - now, or the current expiry - and refuses to
convert a permanent grant into an expiring one.

### The referral loop - `server/index.js`, `public/app.js`

Every user can mint a personal code (7 characters, ambiguous glyphs excluded so
it survives being read aloud on a call). The link is `talklive.app/?ref=CODE`.

The anti-abuse design is the important part: **the reward is not paid when the
link is clicked.** A claim is recorded at registration and settles only after
the invited person has had a conversation lasting past a real threshold,
measured server-side. Opening your own link in fifty incognito windows earns
nothing. Self-referral is rejected outright, first claim wins, and a referral
pays exactly once.

Both sides get 7 days of Plus. Rewarding only the inviter makes the link feel
like spam to the person receiving it.

`npm run test:referral` drives the whole loop through real sockets, including
the cases that must *not* pay.

### Re-engagement - `server/push.js`, `public/sw.js`

Web push over VAPID. This is the highest-leverage retention change available to
this product, because it is the **only** channel an anonymous service has: there
is no email address and no phone number.

It fires on friend messages, friend requests and call-backs, and only when the
recipient has no live socket - somebody with the tab open has already been told,
and a system notification on top of an in-app one is the fastest way to get
permission revoked. Notification *contents* are deliberately excluded: these
land on lock screens in front of other people.

Permission is requested at the one moment it is self-evidently useful - when
the user has just gained a friend who can message them - never on page load. A
permission prompt with no context is denied, and Chrome's denials do not expire.

### Installability - `public/sw.js`, `public/site.webmanifest`

Service worker, 512px and maskable icons, real screenshots, and three app
shortcuts (Talk / Chat / Friends). The install prompt is suppressed on a first
visit and offered from the second, because the browser gives you exactly one
prompt and a first-time visitor has not decided yet.

The service worker deliberately does **not** precache the app shell. Pinning
`index.html` would freeze users on a stale build across deploys, and a
random-chat client that disagrees with its server about the signalling protocol
does not fail gracefully - it fails as "searching forever". HTML is always
network-first; only assets carrying the site's `?v=` cache-buster are cached.

### Measurement

Call duration is now recorded on both sides of every pairing, split into
`conversation_real` and `conversation_brief`. Until now the dashboard could not
distinguish a twenty-minute conversation from a two-second skip, which made the
single most important product question - *is anyone actually talking?* -
unanswerable. New funnel counters: `premium_checkout_start`,
`premium_activated`, `premium_cancelled`, `referral_claimed`,
`referral_qualified`, `pwa_install_click`, `pwa_installed`, `push_optin`.

---

## 4. What to do next, in priority order

### P0 - Reconnect the database. Nothing else matters until this is done.

`DATABASE_URL` is unset, so the store falls back to a JSON file on a container
with no mounted volume, and deploys are automatic. **Every subscription,
referral and push subscription written today is destroyed on the next deploy.**
Shipping billing on top of an ephemeral store would mean charging people and
losing the record of it. See Task 2 in [CODEX-HANDOFF.md](CODEX-HANDOFF.md).

### P1 - Turn on billing

Create the Stripe product, then set the four secrets in one command (§5). Price
at **$4.99/month with an annual plan at ~$29.99**. Reasons: it undercuts the
category's typical $9.99-$19.99 while staying above the psychological "is this
a scam" floor, and the annual plan is where the margin is - churn on
random-chat subscriptions is brutal, and yearly billing converts a two-month
customer into a twelve-month one.

Do not skip the webhook secret. Without it Checkout works, customers are
charged, and no payment ever grants anything - the server logs a loud warning
on boot for exactly this reason.

### P2 - Add the free-account rung

This is the one structural thing AirTalk does that TalkLive does not. Right now
the ladder is *anonymous -> paid*, which is a cliff. Make it
*anonymous -> free account -> paid*:

- Anonymous: random matching, no filters.
- Free account: country filter, friends list, call history.
- Plus: gender filter, unlimited countries and friends, no ads.

The middle rung costs nothing to give away and buys a durable identity, which
is what makes every later retention mechanic work.

### P3 - Rewarded unlock ("earn a day of Plus")

Watching a rewarded ad or completing a referral grants 24 hours of Plus. The
referral half already exists. This is the Model-A mechanic worth borrowing: it
monetises non-payers, it seeds demand for the paid filters by letting people
feel them, and it makes the paywall read as generous.

### P4 - Scaling past one machine

`CODEX-HANDOFF.md` correctly forbids running a second machine: matchmaking
state is in process memory, so a second instance splits users into two pools
that cannot see each other. That ceiling is fine now and fatal later - a
matching pool that is split in half roughly doubles everyone's wait, which is
the one thing this product cannot afford.

The fix is a Socket.IO Redis adapter plus moving `waitingQueue`, `partners` and
`clientSockets` into Redis. Do it **before** it is needed, not during the
traffic spike that needs it.

### P5 - Fix the dependency advisories

`npm audit --production` reports 9 pre-existing advisories (Express 4 and its
`body-parser`/`qs` chain, `socket.io-parser`, `geoip-lite` -> `ip-address`,
`google-auth-library` -> `gaxios` -> `uuid`). None come from anything added
here. They are not urgent, but a public site with a payments path should not be
carrying a high-severity advisory in its WebSocket parser.

---

## 5. Configuration

Everything added here is off until its keys exist. Set them in one command -
`fly secrets set` restarts the machine, and boot takes ~20s because
`geoip-lite` loads a 154MB database at require time.

```sh
fly secrets set \
  STRIPE_SECRET_KEY='sk_live_...' \
  STRIPE_PRICE_MONTHLY='price_...' \
  STRIPE_PRICE_YEARLY='price_...' \
  STRIPE_WEBHOOK_SECRET='whsec_...' \
  VAPID_PUBLIC_KEY='...' \
  VAPID_PRIVATE_KEY='...' \
  VAPID_CONTACT='info@talklive.app' \
  -a talklive-ai
```

| Var | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Enables Checkout. Without it `/pricing` keeps its honest "coming soon" card. |
| `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` | Price IDs from the Stripe product. At least one is required. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the endpoint at `https://talklive.app/billing/webhook`. **Without it no payment ever grants premium.** |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web push keypair. Generate once with `node -e "console.log(require('web-push').generateVAPIDKeys())"` and never rotate - replacing them silently invalidates every existing subscription. |
| `VAPID_CONTACT` | Contact address push services require. Falls back to `OWNER_EMAIL`. |
| `REAL_CONVERSATION_MS` | Test-only override for the referral qualifying threshold. Never set in production. |

Stripe webhook endpoint to create in the dashboard - subscribe to exactly these
events:

```
https://talklive.app/billing/webhook
  checkout.session.completed
  invoice.paid
  customer.subscription.updated
  customer.subscription.deleted
```

## 6. Tests

```sh
npm run test:billing     # webhook signature, replay, and event mapping
npm run check:seo        # rebuild the SEO surface and audit every link
npm run check:turn       # verify the TURN relay actually relays

# the referral loop needs a running server with a shortened threshold
REAL_CONVERSATION_MS=1500 PORT=5099 node server/index.js &
URL=http://localhost:5099 REAL_CONVERSATION_MS=1500 npm run test:referral
```
