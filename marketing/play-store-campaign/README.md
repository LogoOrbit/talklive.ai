# Google Play screenshot campaign

Eight 1080 × 1920 portrait screenshots in two lighting moods, ready to upload:

- `dark/` — midnight navy and indigo, the app in its dark theme
- `light/` — porcelain and soft brand tints, the app in its light theme
- `overview-dark.jpg`, `overview-light.jpg` — the full sets at a glance

| # | Headline | App screen |
|---|----------|------------|
| 01 | Meet someone new. | Talk tab, voice mode |
| 02 | Hear a real voice. | Live voice call |
| 03 | Prefer typing? | Text chat with a stranger |
| 04 | Keep the good ones. | Friends, plus a friend calling back |
| 05 | Messages that feel alive. | Chat with voice notes and a reaction |
| 06 | Break the ice. | Tic-Tac-Toe during a call |
| 07 | Be anyone. | Spirit animal picker |
| 08 | Go further with Plus. | TalkLive Plus page (price kept out of frame) |

## Where the UI comes from

Nothing in the phones is drawn by hand. Each screen is the app's own Compose
code rendered by `android-native/app/src/test/java/app/talklive/CampaignShots.kt`
(Robolectric + Roborazzi, 392 × 871 dp at 4x), with sample people and messages.
The status bar and gesture handle are a plain Android 15 style. The spirit-animal
floor on slide 07 uses the web app's own artwork (`public/animals.js`).

## Regenerate after a UI change

Needs an Android SDK (platform 36), Node, Python 3 with Pillow and NumPy, and Playwright's Chromium.

```bash
cd android-native
./gradlew testDebugUnitTest --tests '*CampaignShots*' -Proborazzi.test.record=true
```

```bash
cd marketing/play-store-campaign/source
npm install
node sysbars.js
python3 make_screens.py ../../../android-native/app/build/campaign screens .
node render.js
```

`render.js 01,04 dark` renders only some slides or one theme. Layouts, copy and
lighting live in `source/slides.js`; the 3D phone (studio-lit metal frame, glass,
punch-hole camera) is `source/phone3d.js`.
