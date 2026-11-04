# TalkLive for Android (native)

Kotlin + Jetpack Compose app that talks to the same server as the website
(Socket.IO + WebRTC), replacing the Capacitor wrapper in `mobile/`. Same
package id (`app.talklive`), so it ships as an update to the Play listing.

## Test on your phone (no Android Studio)

1. GitHub > Actions > **Android native app** > latest run > download **talklive-native-debug**.
2. Unzip, copy `app-debug.apk` to the phone and open it (allow "Install unknown apps").
3. It installs as a separate app next to the Play Store version.

## Push notifications (one-time setup)

1. console.firebase.google.com > your TalkLive project > Project settings > Add app > Android:
   add **app.talklive** (if not there yet) and **app.talklive.debug** (the test build).
2. Download `google-services.json` (it now lists both) and save it as a GitHub secret named
   `GOOGLE_SERVICES_JSON` (Settings > Secrets and variables > Actions). For local builds put it in `app/`.
3. On the server, `FCM_SERVICE_ACCOUNT` must be set (see `mobile/README.md`), which the web push already uses.

Without the file the app works normally, just without push.

## TalkLive Plus on Google Play (one-time setup)

The app sells Plus as the Play subscription `talklive_plus`. The server checks
every purchase with Google before turning Plus on (`server/play-billing.js`).

1. Play Console → your app → Monetize → Subscriptions → Create subscription,
   product ID `talklive_plus`. Add base plans `monthly` (P1M) and `yearly` (P1Y),
   set prices, activate. Optional: a free-trial offer.
2. Google Cloud (same project as Play) → IAM → Service accounts → create one,
   add a JSON key. Play Console → Users and permissions → invite its email with
   "View financial data" and "Manage orders and subscriptions".
3. Server secrets:
   ```bash
   fly secrets set PLAY_SERVICE_ACCOUNT="$(base64 -w0 key.json)" PLAY_RTDN_SECRET="$(openssl rand -hex 24)"
   ```
4. Renewals and refunds: Google Cloud → Pub/Sub → create topic `play-rtdn`,
   grant `google-play-developer-notifications@system.gserviceaccount.com` the
   Publisher role, add a push subscription to
   `https://talklive.app/billing/play/rtdn?secret=<PLAY_RTDN_SECRET>`.
   Play Console → Monetization setup → Real-time developer notifications → that topic.
5. Testing: add testers under Settings → License testing. Purchases only work
   from an app installed from a Play testing track (internal testing is enough).

Until step 3 is done, the app shows prices but the server answers 503 and the
purchase is kept on the phone and verified on the next start.

## Build

Needs JDK 17+ and the Android SDK (Android Studio is easiest: open this folder).

```sh
./gradlew assembleDebug                                   # talks to https://talklive.app
./gradlew assembleDebug -PserverUrl=http://10.0.2.2:5000  # local server from the emulator
./gradlew testDebugUnitTest -Proborazzi.test.record=true  # render screens to app/build/screenshots
```

Release: set `TALKLIVE_KEYSTORE`, `TALKLIVE_KEYSTORE_PASSWORD` (same upload key
as `mobile/`) and run `./gradlew bundleRelease`.

## Layout

| Package | What |
|---|---|
| `net/` | `TalkSocket` (Socket.IO, identity registration, request/response), `/ice-servers` |
| `call/` | `CallManager` (search → match → WebRTC → next/end), `RtcSession`, audio routing, foreground `CallService` |
| `auth/` | Email sign-up with code, log-in, Google (Credential Manager), session resume |
| `ui/` | Compose screens: onboarding, home, call. Light theme by default, website brand colours |

## Status

Done: onboarding, accounts, spirit animals, random voice calls, friends, chats, friend calls, push.
Next: text chat mode, filters, games, streaks, Play Billing.
