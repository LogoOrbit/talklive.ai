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

## Owner Dashboard

A secured owner dashboard lives at **`/owner`** (e.g. `https://talklive.ai/owner`).

- **Security:** admin password (min 10 chars) + Google Authenticator (TOTP) 2FA. First visit runs a one-time setup where you scan a QR code. 5 failed logins lock the IP out for 15 minutes; every login and admin action lands in the Audit Log tab.
- **Analytics:** live online users (with country/city/IP), visits, unique visitors, daily 24h users, matches, 30-day traffic chart, top countries/cities, feature-usage graph (most → least), anonymous "what users talk about" keyword aggregate, and a rule-based AI conclusion on how the site is doing.
- **Moderation:** every user report is stored with reporter/reported details; one-click bans from 30 minutes up to 5 years (by clientId **and** IP — banned users cannot connect at all until the ban expires or you lift it). Users are auto-banned for 30 minutes after 3 reports.
- **Errors:** client-side JS errors and server crashes are collected in the Errors tab (duplicates collapsed).
- **Maintenance mode:** one button takes the site offline with a friendly message; the dashboard stays reachable.

### Environment variables

| Var | Purpose |
|---|---|
| `OWNER_EMAIL` | Where report/feedback/error alert emails go |
| `SMTP_USER` / `SMTP_PASS` | Gmail address + **app password** (Google Account → Security → 2-Step Verification → App passwords) |
| `DATA_DIR` | Directory for the persistent JSON store (default `./data`; on Render mount a disk at `/var/data`) |

Email alerts are throttled to one per topic per 10 minutes and are skipped entirely if SMTP is not configured.
