'use strict';
// Fix list 3.1: the age-assurance seam. Nothing here is live - these tests pin
// down that the flags default off, that "off" changes nothing, and that "on"
// without a provider fails closed rather than quietly allowing.
const test = require('node:test');
const assert = require('node:assert/strict');
const flags = require('../server/flags');
const age = require('../server/age-assurance');

test.beforeEach(() => {
  age._reset();
  flags._set('ageAssurance', false);
  flags._set('ageBandSignal', false);
});

test('flags default off, and unknown names in FEATURE_FLAGS are ignored', () => {
  const loaded = flags.load({ FEATURE_FLAGS: '{"madeUp":true}' });
  assert.equal(loaded.ageAssurance, false);
  assert.equal(loaded.ageBandSignal, false);
  assert.equal(loaded.progressiveDisclosure, false);
  assert.equal(loaded.madeUp, undefined);
  assert.equal(flags.load({ FEATURE_FLAGS: 'not json' }).ageAssurance, false);
  assert.equal(flags.load({ FEATURE_FLAGS: '{"ageAssurance":true}' }).ageAssurance, true);
  assert.equal('ageBandSignal' in flags.clientFlags(), false, 'server-only flag stays server-side');
});

test('with the flag off every gate allows, as before', () => {
  for (const f of ['account', 'friends', 'premium']) assert.deepEqual(age.check(f, { clientId: 'c1' }), { ok: true });
});

test('the anonymous Talk/Chat entry point is never gated', () => {
  flags._set('ageAssurance', true);
  assert.deepEqual(age.check('talk', { clientId: 'c1' }), { ok: true });
  assert.deepEqual(age.check('chat', { clientId: 'c1' }), { ok: true });
});

test('flag on with no provider fails closed', () => {
  flags._set('ageAssurance', true);
  const r = age.check('account', { clientId: 'c1' });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'unavailable');
});

test('flag on with a provider: verify first, then allowed', async () => {
  flags._set('ageAssurance', true);
  age.registerProvider({
    name: 'fake',
    start: async () => ({ url: 'https://example.test/check' }),
    verify: async ({ payload }) => ({ status: payload.ok ? 'adult' : 'minor' }),
  });
  assert.equal(age.check('friends', { clientId: 'c1' }).reason, 'verify');
  await age.verify('c1', { ok: true });
  assert.deepEqual(age.check('friends', { clientId: 'c1' }), { ok: true });
  await age.verify('c2', { ok: false });
  assert.equal(age.check('premium', { clientId: 'c2' }).reason, 'restricted');
});

test('regions scope the gate without hardcoding a legal conclusion', () => {
  flags._set('ageAssurance', true);
  age.configure({ regions: ['GB'] });
  assert.equal(age.check('account', { clientId: 'c1', country: 'GB' }).ok, false);
  assert.equal(age.check('account', { clientId: 'c1', country: 'US' }).ok, true);
});

test('age-band signal is ignored while its flag is off, and restricts when on', () => {
  assert.equal(age.reportAgeBand('c3', '13_17', { source: 'test' }), false);
  assert.equal(age.restrictionsFor('c3'), null);
  flags._set('ageBandSignal', true);
  assert.equal(age.reportAgeBand('c3', '13_17', { source: 'test' }), true);
  assert.deepEqual(age.restrictionsFor('c3'), { friends: false, voice: false, moderation: 'strict' });
  assert.equal(age.check('friends', { clientId: 'c3' }).reason, 'restricted');
  assert.equal(age.reportAgeBand('c4', 'not-a-band'), false);
});
