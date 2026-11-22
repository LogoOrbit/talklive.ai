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

// { top: 'b3' | null, earned: ['b1','b2','b3'], hours: 12.4 } for a total in seconds.
function badgesForSeconds(seconds) {
  const secs = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const earned = BADGES.filter((b) => secs >= b.hours * 3600).map((b) => b.id);
  return {
    top: earned.length ? earned[earned.length - 1] : null,
    earned,
    hours: Math.round((secs / 3600) * 10) / 10,
  };
}

function badgesFor(store, clientId) {
  const rec = clientId && store.data.talkTime ? store.data.talkTime[clientId] : null;
  return badgesForSeconds(rec ? rec.seconds : 0);
}

// For the owner dashboard: people by talk hours with the badge they hold, and
// how many people hold each badge.
function dashboardView(store, { limit = 200 } = {}) {
  const counts = Object.fromEntries(BADGES.map((b) => [b.id, 0]));
  const rows = [];
  for (const [clientId, rec] of Object.entries(store.data.talkTime || {})) {
    if (!rec) continue;
    const b = badgesForSeconds(rec.seconds);
    for (const id of b.earned) counts[id] += 1;
    if (b.top) rows.push({ clientId, username: rec.username || '', country: rec.country || '', hours: b.hours, top: b.top, earned: b.earned.length });
  }
  rows.sort((a, b) => b.hours - a.hours);
  return {
    badges: BADGES.map((b) => ({ ...b, count: counts[b.id] })),
    people: rows.length,
    rows: rows.slice(0, limit),
  };
}

module.exports = { BADGES, badgesForSeconds, badgesFor, dashboardView };
