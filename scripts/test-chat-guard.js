#!/usr/bin/env node
/*
 * Chat spam guard (server/chat-guard.js), with a fake clock:
 *   - normal chatting passes, short replies may repeat
 *   - too fast, 3rd repeat and character walls are blocked
 *   - 3 blocks in 2 minutes mute for a minute; the next mute is longer
 *   - friend messages skip the speed check
 */
const { createChatGuard } = require('../server/chat-guard');

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : JSON.stringify(extra));
};
let clock = 1e12;
const g = createChatGuard({ now: () => clock });
const send = (who, text, opts) => g.check(who, text, opts);
const wait = (ms) => { clock += ms; };

// Normal conversation
let blocked = 0;
for (const t of ['hi', 'how are you?', 'ok', 'ok', 'ok', 'lol', 'lol', 'lol', 'where are you from', 'nice']) { if (send('a', t)) blocked++; wait(1500); }
ok('normal chat and repeated short replies pass', blocked === 0);

// Too fast
for (let i = 0; i < 5; i++) send('b', 'message number ' + i);
const fast = send('b', 'one more');
ok('6th message within 5s is blocked as too fast', fast && fast.reason === 'rate');
wait(5000);
ok('after a pause it passes again', send('b', 'calm now') === null);

// Repeats
wait(10000);
ok('same message twice is fine', !send('c', 'please talk to me') && (wait(3000), !send('c', 'please talk to me')));
wait(3000);
const rep = send('c', 'Please talk to me!!');
ok('3rd repeat within 2 min is blocked', rep && rep.reason === 'unsafe' && rep.why === 'repeat');
wait(2 * 60000 + 1);
ok('after 2 minutes it can be sent again', send('c', 'please talk to me') === null);

// Walls
ok('character wall blocked', (send('d', 'heyyyyyyyyyyyyyyyyyyyy') || {}).why === 'wall');
wait(3000);
ok('word wall blocked', (send('d', 'hi hi hi hi hi hi hi hi hi') || {}).why === 'wall');
wait(3000);
ok('emoji wall blocked', (send('e', '😂'.repeat(20)) || {}).why === 'wall');
ok('a few emojis pass', send('f', 'haha 😂😂😂') === null);

// Mute
wait(3000);
const third = send('d', 'zzzzzzzzzzzzzzzzzzzzzz');
ok('3rd block in 2 minutes mutes for a minute', third && third.muted === 60000);
wait(2000);
ok('muted: even a normal message is blocked', (send('d', 'sorry') || {}).reason === 'rate');
wait(60000);
ok('mute ends after a minute', send('d', 'sorry') === null);
for (let i = 0; i < 3; i++) { wait(3000); send('d', 'xxxxxxxxxxxxxxxxxxxxxxx'); }
ok('second mute within the hour is longer', g._people.get('d').mutedUntil - clock === 120000);

// Friend messages skip the speed check
let fb = 0;
for (let i = 0; i < 10; i++) if (send('g', 'queued message ' + i, { rate: false })) fb++;
ok('friend backlog burst is not blocked for speed', fb === 0);
ok('friend repeats are still blocked', (send('g', 'queued message 1', { rate: false }), (send('g', 'queued message 1', { rate: false }) || {}).why === 'repeat'));

console.log(failed ? `\n${failed} check(s) failed` : '\nAll chat guard checks passed');
process.exit(failed ? 1 : 0);
