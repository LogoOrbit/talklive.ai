// Daily streak, country passport and weekly stats, kept on the server per
// profile (clientId) so they follow a signed-in person to every device and
// survive a cleared browser. Counted here, from calls the server saw end, so
// they cannot be typed into localStorage.
//
// Days are the person's own calendar days: their browser's IANA zone (sent at
// register) decides when "today" starts, falling back to UTC.
//
// Pure functions over a plain record; server/index.js loads and saves it.
'use strict';

// ENGAGE_GOOD_CALL_SECONDS is for tests only.
const GOOD_CALL_SECONDS = Number(process.env.ENGAGE_GOOD_CALL_SECONDS) || 30;
const PASSPORT_MAX = 250;
// Progress kept only in a browser before this moved server-side can be carried
// over once. The feature had been live for days, so anything bigger than this
// was typed in, not earned.
const MERGE_STREAK_MAX = 7;

function emptyRecord() {
  return {
    streak: { count: 0, best: 0, last: '', freezeWeek: '' },
    passport: [],
    week: { week: '', calls: 0, countries: [], longest: 0 },
    prevWeek: null,
    merged: false,
  };
}

function normalise(rec) {
  const base = emptyRecord();
  if (!rec || typeof rec !== 'object') return base;
  return {
    streak: Object.assign(base.streak, rec.streak || {}),
    passport: Array.isArray(rec.passport) ? rec.passport.slice(0, PASSPORT_MAX) : [],
    week: Object.assign(base.week, rec.week || {}),
    prevWeek: rec.prevWeek || null,
    merged: !!rec.merged,
  };
}

function dayKey(now, tz) {
  const d = new Date(now);
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch (_) {
    return d.toISOString().slice(0, 10);
  }
}
function dayNum(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}
function keyOfDayNum(n) {
  return new Date(n * 86400000).toISOString().slice(0, 10);
}
// The Monday that starts the week holding this day.
function weekOf(key) {
  const n = dayNum(key);
  const weekday = new Date(n * 86400000).getUTCDay(); // 0 = Sunday
  return keyOfDayNum(n - ((weekday + 6) % 7));
}

const validCountry = (c) => typeof c === 'string' && /^[A-Z]{2}$/.test(c) && c !== 'XX';

// Last week's numbers become the recap once a new week starts.
function rollWeek(rec, today) {
  const thisWeek = weekOf(today);
  if (rec.week.week === thisWeek) return;
  const lastWeek = keyOfDayNum(dayNum(thisWeek) - 7);
  rec.prevWeek = rec.week.week === lastWeek && rec.week.calls > 0
    ? { week: rec.week.week, calls: rec.week.calls, countries: rec.week.countries.length, longest: rec.week.longest }
    : (rec.prevWeek && rec.prevWeek.week === lastWeek ? rec.prevWeek : null);
  rec.week = { week: thisWeek, calls: 0, countries: [], longest: 0 };
}

// A call ended. Returns what changed, for the "🔥 5-day streak" toast.
function noteCall(input, { country, seconds, now = Date.now(), tz } = {}) {
  const rec = normalise(input);
  const result = { rec, bump: null, stamp: null };
  if (!(seconds >= GOOD_CALL_SECONDS)) return result;
  const today = dayKey(now, tz);
  rollWeek(rec, today);

  const s = rec.streak;
  if (s.last !== today) {
    const gap = s.last ? dayNum(today) - dayNum(s.last) : 0;
    let saved = false;
    if (gap === 1) s.count += 1;
    else if (gap === 2 && s.freezeWeek !== weekOf(today)) { s.count += 1; s.freezeWeek = weekOf(today); saved = true; }
    else s.count = 1;
    s.best = Math.max(s.best || 0, s.count);
    s.last = today;
    result.bump = { count: s.count, saved };
  }

  if (validCountry(country) && !rec.passport.includes(country) && rec.passport.length < PASSPORT_MAX) {
    rec.passport.push(country);
    result.stamp = { country, total: rec.passport.length };
  }

  rec.week.calls += 1;
  if (validCountry(country) && !rec.week.countries.includes(country)) rec.week.countries.push(country);
  rec.week.longest = Math.max(rec.week.longest || 0, Math.round(seconds));
  return result;
}

// What the page shows. A streak that can no longer be kept reads as 0.
function view(input, { now = Date.now(), tz } = {}) {
  const rec = normalise(input);
  const today = dayKey(now, tz);
  rollWeek(rec, today);
  const s = rec.streak;
  let count = s.count;
  if (s.last) {
    const gap = dayNum(today) - dayNum(s.last);
    if (gap > 2 || (gap === 2 && s.freezeWeek === weekOf(today))) count = 0;
  }
  return {
    streak: { count, best: s.best, doneToday: s.last === today },
    passport: rec.passport.slice(),
    week: { calls: rec.week.calls, countries: rec.week.countries.length, longest: rec.week.longest },
    prevWeek: rec.prevWeek,
    merged: rec.merged,
  };
}

// Fold progress from somewhere else into this record: a browser's own copy
// (once, capped), or a guest profile when it signs in to an account.
function merge(input, other, { trusted = false, now = Date.now(), tz } = {}) {
  const rec = normalise(input);
  if (!other || typeof other !== 'object') return rec;
  const codes = Array.isArray(other.passport) ? other.passport : [];
  for (const c of codes) {
    if (rec.passport.length >= PASSPORT_MAX) break;
    if (validCountry(c) && !rec.passport.includes(c)) rec.passport.push(c);
  }
  const os = other.streak || {};
  const today = dayKey(now, tz);
  const last = typeof os.last === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(os.last) ? os.last : '';
  // A streak only carries over if it is still alive and not from the future.
  const gap = last ? dayNum(today) - dayNum(last) : 99;
  if (last && gap >= 0 && gap <= 1) {
    let count = Math.max(0, Math.floor(Number(os.count) || 0));
    if (!trusted) count = Math.min(count, MERGE_STREAK_MAX);
    const mine = rec.streak;
    const mineAlive = mine.last && dayNum(today) - dayNum(mine.last) <= 1;
    if (!mineAlive || count > mine.count || (count === mine.count && last > mine.last)) {
      mine.count = count;
      mine.last = last;
    }
    mine.best = Math.max(mine.best || 0, mine.count, trusted ? Math.floor(Number(os.best) || 0) : 0);
  }
  return rec;
}

module.exports = { GOOD_CALL_SECONDS, emptyRecord, normalise, noteCall, view, merge, dayKey, weekOf };
