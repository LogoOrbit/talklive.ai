# Changelog

## 2026-10-31 — audit and fix pass

Full findings, with file:line references, are in [AUDIT.md](AUDIT.md).

### Fixed

**Payments (Stripe)**
- Out-of-order webhooks no longer cost subscribers their Plus. A late
  `checkout.session.completed` used to cut a paid month down to one day;
  cancelling an **old** subscription revoked the **current** one; a webhook
  could revoke or downgrade a manual/referral grant. `billing.nextPremium`
  now never shortens an active expiry, skips events older than the last one
  applied, skips revokes for a different subscription, leaves non-Stripe
  grants alone, and skips repeated event ids. (C2)
- The webhook writes the grant to the store before answering 200, so a
  crash or deploy inside the 15 s save window cannot lose a payment. (H1)

**Auth**
- Session tokens are stored as SHA-256 hashes, not raw. Old raw entries are
  re-keyed on first use, so nobody is signed out. (H2)
- Changing or resetting a password now signs out the account's other
  **connected** devices too, not only the stored tokens. (H3)
- Unknown usernames take the same scrypt time as a wrong password, so login
  timing no longer reveals which usernames exist. (L2)

**Security**
- Dependencies: `npm audit fix` (critical `proxy-addr`, high
  `socket.io-parser` memory exhaustion, `engine.io`, `body-parser`,
  `brace-expansion`) and `nodemailer` 9 → 10. 14 advisories → 9 (see
  "Remaining"). (C1)
- WebRTC signalling relays only the SDP/ICE fields, not the sender's whole
  object. (M2)
- `/events` is rate limited. (M3)
- Country codes are validated before going into a flag image URL. (L1)

**Calls**
- A dropped call retries immediately when the network type changes
  (Wi-Fi ↔ mobile data), not only on `online`. (M4)

**UI**
- The Chat Support bubble no longer covers the friend chat's Send and
  voice-message buttons on desktop. (H5)

### Improved

- `npm test` runs all 47 suites; `npm run test:critical` runs auth,
  payments, friends, messaging and signalling. CI now runs the critical set
  on every branch and PR (none of these ran in CI before). (H4)
- New tests: webhook ordering (11 unit cases + an end-to-end webhook run
  against a real server), `test-auth-sessions.js` (hashed storage, legacy
  re-keying, live sign-out, logout, re-login), signal field whitelist.
- `test-client-ip` fixed (it signed up without the email code, so 8 checks
  failed falsely). (M1)

### Verification

- `npm test`: 47/47 suites pass. Browser suites (`npm run test:social-ui`,
  real Chromium with fake mic): 4/4 pass.
- CI steps run locally: `build:seo`, `build:min`, compression/age tests,
  `audit:seo`, `check:bundle` all pass. `node --check` clean on every file.
  No linter or type checker is configured in this repo.
- Manual flows were exercised through the socket and browser suites, not by
  hand: sign-up (with email code), login, password change/reset, profile and
  nickname edit, add / accept / decline / cancel / remove / block / unblock
  friend, DMs (offline queue, delivery, receipts, de-dupe), voice notes,
  matchmaking and signalling, Stripe webhook. **Not tested:** a real 1-to-1
  call between two devices and a live Stripe Checkout (both need real
  hardware/keys).

### Remaining (not changed, with reasons)

- **Whole-document store** (25 MB JSONB rewritten every 15 s) is the main
  performance risk. Splitting it into tables is a production data migration,
  too big and risky for this pass. Start with analytics days and transcripts. (M5)
- **Identity token never rotates.** A leaked token gives permanent access to
  that identity's friends/DMs. Fixing it needs a versioned token and a client
  migration; a bad rotation orphans users (see comments in `server/index.js`). (M6)
- **A Stripe refund/dispute revoke is skipped** if a referral reward was the
  last thing to touch the grant (source becomes `referral`). The grant still
  lapses at its expiry. Low impact; worth a dedicated rule if refunds matter.
- **npm audit, 9 left (8 moderate, 1 high):** the high is `ip-address` inside
  `geoip-lite` (its HTML-emitting methods are not used here); that chain's fix is a breaking downgrade.
  Also `qs` pinned by Express 4, `uuid` via `google-auth-library`. None reachable
  in a way that matters here; revisit on upstream releases.
- **Lighthouse 90+ / full UI pass** needs real-device measurement. The
  existing bundle budget passes.
- **Avatar upload with compression:** not applicable, avatars are presets.
- **DM pagination:** threads are capped at 200 messages and sent whole; fine
  at that cap.
- `README.md` still says free accounts are capped at 5 friends and that
  upgrades go to Patreon; the code has unlimited friends and Stripe.
- `npm run build:seo` rewrites a few pages' `lastmod`/word counts on every
  run (generator drift, existed before this pass); left out of these commits.

### Deploy notes

- **No new env vars. No schema migration.** Session re-keying happens lazily
  in the existing store document; rolling back only signs out sessions
  already re-keyed (they sign in again).
- **Node 20+** required (`engines` bumped; Docker and CI already use 20).
- Make sure `STRIPE_WEBHOOK_SECRET` is set wherever Stripe is enabled
  (unchanged requirement).
