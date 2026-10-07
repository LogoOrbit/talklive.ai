# TalkLive for Android

A Trusted Web Activity: the app opens `https://talklive.app` full screen in
the phone's browser engine, so the app *is* the website and updates with
every deploy. There is no app code to maintain; only release a new version
to change the icon, name, colours or start URL.

- Package: `app.talklive`
- Start URL: `https://talklive.app/?utm_source=android` (counted as its own
  acquisition source)
- Min Android 7.0 (API 24), targets API 36
- Library: `com.google.androidbrowserhelper` (Google's TWA helper)

## Full screen depends on the website

Android only drops the browser URL bar when the site vouches for the app at
`/.well-known/assetlinks.json` (route in `server/index.js`, data in
`server/assetlinks.json`). That file must list the SHA-256 of **every**
certificate the app is signed with:

1. The upload key (already listed).
2. The **Google Play app signing key**. Play re-signs every app it
   distributes with its own key, so after the first upload copy the SHA-256
   from Play Console > Test and release > App integrity > App signing, and
   either add it to `server/assetlinks.json` or set it without a code change:
   `fly secrets set ANDROID_CERT_SHA256=AA:BB:...`.

Check it with
`https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://talklive.app&relation=delegate_permission/common.handle_all_urls`.

## Signing

The upload keystore (`talklive-upload.jks`, alias `upload`) is **not** in the
repo. Keep it and its password somewhere safe (a password manager). With Play
App Signing a lost upload key can be reset through Play support, but it takes
days.

## Building

On GitHub: add the secrets `ANDROID_KEYSTORE_BASE64`
(`base64 -w0 talklive-upload.jks`) and `ANDROID_KEYSTORE_PASSWORD`, then
Actions > **Android app** > Run workflow, and download the
`talklive-android` artifact. `app-release.aab` goes to Play; the `.apk` is for
installing directly on a phone to test.

Locally (JDK 17+, Android SDK):

```sh
cd android
TALKLIVE_KEYSTORE=/path/to/talklive-upload.jks \
TALKLIVE_KEYSTORE_PASSWORD=... \
./gradlew bundleRelease
```

Bump `versionCode` (and `versionName`) in `app/build.gradle` for every
upload; Play rejects a repeated `versionCode`.

## Store listing

`store/` holds the Play listing graphics (512 icon, 1024x500 feature graphic,
1080x1920 phone screenshots) and `PLAY-LISTING.md` the text and the answers
for the Play Console forms.
