# Spec: My Profile, covers, avatars, levels, badges, posts (Nov 2026)

Shared contract for server, web (public/) and Android (android-native/). Ids and
event names here are fixed; implementations must match them exactly.

## 1. Avatars (trimmed)

Pickers show only these faces (others stay valid for whoever wears them, but are
no longer offered):

- Free animals (3): `a:lion`, `a:fox`, `a:cat`
- Free characters (3): `c:wizard`, `c:pirate`, `c:robot`
- Plus animals (5): `a:panda`, `a:dog` and the 3 most detailed other animals that
  already exist in public/animals.js (same 3 on Android).
- Plus characters (5): `c:detective`, `c:ninja` and the 3 most detailed other
  characters that already exist (same 3 on Android).
- Special (unlocked by level, never by Plus): `c:silver_knight` (Silver),
  `c:gold_phoenix` (Gold), `c:diamond_legend` (Diamond). New art, detailed,
  readable at 28px, gently animated where the platform animates avatars.

`FREE_FACES` (server/index.js, public/animals.js, Characters.kt) becomes exactly
the 6 free faces. A special face may be picked only when its tier is unlocked
(server refuses otherwise, like a Plus face).

## 2. Points and levels (server-tracked; UI on Android only)

Stored per profile clientId: `store.data.progress[clientId] = { points, lastClaimAt, redeemedCode, invites: [clientIds], inviteBatchesPaid }`.

- Daily claim: +1 point, once per rolling 24 h.
- Invite code: every signed-in account has a secret code (reuse the existing
  referral code). A new account that is verified (Google, or email verified at
  signup) and less than 7 days old may redeem ONE code that is not its own and
  not from the same device/network (reuse referral ownerNets checks): the
  redeemer gets +10 now; the code owner gets +10 for every 3 such redeemers.
- Tiers: Silver at 40 points (unlocks `c:silver_knight`), Gold at 100
  (`c:gold_phoenix`), Diamond at 200 (`c:diamond_legend`). Level number:
  `level = min(10, 1 + floor(points / 20))` for display; tier names as above.

Socket events (all need a registered profile; replies via ack callback):
- `progress-get` -> ack `{ points, level, tier: 'none'|'silver'|'gold'|'diamond', nextTier, nextAt, canClaim, nextClaimAt, code, redeemed: bool, invitesCounted }`
- `progress-claim` -> ack `{ ok, points, ...same as above }` or `{ ok:false, reason:'wait', nextClaimAt }`
- `progress-redeem` `{ code }` -> ack `{ ok, points }` or `{ ok:false, reason:'not-verified'|'too-old'|'own'|'used'|'invalid'|'same-device' }`
- Server pushes `progress` with the progress-get payload when it changes.

## 3. Talk-time badges (both platforms)

Computed from `store.data.talkTime[clientId].seconds` (total call time). Ten
badges, automatically held once the threshold is reached:

| id | name | hours |
|---|---|---|
| `b1` | First Words | 1 |
| `b2` | Chatterbox | 5 |
| `b3` | Storyteller | 10 |
| `b4` | Night Owl | 25 |
| `b5` | Globetrotter | 50 |
| `b6` | Silver Tongue | 100 |
| `b7` | Golden Voice | 250 |
| `b8` | Legend | 500 |
| `b9` | Mythic | 1000 |
| `b10` | TalkLive Icon | 2500 |

Server adds `badges: { top: 'b3' | null, earned: ['b1','b2','b3'], hours: 12.4 }`
to: the person's own state (`state-sync`), and every public profile/snapshot
another person sees (profile sheets, friend list rows, find-by-friend-id,
matched partner). Badge art: small, detailed, miniature medals, each distinct,
softly animated (shine sweep / glow), drawn in SVG on web (public/badges.js,
shared) and in Compose on Android. Shown on own and others' profiles.

Dashboard: a "Badges" section (Users tab or its own tab) listing people by
talk hours with the badge they hold, and a count per badge.

## 4. Profile covers

`cover` id strings:
- Free solids: `solid:ocean`, `solid:sky`, `solid:mint`, `solid:sunset`, `solid:rose`, `solid:slate`
- Free gradients: `grad:dawn`, `grad:lagoon`, `grad:berry`, `grad:forest`, `grad:peach`, `grad:night`
- Plus animated: `plus:aurora`, `plus:galaxy`, `plus:waves`, `plus:neon`, `plus:sakura`, `plus:fireflies`

Event `set-cover` `{ cover }` -> ack `{ ok, cover }` / `{ ok:false, reason:'plus'|'invalid' }`.
Stored on the account (or clientId for guests). Server always reports the
EFFECTIVE cover: a `plus:` cover while not Plus is reported as `null`.
`cover` is included in own state and every public profile/snapshot.

## 5. Plus ends = Plus features end

When Plus (subscription, pass, trial) is no longer active, the server must, at
the moment it ends (armPremiumTimer/emitPremiumStatus path) and on every
register: drop Plus-only filters (exists), report Plus covers as null, and
replace a Plus face (not a special face) with a free face (keep a record of the
chosen Plus face so it comes back if Plus returns). Clients follow what the
server reports.

## 6. Friends list: disappearing messages

Each friend list row the server sends gains `disappearing: <seconds>|0`.

## 7. Admin posts with reactions and comments (website)

`store.data.posts = [{ id, text, image?, createdAt, editedAt?, pinned, reactions: { like:[cid], love:[cid], haha:[cid], wow:[cid], sad:[cid] }, comments: [{ id, clientId, name, avatar, handle, text, ts, admin?:true, hidden?:true }] }]`

Public HTTP (server/posts.js, mounted from index.js):
- `GET /api/posts?clientId=&identityToken=` -> `{ posts: [{ id, text, image, createdAt, counts: {like,love,haha,wow,sad,total}, mine: 'like'|null, commentCount, comments: [last 50 visible, oldest first] }], canComment: bool }`
- `POST /api/posts/:id/react` `{ clientId, identityToken, type|null }` -> updated post. One reaction per person (null removes). Anyone with a valid identity may react.
- `POST /api/posts/:id/comments` `{ clientId, identityToken, text }` -> `{ ok, comment }`. Only verified accounts (signed-in account with Google or verified email). Max 500 chars, rate limit 5/min, text passes the same chat-guard/automod checks used for chat. `{ ok:false, reason:'verify'|'rate'|'blocked' }`.

Admin (owner dashboard, new "Posts" tab, routes under the existing admin router):
create / edit / pin / delete posts, see all comments, hide/delete a comment,
reply as "TalkLive" (admin comment, shown with an Admin badge), see counts.

Web home (public/index.html + app.js or a new public/posts.js): when the user
scrolls the home page, a "From TalkLive" section shows posts (newest/pinned
first) in a Facebook-style card: text/image, reaction bar with counts per type
and total, comment count, comments list, comment box (or "Sign in with a
verified account to comment"). Reacting/commenting updates counts live.

## 8. Round 2 changes (Nov 22)

**Free faces (replaces §1 lists):**
- Free animals (5): `a:cat`, `a:fox`, `a:panda`, `a:rabbit`, `a:dog`
- Free characters (5): `c:wizard`, `c:pirate`, `c:robot`, `c:queen`, `c:artist`
- Plus (picker, 5+5): animals `a:lion`, `a:raccoon`, `a:giraffe` + 2 most detailed others; characters `c:detective`, `c:ninja`, `c:warrior`, `c:gamer` + 1 most detailed other. Same lists on server, web, Android.
- Anyone without Plus currently wearing a Plus face (account record, stored settings, live profile) is switched to a free face: animal -> `a:cat`, character -> `c:wizard`. One-time migration at boot plus the existing per-register check.

**History:** call and chat history (recent people) and the stranger conversations reachable from it are kept 30 days. UI shows one short line: "Kept for 30 days".

**Likes = mutual match:**
- `like-partner` `{ clientId }` -> ack `{ ok, matched }`. Only for someone in your recent history (or current partner). One like per pair, idempotent.
- When both have liked each other: both get `like-match` `{ clientId, username, avatar, cover, badges }`; the server makes them friends (if not already, and not blocked) and the UI shows "It's a match!" with a "Call again" action.
- `likes-summary` -> ack `{ count, matches, people }`: `count` = likes received in the last 30 days not yet matched; `people` = `[{ clientId, username, avatar, ts }]` only for Plus (empty list otherwise, UI shows blurred faces + "See who with Plus"). Push `likes` `{ count }` when it changes.
- Likes received in the last 7 days give a small match-priority boost (reputation / ranking).

**Server notes (implemented):**
- Face on every person payload comes from one resolver (`resolveFace` in server/index.js): live profile, then the owner account's saved face, then the last noted face, then the stored row, then a stable free default animal. A Plus face worn without Plus is shown as the free face of that kind. Applies to friend rows, history rows, find-by-friend-id, matched/like-match partner, likes-summary people, post comment avatars.
- Likes reuse the existing "who liked you" store (`store.addLike`); the in-call heart button feeds it too, so a heart can also complete a match. Match = both directions present within 30 days. `like-partner` failure reasons: `invalid`, `not-registered`, `not-recent`, `blocked`, `rate`. `like-match` also carries `friendId`. Web events `get-likes` and `mutual-heart` still work.
- Ranking: likes received in the last 7 days add +0.5 each (max 4 counted) to that candidate's match score.
- Android posts API: `GET /api/posts?clientId=&identityToken=`, `POST /api/posts/:id/react`, `POST /api/posts/:id/comments` need no cookies or CORS. `identityToken` is the token from the socket event `identity-token` `{ clientId, token }`; clientId must match `[A-Za-z0-9_-]{8,64}`. Without a valid pair GET still works (mine null, canComment false); react/comment return 401 `{ ok:false, reason:'identity' }`.

## 9. Top-talker rank badges + hide badges

- Rank badges `top1`..`top5` ("#1 Top Talker" crown, "#2 Top Talker", ... "#5 Top Talker"): held by the 5 people with the most total call time (`talkTime.seconds`, same numbers as the dashboard Talk time leaderboard). Recomputed automatically (on boot, after each call end at most once a minute). Accounts and guests both count; banned profiles are skipped. A rank badge outranks hour badges: when held it is the `top` badge shown by the name. Payload: `badges: { top, earned, hours, rank: 1..5|null }`, with `top1`..`top5` in `earned` when held.
- Art: more special than hour badges (crown/trophy motif, gold for #1, silver #2, bronze #3, platinum-blue #4/#5), shiny and animated.
- Dashboard Badges view shows the current top 5 with their rank badge.
- Setting `show-badges` `{ on }` -> ack `{ ok, on }` (default on, stored per profile/account). When off, the server sends `badges: null` to OTHER people; the owner still gets their own badges plus `badgesHidden: true` in own state. Toggle lives in My Profile > Badges ("Show badges on my profile").

## 10. Round 3 (Nov 23): simple profile, anti-cheat, daily claim

**Profile (app + web).** App bottom bar: Home, Friends, History, Filters, **Profile** (replaces More; icon = own avatar). Web: the same Profile page/sheet from the header avatar.
- Profile screen top: one profile card on its cover background: avatar (small pencil overlay; tapping opens Edit profile on the Avatar tab), name, ID, top badge, level chip (app), and a stats row: streak chip (🔥 N) and a single countries button ("🌍 N countries") that opens a scrollable list of the countries talked to (flag, name, count). Streak and countries are removed from Home everywhere.
- Under the card: one "Edit profile" button, then the Settings list (compact, grouped: Plus, Notifications, Privacy & safety, Appearance & sound, Account, Help, News, Invite). Nothing else; no long scroll on a normal phone for the top part.
- Edit profile: live preview of the card at the top that updates as you choose; below it three tabs: Avatar | Cover | Name (display name + ID). Save / Cancel. Badges shelf + "Show badges" switch live on the Profile screen under the card (one horizontal row).
- Home (web): no "Today's question", no weekly recap ("Last week: ..."), no streak/countries, no avatar picker. Home (app): same.
- Hours text: whole hours "12h" (floor); under 1h show minutes "40m". Never "1.0h".

**Daily reward (app).** On the first app open after `canClaim` becomes true, show an attractive "Daily reward" sheet (gift animation, +1 point, Claim button). If dismissed, the level chip in the top bar shows a pulsing dot/bounce until claimed; tapping it opens Rewards with Claim.

**Anti-cheat: only active talk counts.**
- During a voice call each client sends `voice-activity` `{ pairId, spokeMs }` every 10 s: milliseconds its own mic detected speech (local VAD) in that window, 0..10000. Text chats do not send it.
- Server keeps, per call, the last 20 s of reports from each side. A 10 s window is ACTIVE when both sides reported spokeMs >= 1000 within the last 20 s. `talkTime.active` += active seconds at call end (cap: the call's real length). Only `active` seconds (plus the pre-cutover total stored once as `talkTime.base`) feed badges, rank badges, hour displays, progress and streaks. Dashboard keeps showing raw seconds and adds an Active column.
- A client that sends no reports earns 0 active seconds (old or modified clients cannot farm).
- Silence auto-end: if neither side reported speech in the first 60 s after connect, or both sides reported 0 for 120 s straight, server emits `silence-warning` `{ endsInMs: 60000 }` to both; UI shows a 60 s countdown with "Still here" button. Speech from either side or `still-here` from either side -> `silence-cleared` to both. Otherwise the server ends the call (both get `partner-left` `{ reason: 'silence' }`, UI: "Call ended: no one was talking"). Pairs where either side never sent any `voice-activity` (old clients) are not auto-ended.

**Hardening.** Every reward/feature is decided on the server only: daily claim timing, invite redeem, rank/hour badges, covers, faces (Plus and special), likes, posts, Plus features. Rate-limit every new event; validate payload types/lengths; never trust client-sent premium, tier, face unlock, hours or timestamps.
