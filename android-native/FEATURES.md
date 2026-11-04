# Website → Android feature parity

What the website does and where it is in the native app. "Tested" means a
JVM test drives the app's own code against a real local server
(`ServerE2ETest`) or checks the rules directly (`GameRulesTest`); screens
are also rendered in `ScreenshotTest`.

| Website feature | App | Tested |
|---|---|---|
| Random voice calls (WebRTC, TURN) | Talk tab → Voice | matching + signalling relay (device only for audio) |
| Next / end / mute / speaker / report | Call screen | report + next in e2e |
| Random text chat | Talk tab → Text | ✅ e2e |
| Text chat: replies, reactions, typing, links refused, away | Text chat screen | ✅ e2e |
| Switch a text chat to voice | Phone icon in text chat | server flow; device for audio |
| Spirit animals (same artwork) | Picker after sign-up, Profile | generated from `public/animals.js` |
| Icebreakers (same deck) | Text chat chips, call card | generated from `public/icebreakers.js` |
| Call reactions, mutual heart | Reaction bar, match overlay | likes count in e2e |
| Rate the call | Card after a call | — |
| Partner card: country, local time, language, interests, films | Call + text chat | interests + films in e2e |
| Sign up with email code, log in, Google | Onboarding | ✅ e2e (Google needs a device) |
| Forgot password (email code) | Log in → Forgot password? | ✅ e2e |
| Change name / password / recovery email | Profile | ✅ e2e (name, password) |
| Custom friend ID | Profile → Privacy | ✅ e2e |
| Friends: requests, accept, cancel, remove, block, unblock, pin, rename, mute | Friends tab | ✅ e2e |
| Find by friend ID, share your ID | Friends → ➕ | ✅ e2e |
| People you met today | Friends tab | via state-sync |
| Direct messages: sent/seen, typing, unread, retry | Chats tab, chat screen | ✅ e2e |
| Edit, delete, react to DMs; clear chat | Long-press a message, chat menu | ✅ e2e |
| Voice messages with consent | Mic button in chats | ✅ e2e (audio round trip) |
| Call a friend, ringing, decline, call back later | Friends tab, chat header | ✅ e2e |
| Missed calls / accepted requests | Friends → bell | via notifications |
| Show online status, friends can call me | Profile → Privacy | ✅ e2e |
| Streak, weekly stats, passport | Home 🔥 chip | ✅ e2e (streak) |
| Match filters: interests, countries, gender (Plus) | Home filter button | ✅ e2e (interests) |
| Favourite films and shows (Apple search) | Profile | ✅ e2e (save + shown to partner) |
| Who liked you (names with Plus) | Profile | ✅ e2e |
| Invite friends (referral) | Profile, talklive.app/?ref= links | ✅ e2e |
| Undo skip (Plus) | Snackbar after Next | — (needs a Plus account) |
| Mini-games: Tic Tac Toe, Dots and Boxes | 🎮 in calls and text chats | ✅ rules + e2e full game |
| Feedback | Profile | ✅ e2e |
| Help and support chat with the team | Profile → Help and support | ✅ e2e |
| Moderator warnings, bans, maintenance | Dialog / screen | — |
| Push notifications | FCM (needs google-services.json) | — |
| Buy TalkLive Plus | Profile → TalkLive Plus (Google Play Billing, verified by the server) | server rules in `scripts/test-play-billing.js`; purchase needs a Play test track |
| Visitors today | Home | ✅ e2e |
| I am / age group (feeds gender filters and stats) | Profile → You | — |
| Voice check (on-device, opt-in, behind the server's `voiceCheck` flag) | Profile → You | `VoiceAnalysisTest` (synthetic voices) |
| Shouting alert for moderators (same as mobile web) | Automatic during calls | `VoiceAnalysisTest` |
| 17 languages | System or per-app language (Android 13+) | screenshots (ar, hi, de, ja) |
| Themes: Dark (default), Light, Ocean, Sunset | Profile → Appearance | screenshots |
| Emoji picker, GIFs (Giphy via /api/gifs) | Chat composer | ✅ e2e (GIF) |
| Sound effects (same tones as the website) | Automatic; Profile → Sounds | — |
| Movie-character avatars | Avatar picker | generated from `public/characters.js` |
| Team replies to feedback | Dialog when one arrives | — |
| "Keep my filters" when nobody matches | Snackbar | — |
| Remove someone from "met today" | Long-press their card | ✅ e2e |
| Links open the app, shortcuts | talklive.app links, long-press icon | — |

## Not in the app yet

| Website feature | Why |
|---|---|
| Speech-to-text moderation (keywords, sentiment, TalkGuard model) | The website turns it off on phones too (browsers cannot run it next to a call). Shouting detection runs in the app, and the server still checks every text message. |
| "Voice-checked only" filter option | Needs the server's `voiceCheck` flag; the verdict is already sent, the filter toggle comes when the flag goes live. |
