// Adsterra ad revenue for the owner dashboard, read from the Publisher API v3
// (https://api3.adsterratools.com/publisher). Needs ADSTERRA_API_KEY, the token
// from Adsterra -> Profile -> API. Read-only: nothing here changes the account.
const API = 'https://api3.adsterratools.com/publisher';
const API_KEY = process.env.ADSTERRA_API_KEY || '';
// Adsterra refreshes its stats roughly hourly, so polling more often than this
// only spends the account's API quota.
const CACHE_MS = 10 * 60000;
const TIMEOUT_MS = 15000;

const cache = new Map(); // url -> { ts, items }

function configured() { return !!API_KEY; }

function ymd(d) { return d.toISOString().slice(0, 10); }

async function stats(params, maxAge = CACHE_MS) {
  const url = `${API}/stats.json?${new URLSearchParams(params)}`;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.ts < maxAge) return hit.items;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'X-API-Key': API_KEY, Accept: 'application/json' },
      signal: controller.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const why = body.message || body.error || (res.status === 401 || res.status === 403 ? 'API key rejected' : `HTTP ${res.status}`);
      throw new Error(`Adsterra: ${why}`);
    }
    const items = Array.isArray(body.items) ? body.items : [];
    cache.set(url, { ts: Date.now(), items });
    return items;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Adsterra: request timed out');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const n = (v) => Number(v) || 0;
function row(it, key) {
  return {
    key,
    impressions: n(it.impression ?? it.impressions),
    clicks: n(it.clicks),
    revenue: n(it.revenue),
  };
}
function withRates(r) {
  return {
    ...r,
    revenue: Math.round(r.revenue * 10000) / 10000,
    cpm: r.impressions ? Math.round((r.revenue / r.impressions) * 1000 * 1000) / 1000 : 0,
    ctr: r.impressions ? Math.round((r.clicks / r.impressions) * 10000) / 100 : 0,
  };
}
function sum(rows) {
  return withRates(rows.reduce((a, r) => ({
    key: 'total', impressions: a.impressions + r.impressions, clicks: a.clicks + r.clicks, revenue: a.revenue + r.revenue,
  }), { key: 'total', impressions: 0, clicks: 0, revenue: 0 }));
}
function grouped(items, keyOf) {
  const m = new Map();
  for (const it of items) {
    const r = row(it, keyOf(it));
    const cur = m.get(r.key) || { key: r.key, impressions: 0, clicks: 0, revenue: 0 };
    cur.impressions += r.impressions; cur.clicks += r.clicks; cur.revenue += r.revenue;
    m.set(r.key, cur);
  }
  return [...m.values()].map(withRates).sort((a, b) => b.revenue - a.revenue);
}

// Earliest date counted in the all-time total. Adsterra has no lifetime
// endpoint, so days before the 31-day window are summed one calendar year per
// request. Finished days barely change, so that part is cached for an hour;
// the window itself comes from the fresh 10-minute data, which keeps All time
// consistent with the other tiles.
const ALL_TIME_FROM = process.env.ADSTERRA_START_DATE || '2020-01-01';
async function historyBefore(windowStart) {
  const last = ymd(new Date(Date.parse(windowStart) - 86400000));
  const perDay = new Map();
  if (last < ALL_TIME_FROM) return perDay;
  const ranges = [];
  for (let y = Number(ALL_TIME_FROM.slice(0, 4)); y <= Number(last.slice(0, 4)); y++) {
    const start = y === Number(ALL_TIME_FROM.slice(0, 4)) ? ALL_TIME_FROM : `${y}-01-01`;
    const finish = y === Number(last.slice(0, 4)) ? last : `${y}-12-31`;
    ranges.push({ start_date: start, finish_date: finish, group_by: 'date' });
  }
  const chunks = await Promise.all(ranges.map((r) => stats(r, 60 * 60000)));
  // Keyed by date and bounded to what was asked for, so no day is ever
  // counted twice even if the API returns rows outside a range.
  chunks.forEach((items, i) => {
    for (const it of items) {
      const d = String(it.date || '').slice(0, 10);
      if (d >= ranges[i].start_date && d <= ranges[i].finish_date) perDay.set(d, row(it, d));
    }
  });
  return perDay;
}

// Daily series for the last `days` days plus the period broken down by ad unit
// and by country. Days are UTC, which is what Adsterra reports in. 31 days so
// month-to-date is complete on the 31st as well.
async function report(days = 31) {
  const finish = new Date();
  const start = new Date(finish.getTime() - (days - 1) * 86400000);
  const range = { start_date: ymd(start), finish_date: ymd(finish) };
  const [byDate, byPlacement, byCountry, lifetime] = await Promise.all([
    stats({ ...range, group_by: 'date' }),
    stats({ ...range, group_by: 'placement' }).catch(() => []),
    stats({ ...range, group_by: 'country' }).catch(() => []),
    historyBefore(range.start_date).catch((err) => ({ error: String(err.message || err) })),
  ]);

  const perDay = new Map();
  for (const it of byDate) {
    const d = String(it.date || '').slice(0, 10);
    if (d >= range.start_date && d <= range.finish_date) perDay.set(d, withRates(row(it, d)));
  }
  const daily = [];
  for (let t = start.getTime(); t <= finish.getTime(); t += 86400000) {
    const d = ymd(new Date(t));
    daily.push(perDay.get(d) || withRates({ key: d, impressions: 0, clicks: 0, revenue: 0 }));
  }
  const today = ymd(finish);
  const yesterday = ymd(new Date(finish.getTime() - 86400000));
  const month = today.slice(0, 7);
  const last = (k) => sum(daily.slice(-k));
  let allTime = lifetime;
  if (!lifetime.error) {
    const rows = [...lifetime.values(), ...daily];
    const since = rows.filter((r) => r.impressions || r.revenue).map((r) => r.key).sort()[0] || null;
    // Adsterra's "Earned" only credits finished days, so also give the total
    // without today to compare against it.
    const settled = sum(rows.filter((r) => r.key !== today)).revenue;
    allTime = { ...sum(rows), settled, since };
  }

  return {
    range,
    fetchedAt: Date.now(),
    totals: {
      today: sum(daily.filter((d) => d.key === today)),
      yesterday: sum(daily.filter((d) => d.key === yesterday)),
      last7: last(7),
      last30: last(30),
      monthToDate: sum(daily.filter((d) => d.key.startsWith(month))),
      allTime,
    },
    daily,
    placements: grouped(byPlacement, (it) => String(it.placement || it.placement_name || it.title || it.placement_id || 'unknown')).slice(0, 25),
    countries: grouped(byCountry, (it) => String(it.country || it.country_code || 'unknown')).slice(0, 25),
  };
}

module.exports = { configured, report };
