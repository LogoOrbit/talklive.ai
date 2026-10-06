// Checks "top 3 films" end to end against a mock TMDB: search is trimmed,
// filtered and cached; a profile saves at most three picks whose titles and
// posters come from TMDB rather than the client; and anyone can then read a
// person's list - except someone they blocked.
//
//   node scripts/test-fav-films.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
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

const movie = (id, title) => ({ media_type: 'movie', id, title, release_date: '2010-07-16', poster_path: `/p${id}.jpg`, adult: false, overview: 'long text the proxy should drop' });

(async () => {
  let upstreamHits = 0;
  const mock = http.createServer((req, res) => {
    upstreamHits++;
    const url = new URL(req.url, 'http://x');
    res.setHeader('Content-Type', 'application/json');
    if (url.pathname.endsWith('/search/multi')) {
      return res.end(JSON.stringify({ results: [
        movie(1, 'Inception'),
        { media_type: 'tv', id: 2, name: 'Dark', first_air_date: '2017-12-01', poster_path: '/p2.jpg' },
        { media_type: 'person', id: 3, name: 'Someone', profile_path: '/x.jpg' },
        { ...movie(4, 'No Poster'), poster_path: null },
        { ...movie(5, 'Adult'), adult: true },
      ] }));
    }
    const m = url.pathname.match(/\/(movie|tv)\/(\d+)$/);
    if (m && m[2] !== '404') return res.end(JSON.stringify(m[1] === 'movie' ? movie(Number(m[2]), 'Film ' + m[2]) : { id: Number(m[2]), name: 'Show ' + m[2], poster_path: `/s${m[2]}.jpg` }));
    res.statusCode = 404;
    res.end('{}');
  });
  await new Promise((r) => mock.listen(0, '127.0.0.1', r));

  const PORT = 5800 + Math.floor(Math.random() * 200);
  const BASE = `http://127.0.0.1:${PORT}`;
  const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-films-'));
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_DIR, NODE_ENV: 'development', TMDB_API_KEY: 'test-key', TMDB_API_BASE: `http://127.0.0.1:${mock.address().port}/3/` },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logs = [];
  srv.stdout.on('data', (d) => logs.push(String(d)));
  srv.stderr.on('data', (d) => logs.push(String(d)));
  const socks = [];
  const done = (code) => {
    socks.forEach((s) => s.close());
    try { srv.kill('SIGKILL'); } catch (_) { /* gone */ }
    mock.close();
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

  try {
    for (let i = 0; i < 40; i++) {
      try { await fetch(BASE + '/healthz'); break; } catch (_) { await wait(250); }
    }
    ok('feature reports enabled with a key', (await (await fetch(BASE + '/api/films/config')).json()).enabled === true);

    const s1 = await (await fetch(BASE + '/api/films/search?q=incep')).json();
    ok('only titled movies and shows with posters come back', s1.results.map((r) => r.id).join(',') === '1,2', JSON.stringify(s1));
    ok('results are trimmed to five fields', Object.keys(s1.results[0]).sort().join(',') === 'id,p,t,title,year');
    ok('shows use their name and first air year', s1.results[1].title === 'Dark' && s1.results[1].year === '2017' && s1.results[1].t === 'tv');
    const hits = upstreamHits;
    await fetch(BASE + '/api/films/search?q=INCEP');
    ok('an identical query is served from cache', upstreamHits === hits);
    ok('a one-letter query never goes upstream', (await (await fetch(BASE + '/api/films/search?q=a')).json()).results.length === 0 && upstreamHits === hits);

    const a = await connect('c_films_a');
    const b = await connect('c_films_b');
    a.emit('set-fav-films', { films: [
      { t: 'movie', id: 1, title: 'FAKE TITLE', p: '/evil.jpg' },
      { t: 'tv', id: 2 },
      { t: 'movie', id: 1 },
      { t: 'movie', id: 77 },
      { t: 'movie', id: 88 },
    ] });
    const saved = await once(a, 'set-fav-films-result');
    ok('save succeeds', saved.ok === true, JSON.stringify(saved));
    ok('at most three, duplicates dropped', saved.films.map((f) => f.id).join(',') === '1,2,77', JSON.stringify(saved.films));
    ok('titles and posters come from TMDB, not the client', saved.films[0].title === 'Inception' && saved.films[0].p === '/p1.jpg');
    ok('an uncached pick is looked up on TMDB', saved.films[2].title === 'Film 77');

    b.emit('get-fav-films', { clientId: 'c_films_a' });
    const seen = await once(b, 'fav-films');
    ok('another person sees the list', seen.clientId === 'c_films_a' && seen.films.length === 3 && !seen.self);
    a.emit('get-fav-films', {});
    const mine = await once(a, 'fav-films');
    ok('own list is flagged as own', mine.self === true && mine.clientId === 'c_films_a');

    a.emit('set-fav-films', { films: [{ t: 'movie', id: 404 }, { t: 'bogus', id: 1 }] });
    const bad = await once(a, 'set-fav-films-result');
    ok('unknown and malformed picks are dropped', bad.ok && bad.films.length === 0);
    a.emit('set-fav-films', { films: [{ t: 'tv', id: 2 }] });
    await once(a, 'set-fav-films-result');

    a.emit('block-friend', { friendClientId: 'c_films_b' });
    await wait(300);
    b.emit('get-fav-films', { clientId: 'c_films_a' });
    const blocked = await once(b, 'fav-films');
    ok('a blocked person sees nothing', blocked.films.length === 0, JSON.stringify(blocked));

    ok('the API key never reaches the client', !JSON.stringify(s1).includes('test-key'));
    ok('nothing crashed the server', !logs.join('').includes('Unhandled'), logs.join('').slice(-300));
    console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
    done(failed ? 1 : 0);
  } catch (err) {
    console.error(err, logs.join('').slice(-1500));
    done(1);
  }
})();
