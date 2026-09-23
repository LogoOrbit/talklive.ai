# TalkLive motion ad

`../TalkLive-Motion-Ad.mp4` — 23s, 1080×1920, 30fps, with `MusicForTalkLive.mp3`. Built from real screens of the app.

Regenerate (needs global Playwright and ffmpeg):

```bash
PORT=6900 DATA_DIR=/tmp/tl-data npm start          # app, from repo root
node marketing/video-ad/capture.js                # real app screens -> shots/
npx http-server -p 6910 -s .                      # static server, from repo root
node marketing/video-ad/render.js preview 5 12 20 # spot-check frames -> prev/
node marketing/video-ad/render.js video           # full MP4
```

Edit timing, captions and camera moves in `compose.html` (`CAPS`, `SCREENS`, `CAM`, `TAPS`).
