// Checks "top 3 films" end to end: a profile saves at most three picks, only
// with Apple posters and Apple store links and screened titles; anyone can
// then read a person's list - except someone they blocked. Searching happens
// in the browser (public/fav-films.js), so the server has nothing to call.
//
//   node scripts/test-fav-films.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

let failed = 0;
const ok = (n, c, x) => { if (!c) failed++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : (x === undefined ? '' : x)); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function once(sock, ev, ms = 4000) {
  return new Promise((res, rej) => {
    const timer = setTimeout(() => { sock.off(ev, on); rej(new Error('timeout waiting for ' + ev)); }, ms);
    function on(data) { clearTimeout(timer); sock.off(ev, on); res(data); }
    sock.on(ev, on);
  });
}

const ART = 'https://is1-ssl.mzstatic.com/image/thumb/Video/v4/aa/bb/cc/abc-def/pr_source.lsr/100x100bb.jpg';
const film = (id, extra = {}) => ({
  t: 'movie', id, title: 'Film ' + id, year: '2010', art: ART,
  url: `https://itunes.apple.com/us/movie/film-${id}/id${id}?uo=4`, ...extra,
});

(async () => {
  const PORT = 5800 + Math.floor(Math.random() * 200);
  const BASE = `http://127.0.0.1:${PORT}`;
  const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-films-'));
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logs = [];
  srv.stdout.on('data', (d) => logs.push(String(d)));
  srv.stderr.on('data', (d) => logs.push(String(d)));
  const socks = [];
  const done = (code) => {
    socks.forEach((s) => s.close());
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
    process.exit(code);
  };
  async function connect(clientId) {
    const sock = io(BASE, { transports: ['websocket'], forceNew: true });
    socks.push(sock);
    const id = once(sock, 'friend-id');
    sock.emit('register', { clientId, nickname: clientId, gender: 'male' });
    await id;
    return sock;
  }
  async function save(sock, films) {
    const r = once(sock, 'set-fav-films-result');
    sock.emit('set-fav-films', { films });
    return r;
  }

  try {
    for (let i = 0; i < 40; i++) {
      try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); }
    }
    const a = await connect('c_films_a');
    const b = await connect('c_films_b');

    const saved = await save(a, [
      film(1),
      { ...film(2), t: 'tv', title: 'Some Show', url: 'https://itunes.apple.com/us/tv-show/some-show/id2?uo=4' },
      film(1),
      film(3, { year: 'soon' }),
      film(4),
    ]);
    ok('save succeeds', saved.ok === true, JSON.stringify(saved));
    ok('at most three, duplicates dropped', saved.films.map((f) => f.id).join(',') === '1,2,3', JSON.stringify(saved.films));
    ok('stored fields are exactly the six expected', Object.keys(saved.films[0]).sort().join(',') === 'art,id,t,title,url,year');
    ok('a bad year is blanked, not trusted', saved.films[2].year === '');

    const bad = await save(a, [
      film(10, { art: 'https://evil.example/x/100x100bb.jpg' }),
      film(11, { url: 'https://evil.example/movie' }),
      film(12, { url: 'javascript:alert(1)' }),
      film(13, { title: 'visit www.spam.com now' }),
      film(14, { title: '   ' }),
      film(15, { t: 'book' }),
      film(-1),
    ]);
    ok('non-Apple posters/links, links in titles and bad ids are all dropped', bad.ok && bad.films.length === 0, JSON.stringify(bad.films));

    const clean = await save(a, [film(20, { title: '  The​   Dark   Knight  ' })]);
    ok('titles are cleaned of invisible characters and extra spaces', clean.films[0].title === 'The Dark Knight', JSON.stringify(clean.films[0].title));

    await save(a, [film(1), film(2)]);
    b.emit('get-fav-films', { clientId: 'c_films_a' });
    const seen = await once(b, 'fav-films');
    ok('another person sees the list', seen.clientId === 'c_films_a' && seen.films.length === 2 && !seen.self);
    a.emit('get-fav-films', {});
    const mine = await once(a, 'fav-films');
    ok('own list is flagged as own', mine.self === true && mine.clientId === 'c_films_a');

    a.emit('block-friend', { friendClientId: 'c_films_b' });
    await wait(300);
    b.emit('get-fav-films', { clientId: 'c_films_a' });
    const blocked = await once(b, 'fav-films');
    ok('a blocked person sees nothing', blocked.films.length === 0, JSON.stringify(blocked));

    ok('nothing crashed the server', !logs.join('').includes('Unhandled'), logs.join('').slice(-300));
    console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
    done(failed ? 1 : 0);
  } catch (err) {
    console.error(err, logs.join('').slice(-1500));
    done(1);
  }
})();
