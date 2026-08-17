// Turns the store's UTC hour buckets into reports for a chosen timezone.
//
// Why this exists: analytics are recorded against `new Date().toISOString()`,
// i.e. UTC days. For an owner in, say, Karachi that means "today" on the
// dashboard silently started at 5am local and runs to 5am tomorrow - so a
// number like "67 today" can't be trusted without knowing where the day was
// cut. Every visit/connection/match is also stamped into an hour bucket, so
// here we re-fold those hours into whatever local day the owner asked for and
// label the boundaries explicitly.
//
// Days recorded before hourly buckets existed have no hours to fold; they are
// attributed whole to the local day containing their UTC midday and flagged
// `estimated`, so the dashboard can say so rather than quietly mixing them in.

// Counters that live on the hour bucket and are summed across a local day.
const HOUR_METRICS = ['visits', 'uniques', 'connections', 'matches', 'messages'];
// Counters only kept per UTC day; they follow the day's dominant local day.
const DAY_ONLY_METRICS = ['reports', 'errors', 'newAccounts', 'feedback'];

function isValidTimezone(tz) {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch (_) {
    return false;
  }
}

function normalizeTimezone(tz, fallback = 'UTC') {
  if (isValidTimezone(tz)) return tz;
  return isValidTimezone(fallback) ? fallback : 'UTC';
}

// Local calendar parts for an instant, via Intl so DST is handled for us.
function localParts(ts, tz) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(ts));
  const get = (type) => (parts.find((p) => p.type === type) || {}).value;
  return {
    day: `${get('year')}-${get('month')}-${get('day')}`,
    // 'en-CA' renders midnight as 24 in some ICU builds; fold it back to 0.
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
  };
}

// UTC offset of a zone at an instant, as "UTC+05:30" - shown so the owner can
// verify the day boundary is where they expect it.
function offsetLabel(ts, tz) {
  const p = localParts(ts, tz);
  const asUtc = Date.UTC(
    Number(p.day.slice(0, 4)), Number(p.day.slice(5, 7)) - 1, Number(p.day.slice(8, 10)),
    p.hour, p.minute
  );
  const mins = Math.round((asUtc - Math.floor(ts / 60000) * 60000) / 60000);
  const sign = mins < 0 ? '-' : '+';
  const abs = Math.abs(mins);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

// Shift a 'YYYY-MM-DD' local day key by n days. Pure calendar arithmetic (no
// timezone involved) - the key is already local.
function addDays(dayKey, n) {
  const t = Date.UTC(Number(dayKey.slice(0, 4)), Number(dayKey.slice(5, 7)) - 1, Number(dayKey.slice(8, 10)));
  return new Date(t + n * 86400000).toISOString().slice(0, 10);
}

// Day of week for a local day key, 0 = Monday .. 6 = Sunday.
function weekdayIndex(dayKey) {
  const t = Date.UTC(Number(dayKey.slice(0, 4)), Number(dayKey.slice(5, 7)) - 1, Number(dayKey.slice(8, 10)));
  return (new Date(t).getUTCDay() + 6) % 7;
}

function startOfWeek(dayKey) {
  return addDays(dayKey, -weekdayIndex(dayKey));
}

function emptyDay(dayKey) {
  const b = {
    day: dayKey,
    peakOnline: 0,
    // 24 slots of the *local* day, index = local hour.
    hours: Array.from({ length: 24 }, () => ({ visits: 0, uniques: 0, connections: 0, matches: 0, messages: 0, peakOnline: 0 })),
    // True when some of this day's numbers come from a pre-hourly record and
    // could not be split on the local day boundary.
    estimated: false,
  };
  for (const m of HOUR_METRICS) b[m] = 0;
  for (const m of DAY_ONLY_METRICS) b[m] = 0;
  return b;
}

// Fold every stored UTC day/hour into local-day buckets. Returns a Map of
// localDayKey -> bucket.
function foldToLocalDays(days, tz) {
  const out = new Map();
  const bucketFor = (key) => {
    if (!out.has(key)) out.set(key, emptyDay(key));
    return out.get(key);
  };

  for (const [utcDay, d] of Object.entries(days || {})) {
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(utcDay)) continue;
    const y = Number(utcDay.slice(0, 4));
    const mo = Number(utcDay.slice(5, 7)) - 1;
    const da = Number(utcDay.slice(8, 10));
    const hours = d.hours && typeof d.hours === 'object' ? d.hours : null;

    if (hours && Object.keys(hours).length) {
      for (let h = 0; h < 24; h++) {
        const src = hours[String(h)];
        if (!src) continue;
        // Probe mid-hour so a DST jump can never land us on a skipped instant.
        const local = localParts(Date.UTC(y, mo, da, h, 30), tz);
        const b = bucketFor(local.day);
        for (const m of HOUR_METRICS) b[m] += src[m] || 0;
        const slot = b.hours[local.hour];
        for (const m of HOUR_METRICS) slot[m] += src[m] || 0;
        slot.peakOnline = Math.max(slot.peakOnline, src.peakOnline || 0);
        b.peakOnline = Math.max(b.peakOnline, src.peakOnline || 0);
      }
    } else {
      // Legacy day: no hours to split on, so attribute it whole.
      const local = localParts(Date.UTC(y, mo, da, 12), tz);
      const b = bucketFor(local.day);
      for (const m of HOUR_METRICS) b[m] += d[m] || 0;
      b.peakOnline = Math.max(b.peakOnline, d.peakOnline || 0);
      b.estimated = true;
    }

    // Reports/errors/new accounts are only stored per UTC day. Attribute them
    // to the local day that holds most of that UTC day (its midpoint).
    const midLocal = localParts(Date.UTC(y, mo, da, 12), tz);
    const mb = bucketFor(midLocal.day);
    for (const m of DAY_ONLY_METRICS) mb[m] += d[m] || 0;
  }

  return out;
}

function sumDays(buckets) {
  const total = {
    peakOnline: 0,
    days: buckets.length,
    estimated: buckets.some((b) => b.estimated),
  };
  for (const m of HOUR_METRICS.concat(DAY_ONLY_METRICS)) total[m] = 0;
  for (const b of buckets) {
    for (const m of HOUR_METRICS.concat(DAY_ONLY_METRICS)) total[m] += b[m] || 0;
    total.peakOnline = Math.max(total.peakOnline, b.peakOnline || 0);
  }
  return total;
}

// null means "there is no baseline to compare against" - which is genuinely
// different from 0%, and must not be rendered as "flat".
function pctChange(now, before) {
  if (!before) return null;
  return Math.round(((now - before) / before) * 100);
}

/**
 * Build the full activity report for a timezone.
 *
 * @param {object} days  store.data.analytics.days
 * @param {string} tz    IANA timezone the days should be cut on
 * @param {number} now   "now" as an epoch ms (injectable for tests)
 */
function buildReport(days, tz, now = Date.now()) {
  const zone = normalizeTimezone(tz);
  const local = foldToLocalDays(days, zone);
  const nowLocal = localParts(now, zone);

  const todayKey = nowLocal.day;
  const yesterdayKey = addDays(todayKey, -1);
  const get = (key) => local.get(key) || emptyDay(key);

  // Last 30 local days, oldest first, gaps filled with zeroes so the chart and
  // the table never skip a quiet day.
  const daily = [];
  for (let i = 29; i >= 0; i--) daily.push(get(addDays(todayKey, -i)));

  // Whole local weeks, Monday-based. The current week is partial by definition
  // and marked as such.
  const thisWeekStart = startOfWeek(todayKey);
  const weekly = [];
  for (let w = 7; w >= 0; w--) {
    const start = addDays(thisWeekStart, -7 * w);
    const end = addDays(start, 6);
    const bucketList = [];
    for (let i = 0; i < 7; i++) bucketList.push(get(addDays(start, i)));
    const totals = sumDays(bucketList);
    const elapsed = w === 0 ? weekdayIndex(todayKey) + 1 : 7;
    weekly.push({
      weekStart: start,
      weekEnd: end,
      current: w === 0,
      daysElapsed: elapsed,
      ...totals,
      // Best day of the week by visits, so a weekly report says something more
      // useful than a bare total.
      bestDay: bucketList.reduce((best, b) => (b.visits > (best ? best.visits : -1) ? b : best), null),
    });
  }

  const today = get(todayKey);
  const yesterday = get(yesterdayKey);
  const last7 = sumDays(daily.slice(-7));
  const prev7 = sumDays(daily.slice(-14, -7));

  // Compare like-for-like: today has only run `nowLocal.hour` hours so far, so
  // put yesterday's same window next to it instead of its full-day total.
  const hoursElapsed = nowLocal.hour + 1;
  const yesterdaySoFar = { visits: 0, uniques: 0, connections: 0, matches: 0, messages: 0, peakOnline: 0 };
  for (let h = 0; h < hoursElapsed; h++) {
    const slot = yesterday.hours[h];
    for (const m of HOUR_METRICS) yesterdaySoFar[m] += slot[m];
    yesterdaySoFar.peakOnline = Math.max(yesterdaySoFar.peakOnline, slot.peakOnline);
  }

  return {
    timezone: zone,
    offset: offsetLabel(now, zone),
    now: { day: todayKey, hour: nowLocal.hour, minute: nowLocal.minute },
    // The exact window each "today" number covers, so nothing is ambiguous.
    todayWindow: `${todayKey} 00:00 → ${String(nowLocal.hour).padStart(2, '0')}:${String(nowLocal.minute).padStart(2, '0')} (${zone})`,
    yesterdayWindow: `${yesterdayKey} 00:00 → 23:59 (${zone})`,
    today,
    yesterday,
    yesterdaySoFar: { ...yesterdaySoFar, hoursElapsed },
    changeVsYesterday: {
      visits: pctChange(today.visits, yesterdaySoFar.visits),
      uniques: pctChange(today.uniques, yesterdaySoFar.uniques),
      connections: pctChange(today.connections, yesterdaySoFar.connections),
      matches: pctChange(today.matches, yesterdaySoFar.matches),
    },
    daily,
    weekly,
    last7,
    prev7,
    changeVsLastWeek: {
      visits: pctChange(last7.visits, prev7.visits),
      uniques: pctChange(last7.uniques, prev7.uniques),
      connections: pctChange(last7.connections, prev7.connections),
      matches: pctChange(last7.matches, prev7.matches),
    },
  };
}

module.exports = {
  HOUR_METRICS,
  DAY_ONLY_METRICS,
  isValidTimezone,
  normalizeTimezone,
  localParts,
  offsetLabel,
  addDays,
  weekdayIndex,
  startOfWeek,
  foldToLocalDays,
  sumDays,
  buildReport,
};
