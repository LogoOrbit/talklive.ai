// Audience and experience analytics for the owner dashboard: who uses TalkLive
// (gender, age group, device, language, new vs returning) and how it goes for
// them (wait to match, who gives up waiting, call length, the gender mix of
// pairings, post-call ratings).
//
// Everything here is aggregate. The store keeps counters on the UTC day record
// (see recordPerson / recordCallEnd in server/store.js); a person is counted
// once per day, keyed by a truncated hash of their clientId, never by name.
// Gender and age group are self-reported in Settings and never verified, so the
// dashboard labels them that way.

const AGE_GROUPS = ['18-24', '25-34', '35-44', '45-54', '55+'];
const GENDERS = ['male', 'female', 'unspecified'];

function normGender(g) {
  return g === 'male' || g === 'female' ? g : 'unspecified';
}

function normAge(a) {
  return AGE_GROUPS.includes(a) ? a : 'unspecified';
}

// Coarse, dependency-free user-agent classification. Only buckets that are
// useful for product decisions ("is this a phone app?") - not a fingerprint.
function parseUA(ua) {
  const s = String(ua || '');
  let device = 'desktop';
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(s)) device = 'tablet';
  else if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone|Opera Mini/i.test(s)) device = 'mobile';
  let os = 'Other';
  if (/Windows/i.test(s)) os = 'Windows';
  else if (/iPhone|iPad|iPod/i.test(s)) os = 'iOS';
  else if (/Android/i.test(s)) os = 'Android';
  else if (/CrOS/i.test(s)) os = 'ChromeOS';
  else if (/Mac OS X|Macintosh/i.test(s)) os = 'macOS';
  else if (/Linux/i.test(s)) os = 'Linux';
  let browser = 'Other';
  if (/SamsungBrowser/i.test(s)) browser = 'Samsung Internet';
  else if (/Edg\//i.test(s)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(s)) browser = 'Opera';
  else if (/FBAN|FBAV|Instagram/i.test(s)) browser = 'In-app (FB/IG)';
  else if (/Firefox|FxiOS/i.test(s)) browser = 'Firefox';
  else if (/CriOS|Chrome/i.test(s)) browser = 'Chrome';
  else if (/Safari/i.test(s)) browser = 'Safari';
  return { device, os, browser };
}

// Primary language from Accept-Language ("en-GB,en;q=0.9" -> "en").
function parseLang(header) {
  const m = String(header || '').trim().match(/^([a-zA-Z]{2,3})/);
  return m ? m[1].toLowerCase() : 'unknown';
}

// Client ids are minted as 'c_' + random + Date.now().toString(36) (see
// getClientId in public/app.js), so the id itself says when this browser first
// arrived - no extra storage needed to tell a newcomer from a regular.
function lifecycleOf(clientId, now = Date.now()) {
  const m = /^c_[a-z0-9]+$/.test(String(clientId || '')) ? String(clientId).slice(-8) : '';
  const born = m ? parseInt(m, 36) : NaN;
  if (!Number.isFinite(born) || born < Date.UTC(2024, 0, 1) || born > now + 86400000) return 'unknown';
  const days = (now - born) / 86400000;
  if (days < 1) return 'new';
  if (days <= 7) return '1-7d';
  if (days <= 30) return '8-30d';
  return '30d+';
}

const LEN_BUCKETS = [['<10s', 10], ['10-60s', 60], ['1-5m', 300], ['5-15m', 900], ['15m+', Infinity]];
const WAIT_BUCKETS = [['<5s', 5], ['5-15s', 15], ['15-60s', 60], ['1-3m', 180], ['3m+', Infinity]];

function bucketOf(buckets, seconds) {
  for (const [name, max] of buckets) if (seconds < max) return name;
  return buckets[buckets.length - 1][0];
}

// A pairing's gender mix, order-independent: 'F-M', 'M-M', 'F-F', 'M-?', ...
function pairKeyOf(g1, g2) {
  const c = (g) => (g === 'male' ? 'M' : g === 'female' ? 'F' : '?');
  return [c(g1), c(g2)].sort().join('-');
}

// --- Report ---------------------------------------------------------------

function addInto(target, src) {
  for (const [k, v] of Object.entries(src || {})) {
    if (typeof v === 'number') target[k] = (target[k] || 0) + v;
  }
  return target;
}

function addSeg(target, src) {
  for (const [k, v] of Object.entries(src || {})) {
    const t = target[k] || (target[k] = { n: 0, s: 0, real: 0, up: 0, down: 0 });
    addInto(t, v);
  }
}

function sorted(obj, limit) {
  const out = Object.entries(obj || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  return limit ? out.slice(0, limit) : out;
}

function pct(v, t) {
  return t ? Math.round((v / t) * 1000) / 10 : 0;
}

function lastDayKeys(n, now = Date.now()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(new Date(now - i * 86400000).toISOString().slice(0, 10));
  return out;
}

// Live breakdown of who is connected right now.
function liveBreakdown(users) {
  const gender = { male: 0, female: 0, unspecified: 0 };
  const age = {};
  for (const a of [...AGE_GROUPS, 'unspecified']) age[a] = 0;
  const device = {};
  let inCall = 0; let waiting = 0;
  const waitingBy = { male: 0, female: 0, unspecified: 0 };
  for (const u of users || []) {
    const g = normGender(u.gender);
    gender[g] += 1;
    age[normAge(u.ageGroup)] += 1;
    if (u.device) device[u.device] = (device[u.device] || 0) + 1;
    if (u.inCall) inCall += 1;
    if (u.waiting) { waiting += 1; waitingBy[g] += 1; }
  }
  return { total: (users || []).length, gender, age, device, inCall, waiting, waitingBy };
}

function buildReport(days, range, liveUsers, now = Date.now()) {
  const keys = lastDayKeys(range, now);
  const people = { n: 0, gender: {}, age: {}, cross: {}, device: {}, os: {}, browser: {}, lang: {}, lifecycle: {}, interests: {} };
  const calls = { n: 0, s: 0, len: {}, pairs: {}, waitN: 0, waitS: 0, wait: {}, abandonN: 0, abandonS: 0, up: 0, down: 0, rateLen: {}, seg: { gender: {}, age: {} } };
  let matches = 0; let reports = 0; let uniques = 0;
  const trend = [];

  for (const k of keys) {
    const d = days[k] || {};
    const p = d.people || {};
    const c = d.calls || {};
    people.n += p.n || 0;
    for (const f of ['gender', 'age', 'cross', 'device', 'os', 'browser', 'lang', 'lifecycle', 'interests']) addInto(people[f], p[f]);
    for (const f of ['n', 's', 'waitN', 'waitS', 'abandonN', 'abandonS', 'up', 'down']) calls[f] += c[f] || 0;
    for (const f of ['len', 'pairs', 'wait']) addInto(calls[f], c[f]);
    for (const [b, v] of Object.entries(c.rateLen || {})) {
      const t = calls.rateLen[b] || (calls.rateLen[b] = { up: 0, down: 0 });
      addInto(t, v);
    }
    if (c.seg) { addSeg(calls.seg.gender, c.seg.gender); addSeg(calls.seg.age, c.seg.age); }
    matches += (d.matches || 0) + ((d.features && d.features.chat_match) || 0);
    reports += d.reports || 0;
    uniques += d.uniques || 0;
    const pg = p.gender || {};
    trend.push({
      day: k,
      people: p.n || 0,
      male: pg.male || 0,
      female: pg.female || 0,
      unspecified: pg.unspecified || 0,
      calls: c.n || 0,
      avgCall: c.n ? Math.round((c.s || 0) / c.n) : 0,
      avgWait: c.waitN ? Math.round((c.waitS || 0) / c.waitN) : 0,
      satisfaction: (c.up || 0) + (c.down || 0) ? pct(c.up || 0, (c.up || 0) + (c.down || 0)) : null,
    });
  }

  const genderTotal = GENDERS.reduce((a, g) => a + (people.gender[g] || 0), 0);
  const ageKeys = [...AGE_GROUPS, 'unspecified'];
  const ageTotal = ageKeys.reduce((a, g) => a + (people.age[g] || 0), 0);
  const ageKnown = AGE_GROUPS.reduce((a, g) => a + (people.age[g] || 0), 0);
  const genderKnown = (people.gender.male || 0) + (people.gender.female || 0);
  const brief = calls.len['<10s'] || 0;
  const rated = calls.up + calls.down;
  const attempts = calls.waitN + calls.abandonN;

  const segRows = (seg, order) => order.map((k) => {
    const v = seg[k] || { n: 0, s: 0, real: 0, up: 0, down: 0 };
    return {
      key: k,
      calls: v.n,
      avgSeconds: v.n ? Math.round(v.s / v.n) : 0,
      realPct: pct(v.real, v.n),
      satisfaction: v.up + v.down ? pct(v.up, v.up + v.down) : null,
      ratings: v.up + v.down,
    };
  });

  const report = {
    range,
    days: keys,
    live: liveBreakdown(liveUsers),
    people: {
      personDays: people.n,
      gender: GENDERS.map((g) => ({ key: g, n: people.gender[g] || 0, pct: pct(people.gender[g] || 0, genderTotal) })),
      genderKnownPct: pct(genderKnown, genderTotal),
      femaleToMale: people.gender.male ? Math.round(((people.gender.female || 0) / people.gender.male) * 100) / 100 : null,
      age: ageKeys.map((a) => ({ key: a, n: people.age[a] || 0, pct: pct(people.age[a] || 0, ageTotal), knownPct: AGE_GROUPS.includes(a) ? pct(people.age[a] || 0, ageKnown) : null })),
      ageKnownPct: pct(ageKnown, ageTotal),
      // gender x age grid for the heatmap.
      cross: GENDERS.map((g) => ({ gender: g, cells: ageKeys.map((a) => people.cross[g + '|' + a] || 0) })),
      ageKeys,
      device: sorted(people.device),
      os: sorted(people.os),
      browser: sorted(people.browser),
      lang: sorted(people.lang, 12),
      lifecycle: ['new', '1-7d', '8-30d', '30d+', 'unknown'].map((k) => ({ key: k, n: people.lifecycle[k] || 0, pct: pct(people.lifecycle[k] || 0, people.n) })),
      interests: sorted(people.interests, 20),
    },
    experience: {
      calls: calls.n,
      avgCallSeconds: calls.n ? Math.round(calls.s / calls.n) : 0,
      totalTalkHours: Math.round((calls.s / 3600) * 10) / 10,
      skipRatePct: pct(brief, calls.n),
      realPct: pct(calls.n - brief - (calls.len['10-60s'] || 0), calls.n),
      length: LEN_BUCKETS.map(([k]) => ({ key: k, n: calls.len[k] || 0, pct: pct(calls.len[k] || 0, calls.n) })),
      pairs: sorted(calls.pairs).map(([k, n]) => ({ key: k, n, pct: pct(n, Object.values(calls.pairs).reduce((a, b) => a + b, 0)) })),
      avgWaitSeconds: calls.waitN ? Math.round(calls.waitS / calls.waitN) : 0,
      wait: WAIT_BUCKETS.map(([k]) => ({ key: k, n: calls.wait[k] || 0, pct: pct(calls.wait[k] || 0, calls.waitN) })),
      searches: attempts,
      abandoned: calls.abandonN,
      abandonPct: pct(calls.abandonN, attempts),
      avgAbandonSeconds: calls.abandonN ? Math.round(calls.abandonS / calls.abandonN) : 0,
      ratings: rated,
      up: calls.up,
      down: calls.down,
      satisfaction: rated ? pct(calls.up, rated) : null,
      rateByLength: LEN_BUCKETS.map(([k]) => {
        const v = calls.rateLen[k] || { up: 0, down: 0 };
        return { key: k, up: v.up, down: v.down, satisfaction: v.up + v.down ? pct(v.up, v.up + v.down) : null };
      }),
      byGender: segRows(calls.seg.gender, GENDERS),
      byAge: segRows(calls.seg.age, ageKeys),
      matches,
      reports,
      reportsPer1k: matches ? Math.round((reports / matches) * 10000) / 10 : 0,
      visitors: uniques,
      visitorToUserPct: pct(people.n, uniques),
    },
    trend,
  };
  report.insights = insights(report);
  report.health = healthScore(report);
  return report;
}

// 0-100, from the four things that most decide whether a stranger-chat app
// works: people get matched fast, they don't give up, they talk (not skip),
// and they say it was good. Missing signals are left out rather than scored.
function healthScore(r) {
  const e = r.experience;
  const parts = [];
  if (e.searches >= 5) parts.push(['Matching', Math.max(0, 100 - e.avgWaitSeconds * 1.5), 'avg wait ' + e.avgWaitSeconds + 's']);
  if (e.searches >= 5) parts.push(['Retention in queue', 100 - e.abandonPct, e.abandonPct + '% gave up']);
  if (e.calls >= 5) parts.push(['Conversations', 100 - e.skipRatePct, e.skipRatePct + '% skipped under 10s']);
  if (e.ratings >= 5) parts.push(['Satisfaction', e.satisfaction, e.satisfaction + '% thumbs up']);
  if (e.matches >= 20) parts.push(['Safety', Math.max(0, 100 - e.reportsPer1k * 2), e.reportsPer1k + ' reports / 1k matches']);
  if (!parts.length) return { score: null, parts: [] };
  const score = Math.round(parts.reduce((a, p) => a + p[1], 0) / parts.length);
  return { score, parts: parts.map(([name, v, note]) => ({ name, score: Math.round(v), note })) };
}

// Plain-language, actionable observations. Each one only fires when there is
// enough data behind it to mean something.
function insights(r) {
  const out = [];
  const p = r.people;
  const e = r.experience;
  const g = Object.fromEntries(p.gender.map((x) => [x.key, x]));
  const known = (g.male.n || 0) + (g.female.n || 0);
  if (known >= 20) {
    const fShare = pct(g.female.n, known);
    if (fShare < 25) out.push({ level: 'warn', text: `Only ${fShare}% of people who state a gender are female (${g.female.n} vs ${g.male.n} male). Women are the scarce side of the market: female-targeted marketing and safety messaging will lift match quality for everyone.` });
    else if (fShare > 60) out.push({ level: 'info', text: `${fShare}% of people who state a gender are female - unusually high for a stranger-chat app. Male-targeted acquisition would balance the pool.` });
    else out.push({ level: 'good', text: `Gender balance is healthy: ${fShare}% female, ${Math.round((100 - fShare) * 10) / 10}% male among people who state a gender.` });
  }
  if (p.personDays >= 20 && p.genderKnownPct < 50) out.push({ level: 'info', text: `${Math.round((100 - p.genderKnownPct) * 10) / 10}% of people don't state a gender, so the gender split is a sample. Prompting for it once (as /chat does) would sharpen these numbers.` });
  if (p.personDays >= 20 && p.ageKnownPct < 30) out.push({ level: 'info', text: `Only ${p.ageKnownPct}% of people have set an age group. The breakdown below is directional until more people fill it in.` });
  const topAge = p.age.filter((a) => a.key !== 'unspecified' && a.n > 0).sort((a, b) => b.n - a.n)[0];
  if (topAge && topAge.n >= 10) out.push({ level: 'good', text: `Largest age group: ${topAge.key} (${topAge.knownPct}% of people who set one). Aim creative, copy and influencer choices at this group.` });
  const mob = p.device.find(([k]) => k === 'mobile');
  const devTotal = p.device.reduce((a, [, v]) => a + v, 0);
  if (mob && devTotal >= 20 && pct(mob[1], devTotal) >= 60) out.push({ level: 'info', text: `${pct(mob[1], devTotal)}% of people are on phones. Mobile speed, the install prompt and one-thumb controls matter more than desktop polish.` });
  const inApp = p.browser.find(([k]) => k === 'In-app (FB/IG)');
  if (inApp && devTotal >= 20 && pct(inApp[1], devTotal) >= 10) out.push({ level: 'warn', text: `${pct(inApp[1], devTotal)}% arrive in the Facebook/Instagram in-app browser, where microphone access often fails. An "Open in browser" nudge there would save calls.` });
  const newc = p.lifecycle.find((l) => l.key === 'new');
  if (p.personDays >= 30 && newc) {
    if (newc.pct > 75) out.push({ level: 'warn', text: `${newc.pct}% of people are brand new - few come back. Retention (friends, notifications, a reason to return) is the bigger lever than more traffic.` });
    else if (newc.pct < 30) out.push({ level: 'good', text: `${Math.round((100 - newc.pct) * 10) / 10}% of people are returning users - a loyal base. Growth now depends on acquisition.` });
  }
  if (e.searches >= 10 && e.abandonPct >= 30) out.push({ level: 'crit', text: `${e.abandonPct}% of searches end with the person giving up before a match (after ~${e.avgAbandonSeconds}s on average). Too few people online at once - concentrate marketing into peak hours, or show a bot/"notify me" fallback.` });
  if (e.searches >= 10 && e.avgWaitSeconds > 30) out.push({ level: 'warn', text: `Average wait for a match is ${e.avgWaitSeconds}s. Under 10s feels instant; above 30s people start leaving.` });
  if (e.calls >= 10 && e.skipRatePct >= 50) out.push({ level: 'warn', text: `${e.skipRatePct}% of conversations end within 10 seconds. Better first impressions (icebreakers, interest matching) would convert more matches into real talks.` });
  if (e.calls >= 10 && e.avgCallSeconds >= 180) out.push({ level: 'good', text: `Average conversation lasts ${Math.round(e.avgCallSeconds / 60)} min - people who connect genuinely talk.` });
  if (e.ratings >= 10) {
    if (e.satisfaction < 50) out.push({ level: 'crit', text: `Only ${e.satisfaction}% of rated conversations got a thumbs up. Read the latest reports and chats to find what is going wrong.` });
    else if (e.satisfaction >= 75) out.push({ level: 'good', text: `${e.satisfaction}% of rated conversations got a thumbs up.` });
  }
  const segF = e.byGender.find((s) => s.key === 'female');
  const segM = e.byGender.find((s) => s.key === 'male');
  if (segF && segM && segF.ratings >= 5 && segM.ratings >= 5 && segF.satisfaction != null && segM.satisfaction != null && segM.satisfaction - segF.satisfaction >= 15) {
    out.push({ level: 'warn', text: `Women rate conversations ${segF.satisfaction}% positive vs ${segM.satisfaction}% for men. Check reports from female users for harassment patterns - this gap drives women away.` });
  }
  if (e.matches >= 50 && e.reportsPer1k >= 20) out.push({ level: 'warn', text: `${e.reportsPer1k} reports per 1,000 matches - above a healthy level (<10). Consider stricter auto-bans.` });
  if (e.visitors >= 50 && e.visitorToUserPct < 20) out.push({ level: 'warn', text: `Only ${e.visitorToUserPct}% of visitors ever open the app to chat. The landing page is losing most people before they tap Start.` });
  const mf = e.pairs.find((x) => x.key === 'F-M');
  const mm = e.pairs.find((x) => x.key === 'M-M');
  if (mm && e.calls >= 20 && mm.pct >= 50) out.push({ level: 'info', text: `${mm.pct}% of pairings are male-male${mf ? `, ${mf.pct}% mixed` : ''}. This is what drives short, skipped calls on most random-chat apps.` });
  if (!out.length) out.push({ level: 'info', text: 'Not enough data in this range for insights yet. They appear as people use the app.' });
  return out;
}

module.exports = {
  AGE_GROUPS,
  normGender,
  normAge,
  parseUA,
  parseLang,
  lifecycleOf,
  LEN_BUCKETS,
  WAIT_BUCKETS,
  bucketOf,
  pairKeyOf,
  buildReport,
};
