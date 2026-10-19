# TalkLive motion ads

All 1080×1920, 30fps, built from real screens of the app:

- `../TalkLive-Motion-Ad.mp4` — 23s walkthrough (`compose.html`), also on the landing page
- `../TalkLive-Ad-omegle.mp4` — 15s, "Omegle is gone" hook (`ads.html?ad=omegle`)
- `../TalkLive-Ad-language.mp4` — 15s, language-learner hook (`ads.html?ad=language`)
- `../TalkLive-Ad-animals.mp4` — 15s, spirit-animal roulette hook (`ads.html?ad=animals`)
- `../TalkLive-Ad-games.mp4` — 15s, "Awkward silence? Play a game" with a real Tic Tac Toe match (`ads.html?ad=games`)
- `../TalkLive-Ad-worldwide.mp4` — 15s, "It's 2am" + world clocks (`ads.html?ad=worldwide`)
- `../TalkLive-Ad-texting.mp4` — 15s, "Hate phone calls?" text-chat hook (`ads.html?ad=texting`)
- `../TalkLive-Ad-pov.mp4` — 15s, TikTok-style POV captions (`ads.html?ad=pov`)

Regenerate (needs global Playwright and ffmpeg):

```bash
PORT=6900 DATA_DIR=/tmp/tl-data npm start          # app, from repo root
node marketing/video-ad/capture.js                # real app screens -> shots/
node marketing/video-ad/capture-game.js           # real Tic Tac Toe match -> shots/game-*
npx http-server -p 6910 -s .                      # static server, from repo root
node marketing/video-ad/render.js preview 5 12 20 # spot-check frames -> prev/
node marketing/video-ad/render.js video           # full MP4 (original)
node marketing/video-ad/render.js video omegle    # one of the 15s ads
```

Edit timing, captions and camera moves in `compose.html`, or per ad in the `ADS` object in `ads.html`.

## Headphones explainer (28s, 1440×2560, 60fps)

`../TalkLive-Ad-headphones.mp4`: "Your most boring minutes could be the best part of your day." Bus, back seat, bed and break scenes, then headphones on → talklive.app → Tap to Talk → the world. Illustrated motion graphics (`headphones.html`), Kokoro TTS voiceover, and music + sound effects synthesized from scratch (`audio/mix_headphones.py`).

```bash
npx http-server -p 6910 -s .                                   # static server, from repo root
node marketing/video-ad/render-headphones.js preview 2.5 13 18  # spot-check frames -> prev/
node marketing/video-ad/render-headphones.js events             # sound cue sheet -> audio/events.json
python marketing/video-ad/audio/make_vo.py kokoro-v1.0.onnx voices-v1.0.bin vo/   # voiceover lines
python marketing/video-ad/audio/mix_headphones.py vo/ mix.wav   # music + sfx + voice
node marketing/video-ad/render-headphones.js video 4            # silent video -> out/
ffmpeg -i out/headphones-silent.mp4 -i mix.wav -map 0:v -map 1:a -c:v copy \
  -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 256k -ar 48000 -movflags +faststart ../TalkLive-Ad-headphones.mp4
```
