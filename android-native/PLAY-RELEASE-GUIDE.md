# Publishing TalkLive on Google Play - step by step

Everything below uses the real values from this repo: package `app.talklive`,
version **3.9.6 (126)**, Plus subscription `talklive_plus`, passes
`pass_1d` / `pass_7d` / `pass_15d`. Menu names are Play Console's as of late
2026; if one has moved, use the search box at the top of Play Console.

Files you upload:

| What | File |
|---|---|
| App bundle | `TalkLive-3.9.6-126.aab` (signed with your upload key, SHA-1 `6B:85:B9:…:F9:83:98`) |
| Phone screenshots (1080 x 1920) | `play-screenshots/01-…png` to `08-…png` |
| Feature graphic (1024 x 500) | `play-screenshots/feature-graphic.png` |
| App icon (512 x 512) | `mobile/store/icon-512.png` |

---

## 0. Before you start (once)

1. **Payments profile** - Play Console > Settings > Payments profile. Must be
   set up and verified, or you cannot sell Plus. Add your bank account in
   Google Payments for payouts.
2. **Personal developer account created after Nov 2023?** Google requires a
   *closed test with at least 12 testers for 14 days in a row* before the
   Production track unlocks (Dashboard shows "Apply for production"). If your
   app was already live on Production, skip this - you only publish an update.
3. **License testers** - Settings > License testing: add your own Gmail (and
   any testers). Their Plus purchases are free test purchases.

## 1. Create the app (skip if TalkLive already exists in your console)

All apps > **Create app**:
- App name: `TalkLive` · Default language: English (United States)
- App or game: **App** · Free or paid: **Free** (Plus is sold inside the app)
- Tick the declarations > Create app.

> The package name is fixed by the first bundle you upload (`app.talklive`).
> If an app with this package already exists in your account, do not create
> another one - open the existing app.

## 2. Upload the bundle first (it unlocks the Monetize pages)

Subscriptions can only be created after a bundle with the Billing library has
been uploaded once. Use internal testing for that - it goes live in minutes
and nobody outside your list sees it.

1. Test and release > Testing > **Internal testing** > Testers tab: create an
   email list with your own Gmail, save, copy the "Join on the web" link.
2. Releases tab > **Create new release**.
3. **Play App Signing**: if asked, keep "Use Google-generated key" (an existing
   app is already enrolled - you will not see this).
4. Upload `TalkLive-3.9.6-126.aab`. Release name fills in as `126 (3.9.6)`.
5. Release notes (en-US):
   ```
   - Faster start, smoother calls, less battery and storage use
   - Message notifications with Reply and Mark as read
   - Clear message ticks: sent, delivered, seen
   - Tap the signal bars to see your connection and how to improve it
   - Mini-game invites and leaving mid-game fixed
   - New animated avatars for Plus members
   ```
6. Next > Save > **Start rollout to Internal testing**.
7. Open the join link on your phone, accept, install from Play. This is the
   build to test Google sign-in, notifications and purchases with.

## 3. Google sign-in and push after Play App Signing (once)

Play re-signs your app with Google's key, which has its own fingerprint:

1. Test and release > Setup > **App integrity** > App signing: copy the
   **App signing key certificate SHA-1**.
2. Google Cloud Console (same project as Firebase) > APIs & Services >
   Credentials > your **Android** OAuth client for `app.talklive` - make sure
   this SHA-1 is on it (create a second Android client if needed).
   Add the upload key SHA-1 `6B:85:B9:97:03:AE:4C:30:89:35:DE:12:1C:B8:4D:C8:30:F9:83:98`
   too, so APKs you install directly also sign in.
3. Firebase console > Project settings > your Android app `app.talklive` >
   Add fingerprint: the same SHA-1(s).

## 4. TalkLive Plus subscription

Monetize with Play > Products > **Subscriptions** > Create subscription:
- Product ID: `talklive_plus` (must be exactly this) · Name: `TalkLive Plus`
- Benefits (shown on Play's subscription page): "Gender and more country
  filters", "Undo skip", "See who liked you", "All avatars and animated
  scenes", "No ads".

Add **two base plans** (Add base plan > Auto-renewing):

| Base plan ID | Billing period | Price (USD) |
|---|---|---|
| `monthly` | 1 month | 9.99 |
| `yearly` | 1 year | 69.99 |

For each: Set prices > set USD, then **Update exchange rates**. To use the
local prices in `android-native/PLAY_PRICES.csv` (PKR 599 / 4,199, INR 199 /
1,399, GBP 7.99 / 55.99 ...), edit those countries by hand. Grace period: 7
days; account hold: on. **Activate** both base plans.

Optional free trial: base plan > Add offer > Developer-determined or New
customer acquisition > Free trial 3 days > Activate.

## 5. Plus passes (one-time products)

Monetize with Play > Products > **One-time products** > Create, three times:

| Product ID | Name | Price (USD) |
|---|---|---|
| `pass_1d` | Plus for 1 day | 1.99 |
| `pass_7d` | Plus for 7 days | 4.99 |
| `pass_15d` | Plus for 15 days | 6.99 |

Each: set price > Activate. (The app consumes them after use, so people can
buy them again.)

## 6. Let the server verify purchases (once)

Without this, a purchase cannot turn Plus on.

1. Google Cloud (same project) > IAM & Admin > Service accounts > Create
   (`play-billing`) > Keys > Add key > JSON - download it.
2. Play Console > **Users and permissions** > Invite new users: the service
   account's email; permissions **View financial data** and **Manage orders
   and subscriptions**; app: TalkLive > Invite.
3. GitHub > repo Settings > Secrets > Actions: add `PLAY_SERVICE_ACCOUNT`
   (paste the whole JSON) and `PLAY_RTDN_SECRET` (any long random text).
   Then Actions > **Fly secrets** > Run workflow (it copies them to the server).
4. Renewals and refunds: Google Cloud > Pub/Sub > Create topic `play-rtdn`;
   Permissions > add principal
   `google-play-developer-notifications@system.gserviceaccount.com` as
   **Pub/Sub Publisher**; Subscriptions > Create: type **Push**, endpoint
   `https://talklive.app/billing/play/rtdn?secret=<your PLAY_RTDN_SECRET>`.
5. Play Console > Monetize with Play > **Monetization setup** > Real-time
   developer notifications: topic `projects/<your-project>/topics/play-rtdn`
   > Send test notification > Save.

Test: on the internal-test install, buy Plus with your license-tester account
(free), and check the app shows Plus within a few seconds.

## 7. Store listing

Grow users > Store presence > **Main store listing**:
- App name `TalkLive`; short and full description: copy from
  `mobile/PLAY-LISTING.md`, but delete the line "TalkLive is free and
  supported by ads" (the app has no ads).
- App icon: `icon-512.png`; Feature graphic: `feature-graphic.png`.
- **Phone screenshots**: upload `01` to `08` in order (the first three are
  what most people see).
- 7-inch / 10-inch tablet screenshots: optional - the same files are accepted.
- Save.

Store settings: category **Social**; contact email `info@talklive.app`;
website `https://talklive.app`.

## 8. App content (Policy and programs > App content)

Every item must show a green tick before review:

| Item | Answer |
|---|---|
| Privacy policy | `https://talklive.app/privacy` |
| App access | "All or some functionality is restricted" > add instructions: "Guests can use calls and chat without an account. To test accounts, sign up with any email." |
| Ads | **No** - the Android app contains no ad SDK (ads are only on the website) |
| Content rating | Questionnaire > category Social or Communication; users can interact/exchange content: **Yes**; shares location: **No**; answer the rest truthfully. Expect a Mature/18+ rating |
| Target audience | **18 and over** only |
| News app | No |
| Data safety | see below |
| Government / financial / health apps | No |
| Account deletion | Yes - in-app (Profile > Delete account) and web: `https://talklive.app/delete-account` |
| Foreground service | Microphone: "Ongoing voice call". Upload a 30 s screen recording: start a call, press Home, show the call notification and that the call goes on |

**Data safety** (from `public/privacy.html`):
- Encrypted in transit: Yes · Users can request deletion: Yes
- Collected: Personal info (email, username, optional); User IDs; Messages
  (text chats kept for a limited period for moderation; friend messages; a
  short preview is sent through Google's push service for notifications);
  Audio (friend voice messages only - calls are never recorded); App activity;
  Crash logs; Device IDs (push token).
- Purposes: App functionality, Account management, Fraud prevention/safety,
  Analytics.
- Shared: none sold; processors (Google Firebase, Google Play billing) are
  "service providers", not sharing.

## 9. Production release

1. Test and release > **Production** > Countries/regions: Add countries >
   select all (or your list) > Save.
2. Create new release > **Add from library** > pick `126 (3.9.6)` (the bundle
   already uploaded to internal testing) > same release notes.
3. Staged rollout: start at **20%**, watch Android vitals (crashes/ANRs)
   for 1-2 days, then Increase rollout to 100%.
4. Next > Save > **Send for review** (Publishing overview > Send changes for
   review). Updates usually take hours to 2 days; a first release up to a week.

## 10. After it is live

- Publishing overview: turn on **Managed publishing** if you want to choose
  the exact moment approved changes go live.
- Watch Quality > Android vitals and Ratings and reviews; reply to reviews.
- Next update: raise `versionCode` in `android-native/app/build.gradle.kts`,
  run Actions > **Android native app** > Run workflow, download
  `talklive-native-release` (the .aab) and upload it as a new release.
