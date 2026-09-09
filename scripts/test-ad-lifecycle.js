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
});

function harness(mode, hidden = false, callState) {
  const events = {}, mutations = [], intervals = [], written = [];
  const button = { dataset: { mode, callState } };
  function element(type) {
    return { dataset: { ad: type }, style: {}, children: [], clientWidth: 800,
      getBoundingClientRect: () => ({ width: 800, top: 10, bottom: 100 }),
      closest: () => null, setAttribute() {},
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
  const window = { innerHeight: 800, innerWidth: 1000, MutationObserver: true };
  vm.runInNewContext(source, { window, document,
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
