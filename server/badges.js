// Talk-time badges (docs/SPEC-PROFILE-PROGRESS-POSTS.md, section 3).
//
// Nothing is stored: a badge is held once a person's total call time reaches
// its threshold, so it is computed from store.data.talkTime[clientId].seconds.

const BADGES = [
  { id: 'b1', name: 'First Words', hours: 1 },
  { id: 'b2', name: 'Chatterbox', hours: 5 },
  { id: 'b3', name: 'Storyteller', hours: 10 },
  { id: 'b4', name: 'Night Owl', hours: 25 },
  { id: 'b5', name: 'Globetrotter', hours: 50 },
  { id: 'b6', name: 'Silver Tongue', hours: 100 },
  { id: 'b7', name: 'Golden Voice', hours: 250 },
  { id: 'b8', name: 'Legend', hours: 500 },
  { id: 'b9', name: 'Mythic', hours: 1000 },
  { id: 'b10', name: 'TalkLive Icon', hours: 2500 },
];

// Rank badges (spec section 9): the 5 people with the most total call time hold
// top1..top5. Recomputed by recomputeRanks(); kept in memory (it is derived from
// talkTime, so a restart simply recomputes it at boot).
const RANK_BADGES = [
  { id: 'top1', rank: 1, name: '#1 Top Talker' },
  { id: 'top2', rank: 2, name: '#2 Top Talker' },
  { id: 'top3', rank: 3, name: '#3 Top Talker' },
  { id: 'top4', rank: 4, name: '#4 Top Talker' },
  { id: 'top5', rank: 5, name: '#5 Top Talker' },
];
let ranks = new Map(); // clientId -> 1..5

// Top 5 by talkTime.seconds (same numbers as the dashboard leaderboard).
// `skip(clientId)` leaves out banned profiles. Returns the clientIds whose rank
// changed (gained, lost or moved).
function recomputeRanks(store, skip) {
  const rows = [];
  for (const [clientId, rec] of Object.entries(store.data.talkTime || {})) {
    if (!rec || !(rec.seconds > 0)) continue;
    if (skip && skip(clientId)) continue;
    rows.push([clientId, rec.seconds]);
  }
  rows.sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));
  const next = new Map();
  rows.slice(0, RANK_BADGES.length).forEach(([clientId], i) => next.set(clientId, i + 1));
  const changed = [];
  for (const [id, r] of next) if (ranks.get(id) !== r) changed.push(id);
  for (const id of ranks.keys()) if (!next.has(id)) changed.push(id);
  ranks = next;
  return changed;
}
function rankOf(clientId) { return ranks.get(clientId) || null; }

// { top: 'b3' | 'top1' | null, earned: [...], hours: 12.4, rank: 1..5 | null } for a total in seconds.
function badgesForSeconds(seconds, rank = null) {
  const secs = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const earned = BADGES.filter((b) => secs >= b.hours * 3600).map((b) => b.id);
  let top = earned.length ? earned[earned.length - 1] : null;
  if (rank) {
    earned.push(`top${rank}`);
    top = `top${rank}`; // a rank badge outranks the hour badges
  }
  return { top, earned, hours: Math.round((secs / 3600) * 10) / 10, rank: rank || null };
}

function badgesFor(store, clientId) {
  const rec = clientId && store.data.talkTime ? store.data.talkTime[clientId] : null;
  return badgesForSeconds(rec ? rec.seconds : 0, rankOf(clientId));
}

// For the owner dashboard: people by talk hours with the badge they hold, how
// many people hold each badge, and the current top 5.
function dashboardView(store, { limit = 200 } = {}) {
  const counts = Object.fromEntries(BADGES.map((b) => [b.id, 0]));
  const rows = [];
  for (const [clientId, rec] of Object.entries(store.data.talkTime || {})) {
    if (!rec) continue;
    const b = badgesForSeconds(rec.seconds, rankOf(clientId));
    for (const id of b.earned) if (id in counts) counts[id] += 1;
    if (b.top) rows.push({ clientId, username: rec.username || '', country: rec.country || '', hours: b.hours, top: b.top, rank: b.rank, earned: b.earned.length });
  }
  rows.sort((a, b) => b.hours - a.hours);
  const topFive = [...ranks.entries()].sort((x, y) => x[1] - y[1]).map(([clientId, rank]) => {
    const rec = (store.data.talkTime || {})[clientId] || {};
    return { rank, id: `top${rank}`, name: RANK_BADGES[rank - 1].name, clientId, username: rec.username || '', country: rec.country || '', hours: Math.round(((rec.seconds || 0) / 3600) * 10) / 10 };
  });
  return {
    badges: BADGES.map((b) => ({ ...b, count: counts[b.id] })),
    rankBadges: RANK_BADGES,
    topFive,
    people: rows.length,
    rows: rows.slice(0, limit),
  };
}

module.exports = { BADGES, RANK_BADGES, recomputeRanks, rankOf, badgesForSeconds, badgesFor, dashboardView };
