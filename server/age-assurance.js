// Tiered age assurance - PLUMBING ONLY (fix list 3.1).
//
// Self-attested "I am 18+" is the only age check TalkLive runs today. UK and
// EU regulators have said self-declaration is not enough for services where
// unknown adults can contact minors, so this module is the seam a real check
// plugs into. Nothing here is live:
//
//   - The `ageAssurance` flag (server/flags.js) is off. While it is off every
//     gate answers "allowed" and behaviour is exactly what it was.
//   - No provider is registered. If the flag is turned on without one, the
//     gates FAIL CLOSED (the gated feature is refused with a clear message),
//     because silently allowing would make the flag a lie.
//   - Choosing a vendor or method (Yoti, Persona, Veriff, Incode, AU10TIX,
//     facial/voice estimation, ID document, ...) is a product/legal decision.
//     TODO(age-assurance-vendor): register the chosen provider below.
//   - Which regions require it is a legal decision too. `regions` is config,
//     not a conclusion: empty means "everywhere the flag is on".
//
// What is gated, and what deliberately is not:
//   - GATED: creating an account, sending/accepting friend requests and
//     messaging friends (persistent contact between strangers), and
//     Premium/payment checkout.
//   - NOT GATED: the anonymous single-session Talk / Chat entry point. That
//     stays one tap, by design.
//
// Age-band signal (flag `ageBandSignal`, also off): a provider - for example a
// future voice-analysis step - may report an estimated band for a client. No
// voice analysis exists in this codebase today; there is no pipeline to
// extend, so this is the interface one would report through. A client whose
// band is under 18 is routed to the restricted profile: no persistent-
// relationship features, text-only, tighter moderation defaults.

const flags = require('./flags');

// --- Provider interface ------------------------------------------------------
//
// A provider is an object:
//   {
//     name: 'vendor-name',
//     // Begin a check for this client. Returns what the browser needs to run
//     // it (a hosted-flow URL, an SDK session token, ...).
//     async start({ clientId, feature, country }) -> { url?, session?, expiresAt? },
//     // Verify the result the vendor sent back (webhook or client callback).
//     async verify({ clientId, payload }) -> { status: 'adult' | 'minor' | 'unknown', band?: string },
//   }
let provider = null;

function registerProvider(p) {
  if (!p || typeof p.start !== 'function' || typeof p.verify !== 'function' || !p.name) {
    throw new Error('age-assurance provider must have name, start() and verify()');
  }
  provider = p;
}

// --- Per-client state -----------------------------------------------------
//
// In memory for now. TODO(age-assurance-storage): persist in server/store.js
// once a provider exists and retention has been decided with legal - an age
// result is personal data and must not be kept longer than it is needed.
const statusByClient = new Map(); // clientId -> { status, band, at }

const BANDS = new Set(['under_13', '13_17', '18_24', '25_plus', 'unknown']);
const MINOR_BANDS = new Set(['under_13', '13_17']);

function setResult(clientId, { status, band } = {}) {
  if (!clientId) return;
  const s = status === 'adult' || status === 'minor' ? status : 'unknown';
  statusByClient.set(clientId, { status: s, band: BANDS.has(band) ? band : 'unknown', at: Date.now() });
}

// Report an estimated age band from a signal source. Ignored unless the
// ageBandSignal flag is on.
function reportAgeBand(clientId, band, { source = 'unknown' } = {}) {
  if (!flags.isOn('ageBandSignal') || !clientId || !BANDS.has(band)) return false;
  const prev = statusByClient.get(clientId) || {};
  // A verified adult result from a provider outranks an estimate.
  if (prev.status === 'adult' && prev.source === 'provider') return false;
  statusByClient.set(clientId, {
    status: MINOR_BANDS.has(band) ? 'minor' : (prev.status || 'unknown'),
    band,
    source,
    at: Date.now(),
  });
  return true;
}

// --- Restricted profile ---------------------------------------------------

const RESTRICTED_PROFILE = Object.freeze({
  friends: false,        // no persistent-relationship features
  voice: false,          // text-only
  moderation: 'strict',  // tighter moderation defaults
});

function isRestricted(clientId) {
  const s = statusByClient.get(clientId);
  return !!s && s.status === 'minor';
}

// What a client may use. Unrestricted clients get null (no overrides).
function restrictionsFor(clientId) {
  return isRestricted(clientId) ? RESTRICTED_PROFILE : null;
}

// --- Gates ------------------------------------------------------------------

const GATED = new Set(['account', 'friends', 'premium']);

let config = { regions: [] }; // ISO country codes; empty = everywhere

function configure(next = {}) {
  config = Object.assign({}, config, next);
}

function appliesIn(country) {
  if (!config.regions || !config.regions.length) return true;
  return !!country && config.regions.includes(String(country).toUpperCase());
}

// Decide whether `clientId` may use a gated feature.
//   -> { ok: true }
//   -> { ok: false, reason, message }
function check(feature, { clientId, country } = {}) {
  if (!GATED.has(feature)) return { ok: true };
  // Restricted clients never get persistent-contact or paid features, whether
  // or not the full gate is on - the band signal has its own flag.
  if (isRestricted(clientId)) {
    return { ok: false, reason: 'restricted', message: 'This feature is not available on your account.' };
  }
  if (!flags.isOn('ageAssurance') || !appliesIn(country)) return { ok: true };
  if (!provider) {
    return { ok: false, reason: 'unavailable', message: 'Age verification is required for this feature but is not available yet.' };
  }
  const s = statusByClient.get(clientId);
  if (s && s.status === 'adult') return { ok: true };
  return { ok: false, reason: 'verify', message: 'Please verify your age to use this feature.' };
}

// Start a check with the registered provider (for a future /age-check route).
async function start(clientId, feature, country) {
  if (!provider) throw new Error('no age-assurance provider registered');
  return provider.start({ clientId, feature, country });
}

async function verify(clientId, payload) {
  if (!provider) throw new Error('no age-assurance provider registered');
  const result = await provider.verify({ clientId, payload });
  setResult(clientId, result);
  const s = statusByClient.get(clientId);
  if (s) s.source = 'provider';
  return statusByClient.get(clientId);
}

// Test hook: forget everything.
function _reset() {
  statusByClient.clear();
  provider = null;
  config = { regions: [] };
}

module.exports = {
  check, start, verify, registerProvider, reportAgeBand, restrictionsFor, isRestricted,
  configure, RESTRICTED_PROFILE, _reset,
};
