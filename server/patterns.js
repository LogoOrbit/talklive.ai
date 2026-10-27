// Behaviour patterns: counting, not reading. All in memory over a rolling 24
// hours, so it costs next to nothing and forgets on its own.
//
//   copy-paste   the same message (12+ characters) sent to 5+ different
//                strangers within an hour. Only when it looks like spam
//                (the model's spam score, a link, a contact handle or money talk)
//                does it count against them; a copy-pasted "hi how are you" is
//                just shown.
//   fast-skipped 15+ matches in a day where 80%+ of partners left within
//                5 seconds. Shown only: a bad mic looks the same.
//   crowded IP   8+ different devices from one IP in a day, and any device on
//                an IP that a banned or in-review person also used. Shown only:
//                schools and mobile carriers share IPs.

const modTags = require('./moderation-tags');

const HOUR = 3600000;
const DAY = 24 * HOUR;

function createPatterns({ talkguard, onSpam, isFlagged }) {
  const sent = new Map(); // clientId -> Map(textKey -> { to:Set, first, text })
  const pairs = new Map(); // clientId -> { username, matches:[ts], fast:[ts] }
  const ips = new Map(); // ip -> Map(clientId -> { ts, username })
  const names = new Map(); // clientId -> username
  const spamHits = []; // recent copy-paste findings, newest first

  const key = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  function onMessage({ from, to, text, username }) {
    if (!from || !to) return;
    const k = key(text);
    if (k.length < 12) return;
    if (username) names.set(from, username);
    let m = sent.get(from);
    if (!m) sent.set(from, m = new Map());
    let rec = m.get(k);
    const now = Date.now();
    if (!rec || now - rec.first > HOUR) m.set(k, rec = { to: new Set(), first: now, text: String(text).slice(0, 200), reported: false });
    rec.to.add(to);
    if (rec.to.size >= 5 && !rec.reported) {
      rec.reported = true;
      const sc = talkguard ? talkguard.score(text) : { spam: 0 };
      const flags = modTags.riskFlags(text);
      const spammy = sc.spam >= 0.6 || flags.some((f) => f === 'link' || f === 'contact' || f === 'money');
      spamHits.unshift({ ts: now, clientId: from, username: names.get(from) || '', text: rec.text, partners: rec.to.size, spammy, spamScore: Math.round(sc.spam * 100) / 100 });
      if (spamHits.length > 100) spamHits.length = 100;
      if (spammy && onSpam) onSpam({ clientId: from, username: names.get(from), text: rec.text, partners: rec.to.size });
    }
  }

  // leaver ended the conversation; left is the person they left.
  function onPairEnd({ left, leftName, seconds }) {
    if (!left) return;
    let p = pairs.get(left);
    if (!p) pairs.set(left, p = { matches: [], fast: [] });
    if (leftName) names.set(left, leftName);
    const now = Date.now();
    p.matches.push(now);
    if (seconds < 5) p.fast.push(now);
    if (p.matches.length > 400) p.matches.splice(0, p.matches.length - 400);
    if (p.fast.length > 400) p.fast.splice(0, p.fast.length - 400);
  }

  function onConnect({ ip, clientId, username }) {
    if (!ip || !clientId) return;
    if (username) names.set(clientId, username);
    let m = ips.get(ip);
    if (!m) ips.set(ip, m = new Map());
    m.set(clientId, Date.now());
  }

  function prune() {
    const cut = Date.now() - DAY;
    for (const [c, m] of sent) { for (const [k, r] of m) if (r.first < Date.now() - HOUR) m.delete(k); if (!m.size) sent.delete(c); }
    for (const [c, p] of pairs) { p.matches = p.matches.filter((t) => t > cut); p.fast = p.fast.filter((t) => t > cut); if (!p.matches.length) pairs.delete(c); }
    for (const [ip, m] of ips) { for (const [c, t] of m) if (t < cut) m.delete(c); if (!m.size) ips.delete(ip); }
    if (names.size > 50000) names.clear();
    while (spamHits.length && spamHits[spamHits.length - 1].ts < cut) spamHits.pop();
  }
  setInterval(prune, 10 * 60000).unref();

  function summary() {
    prune();
    const fast = [...pairs.entries()]
      .filter(([, p]) => p.matches.length >= 15 && p.fast.length / p.matches.length >= 0.8)
      .map(([c, p]) => ({ clientId: c, username: names.get(c) || '', matches: p.matches.length, fast: p.fast.length, pct: Math.round(p.fast.length / p.matches.length * 100) }))
      .sort((a, b) => b.matches - a.matches).slice(0, 30);
    const crowded = [];
    for (const [ip, m] of ips) {
      const ids = [...m.keys()];
      const flagged = isFlagged ? ids.filter((c) => isFlagged(c, ip)) : [];
      if (ids.length >= 8 || (flagged.length && ids.length > flagged.length)) {
        crowded.push({ ip: ip.replace(/(\d+\.\d+)\.\d+\.\d+$/, '$1.x.x').replace(/^([0-9a-f]+:[0-9a-f]+):.*$/i, '$1::'), devices: ids.length, names: ids.slice(0, 8).map((c) => names.get(c) || c.slice(0, 6)), flagged: flagged.map((c) => names.get(c) || c.slice(0, 6)) });
      }
    }
    crowded.sort((a, b) => (b.flagged.length - a.flagged.length) || (b.devices - a.devices));
    return { copyPaste: spamHits.slice(0, 40), fastSkipped: fast, crowdedIps: crowded.slice(0, 30) };
  }

  return { onMessage, onPairEnd, onConnect, summary };
}

module.exports = { createPatterns };
