'use strict';
// Age disputes: a claim never lifts a restriction, a decision needs a reason,
// and a flagged person is restricted until someone decides.
const test = require('node:test');
const assert = require('node:assert/strict');
const age = require('../server/age-assurance');
const c = require('../server/age-case');

test.beforeEach(() => age._reset());

test('flagging restricts, and a claim changes nothing', () => {
  let rec = c.flag(null, { clientId: 'a', username: 'Sam', reason: 'said they are in year 9' });
  assert.equal(rec.state, 'open');
  assert.equal(c.isRestricted(rec), true);
  rec = c.addClaim(rec, 'I am 19', { source: 'user' });
  assert.equal(rec.claims.length, 1);
  assert.equal(rec.state, 'open');
  assert.equal(c.isRestricted(rec), true);
});

test('a decision needs a valid outcome and a reason', () => {
  const rec = c.flag(null, { clientId: 'a', reason: 'school mentions' });
  assert.equal(c.decide(rec, { outcome: 'clear', reason: 'short' }).ok, false);
  assert.equal(c.decide(rec, { outcome: 'maybe', reason: 'long enough reason' }).ok, false);
  assert.equal(c.decide(null, { outcome: 'clear', reason: 'long enough reason' }).ok, false);
  const out = c.decide(rec, { outcome: 'clear', reason: 'no age cues, clean history', by: 'owner' });
  assert.equal(out.rec.state, 'cleared');
  assert.equal(c.isRestricted(out.rec), false);
  assert.equal(out.rec.decisions[0].by, 'owner');
});

test('new evidence reopens a cleared case; restrict keeps it restricted', () => {
  let rec = c.decide(c.flag(null, { clientId: 'a', reason: 'first report' }), { outcome: 'clear', reason: 'not enough evidence' }).rec;
  rec = c.flag(rec, { clientId: 'a', reason: 'two new reports', source: 'report' });
  assert.equal(rec.state, 'open');
  assert.equal(rec.evidence.length, 2);
  rec = c.decide(rec, { outcome: 'restrict', reason: 'several consistent reports' }).rec;
  assert.equal(rec.state, 'restricted');
  assert.equal(c.isRestricted(rec), true);
});

test('age-assurance restricts through the case lookup, with every flag off', () => {
  const cases = { a: c.flag(null, { clientId: 'a', reason: 'school mentions' }) };
  age.setCaseLookup((id) => c.isRestricted(cases[id] || null));
  assert.equal(age.isRestricted('a'), true);
  assert.equal(age.check('friends', { clientId: 'a' }).ok, false);
  assert.equal(age.isRestricted('b'), false);
  cases.a = c.decide(cases.a, { outcome: 'clear', reason: 'no age cues at all' }).rec;
  assert.equal(age.isRestricted('a'), false);
});

test('evidence, claims and decisions are capped and clipped', () => {
  let rec = null;
  for (let i = 0; i < 60; i++) rec = c.flag(rec, { clientId: 'a', reason: 'x'.repeat(900) + i });
  assert.equal(rec.evidence.length, 30);
  assert.equal(rec.evidence[0].text.length, 400);
});
