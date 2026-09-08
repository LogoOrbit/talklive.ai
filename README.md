# TalkLive

A random audio chat app - pairs strangers for live, audio-only conversations. Built with WebRTC for peer-to-peer audio and Socket.IO for signaling/matchmaking.

## Features

- One-tap random matchmaking (no sign up required)
- Optional account sign up/log in, including "Sign Up / Continue with Google"
- Peer-to-peer audio over WebRTC (low latency, not routed through the server)
- "Next Stranger" to skip and instantly requeue
- Mute/unmute mic
- Live online user count
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
| `SMTP_USER` / `SMTP_PASS` | Gmail address + **app password** (Google Account → Security → 2-Step Verification → App passwords) |
| `DATA_DIR` | Directory for the JSON store (default `./data`). In production `fly.toml` sets it to `/data`, but **no volume is mounted there**, so it is an ordinary directory inside the container and everything in it is destroyed on each deploy. The server detects this at boot, logs it prominently, emails the owner and flags it on the `/owner` screen. The fix is `DATABASE_URL` (Postgres) — see `DEPLOY-FLY.md` and `CODEX-HANDOFF.md`. |
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

### Premium (TalkLive Plus)

Free tier limits (enforced server-side): max 3 preferred + 3 avoided countries, max 10 friends, and the gender filter locked. Premium unlocks all filters, unlimited friends, and no ads. The `/pricing` upgrade button sends buyers to the TalkLive Patreon join page.

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
