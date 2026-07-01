# TalkLive

A random audio chat app — pairs strangers for live, audio-only conversations. Built with WebRTC for peer-to-peer audio and Socket.IO for signaling/matchmaking.

## Features

- One-tap random matchmaking (no sign up required)
- Optional account sign up/log in, including "Sign Up / Continue with Google"
- Peer-to-peer audio over WebRTC (low latency, not routed through the server)
- "Next Stranger" to skip and instantly requeue
- Mute/unmute mic
- Live online user count
- Speaking indicator (visualizes remote audio activity)

## Running locally

```bash
npm install
npm start
```

Then open http://localhost:5000 in two separate browser tabs/windows (or two devices) to be matched with each other.

### Enabling "Sign Up with Google" (optional)

The app works fully without this — the Google button just won't be shown.

1. In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an OAuth 2.0 Client ID of type "Web application".
2. Add your site's origin(s) (e.g. `http://localhost:5000` and your production URL) under "Authorized JavaScript origins". No redirect URI is needed — sign-in happens client-side via Google Identity Services.
3. Set the `GOOGLE_CLIENT_ID` environment variable to that client ID before starting the server:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com npm start
   ```

## How it works

- `server/index.js` — Express static server + Socket.IO signaling. Maintains a waiting queue and pairs the first two waiting sockets together. Relays WebRTC offer/answer/ICE candidates between matched peers only.
- `public/app.js` — Client logic: requests mic access, manages the `RTCPeerConnection`, and drives the UI state machine (idle → waiting → connected).

Audio itself flows directly between the two browsers (peer-to-peer); the server only handles matchmaking and connection setup signaling, so it never sees or stores call audio.

## Notes

- Uses public Google STUN servers for NAT traversal. On some restrictive networks (symmetric NAT, corporate firewalls) a TURN server would be needed for relay fallback — not included here.
- Requires HTTPS (or localhost) in production, since browsers only allow microphone access on secure origins.
