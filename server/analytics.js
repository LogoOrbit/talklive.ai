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
// `bots` is crawler page views, kept out of `visits`/`uniques` (see
// server/bots.js) but folded on the same hour buckets so it can be cut on the
// owner's local day like everything else.
const HOUR_METRICS = ['visits', 'uniques', 'connections', 'matches', 'messages', 'bots'];
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
    hours: Array.from({ length: 24 }, () => ({ visits: 0, uniques: 0, connections: 0, matches: 0, messages: 0, bots: 0, peakOnline: 0 })),
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
  const yesterdaySoFar = { visits: 0, uniques: 0, connections: 0, matches: 0, messages: 0, bots: 0, peakOnline: 0 };
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

// --- Custom time windows ------------------------------------------------------
//
// "How many visits from 7am until 7am the next day?" Answered from the UTC hour
// buckets: every hour whose start falls inside [from, to) is counted. That
// makes the window exact to the hour for any zone on a whole-hour offset; for
// zones like UTC+05:30 each edge can be off by up to half an hour, and the
// report says so. Unique visitors are deduped per UTC day only, so across a
// window that crosses UTC midnight the figure can count one person twice - it
// is labelled approximate.

// Epoch ms of a local wall-clock time ('YYYY-MM-DDTHH:MM') in `tz`.
function zonedToUtc(wall, tz) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(wall || ''));
  if (!m) return NaN;
  const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const offsetAt = (ts) => {
    const p = localParts(ts, tz);
    return Date.UTC(+p.day.slice(0, 4), +p.day.slice(5, 7) - 1, +p.day.slice(8, 10), p.hour, p.minute) - Math.floor(ts / 60000) * 60000;
  };
  // Two passes settle the offset across a DST change.
  let ts = asUtc - offsetAt(asUtc);
  ts = asUtc - offsetAt(ts);
  return ts;
}

function wallLabel(ts, tz) {
  const p = localParts(ts, tz);
  return `${p.day} ${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

const HOUR_MS = 3600000;

// Sum the hour buckets in [from, to). `hours` lists each hour for charting.
function windowTotals(days, from, to, tz) {
  const totals = { peakOnline: 0 };
  for (const m of HOUR_METRICS) totals[m] = 0;
  const hours = [];
  let legacy = false;
  const now = Date.now();
  for (let t = Math.ceil(from / HOUR_MS) * HOUR_MS; t < to && t <= now; t += HOUR_MS) {
    const d = new Date(t);
    const rec = days[d.toISOString().slice(0, 10)];
    if (rec && (!rec.hours || !Object.keys(rec.hours).length) && (rec.visits || rec.connections)) legacy = true;
    const src = (rec && rec.hours && rec.hours[String(d.getUTCHours())]) || {};
    const row = { ts: t, label: wallLabel(t, tz) };
    for (const m of HOUR_METRICS) { row[m] = src[m] || 0; totals[m] += row[m]; }
    row.peakOnline = src.peakOnline || 0;
    totals.peakOnline = Math.max(totals.peakOnline, row.peakOnline);
    hours.push(row);
  }
  totals.hours = hours.length;
  return { totals, hours, legacy };
}

const MAX_WINDOW_MS = 31 * 86400000;

// One custom window, plus the window of equal length just before it.
function windowReport(days, { from, to, tz }) {
  const zone = normalizeTimezone(tz);
  const start = zonedToUtc(from, zone);
  const end = zonedToUtc(to, zone);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return { error: 'Pick a valid start and end time.' };
  if (end <= start) return { error: 'The end time must be after the start time.' };
  if (end - start > MAX_WINDOW_MS) return { error: 'Windows are limited to 31 days.' };
  const cur = windowTotals(days, start, end, zone);
  const len = end - start;
  const prev = windowTotals(days, start - len, start, zone);
  const change = {};
  for (const m of HOUR_METRICS) change[m] = pctChange(cur.totals[m], prev.totals[m]);
  return {
    timezone: zone,
    offset: offsetLabel(start, zone),
    from: wallLabel(start, zone),
    to: wallLabel(end, zone),
    hoursLong: Math.round(len / HOUR_MS * 10) / 10,
    inProgress: end > Date.now(),
    halfHourZone: new Date(start).getUTCMinutes() !== 0 || new Date(end).getUTCMinutes() !== 0,
    totals: cur.totals,
    hours: cur.hours,
    legacy: cur.legacy,
    previous: { from: wallLabel(start - len, zone), to: wallLabel(start, zone), totals: prev.totals },
    change,
  };
}

// "Business days" that start at `startHour` local time (7 -> 07:00 to 07:00
// the next day), newest first. The newest one may still be running.
function shiftedDays(days, { tz, startHour, count }, now = Date.now()) {
  const zone = normalizeTimezone(tz);
  const h = Math.min(23, Math.max(0, Math.floor(Number(startHour) || 0)));
  const n = Math.min(60, Math.max(1, Math.floor(Number(count) || 14)));
  const hh = String(h).padStart(2, '0');
  const nowLocal = localParts(now, zone);
  // The window that contains "now" started today at h, or yesterday if it is
  // not yet h o'clock.
  let firstDay = nowLocal.hour >= h ? nowLocal.day : addDays(nowLocal.day, -1);
  const out = [];
  for (let i = 0; i < n; i++) {
    const day = addDays(firstDay, -i);
    const start = zonedToUtc(`${day}T${hh}:00`, zone);
    const end = zonedToUtc(`${addDays(day, 1)}T${hh}:00`, zone);
    const w = windowTotals(days, start, end, zone);
    out.push({ day, from: wallLabel(start, zone), to: wallLabel(end, zone), inProgress: end > now, ...w.totals, legacy: w.legacy });
  }
  return { timezone: zone, startHour: h, windows: out };
}

module.exports = {
  zonedToUtc,
  windowReport,
  shiftedDays,
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
