'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../public/ads.js'), 'utf8');

test('Social Bar stays off conversation surfaces and is engagement gated', () => {
  assert.match(source, /document\.getElementById\('callMainBtn'\) \|\| document\.getElementById\('viewLive'\)/);
  assert.match(source, /Date\.now\(\) < readyAt \|\| scrollRatio\(\) < minScroll/);
  assert.match(source, /6cccce7190388ac7a53bb4b9de9f8dc8\.js/);
  // contentOnly is now off, so the unit is allowed to earn on the app
  // surfaces - but a remotely controlled overlay must still never appear over
  // a live conversation or over the matchmaking screen the user is watching.
  // That guard is re-checked at load time, not just at init, because the call
  // usually starts during the delay.
  assert.match(source, /if \(callIsLive\(\) \|\| isSearching\(\)\) return;/);
});

test('search adhesive is controlled, dismissible, and restricted to matchmaking', () => {
  assert.match(source, /state\(\) === 'searching'/);
  assert.match(source, /talklive_search_ad_dismissed_until/);
  assert.match(source, /banner\(slot, '320x50', 0\)/);
  assert.match(source, /attributeFilter: \['data-call-state', 'data-mode'\]/);
});

function harness(mode, hidden = false, callState, opts = {}) {
  const events = {}, mutations = [], intervals = [], written = [];
  const button = { dataset: { mode, callState } };
  function element(type) {
    return { dataset: { ad: type }, style: {}, children: [], clientWidth: 800,
      getBoundingClientRect: () => ({ width: 800, top: 10, bottom: 100 }),
      closest: sel => ((sel === '#callPanel' && opts.inCallPanel) || (sel === '.ad-card-app' && opts.appCard) ? {} : null),
      attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k] || null; },
      appendChild(child) { this.children.push(child); },
      removeChild(child) { this.children.splice(this.children.indexOf(child), 1); } };
  }
  const slots = [element('native'), element('native'), element('leaderboard')];
  const document = { hidden, readyState: 'complete',
    getElementById: id => id === 'callMainBtn' ? button : null,
    querySelectorAll: () => slots,
    addEventListener: (name, callback) => { events[name] = callback; },
    createElement: tag => {
      const el = element();
      if (tag === 'iframe') el.contentWindow = { document: {
        open() {}, write: html => written.push(html), close() {},
        body: { childElementCount: 0, querySelector: () => null },
      } };
      return el;
    },
  };
  const window = { innerHeight: 800, innerWidth: 1000, MutationObserver: true, sessionStorage: opts.sessionStorage };
  // With opts.config the page fetches it like /ads-config.json; the 1s
  // fallback timer never fires, so the test awaits the fetch instead.
  const fetch = opts.config ? () => Promise.resolve({ ok: true, json: () => opts.config }) : undefined;
  if (fetch) window.fetch = fetch;
  vm.runInNewContext(source, { window, document, fetch, setTimeout: () => 0, clearTimeout() {},
    MutationObserver: class { constructor(cb) { mutations.push(cb); } observe() {} },
    setInterval: cb => (intervals.push(cb), intervals.length), clearInterval() {},
  });
  return { button, slots, document, events, written,
    change: (value, state) => {
      button.dataset.mode = value;
      button.dataset.callState = state;
      mutations.forEach(cb => cb());
    },
    tick: () => intervals.slice().forEach(cb => cb()),
  };
}

test('ads wait through connecting/reconnecting and load once after idle', () => {
  const h = harness('loading');
  assert.equal(h.written.length, 0);
  h.change('hangup');
  assert.equal(h.written.length, 0);
  h.change('call');
  assert.equal(h.written.length, 1);
  assert.match(h.written[0], /target="_blank"/);
  assert.equal(h.slots[0].children.length, 2);
  assert.equal(h.slots[1].children.length, 0);
  h.change('call');
  assert.equal(h.written.length, 1);
  h.change('loading');
  for (let i = 0; i < 20; i++) h.tick();
  assert.equal(h.written.length, 1, 'no retry during reconnect');
});

test('searching is not a live conversation - slots fill while waiting for a match', () => {
  const h = harness('loading', false, 'searching');
  assert.equal(h.written.length, 1, 'ad loads during the search');
  // The match arrives: nothing new starts, and what loaded stays put.
  h.change('hangup', 'connected');
  h.tick();
  assert.equal(h.written.length, 1);
});

test('connecting and reconnecting still pause ads', () => {
  const h = harness('loading', false, 'connecting');
  assert.equal(h.written.length, 0);
  h.change('loading', 'reconnecting');
  assert.equal(h.written.length, 0);
  h.change('loading', 'searching');
  assert.equal(h.written.length, 1);
});

test('hidden tabs do not load ads until visible', () => {
  const h = harness('call', true);
  assert.equal(h.written.length, 0);
  h.document.hidden = false;
  h.events.visibilitychange();
  assert.equal(h.written.length, 1);
});

/*
 * A slot whose tag was already loading when the match connected used to be
 * stranded: pollFill returned early for the whole call, so the give-up path
 * never ran and the reserved space stayed blank until the user hung up. The
 * search screen only gives a slot about six seconds before a match arrives, so
 * this was the normal outcome on the call screen rather than an edge case.
 *
 * It must now resolve mid-call, but without taking its space back - collapsing
 * would move the page under a live conversation. The collapse waits for idle.
 */
test('a slot that times out mid-call resolves but keeps its space until idle', () => {
  const h = harness('loading', false, 'searching');
  const slot = h.slots[2];
  assert.equal(h.written.length, 1, 'the banner started loading during the search');

  h.change('hangup', 'connected');
  for (let i = 0; i < 40; i++) h.tick();
  assert.equal(h.written.length, 1, 'no host failover mid-call');
  assert.notEqual(slot.style.display, 'none', 'space is held while the call is live');

  h.change('call', 'idle');
  assert.equal(slot.style.display, 'none', 'the space is given up once the call ends');
});

// The density ceiling and the native tag's single-container claim must both be
// spent at load time, not at DOMContentLoaded. index.html's first three slots
// sit inside #callPanel/.hidden - display:none - so counting them up front let
// invisible slots consume the entire page budget and starve every visible one.
test('density and the native claim are spent when a slot actually loads', () => {
  assert.match(source, /if \(loaded >= \(config\.maxSlotsPerPage \|\| 0\)\) \{ hideSlot\(el\); return; \}/);
  assert.match(source, /if \(type === 'native' && nativeClaimed\) \{ hideSlot\(el\); return; \}/);
  assert.doesNotMatch(source, /kept\.length >= \(config\.maxSlotsPerPage/);
});

/*
 * The backfill network is the second demand source for a slot Adsterra could
 * not sell. It must sit between the last Adsterra host and the house promo -
 * never in front of a live Adsterra attempt, and never in place of one.
 */
test('backfill is tried after Adsterra and before the house promo', () => {
  assert.match(source, /if \(next < HOSTS\.length\) \{ banner\(el, size, next\); return; \}\s*\n(?:\s*\/\/[^\n]*\n)*\s*if \(backfill\(el, size, false\)\) return;\s*\n\s*hideSlot\(el, false\);/);
  assert.match(source, /if \(backfill\(el, 'native', live\)\) return;\s*\n\s*hideSlot\(el, live\);/);
  // Never swaps a tag into a frame the user is looking at mid-call.
  assert.match(source, /function backfill\(el, size, live, i\) \{\s*\n\s*if \(live\) return false;/);
  // An unconfigured size has no backfill at all, so a half-filled zone map is
  // safe rather than a slot that loads an empty tag.
  assert.match(source, /if \(!zone\) return null;/);
  // Each network that declines hands the slot to the next one, and the slot is
  // cleared first so dead tags do not stack up in it.
  assert.match(source, /if \(backfill\(el, size, false, nextIndex\)\) return;/);
  assert.match(source, /function next\(nowLive\) \{\s*\n\s*if \(nowLive\) \{ hideSlot\(el, true\); return; \}\s*\n\s*clear\(\);/);
});

test('backfill stays off until a network is configured', () => {
  const config = require('../public/ads-config.json');
  assert.equal(config.backfill.enabled, false, 'ships disabled - needs real zone IDs');
  // Every network is a placeholder until its dashboard values are pasted in, so
  // none of them can load: no src and no zones means each is skipped.
  for (const net of config.backfill.networks) {
    assert.equal(net.src, '', `${net.id} must ship without a src`);
    assert.deepEqual(net.zones, {}, `${net.id} must ship without zones`);
  }
  // The default in ads.js must agree, so a failed config fetch cannot turn on
  // a network that was never set up.
  assert.match(source, /backfill: \{ enabled: false, networks: \[\] \}/);
});

/*
 * No ad renders at the connect moment. A tag still loading when the match
 * connects used to finish a second or two into the call; it is now abandoned
 * invisibly inside its reserved space, and the space is returned at idle.
 */
test('a slot still loading when the match connects never appears', () => {
  const h = harness('loading', false, 'searching');
  const slot = h.slots[2];
  assert.equal(h.written.length, 1, 'the banner started loading during the search');
  h.change('loading', 'connecting');
  assert.equal(slot.style.visibility, 'hidden', 'hidden the instant the match connects');
  assert.notEqual(slot.style.display, 'none', 'without giving up its space mid-call');
  h.change('hangup', 'connected');
  for (let i = 0; i < 40; i++) h.tick();
  assert.equal(slot.attrs['data-ad-filled'], undefined, 'never revealed');
  h.change('call', 'idle');
  assert.equal(slot.style.display, 'none', 'space returned once the call ends');
});

test('call-screen frequency cap is a config value, off by default', () => {
  const config = require('../public/ads-config.json');
  assert.equal(config.callScreenCap.everyNCalls, 1);
  assert.match(source, /callScreenCap: \{ everyNCalls: 1 \}/);
  assert.match(source, /if \(isCallScreenSlot\(el\) && callScreenCapped\(\)\) \{ hideSlot\(el\); return; \}/);
});

test('with everyNCalls = 3, call-screen slots serve on one call in three', async () => {
  const base = require('../public/ads-config.json');
  const config = Object.assign({}, base, {
    callScreenCap: { everyNCalls: 3 }, fallback: { enabled: false, promos: [] },
    socialBar: { enabled: false }, searchAnchor: { enabled: false },
  });
  // One page view per call. The counters live in sessionStorage so they
  // survive the reload; one shared store stands in for it here.
  const data = {};
  const sessionStorage = { getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; } };
  const served = [];
  for (let call = 1; call <= 6; call++) {
    const h = harness('loading', false, undefined, { inCallPanel: true, config, sessionStorage });
    await new Promise(r => setImmediate(r));
    h.change('loading', 'searching');
    served.push(h.written.length > 0);
  }
  assert.deepEqual(served, [true, false, false, true, false, false]);
});

test('adsenseSafe ships off and, when on, drops the placements AdSense objects to', () => {
  const config = require('../public/ads-config.json');
  assert.equal(config.adsenseSafe, false, 'ships off - flipping it is a revenue decision');
  assert.match(source, /adsenseSafe: false,/);
  // Social Bar, the matchmaking adhesive, and every app-screen slot.
  assert.match(source, /opts\.enabled === false \|\| config\.adsenseSafe \|\|/);
  assert.match(source, /opts\.enabled !== true \|\| config\.adsenseSafe \|\|/);
  assert.match(source, /if \(config\.adsenseSafe && el\.closest && el\.closest\('\.ad-card-app'\)\) \{ hideSlot\(el\); continue; \}/);
});

test('with adsenseSafe on, an app-screen slot never loads a network tag', async () => {
  const base = require('../public/ads-config.json');
  const config = Object.assign({}, base, { adsenseSafe: true, fallback: { enabled: false, promos: [] } });
  const h = harness('call', false, 'idle', { config, appCard: true });
  await new Promise(r => setImmediate(r));
  assert.equal(h.written.length, 0);
  assert.ok(h.slots.every(s => s.style.display === 'none'), 'app-screen slots collapse');
});
