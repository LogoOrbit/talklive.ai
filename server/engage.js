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
    goodCalls: 0,
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
    goodCalls: Math.max(0, Math.floor(Number(rec.goodCalls) || 0)),
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

// Missed days a streak survives: one a week for everyone, plus 2 a month for
// Plus members (a month is the calendar month of the day it is used).
const PLUS_FREEZES = 2;
function plusFreezesLeft(s, today, plus) {
  if (!plus) return 0;
  const month = today.slice(0, 7);
  const used = s.plusFreezes && s.plusFreezes.month === month ? s.plusFreezes.used : 0;
  return Math.max(0, PLUS_FREEZES - used);
}
function coverage(s, today, plus) {
  const gap = s.last ? dayNum(today) - dayNum(s.last) : 0;
  const missed = Math.max(0, gap - 1);
  if (missed === 0) return { alive: true, weekly: 0, plus: 0 };
  const weekly = s.freezeWeek !== weekOf(today) ? 1 : 0;
  const plusLeft = plusFreezesLeft(s, today, plus);
  if (missed > weekly + plusLeft) return { alive: false, weekly: 0, plus: 0 };
  const useWeekly = Math.min(weekly, missed);
  return { alive: true, weekly: useWeekly, plus: missed - useWeekly };
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
function noteCall(input, { country, seconds, now = Date.now(), tz, plus = false } = {}) {
  const rec = normalise(input);
  const result = { rec, bump: null, stamp: null };
  if (!(seconds >= GOOD_CALL_SECONDS)) return result;
  const today = dayKey(now, tz);
  rollWeek(rec, today);

  const s = rec.streak;
  if (s.last !== today) {
    const c = s.last ? coverage(s, today, plus) : { alive: false };
    let saved = false;
    let frozen = 0;
    if (c.alive) {
      s.count += 1;
      if (c.weekly) { s.freezeWeek = weekOf(today); saved = true; }
      if (c.plus) {
        const month = today.slice(0, 7);
        const used = s.plusFreezes && s.plusFreezes.month === month ? s.plusFreezes.used : 0;
        s.plusFreezes = { month, used: used + c.plus };
        saved = true; frozen = c.plus;
      }
    } else s.count = 1;
    s.best = Math.max(s.best || 0, s.count);
    s.last = today;
    result.bump = { count: s.count, saved, frozen };
  }

  if (validCountry(country) && !rec.passport.includes(country) && rec.passport.length < PASSPORT_MAX) {
    rec.passport.push(country);
    result.stamp = { country, total: rec.passport.length };
  }

  rec.week.calls += 1;
  rec.goodCalls += 1;
  if (validCountry(country) && !rec.week.countries.includes(country)) rec.week.countries.push(country);
  rec.week.longest = Math.max(rec.week.longest || 0, Math.round(seconds));
  return result;
}

// Plus brings a broken streak back: once every 30 days, for a streak of 2+
// days that ended in the last 30. It carries on as if the last call was
// yesterday, so today's call keeps it going.
const RESTORE_WINDOW_DAYS = 30;
function restoreState(s, today, plus = false) {
  if (!s.last || !(s.count >= 2)) return null;
  const gap = dayNum(today) - dayNum(s.last);
  // Broken = still broken after a call today (today itself is not missed yet).
  const broken = gap > 1 && !coverage(s, today, plus).alive;
  if (!broken) return null;
  const recent = s.restoredAt && dayNum(today) - dayNum(s.restoredAt) < RESTORE_WINDOW_DAYS;
  return { count: s.count, restorable: gap <= RESTORE_WINDOW_DAYS && !recent };
}

function restore(input, { now = Date.now(), tz, plus = false } = {}) {
  const rec = normalise(input);
  const today = dayKey(now, tz);
  const st = restoreState(rec.streak, today, plus);
  if (!st || !st.restorable) return { rec, ok: false };
  rec.streak.last = keyOfDayNum(dayNum(today) - 1);
  rec.streak.restoredAt = today;
  return { rec, ok: true, count: rec.streak.count };
}

// What the page shows. A streak that can no longer be kept reads as 0.
function view(input, { now = Date.now(), tz, plus = false } = {}) {
  const rec = normalise(input);
  const today = dayKey(now, tz);
  rollWeek(rec, today);
  const s = rec.streak;
  let count = s.count;
  if (s.last) {
    const gap = dayNum(today) - dayNum(s.last);
    if (gap > 1 && !coverage(s, today, plus).alive) count = 0;
  }
  return {
    streak: {
      count, best: s.best, doneToday: s.last === today, lost: restoreState(s, today, plus),
      // Plus: missed days left this month that will not break the streak.
      freezesLeft: plus ? plusFreezesLeft(s, today, true) : null,
    },
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

module.exports = { GOOD_CALL_SECONDS, emptyRecord, normalise, noteCall, view, merge, restore, dayKey, weekOf };
