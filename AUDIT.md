# TalkLive audit — 2026-10-31

Scope: whole repo at `291ac83`. Phase 1 (read + run) findings, with the planned
fix for each. Status of each fix is in `CHANGELOG.md`.

## 1. Architecture

| Layer | What it is | Where |
|---|---|---|
| Frontend | Vanilla JS, no framework or bundler. `app.js` (call app, 11.5k lines), `chat.js` (text app), ~20 feature scripts, CSS. ~260 generated SEO pages. PWA (`sw.js`, manifest). | `public/` |
| Backend | One Node 18+ process: Express (static + HTTP API) and Socket.IO (matchmaking, signalling, auth, friends, DMs, notifications). | `server/index.js` (7.5k lines) |
| Database | One JSONB document (`owner_store`, row `id=1`) in Supabase Postgres, mirrored to a JSON file on the Fly volume. Rewritten whole on a 15 s debounce (~25 MB in Oct 2026). Separate tables only for password resets, transcripts and voice notes. | `server/store.js` |
| Signalling / TURN | Socket.IO relays SDP/ICE between matched partners only. `/ice-servers` mints short-lived TURN credentials (Cloudflare, Metered, or coturn shared secret). | `server/index.js` (`signal`, `/ice-servers`), `DEPLOY-TURN.md` |
| Identity | Anonymous `clientId` per browser + HMAC identity token (`IDENTITY_SECRET`). Accounts (username/password with scrypt, or Google ID token) link to a `clientId`. Durable session tokens (365-day sliding). | `server/index.js` |
| Payments | Stripe Checkout (subscription) via raw REST; webhook with HMAC + timestamp check grants/extends/revokes premium keyed by `clientId`. | `server/billing.js`, `/billing/*` |
| Ads | Adsterra/Monetag tags loaded on free tier only; hidden for premium. | `public/*.html`, `config.js` |
| Push | Web Push (VAPID) + FCM for the Capacitor Android app. | `server/push.js`, `mobile/` |
| Owner dashboard | `/owner` (password + TOTP, `SameSite=Strict` cookie, JSON-only API). | `server/admin.js` |
| Deploy | Fly.io (`sin`), Dockerfile, auto-deploy on push to `main` (`fly-deploy.yml`). CI on branches/PRs (`ci.yml`). | `.github/workflows/` |

## 2. Baseline run

- `npm ci`: OK. `npm audit`: **14 vulnerabilities (1 critical, 6 high, 7 moderate)** —
  `proxy-addr` (critical), `socket.io-parser` (high, memory exhaustion), `engine.io`,
  `body-parser`, `nodemailer`, `brace-expansion`, `qs`, `uuid`; `geoip-lite`'s
  transitive `ip-address`/`glob`/`minimatch`/`rimraf` (fix requires a breaking downgrade).
- `node server/index.js`: boots (file store) on :5000.
- Lint / type-check: **none configured** (plain JS, no ESLint/TS). `node --check` on every
  `server/`, `public/`, `scripts/` file: clean.
- `npm test`: **does not exist**. 46 `scripts/test-*.js` suites run individually:
  44 pass, 2 fail:
  - `test-client-ip`: 8 failures — the test signs up without the email code that
    sign-up has required since `1f7aa07`; every later check cascades from the missing account.
  - `test-password-reset`: harness error, needs a server started by hand (documented
    in its header). Passes when run that way.
- CI runs only 9 of the 46 suites; billing, auth, friends and messaging suites never run in CI.

## 3. Findings

### Critical

| # | Where | Problem | Planned fix |
|---|---|---|---|
| C1 | `package-lock.json` | `proxy-addr` (critical) and `socket.io-parser` (high, unauthenticated memory exhaustion on the public Socket.IO endpoint) plus 5 other fixable advisories. | `npm audit fix` (non-breaking only); re-run all suites. |
| C2 | `server/index.js:567` `/billing/webhook`, `server/billing.js:179` `decide` | Stripe does not deliver events in order. (a) `checkout.session.completed` arriving after `invoice.paid` overwrites the real period end with *now + 24 h*, so a paying subscriber loses Plus after one day until the next renewal a month later. (b) `customer.subscription.deleted` / `updated(past_due)` for an **old** subscription revokes the user's **current** one. (c) A Stripe revoke also wipes a manual or referral grant, and a grant converts a permanent manual grant into an expiring one. (d) Duplicate deliveries are re-applied. | Pure `billing.applyEvent(existing, decision, event)` deciding the next record: never shorten an active expiry, ignore events older than the last applied one, ignore a revoke whose subscription id does not match, never touch non-Stripe grants, de-dupe event ids. Unit tests for each ordering. |

### High

| # | Where | Problem | Planned fix |
|---|---|---|---|
| H1 | `server/index.js:567` | Webhook answers 200 before the grant is persisted (15 s debounce in production). A crash/deploy in that window loses a paid grant and Stripe will not retry. | Persist immediately and wait (bounded) before acknowledging. |
| H2 | `server/store.js:2465` | Durable session tokens (365-day, full account access) are stored **in plaintext** in the store document and its disk mirror, unlike reset codes which are hashed. A leaked DB row or volume snapshot = takeover of every signed-in account. | Store `sha256(token)`; look up hashed first, upgrade legacy plaintext entries on first use (no forced sign-out). |
| H3 | `server/index.js:4924`, `:5112` | `change-password` and `reset-password` delete durable sessions but leave every **live** socket of that account authenticated (`socketAuth`), so an attacker already connected keeps access until they disconnect. | Drop `socketAuth` for the account's other sockets and tell them (`resume-session-result {ok:false}`, which both clients already treat as "revoked"). |
| H4 | `.github/workflows/ci.yml`, `package.json` | Auth, payments, friends and messaging tests never run in CI, and there is no `npm test`. A regression in those reaches `main` (= production). | Add `npm test` runner covering the critical suites; run it in CI. |
| H5 | `public/support-chat.js:312` `busy()` | Found in Phase 3 (`scripts/social-ui/voice-notes-ui.js` had been failing since Chat Support shipped): on desktop the support bubble and its "New" callout sit exactly over the friend chat's Send / voice-message buttons and take the tap — an overlay blocking a core action. | Hide the bubble while a friend-chat composer is on screen, as it already does for calls and text chats. |

### Medium

| # | Where | Problem | Planned fix |
|---|---|---|---|
| M1 | `scripts/test-client-ip.js:140-160` | Test predates mandatory email codes; 8 false failures hide whether login lockout still works. | Drive sign-up through `signup-send-code`, reading the dev-mode code from the server log. |
| M2 | `server/index.js:5924` `signal` | Relays the client's object verbatim, so any extra keys (up to the 1 MB socket buffer) are forwarded to the partner. | Forward only `type` + `sdp{type,sdp}` / `candidate{candidate,sdpMid,sdpMLineIndex,usernameFragment}`. |
| M3 | `server/index.js:719` `/events` | Unauthenticated write endpoint with no rate limit (inflates feature analytics, store churn). | `httpRateLimit`. |
| M4 | `public/app.js:7605` | Network-type changes (Wi-Fi ↔ mobile data) often do not fire `online`, so a degraded call waits for the 5 s throttle / the answerer's 3 s timer. | Also listen to `navigator.connection` `change`. |
| M5 | `server/store.js` (architecture) | Whole 25 MB document re-serialised every 15 s; CPU-bound on a shared-cpu-1x. | **Not changed** — splitting into tables is a data migration/rewrite on production data. Recommended as its own project (start with analytics days and transcripts). |
| M6 | `server/index.js:61` | The identity token is a fixed HMAC of the `clientId`; it never rotates, so a leaked token gives permanent access to that identity's friends and DMs, and sign-out/reset cannot revoke it. | **Not changed** — rotating needs a versioned token and a client migration; the code comments document how a bad rotation orphans users. Recorded as a risk. |

### Low

| # | Where | Problem | Planned fix |
|---|---|---|---|
| L1 | `public/app.js:368` `getFlagImg` | Only checks `length === 2` before putting the code into an `src` attribute. Codes come from the server's geo lookup today, so not exploitable, but one bad value would break the attribute. | Validate `^[A-Za-z]{2}$`. |
| L2 | `server/index.js:3332` `verifyAccount` | Unknown usernames return before scrypt → timing difference reveals whether a username exists. Usernames are already discoverable via sign-up ("taken"), so impact is low. | Hash against a dummy salt for unknown users. |
| L3 | `README.md` "Premium" | Says free tier is capped at 5 friends and that upgrade goes to Patreon; code has unlimited friends and Stripe. | Note only. |
| L4 | `geoip-lite` | Transitive advisories only fixable by a breaking downgrade. | Note only; revisit when upstream updates. |

## 4. Reviewed and found sound (no change planned)

- Passwords: async scrypt, per-user salt, constant-time compare, 8-char minimum, per-IP / per-pair / per-account lockout with pre-reserved attempts (race-safe).
- Reset and sign-up OTPs: CSPRNG, hashed at rest, 5-attempt cap, per-email and per-IP throttles, no account-existence oracle.
- Google sign-in: ID token verified server-side, no auto-link by email (prevents takeover), double-submit CSRF on the redirect flow.
- Stripe signature check: HMAC-SHA256, constant-time, 5-minute replay window, raw body.
- Owner dashboard: scrypt + TOTP, `HttpOnly; SameSite=Strict; Secure` cookie, JSON-only API (CSRF-safe), lockout, audit log.
- Headers: CSP, HSTS (prod), `nosniff`, frame-ancestors none, Permissions-Policy.
- Social layer: friend requests (mutual auto-accept, duplicates, decline hold, cancel), block/unblock with restore, DM gating, message id de-dupe, rate limits — covered by 7 passing suites.
- WebRTC client: polite/impolite glare handling, ICE restart with throttle, 20 s connect watchdog, 30 s recovery window, full handler/track teardown, AEC/NS/AGC constraints.
- Client rendering: user strings go through `escapeHtml`; a scan of every template-literal `innerHTML` found no unescaped user data.

## 5. Out of scope / needs a decision

- **Lighthouse 90+ / UI pass**: needs real-device measurement; the repo already enforces a JS/CSS/HTML budget (`check:bundle`). Not attempted blind.
- **Manual end-to-end checks** (sign-up, call, checkout) need two real browsers with microphones and live Stripe/SMTP keys; covered here by the socket-level suites instead.
- **Push to `main`** deploys straight to production (`fly-deploy.yml`).
