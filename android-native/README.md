# TalkLive for Android (native)

Kotlin + Jetpack Compose app that talks to the same server as the website
(Socket.IO + WebRTC), replacing the Capacitor wrapper in `mobile/`. Same
package id (`app.talklive`), so it ships as an update to the Play listing.

## Test on your phone (no Android Studio)

1. GitHub > Actions > **Android native app** > latest run > download **talklive-native-debug**.
2. Unzip, copy `app-debug.apk` to the phone and open it (allow "Install unknown apps").
3. It installs as a separate app next to the Play Store version.

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

Done: onboarding, sign-up/log-in/Google, random voice calls (mute, speaker, next, end, report),
background calls. Next: spirit animals, friends + chat, push (FCM), text chat mode, Play Billing.
