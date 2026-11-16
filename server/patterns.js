// Behaviour patterns: counting, not reading. All in memory over a rolling 24
// hours, so it costs next to nothing and forgets on its own.
//
//   copy-paste   the same message (12+ characters) sent to 5+ different
//                strangers within an hour. Only when it looks like spam
//                (the model's spam score, a link, a contact handle or money talk;
//                two people swapping socials is fine, the same pitch sent to
//                5+ strangers is an advert)
//                does it count against them; a copy-pasted "hi how are you" is
//                just shown.
//   same text    the same or a near-identical message (after normalisation, so
//                 a changed number, emoji or case does not hide it) of 40+
//                 characters sent to 8+ different people within an hour, any
//                 content. A queue-for-review signal only: people do reuse an
//                 opener, which is why it is longer and wider than copy-paste.
//   link first    a brand-new identity whose first message in 3+ different chats
//                 was a web link (the filter's own verdict, so allowed social
//                 profile links never count).
//   spraying      friend requests to 15+ different people in an hour, or voice
//                 notes to 12+ different people in an hour.
//   fast-skipped 15+ matches in a day where 80%+ of partners left within
//                5 seconds. Shown only: a bad mic looks the same.
//   crowded IP   8+ different devices from one IP in a day, and any device on
//                an IP that a banned or in-review person also used. Shown only:
//                schools and mobile carriers share IPs.

const modTags = require('./moderation-tags');
const { normalizeForChecks } = require('./text-normalize');

const HOUR = 3600000;
const DAY = 24 * HOUR;

// Thresholds, in one place. Conservative on purpose: every one of these only
// warns or queues for the owner's review, never bans.
const LIMITS = {
  nearIdenticalTo: 8, nearIdenticalMinLen: 40, similarity: 0.8,
  linkFirstChats: 3, linkFirstHours: 6,
  friendSpray: 15, voiceSpray: 12, sprayWindow: HOUR,
};

function createPatterns({ talkguard, onSpam, isFlagged, isLink, isNewIdentity, count }) {
  const bump = (name) => { try { if (count) count(name); } catch (_) { /* counters are best effort */ } };
  const firsts = new Map(); // clientId -> { chats:Set(to), links:Map(to -> ts), reported:boolean }
  const spray = new Map(); // `${kind}|${clientId}` -> Map(target -> ts)
  const sprayReported = new Map(); // `${kind}|${clientId}` -> ts
  const sent = new Map(); // clientId -> Map(textKey -> { to:Set, first, text })
  const pairs = new Map(); // clientId -> { username, matches:[ts], fast:[ts] }
  const ips = new Map(); // ip -> Map(clientId -> { ts, username })
  const names = new Map(); // clientId -> username
  const spamHits = []; // recent copy-paste findings, newest first

  // The comparison form of a message: folded (look-alikes, zero-width, full-width),
  // lower case, digits all alike, punctuation and emoji gone, in any script. The
  // old form kept only a-z and 0-9, so a message in Arabic, Hindi or Chinese had
  // an empty key and could never be counted.
  const key = (text) => normalizeForChecks(text).toLowerCase()
    .replace(/\p{N}/gu, '#').replace(/[^\p{L}\p{M}#]+/gu, ' ').replace(/#+/g, '#').trim();
  const tokens = (k) => new Set(k.split(' ').filter(Boolean));
  function similar(a, b) {
    if (a.size < 6 || b.size < 6) return false;
    let hit = 0;
    for (const t of a) if (b.has(t)) hit++;
    return hit / (a.size + b.size - hit) >= LIMITS.similarity;
  }

  function onMessage({ from, to, text, username }) {
    if (!from || !to) return;
    if (username) names.set(from, username);
    // Before the length check: a bare link is a short message.
    firstMessage({ from, to, text, now: Date.now() });
    const k = key(text);
    if (k.length < 12) return;
    let m = sent.get(from);
    if (!m) sent.set(from, m = new Map());
    let rec = m.get(k);
    const now = Date.now();
    if (!rec || now - rec.first > HOUR) {
      // A near-identical wording counts as the same message: join its record.
      const tk = tokens(k);
      let near = null;
      if (tk.size >= 6) for (const r of m.values()) if (now - r.first <= HOUR && r.tk && similar(tk, r.tk)) { near = r; break; }
      if (near) rec = near;
      else {
        if (m.size >= 40) m.delete(m.keys().next().value);
        m.set(k, rec = { to: new Set(), first: now, text: String(text).slice(0, 200), reported: false, tk });
      }
    }
    rec.to.add(to);
    // Not spammy by content, but the same long text to many people is a script.
    if (rec.to.size >= LIMITS.nearIdenticalTo && !rec.reportedAny && !rec.spamEvent && String(text).length >= LIMITS.nearIdenticalMinLen) {
      rec.reportedAny = true;
      bump('spam_same_text');
      if (onSpam) onSpam({ clientId: from, username: names.get(from), text: rec.text, partners: rec.to.size, kind: 'same-text' });
    }
    if (rec.to.size >= 5 && !rec.reported) {
      rec.reported = true;
      const sc = talkguard ? talkguard.score(text) : { spam: 0 };
      const flags = modTags.riskFlags(text);
      const spammy = sc.spam >= 0.6 || flags.some((f) => f === 'link' || f === 'contact' || f === 'money');
      spamHits.unshift({ ts: now, clientId: from, username: names.get(from) || '', text: rec.text, partners: rec.to.size, spammy, spamScore: Math.round(sc.spam * 100) / 100 });
      if (spamHits.length > 100) spamHits.length = 100;
      if (spammy) bump('spam_copypaste');
      if (spammy) rec.spamEvent = true;
      if (spammy && onSpam) onSpam({ clientId: from, username: names.get(from), text: rec.text, partners: rec.to.size });
    }
  }

  // A new identity that opens chat after chat with a link is a funnel bot. Only
  // the first message of each chat counts, and only while the identity is new
  // (nothing to lose: no friends, history, account or Plus).
  function firstMessage({ from, to, text, now }) {
    let f = firsts.get(from);
    if (!f) firsts.set(from, f = { chats: new Set(), links: new Map(), reported: false });
    if (f.chats.has(to)) return;
    f.chats.add(to);
    if (f.chats.size > 200) { f.chats.delete(f.chats.values().next().value); }
    if (!isLink || !isLink(text)) return;
    f.links.set(to, now);
    const recent = [...f.links.values()].filter((t) => now - t < LIMITS.linkFirstHours * HOUR);
    if (f.reported || recent.length < LIMITS.linkFirstChats) return;
    if (isNewIdentity && !isNewIdentity(from)) return;
    f.reported = true;
    bump('spam_link_first');
    if (onSpam) onSpam({ clientId: from, username: names.get(from), text: String(text).slice(0, 200), partners: recent.length, kind: 'link-first' });
  }

  // Friend requests and voice notes to many different people in an hour.
  function onAction({ kind, from, to, username }) {
    if (!from || !to || (kind !== 'friend-request' && kind !== 'voice-note')) return;
    if (username) names.set(from, username);
    const k = kind + '|' + from;
    const now = Date.now();
    let m = spray.get(k);
    if (!m) spray.set(k, m = new Map());
    m.set(to, now);
    for (const [t, ts] of m) if (now - ts > LIMITS.sprayWindow) m.delete(t);
    const limit = kind === 'friend-request' ? LIMITS.friendSpray : LIMITS.voiceSpray;
    if (m.size < limit || now - (sprayReported.get(k) || 0) < DAY) return;
    sprayReported.set(k, now);
    const name = kind === 'friend-request' ? 'spam_friend_spray' : 'spam_voice_spray';
    bump(name);
    spamHits.unshift({ ts: now, clientId: from, username: names.get(from) || '', text: '', partners: m.size, spammy: true, kind });
    if (spamHits.length > 100) spamHits.length = 100;
    if (onSpam) onSpam({ clientId: from, username: names.get(from), text: '', partners: m.size, kind });
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
    for (const [c, f] of firsts) if (!f.links.size && f.chats.size < 3) firsts.delete(c);
    for (const [k2, ts] of sprayReported) if (now2() - ts > DAY) { sprayReported.delete(k2); spray.delete(k2); }
    for (const [c, p] of pairs) { p.matches = p.matches.filter((t) => t > cut); p.fast = p.fast.filter((t) => t > cut); if (!p.matches.length) pairs.delete(c); }
    for (const [ip, m] of ips) { for (const [c, t] of m) if (t < cut) m.delete(c); if (!m.size) ips.delete(ip); }
    if (names.size > 50000) names.clear();
    while (spamHits.length && spamHits[spamHits.length - 1].ts < cut) spamHits.pop();
  }
  const now2 = () => Date.now();
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

  return { onMessage, onAction, onPairEnd, onConnect, summary, LIMITS };
}

module.exports = { createPatterns };
