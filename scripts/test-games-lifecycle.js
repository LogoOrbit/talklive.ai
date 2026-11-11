// End-to-end check of the mini-game lifecycle over the server's 'game' relay:
// invite, accept, decline, cancel, both inviting at once, an unanswered invite,
// a partner leaving mid-game, and a new partner not inheriting the old game.
//
//   node scripts/test-games-lifecycle.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const PORT = 5599 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-test-'));

let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : extra);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function once(sock, ev, ms = 4000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout waiting for ' + ev)); }, ms);
    function on(data) { clearTimeout(timer); sock.off(ev, on); res(data); }
    sock.on(ev, on);
  });
}

function connect(name) {
  const sock = io(BASE, { transports: ['websocket'], forceNew: true });
  sock.games = [];
  sock.on('game', (d) => sock.games.push(d));
  sock.emit('register', {
    clientId: 'c_test_' + name, username: name, gender: 'male', country: 'US', countryName: 'United States',
  });
  return sock;
}

async function pair(a, b) {
  const matched = Promise.all([once(a, 'matched'), once(b, 'matched')]);
  a.emit('find-partner', { mode: 'chat' });
  b.emit('find-partner', { mode: 'chat' });
  await matched;
}

// What the socket was sent since the last call, after letting messages land.
async function drain(sock) {
  await wait(150);
  return sock.games.splice(0).map((g) => g.type);
}

const board = () => ({ board: Array(9).fill(null), turn: 0, phase: 'move', winner: null, line: null });

(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', GAME_INVITE_TTL_MS: '900' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const done = (code) => {
    try { srv.kill('SIGKILL'); } catch (_) { /* already gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };

  try {
    for (let i = 0; i < 40; i++) {
      try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); }
    }
    const a = connect('Ann');
    const b = connect('Bob');
    const c = connect('Cat');
    await wait(400);
    await pair(a, b);

    // --- invite / accept / play ---
    a.emit('game', { type: 'invite', game: 'ttt' });
    ok('invite reaches the partner', (await drain(b)).join() === 'invite');
    b.emit('game', { type: 'accept', game: 'ttt' });
    ok('accept reaches the inviter', (await drain(a)).join() === 'accept');
    a.emit('game', { type: 'state', state: board() });
    ok('moves are relayed once playing', (await drain(b)).join() === 'state');
    a.emit('game', { type: 'invite', game: 'dab' });
    ok('a second invite mid-game is refused and the sender unstuck', (await drain(b)).length === 0 && (await drain(a)).join() === 'decline');
    b.emit('game', { type: 'left' });
    ok('leaving a game tells the other side', (await drain(a)).join() === 'left');
    a.emit('game', { type: 'state', state: board() });
    ok('a move after the game ended is not relayed', (await drain(b)).length === 0);
    ok('...and the sender is told the game is over', (await drain(a)).join() === 'left');
    b.emit('game', { type: 'left' });
    ok('a second leave is not echoed', (await drain(a)).length === 0);

    // --- decline ---
    a.emit('game', { type: 'invite', game: 'ttt' });
    await drain(b);
    b.emit('game', { type: 'decline' });
    ok('decline reaches the inviter', (await drain(a)).join() === 'decline');
    b.emit('game', { type: 'accept', game: 'ttt' });
    await wait(100);
    ok('accepting a declined invite starts nothing', (await drain(a)).length === 0);
    ok('...and tells the late accepter to reset', (await drain(b)).join() === 'left');

    // --- cancel ---
    a.emit('game', { type: 'invite', game: 'ttt' });
    await drain(b);
    a.emit('game', { type: 'decline' });
    ok('a cancelled invite reads as a cancel, not a decline', (await drain(b)).join() === 'left');
    b.emit('game', { type: 'accept', game: 'ttt' });
    await wait(100);
    ok('accepting a cancelled invite starts nothing', (await drain(a)).length === 0);
    b.emit('game', { type: 'decline' });
    ok('a stray decline with nothing pending is ignored', (await drain(a)).length === 0);

    // --- invitee closes the games window instead of answering ---
    a.emit('game', { type: 'invite', game: 'ttt' });
    await drain(b);
    b.emit('game', { type: 'left' });
    ok('invitee closing counts as a decline for the inviter', (await drain(a)).join() === 'decline');

    // --- both invite at once ---
    a.emit('game', { type: 'invite', game: 'ttt' });
    b.emit('game', { type: 'invite', game: 'dab' });
    ok('crossing invites reach both sides', (await drain(a)).join() === 'invite' && (await drain(b)).join() === 'invite');
    a.emit('game', { type: 'state', state: board() });
    ok('...and the game that follows is relayed', (await drain(b)).join() === 'state');
    a.emit('game', { type: 'left' });
    await drain(b);

    // --- unanswered invite times out for both ---
    a.emit('game', { type: 'invite', game: 'ttt' });
    await drain(b);
    await wait(1100);
    ok('inviter is told when nobody answers', (await drain(a)).join() === 'decline');
    ok('invitee prompt is withdrawn', (await drain(b)).join() === 'left');
    b.emit('game', { type: 'accept', game: 'ttt' });
    ok('accepting an expired invite starts nothing', (await drain(a)).length === 0);

    // --- partner leaves mid-game, next partner starts clean ---
    a.emit('game', { type: 'invite', game: 'ttt' });
    await drain(b);
    b.emit('game', { type: 'accept', game: 'ttt' });
    await drain(a);
    a.emit('game', { type: 'invite', game: 'ttt' }); // refused: already playing
    await drain(a); await drain(b);
    const gone = once(a, 'partner-left');
    b.emit('leave');
    ok('partner leaving mid-game ends the pairing for the other side', !!(await gone));
    ok('a game message with no partner is answered with game over', await (async () => {
      a.emit('game', { type: 'state', state: board() });
      return (await drain(a)).join() === 'left';
    })());
    await drain(b);
    await pair(a, c);
    c.emit('game', { type: 'accept', game: 'ttt' });
    ok('the old invite is not accepted by the next partner', (await drain(a)).length === 0);
    c.emit('game', { type: 'state', state: board() });
    ok('the old game is not carried to the next partner', (await drain(a)).length === 0);
    await drain(c);
    a.emit('game', { type: 'invite', game: 'dab' });
    ok('the next partner can be invited fresh', (await drain(c)).join() === 'invite');
    c.emit('game', { type: 'accept', game: 'dab' });
    ok('...and accept', (await drain(a)).join() === 'accept');

    // --- disconnect mid-game ---
    const dropped = once(a, 'partner-left');
    c.close();
    ok('a disconnect mid-game is told to the remaining side', (await dropped).reason === 'disconnected');
    const d = connect('Dan');
    await wait(300);
    await pair(a, d);
    d.emit('game', { type: 'state', state: board() });
    ok('a game does not survive into the next pairing', (await drain(a)).length === 0);

    a.close(); b.close(); d.close();
  } catch (err) {
    failed++;
    console.log('FAIL', err.message);
  }
  console.log(failed ? `\n${failed} failed` : '\nall passed');
  done(failed ? 1 : 0);
})();
