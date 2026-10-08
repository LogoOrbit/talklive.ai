# TalkLive mobile app (Android, iOS next)

A [Capacitor](https://capacitorjs.com) app: a native shell that shows
`https://talklive.app` and adds what a website cannot do on a phone. Website
changes reach the app the moment they deploy; only native changes need a new
store release.

| | Where |
|---|---|
| Package / bundle id | `app.talklive` |
| Start URL | `https://talklive.app/?utm_source=mobile_app` (counted as `acq_mobile_app`) |
| Web side | `public/native.js`, loaded only inside the app (inline loader in `index.html` / `chat.html`) |
| Native side | `android/app/src/main/java/app/talklive/` |
| Push sending | `server/push.js` (FCM), `POST /push/native-subscribe` in `server/index.js` |

## What is native

- **Push notifications** (Firebase Cloud Messaging). Friend messages, friend
  requests and "wants to talk" requests. Requests to talk use the `calls`
  channel, which rings with the phone's ringtone. Same copy and throttling as
  web push; message text is never put on the lock screen.
- **Calls survive leaving the app.** `app.js` reports the call state; while a
  call is connecting/connected, `CallService` (a microphone foreground
  service) keeps the microphone and the app alive and shows "On a TalkLive
  call".
- **Google sign-in.** Google blocks its web button in apps, so the app uses
  Android's Credential Manager and hands the ID token to the site, which
  verifies it like the web credential (`google-auth` socket event).
- **App links.** `talklive.app` links open in the app (verified by
  `/.well-known/assetlinks.json`, `server/assetlinks.json`).
- Microphone permission, splash screen, icons, offline page (`www/offline.html`).

## One-time setup (owner)

1. **Firebase (push).** console.firebase.google.com > Add project > add an
   Android app with package `app.talklive`. Download `google-services.json`
   and put it in `android/app/` (or the `GOOGLE_SERVICES_JSON` GitHub
   secret). Then Project settings > Service accounts > Generate new private
   key, and on the server: `fly secrets set FCM_SERVICE_ACCOUNT="$(base64 -w0 key.json)"`.
   Until both exist the app runs normally without push.
2. **Google sign-in.** Google Cloud console (same project as the site's
   `GOOGLE_CLIENT_ID`) > Credentials > Create OAuth client ID > Android, package
   `app.talklive`, with the SHA-1 of each signing key: the upload key
   `3F:35:26:A2:85:A7:E7:6F:AF:26:BF:73:DD:71:BA:7C:2D:AB:7C:2C` and the Play
   app signing key (Play Console > Test and release > App integrity). No code
   change: the app asks for a token for the site's existing web client ID.
3. **App links.** Add the Play app signing key's SHA-256 to
   `server/assetlinks.json` (or `fly secrets set ANDROID_CERT_SHA256=...`).

## Building

```sh
cd mobile
npm ci
npx cap sync android
cd android
TALKLIVE_KEYSTORE=/path/to/talklive-upload.jks TALKLIVE_KEYSTORE_PASSWORD=... \
  ./gradlew bundleRelease assembleRelease
```

Or on GitHub: Actions > **Android app** > Run workflow (secrets listed in
`.github/workflows/android.yml`). Bump `versionCode` / `versionName` in
`android/app/build.gradle` for every Play upload.

The upload keystore (`talklive-upload.jks`, alias `upload`) is never in the
repo; keep it and its password in a password manager.

## Store listing

`store/` holds the graphics and `PLAY-LISTING.md` the listing text and the
answers for Play Console's policy forms.
