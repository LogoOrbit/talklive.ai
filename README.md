# TalkLive

A random audio chat app - pairs strangers for live, audio-only conversations. Built with WebRTC for peer-to-peer audio and Socket.IO for signaling/matchmaking.

## Features

- One-tap random matchmaking (no sign up required)
- Optional account sign up/log in, including "Sign Up / Continue with Google"
- Password recovery by emailed one-time code, so an account is never lost to a
  forgotten password (see [Forgot password](#forgot-password-email-otp))
- Peer-to-peer audio over WebRTC (low latency, not routed through the server)
- "Next Stranger" to skip and instantly requeue
- Mute/unmute mic
- Live online user count
- Pick a "spirit animal" (hand-drawn vector icons, never emoji) that the
  stranger sees the moment you connect - on voice calls and text chats alike,
  so two people who have never spoken already have something to open with
- Speaking indicator (visualizes remote audio activity)
- Installable as an app (service worker + manifest), with an offline page
- Web push for friend messages and call-backs, so a friendship survives the tab
  being closed
- Referral links that pay both sides once the invited person actually talks
- Stripe subscriptions for TalkLive Plus

The growth and monetisation model - how the category makes money, what is built,
and what to do next - is in **[GROWTH.md](GROWTH.md)**.

## Running locally

```bash
npm install
npm start
```

Then open http://localhost:5000 in two separate browser tabs/windows (or two devices) to be matched with each other.

### Enabling "Sign Up with Google" (optional)

The app works fully without this - the Google button just won't be shown.

1. In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an OAuth 2.0 Client ID of type "Web application".
2. Add your site's origin(s) (e.g. `http://localhost:5000` and your production URL) under "Authorized JavaScript origins". No redirect URI is needed - sign-in happens client-side via Google Identity Services.
3. Set the `GOOGLE_CLIENT_ID` environment variable to that client ID before starting the server:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com npm start
   ```

The same button signs existing users in and creates an account for new ones:
the server verifies the ID token Google returns, then finds the account by its
Google `sub` or creates one from the profile.

**What is stored, and where it shows up.** The ID token carries only the
claims the user consents to on Google's own screen (`openid email profile`).
Those are kept verbatim on the account - name, given/family name, verified
email, avatar URL, locale, and the Google Workspace domain for managed
accounts - plus when the account was linked and last signed in with Google. A
claim the user declines is simply absent and is stored as `null`. Nothing is
requested beyond those scopes, and no Google API is called on the user's
behalf.

The owner dashboard shows it all under **Accounts**: the table gains an email
column (marked *verified* when Google vouched for it), every row has a
**Details** button that expands the complete shared profile with the avatar,
and the accounts CSV export carries every field.

### Forgot password (email OTP)

An account is a username and a password, so the one thing that can lose it
forever is a forgotten password. Every account can therefore carry an optional
**recovery email** - set at sign-up, or later under My Account, and filled in
automatically for accounts created through Google. It is never shown to other
users and is never mailed anything but reset codes.

The flow, all over the existing Socket.IO connection:

1. **`forgot-password`** - the user enters their email. If it belongs to an
   account, a random 6-digit code is emailed to it. The reply is identical
   whether or not the address is on an account: on an anonymous chat product,
   "no account with that email" would be a membership oracle for any address
   someone cares to type.
2. **`verify-reset-code`** - the code buys a short-lived reset token. The code
   is good for 10 minutes, survives 5 wrong guesses, and cannot be replayed.
3. **`reset-password`** - the token is spent once to set the new password. Every
   other session of that account is signed out, and the device that did the
   reset is signed straight in.

Codes and tokens are stored only as SHA-256 hashes, in a `password_resets`
table in Supabase Postgres when `DATABASE_URL` is set (created by the server at
boot, like `owner_store`) and in the JSON store otherwise. Requests are
throttled per email address and per IP.

Delivery needs `SMTP_USER` / `SMTP_PASS` (the same Gmail app password the owner
alerts use). Without them the flow is refused in production; in development the
code is printed to the server console instead, which is what
`npm run test:reset` drives:

```bash
DATA_DIR=/tmp/tl-reset PORT=5098 node server/index.js > /tmp/tl.log 2>&1 &
URL=http://localhost:5098 LOG=/tmp/tl.log npm run test:reset
```

## How it works

- `server/index.js` - Express static server + Socket.IO signaling. Maintains a waiting queue and pairs the first two waiting sockets together. Relays WebRTC offer/answer/ICE candidates between matched peers only.
- `public/app.js` - Client logic: requests mic access, manages the `RTCPeerConnection`, and drives the UI state machine (idle → waiting → connected).

Audio itself flows directly between the two browsers (peer-to-peer); the server only handles matchmaking and connection setup signaling, so it never sees or stores call audio.

## SEO

The public marketing surface - ~260 landing pages, country/city/language
directories, the blog, all sitemaps, `llms.txt` and the IndexNow key - is
**generated**, not hand-written:

```bash
npm run build:seo   # regenerates everything into ./public
npm run seo:ping    # pushes the sitemap to the IndexNow network
```

Edit the sources under `scripts/`, never the generated files in `public/`.
Full details - including the three-domain redirect strategy, what the schema
graph contains, how `lastmod` stays accurate, and the short list of tasks that
still need credentials - are in **[SEO.md](SEO.md)**.

## Notes

- Uses public Google STUN servers for NAT traversal, plus a TURN relay when one is configured. On restrictive networks (symmetric NAT, corporate firewalls) STUN alone cannot get media through, so a TURN server is strongly recommended in production. Setup and verification: **[DEPLOY-TURN.md](DEPLOY-TURN.md)**.
- Verify a relay actually works with `npm run check:turn -- --from-url https://talklive.app/ice-servers`. A relay that is misconfigured or gone looks identical to a working one until users cannot hear each other, so check it rather than assuming.
- Requires HTTPS (or localhost) in production, since browsers only allow microphone access on secure origins.

## Owner Dashboard

A secured owner dashboard lives at **`/owner`** (e.g. `https://talklive.app/owner`).

- **Security:** admin password (min 10 chars) + Google Authenticator (TOTP) 2FA. First visit runs a one-time setup where you scan a QR code. 5 failed logins lock the IP out for 15 minutes; every login and admin action lands in the Audit Log tab.
- **Analytics:** live online users (with country/city/IP), visits, unique visitors, daily 24h users, matches, 30-day traffic chart, top countries/cities, feature-usage graph (most → least), anonymous "what users talk about" keyword aggregate, searchable text-chat transcripts (Chats tab; disclosed in the privacy policy - voice is never recorded), and a rule-based AI conclusion on how the site is doing.
- **Moderation:** every user report is stored with reporter/reported details; one-click bans from 30 minutes up to 5 years (by clientId **and** IP - banned users cannot connect at all until the ban expires or you lift it). Users are auto-banned for 30 minutes after 3 reports.
- **Errors:** client-side JS errors and server crashes are collected in the Errors tab (duplicates collapsed).
- **Maintenance mode:** one button takes the site offline with a friendly message; the dashboard stays reachable.

### Environment variables

| Var | Purpose |
|---|---|
| `OWNER_EMAIL` | Where report/feedback/error alert emails go |
| `SMTP_USER` / `SMTP_PASS` | Gmail address + **app password** (Google Account → Security → 2-Step Verification → App passwords). Also sends users their password-reset codes |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_FROM_NAME` | Optional SMTP overrides (default `smtp.gmail.com`, `465`, `TalkLive`) |
| `DATA_DIR` | Directory for the JSON store (default `./data`). In production `fly.toml` sets it to `/data`, but **no volume is mounted there**, so it is an ordinary directory inside the container and everything in it is destroyed on each deploy. The server detects this at boot, logs it prominently, emails the owner and flags it on the `/owner` screen. The fix is `DATABASE_URL` (Postgres) - see `DEPLOY-FLY.md` and `CODEX-HANDOFF.md`. |
| `PREMIUM_CLIENT_IDS` | Comma-separated clientIds to grant premium manually (testing) |
| `LANDING_HOST` | Optional subdomain (e.g. `start.talklive.app`) whose root serves the marketing landing page (`/landing`) |
| `ALIAS_HOSTS` | Comma-separated domains we own that 301 to `CANONICAL_HOST` (e.g. `talklive.xyz,talklive.site`). Each needs its own Fly certificate |
| `TURN_KEY_ID` / `TURN_KEY_API_TOKEN` | Cloudflare Realtime TURN key. The server mints short-lived credentials from it and publishes Cloudflare's global relay - the quickest way to make calls work on carrier/office/school networks with no relay to operate. See `DEPLOY-TURN.md` |
| `METERED_SUBDOMAIN` / `METERED_API_KEY` | Metered TURN account. Same purpose as the Cloudflare pair; both can be set, and their relays are published together |
| `TURN_URLS` | Comma-separated TURN endpoints (e.g. `turn:turn.example.com:3478,turns:turn.example.com:5349?transport=tcp`). Served to browsers by `/ice-servers` |
| `TURN_SHARED_SECRET` | coturn `use-auth-secret` value. The server mints a short-lived HMAC credential per request - preferred over static credentials |
| `TURN_USERNAME` / `TURN_CREDENTIAL` | Static TURN credentials, used only when `TURN_SHARED_SECRET` is unset |
| `TURN_FORCE_RELAY` | `1` forces browsers to use relay candidates only, so neither peer learns the other's IP. **Ignored unless a TURN relay is actually configured** - forcing relay with no relay leaves the browser with zero candidates and every call connects with no audio. Run `npm run check:turn` before setting it |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, `STRIPE_WEBHOOK_SECRET` | Stripe Checkout for TalkLive Plus. All optional: with none set, `/pricing` keeps its "coming soon" card and no checkout exists. See [GROWTH.md](GROWTH.md) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT` | Web push keypair. Optional; without it the browser is never asked for notification permission. **Never rotate** - it silently invalidates every existing subscription |
| `GIPHY_API_KEY` | Giphy API key, enabling the GIF picker in text chat. Optional: with it unset, `/api/gifs/config` reports the feature off and both clients never render the GIF button at all, so nothing dead is shown. Get one at [developers.giphy.com](https://developers.giphy.com/) &rarr; Create an App. Requests are proxied through `/api/gifs` so the key never reaches a browser, results are cached 30 minutes per query, and `rating=g` (Giphy's most restrictive) is always sent. **Was Tenor** until Google shut that API down to external developers on 2026-06-30. |
| `GIPHY_HOURLY_BUDGET` | Max upstream Giphy calls per hour (default `90`). A free "beta" Giphy key allows 100/hour **for the whole key**, not per user, and exceeding it returns errors rather than degrading; past the budget the proxy serves stale cache instead of calling out. Raise it once the key is upgraded to production. |

### Premium (TalkLive Plus)

Free tier limits (enforced server-side): max 2 preferred + 2 avoided countries, max 5 friends, and the gender filter locked. Premium unlocks all filters, unlimited friends, and no ads. The `/pricing` upgrade button sends buyers to the TalkLive Patreon join page.

Matching is instant for everyone. The free tier used to be held ~5s before the
next search after a skip; that was removed because the client also emits `skip`
for involuntary advances (a call whose media never arrived, a failed reconnect),
so the delay fell hardest on users whose calls were already failing.

Premium is keyed to the browser's persistent `clientId` and is persisted in the store (Postgres via `DATABASE_URL`, or the JSON file store), so it survives restarts and deploys. Because the key is the browser id rather than an account, **someone can subscribe without ever signing up** - which the "no sign-up" promise requires.

Grants come from three places:

- **Stripe** (`server/billing.js`), when the Stripe env vars are set. The webhook grants and extends premium to Stripe's own `current_period_end`; a cancelled subscription lapses on its own with no cron, because grants now carry an `expiresAt`.
- **Referrals**, 7 days to each side once an invited user has had a real conversation.
- **Manual**, for testing and support: `PREMIUM_CLIENT_IDS`, or `store.setPremium(clientId)`. A manual grant has no `expiresAt`, so it is permanent - and `extendPremium` deliberately refuses to turn one into an expiring grant.

Email alerts are throttled to one per topic per 10 minutes and are skipped entirely if SMTP is not configured.
