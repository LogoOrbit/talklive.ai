// Feature flags.
//
// Every flag is off unless the FEATURE_FLAGS environment variable turns it on,
// e.g. `fly secrets set FEATURE_FLAGS='{"progressiveDisclosure":true}'`. Only
// the names below are recognised, so a typo in the secret cannot invent a flag,
// and the defaults here are what production runs when the secret is unset.
//
// The same values reach the browser as window.TL_FLAGS through /config.js.
// Flags whose `client` is false stay server-side only.

const DEFS = {
  // Fix list 2.3: first-time visitors see only the two start actions; Friends,
  // History, Shop and Settings move behind "More", and "Add friend" becomes a
  // prompt after a good call. See public/app.js "Progressive disclosure".
  progressiveDisclosure: { default: false, client: true },

  // Fix list 3.1: age-assurance gates on account creation, Friends and
  // Premium/payments. Plumbing only - no provider is wired in, and turning this
  // on without one fails closed (see server/age-assurance.js). Needs explicit
  // product/legal sign-off before it is enabled anywhere.
  ageAssurance: { default: false, client: true },

  // Fix list 3.1: accept an age-band signal from a future voice-analysis
  // provider. No such analysis exists in this codebase today.
  ageBandSignal: { default: false, client: false },
};

function parse(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (err) {
    console.warn('[flags] FEATURE_FLAGS is not valid JSON - every flag stays at its default');
    return {};
  }
}

function load(env = process.env) {
  const overrides = parse(env.FEATURE_FLAGS);
  const flags = {};
  for (const [name, def] of Object.entries(DEFS)) {
    flags[name] = Object.prototype.hasOwnProperty.call(overrides, name) ? overrides[name] === true : def.default;
  }
  for (const name of Object.keys(overrides)) {
    if (!DEFS[name]) console.warn(`[flags] FEATURE_FLAGS names unknown flag "${name}" - ignored`);
  }
  return flags;
}

const FLAGS = load();

function isOn(name) {
  return FLAGS[name] === true;
}

function clientFlags() {
  const out = {};
  for (const [name, def] of Object.entries(DEFS)) if (def.client) out[name] = FLAGS[name];
  return out;
}

module.exports = { isOn, clientFlags, load, DEFS };
