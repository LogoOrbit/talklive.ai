// Mini-game analytics. The games themselves run in the two browsers (see
// public/games.js) and the server only relays their messages between partners,
// so this module watches that relay and turns it into owner-facing numbers:
// who was invited, who accepted, declined or never answered, how many rounds
// were played, who won, and for how long people actually played.
//
// Only the relay is observed - nothing here changes what is forwarded. State
// lives in memory while a pair is together and is written to the store when an
// invite resolves or a pair's game session ends.

const GAMES = new Set(['ttt', 'dab']);
// A round left sitting unfinished (both players went back to talking) should
// not count as an hour of play, so one round is credited at most this long.
const MAX_ROUND_MS = 20 * 60 * 1000;

const gameOf = (g) => (GAMES.has(g) ? g : 'ttt');

// A board nobody has touched yet: what the host broadcasts when a round starts.
function isFreshBoard(s) {
  if (!s || typeof s !== 'object' || s.phase !== 'move') return false;
  if (s.g === 'dab') {
    return Array.isArray(s.h) && Array.isArray(s.v) && s.h.every((x) => x === null) && s.v.every((x) => x === null);
  }
  return Array.isArray(s.board) && s.board.every((x) => x === null);
}

function createGameTracker({ store, profileOf }) {
  // pairKey -> { from, to, game, ts }: an invite waiting for an answer.
  const invites = new Map();
  // pairKey -> session: { game, mode, a, b, startedAt, host, round, rounds[] }
  const sessions = new Map();

  const pairKey = (x, y) => (x < y ? x + '|' + y : y + '|' + x);

  function who(socketId) {
    const p = profileOf(socketId);
    if (!p || !p.clientId) return null;
    return { clientId: p.clientId, username: p.username || '', country: p.countryName || p.country || '', mode: p.mode === 'chat' ? 'chat' : 'talk' };
  }

  function resolveInvite(key, outcome) {
    const inv = invites.get(key);
    if (!inv) return;
    invites.delete(key);
    const from = who(inv.from);
    const to = who(inv.to);
    if (!from || !to) return;
    store.recordGameInvite({ game: inv.game, mode: from.mode, from, to, outcome, waitMs: Date.now() - inv.ts });
  }

  function startSession(key, x, y, game) {
    if (sessions.has(key)) return sessions.get(key);
    const px = who(x);
    const s = { game: gameOf(game), mode: px ? px.mode : 'talk', a: x, b: y, startedAt: Date.now(), host: null, round: null, rounds: [] };
    sessions.set(key, s);
    return s;
  }

  function closeRound(s, now, result) {
    if (!s.round) return;
    const ms = Math.min(MAX_ROUND_MS, Math.max(0, now - s.round.start));
    s.rounds.push({ ms, winner: result === undefined ? null : result, finished: result !== undefined });
    s.round = null;
  }

  function endSession(key) {
    const s = sessions.get(key);
    if (!s) return;
    sessions.delete(key);
    const now = Date.now();
    closeRound(s, now);
    const host = s.host || s.a;
    const guest = host === s.a ? s.b : s.a;
    const players = [who(host), who(guest)];
    if (!players[0] || !players[1]) return;
    store.recordGameSession({
      game: s.game,
      mode: s.mode,
      players,
      startedAt: s.startedAt,
      sessionMs: now - s.startedAt,
      rounds: s.rounds,
    });
  }

  // Every relayed 'game' message, before it is forwarded to the partner.
  function onEvent(senderId, partnerId, data) {
    const key = pairKey(senderId, partnerId);
    const now = Date.now();
    switch (data.type) {
      case 'invite': {
        if (sessions.has(key)) return;
        const game = gameOf(data.game);
        const pending = invites.get(key);
        if (pending && pending.to === senderId) {
          // Both invited each other at once: the clients just start playing.
          resolveInvite(key, 'accepted');
          startSession(key, pending.from, senderId, pending.game);
          return;
        }
        if (pending) resolveInvite(key, 'ignored'); // a second invite replaces an unanswered one
        invites.set(key, { from: senderId, to: partnerId, game, ts: now });
        return;
      }
      case 'accept': {
        const pending = invites.get(key);
        if (!pending || pending.to !== senderId) return;
        resolveInvite(key, 'accepted');
        startSession(key, pending.from, senderId, pending.game);
        return;
      }
      case 'decline': {
        const pending = invites.get(key);
        if (!pending) return;
        // The inviter "declining" is them withdrawing their own invite.
        resolveInvite(key, pending.from === senderId ? 'cancelled' : 'declined');
        return;
      }
      case 'state': {
        const st = data.state;
        if (!st || typeof st !== 'object') return;
        let s = sessions.get(key);
        const fresh = isFreshBoard(st);
        if (!s) {
          if (!fresh) return;
          s = startSession(key, senderId, partnerId, st.g === 'dab' ? 'dab' : 'ttt');
        }
        if (fresh) {
          // Only the host deals a new board, so this is also who "player 0" is.
          closeRound(s, now);
          s.host = senderId;
          s.game = st.g === 'dab' ? 'dab' : 'ttt';
          s.round = { start: now };
          return;
        }
        if (st.phase === 'over' && s.round) {
          const w = st.winner === 0 || st.winner === 1 ? st.winner : 'draw';
          closeRound(s, now, w);
        }
        return;
      }
      case 'left': {
        const pending = invites.get(key);
        if (pending) resolveInvite(key, pending.from === senderId ? 'cancelled' : 'declined');
        endSession(key);
        return;
      }
      default:
    }
  }

  // The pair itself ended (next, hang up, disconnect): settle whatever was open.
  function onPairEnd(x, y) {
    if (!x || !y) return;
    const key = pairKey(x, y);
    if (invites.has(key)) resolveInvite(key, 'ignored');
    endSession(key);
  }

  // Games being played right now, for the dashboard.
  function live() {
    const now = Date.now();
    const out = [];
    for (const s of sessions.values()) {
      const host = who(s.host || s.a);
      const guest = who((s.host || s.a) === s.a ? s.b : s.a);
      out.push({
        game: s.game,
        mode: s.mode,
        players: [host, guest].map((p) => (p ? { username: p.username, country: p.country } : null)),
        startedAt: s.startedAt,
        seconds: Math.round((now - s.startedAt) / 1000),
        rounds: s.rounds.length + (s.round ? 1 : 0),
      });
    }
    return { sessions: out.sort((a, b) => a.startedAt - b.startedAt), pendingInvites: invites.size };
  }

  return { onEvent, onPairEnd, live };
}

module.exports = { createGameTracker, isFreshBoard };
