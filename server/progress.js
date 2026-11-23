// Points, levels and tiers (docs/SPEC-PROFILE-PROGRESS-POSTS.md, section 2).
//
//   store.data.progress[clientId] = { points, lastClaimAt, redeemedCode, invites: [clientId], inviteBatchesPaid }
//
// Points come from a daily claim (+1, once per rolling 24 h) and from invite
// codes (the existing referral codes, see referralCodeFor in store.js): a new
// verified account may redeem one code and gets +10; the code's owner gets +10
// for every 3 such redeemers. The tiers unlock special faces. Points are never
// taken away, so an unlocked face stays unlocked.
//
// Everything here is pure store logic. What needs the live server (is this
// account verified, which networks does it use) is passed in as `ctx`.

const DAY_MS = 24 * 60 * 60 * 1000;
const CLAIM_POINTS = 1;
const REDEEM_POINTS = 10;
const OWNER_POINTS = 10;
const OWNER_BATCH = 3;
const MAX_ACCOUNT_AGE_MS = 7 * DAY_MS;
const MAX_LEVEL = 10;

const TIERS = [
  { name: 'silver', at: 40, face: 'c:silver_knight' },
  { name: 'gold', at: 100, face: 'c:gold_phoenix' },
  { name: 'diamond', at: 200, face: 'c:diamond_legend' },
];
// face id -> tier that unlocks it
const SPECIAL_FACES = Object.fromEntries(TIERS.map((t) => [t.face, t.name]));

function tierOf(points) {
  let tier = 'none';
  for (const t of TIERS) if (points >= t.at) tier = t.name;
  return tier;
}
function levelOf(points) {
  return Math.min(MAX_LEVEL, 1 + Math.floor(Math.max(0, points) / 20));
}
function nextTierOf(points) {
  return TIERS.find((t) => points < t.at) || null;
}
function tierRank(name) {
  return name === 'none' ? 0 : TIERS.findIndex((t) => t.name === name) + 1;
}

function createProgress({ store, now = () => Date.now() }) {
  const all = () => {
    if (!store.data.progress) store.data.progress = {};
    return store.data.progress;
  };
  const peek = (clientId) => all()[clientId] || null;
  function rec(clientId) {
    const map = all();
    if (!map[clientId]) map[clientId] = { points: 0, lastClaimAt: 0, redeemedCode: '', invites: [], inviteBatchesPaid: 0 };
    return map[clientId];
  }

  function pointsOf(clientId) {
    const r = peek(clientId);
    return r ? r.points || 0 : 0;
  }

  // `hasAccount`: only signed-in accounts have a code to share (minting one for
  // every guest would grow the store with codes nobody can use).
  function view(clientId, { hasAccount = false } = {}) {
    const r = peek(clientId) || {};
    const points = r.points || 0;
    const t = now();
    const next = nextTierOf(points);
    const nextClaimAt = (r.lastClaimAt || 0) + DAY_MS;
    const canClaim = !r.lastClaimAt || t >= nextClaimAt;
    return {
      points,
      level: levelOf(points),
      tier: tierOf(points),
      nextTier: next ? next.name : null,
      nextAt: next ? next.at : null,
      canClaim,
      nextClaimAt: canClaim ? 0 : nextClaimAt,
      code: hasAccount ? store.referralCodeFor(clientId) : '',
      redeemed: !!r.redeemedCode,
      invitesCounted: (r.invites || []).length,
    };
  }

  // The daily claim is decided here, on the server clock. `ctx.deviceKey`: a
  // device (or network) that already claimed in the last 24 h under another
  // profile cannot claim again, so a handful of throwaway profiles on one device
  // do not each collect a point.
  function claim(clientId, ctx = {}) {
    const r = rec(clientId);
    const t = now();
    const nextClaimAt = (r.lastClaimAt || 0) + DAY_MS;
    if (r.lastClaimAt && t < nextClaimAt) return { ok: false, reason: 'wait', nextClaimAt };
    const key = typeof ctx.deviceKey === 'string' && ctx.deviceKey ? ctx.deviceKey.slice(0, 80) : '';
    if (key) {
      if (!store.data.claimDevices) store.data.claimDevices = {};
      const dev = store.data.claimDevices;
      const prev = dev[key];
      if (prev && prev.by !== clientId && t - prev.at < DAY_MS) return { ok: false, reason: 'wait', nextClaimAt: prev.at + DAY_MS };
      dev[key] = { by: clientId, at: t };
      const keys = Object.keys(dev);
      if (keys.length > 5000) for (const k of keys) if (t - dev[k].at >= DAY_MS) delete dev[k];
    }
    r.points = (r.points || 0) + CLAIM_POINTS;
    r.lastClaimAt = t;
    store.save();
    return { ok: true, points: r.points };
  }

  // ctx: { verified, accountCreatedAt, ownerHasAccount(ownerClientId), sameDevice(ownerClientId) }
  function redeem(clientId, rawCode, ctx = {}) {
    const code = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';
    const mine = peek(clientId);
    if (mine && mine.redeemedCode) return { ok: false, reason: 'used' };
    if (!ctx.verified) return { ok: false, reason: 'not-verified' };
    const created = Number(ctx.accountCreatedAt) || 0;
    if (!created || now() - created > MAX_ACCOUNT_AGE_MS) return { ok: false, reason: 'too-old' };
    if (!/^[A-Z0-9]{4,16}$/.test(code)) return { ok: false, reason: 'invalid' };
    const owner = store.data.referrals && store.data.referrals.codes[code];
    if (!owner) return { ok: false, reason: 'invalid' };
    if (owner === clientId) return { ok: false, reason: 'own' };
    if (ctx.ownerHasAccount && !ctx.ownerHasAccount(owner)) return { ok: false, reason: 'invalid' };
    if (ctx.sameDevice && ctx.sameDevice(owner)) return { ok: false, reason: 'same-device' };
    // Several accounts from one device or network: only the first redeem counts.
    const refused = ctx.refuse && ctx.refuse(owner);
    if (refused) return { ok: false, reason: refused };
    const me = rec(clientId);
    me.redeemedCode = code;
    me.points = (me.points || 0) + REDEEM_POINTS;
    const o = rec(owner);
    if (!o.invites.includes(clientId)) o.invites.push(clientId);
    const due = Math.floor(o.invites.length / OWNER_BATCH) - (o.inviteBatchesPaid || 0);
    if (due > 0) {
      o.inviteBatchesPaid = (o.inviteBatchesPaid || 0) + due;
      o.points = (o.points || 0) + due * OWNER_POINTS;
    }
    store.save();
    return { ok: true, points: me.points, owner };
  }

  // Whether this person has reached the tier that unlocks a special face.
  function faceUnlocked(clientId, face) {
    const tier = SPECIAL_FACES[face];
    return !!tier && tierRank(tierOf(pointsOf(clientId))) >= tierRank(tier);
  }

  return { view, claim, redeem, pointsOf, faceUnlocked };
}

module.exports = {
  createProgress, tierOf, levelOf, nextTierOf, TIERS, SPECIAL_FACES,
  DAY_MS, REDEEM_POINTS, OWNER_POINTS, OWNER_BATCH, MAX_ACCOUNT_AGE_MS,
};
