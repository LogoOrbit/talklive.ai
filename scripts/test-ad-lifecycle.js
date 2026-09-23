'use strict';
// public/ads.js - the Google AdSense slot loader. Runs the real file in a VM
// against a minimal DOM so the rules that matter for AdSense policy and for
// people mid-call are pinned down.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../public/ads.js'), 'utf8');
const config = require('../public/ads-config.json');

function harness({ mode = 'call', callState, slots = [{ type: 'leaderboard' }], cfg, hidden = false } = {}) {
  const mutations = [];
  const intervals = [];
  const pushes = [];
  const button = { dataset: { mode, callState } };
  function element(spec = {}) {
    return {
      dataset: { ad: spec.type }, style: {}, children: [], attrs: {},
      closest: sel => (sel === '.ad-card-app' && spec.app ? {} : null),
      setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
      appendChild(child) { this.children.push(child); child.parentNode = this; },
      removeChild(child) { this.children.splice(this.children.indexOf(child), 1); },
      get firstChild() { return this.children[0] || null; },
      getBoundingClientRect: () => ({ top: 10, bottom: 100 }),
      querySelector: () => null,
      classList: { add() {} },
    };
  }
  const els = slots.map(element);
  const document = {
    hidden, readyState: 'complete',
    getElementById: id => (id === 'callMainBtn' ? button : null),
    querySelectorAll: () => els,
    addEventListener() {},
    createElement: () => element(),
  };
  const window = { innerHeight: 800, MutationObserver: true, adsbygoogle: pushes };
  const fetch = cfg ? () => Promise.resolve({ ok: true, json: () => cfg }) : undefined;
  if (fetch) window.fetch = fetch;
  vm.runInNewContext(source, {
    window, document, fetch,
    MutationObserver: class { constructor(cb) { mutations.push(cb); } observe() {} },
    setInterval: cb => (intervals.push(cb), intervals.length), clearInterval() {},
    setTimeout: () => 0, clearTimeout() {},
  });
  return {
    els, pushes, button, document,
    ready: () => new Promise(r => setImmediate(r)),
    change(m, state) { button.dataset.mode = m; button.dataset.callState = state; mutations.forEach(cb => cb()); },
    tick: () => intervals.slice().forEach(cb => cb()),
  };
}

const withUnit = Object.assign({}, config, { adsense: { client: config.adsense.client, slots: { default: '1234567890' } } });

test('Google AdSense is the only network: no Adsterra code or config remains', () => {
  assert.doesNotMatch(source, /delvefencescrewdriver|highperformanceformat|effectivecpmnetwork|adsterra/i);
  for (const key of ['socialBar', 'searchAnchor', 'backfill', 'callScreenCap', 'adsenseSafe']) {
    assert.equal(key in config, false, `${key} is an Adsterra-era setting`);
  }
  assert.equal(config.adsense.client, 'ca-pub-6368797323385379');
  assert.match(source, /var CLIENT = 'ca-pub-6368797323385379';/);
});

test('a slot becomes an AdSense unit with the configured unit ID', async () => {
  const h = harness({ cfg: withUnit });
  await h.ready();
  assert.equal(h.pushes.length, 1, 'one adsbygoogle.push per unit');
  const ins = h.els[0].children[0];
  assert.equal(ins.className, 'adsbygoogle');
  assert.equal(ins.attrs['data-ad-client'], 'ca-pub-6368797323385379');
  assert.equal(ins.attrs['data-ad-slot'], '1234567890');
  assert.equal(ins.attrs['data-ad-format'], 'horizontal');
});

test('without a unit ID a slot never loads (Auto ads place ads instead)', async () => {
  const h = harness({ cfg: config });
  await h.ready();
  assert.equal(h.pushes.length, 0);
  assert.equal(h.els[0].style.display, 'none', 'collapses - no house promo either');
  assert.equal(h.els[0].dataset.adHouse, undefined);
});

test('never fills a slot on an app screen, whatever the config says', async () => {
  const h = harness({ cfg: withUnit, slots: [{ type: 'box', app: true }] });
  await h.ready();
  assert.equal(h.pushes.length, 0);
  assert.equal(h.els[0].style.display, 'none');
});

test('nothing loads during a live call; the slot loads once the call ends', async () => {
  const h = harness({ mode: 'hangup', callState: 'connected', cfg: withUnit });
  await h.ready();
  assert.equal(h.pushes.length, 0, 'held while the call is live');
  h.change('call', 'idle');
  assert.equal(h.pushes.length, 1, 'loads after the call');
});

test('the label only appears once Google reports the unit filled', async () => {
  const h = harness({ cfg: withUnit });
  await h.ready();
  const el = h.els[0];
  h.tick();
  assert.equal(el.attrs['data-ad-filled'], undefined);
  el.children[0].attrs['data-ad-status'] = 'filled';
  h.tick();
  assert.equal(el.attrs['data-ad-filled'], '1');
});

test('an unfilled unit gives its space to a house promo, not an empty labelled box', async () => {
  const h = harness({ cfg: withUnit });
  await h.ready();
  const el = h.els[0];
  el.children[0].attrs['data-ad-status'] = 'unfilled';
  h.tick();
  assert.equal(el.dataset.adHouse, '1', 'house promo from ads-config fallback');
  assert.equal(el.attrs['data-ad-filled'], undefined);
});

test('the density ceiling is applied when slots load', async () => {
  const cfg = Object.assign({}, withUnit, { maxSlotsPerPage: 1, fallback: { enabled: false, promos: [] } });
  const h = harness({ cfg, slots: [{ type: 'leaderboard' }, { type: 'box' }] });
  await h.ready();
  assert.equal(h.pushes.length, 1);
  assert.equal(h.els[1].style.display, 'none');
});
