# TalkLive app ad (34 s, vertical)

`TalkLive-App-Ad.mp4`: 1080 × 1920, 30 fps, H.264 + AAC, −14 LUFS (the TikTok / Reels / Shorts standard).
`cover.jpg` is frame 1, for the post cover.

Every phone screen is the Android app itself: the frames come from the app's Compose code
(`android-native/app/src/test/java/app/talklive/AdFrames.kt`), captured on a paused clock so the
real animations show up: the search pulse, the call's live audio ring and timer, messages arriving,
a real Tic-Tac-Toe game ending in "You win!", a friend request being accepted, an incoming call,
and the sheets sliding up. The music is original (`music.py`), and the message, friend and
ringtone sounds are the app's own (`res/raw`).

| Time | Beat | On screen |
|------|------|-----------|
| 0–3 s | Hook | "i pressed ONE button…" → search → "…and now i'm talking to someone in India 🇮🇳😳" |
| 3–6 s | Problem | friends asleep / group chat dead / dating apps = judging faces / video chat = creeps, struck out |
| 6–8 s | Turn | "you just want to TALK to someone." (build) |
| 8–10 s | Drop | TalkLive logo + "talk to someone new. right now." + free · no sign-up · no camera |
| 10–30 s | Features, 2 s each | time + language, text chat, games, add friends, friends call back, voice notes, spirit animals, interest/country match, country passport, "3am? someone's always awake" |
| 30–34 s | CTA | Download FREE on Google Play · no camera · no sign-up · 18+ |

## Rebuild

Needs the Android SDK, Node with Playwright, Python 3 (NumPy, SciPy, Pillow) and ffmpeg.

```bash
cd android-native
./gradlew testDebugUnitTest --tests '*AdFrames*' -Proborazzi.test.record=true
```

```bash
cd marketing/app-video-ad/source
python3 prepare_ui.py
python3 music.py music.wav
python3 sfx_mix.py
./render_chunks.sh
python3 encode.py ../TalkLive-App-Ad.mp4
```

Captions, timing, camera moves and taps are in `ad.html` (`CAPS`, `cam()`, `screenAt()`, `TAPS`);
sound placement is in `sfx_mix.py`. `node render_ad.js preview 1.9,12.5` renders single frames to `prev/`.
