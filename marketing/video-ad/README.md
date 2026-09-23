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
