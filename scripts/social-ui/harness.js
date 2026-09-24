// Browser + socket stress harness for the social layer.
//
// Seeds a store (friends, unread messages, a pending request, accepted news),
// starts the server on it, drives a real Chromium page as "Ann" and plain
// socket.io clients as everyone else. Needs Playwright (global install is
// fine) and a Chromium it can launch:
//
//   npm run test:social-ui      # voice page + /chat page, in a browser
//   npm run test:social-load    # 2,000 seeded users, 300 live sockets
const fs = require('fs'); const os = require('os'); const path = require('path');
const { spawn } = require('child_process');
const REPO = path.join(__dirname, '..', '..');
const { io } = require(REPO + '/node_modules/socket.io-client');
function loadPlaywright() {
  try { return require('playwright'); } catch (_) { /* not a local dependency */ }
  const globalRoot = require('child_process').execSync('npm root -g').toString().trim();
  return require(path.join(globalRoot, 'playwright'));
}
const { chromium } = loadPlaywright();

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// The store is seeded rather than built by registering, so nobody was ever
// issued a token. A fixed secret lets every seeded identity sign its own, as
// the browser it stands for would already hold.
const SECRET = 'social-ui-harness-secret';
const tokenFor = (clientId) => require('crypto').createHmac('sha256', SECRET).update(clientId).digest('hex');
const now = Date.now();
const ID = { ann: 'c_ann_browser_01', ben: 'c_ben_bot_0001', cat: 'c_cat_bot_0001', dan: 'c_dan_bot_0001', eve: 'c_eve_bot_0001' };
const pk = (a, b) => [a, b].sort().join('|');

function seed() {
  const f = (username, cc) => ({ username, countryCode: cc, temporary: true, avatar: null });
  return {
    social: {
      friends: {
        [ID.ann]: { [ID.ben]: f('Ben', 'GB'), [ID.cat]: f('Cat', 'US') },
        [ID.ben]: { [ID.ann]: f('Ann', 'DE') },
        [ID.cat]: { [ID.ann]: f('Ann', 'DE') },
      },
      friendChats: {
        [pk(ID.ann, ID.ben)]: [
          { from: ID.ann, text: 'hi ben', ts: now - 600000, id: 's1' },
          { from: ID.ben, text: 'hey ann', ts: now - 500000, id: 's2' },
          { from: ID.ben, text: 'you there?', ts: now - 400000, id: 's3' },
        ],
      },
      chatHistory: {
        [ID.ann]: [{ clientId: ID.dan, username: 'Dan', countryCode: 'FR', avatar: null, mode: 'chat', ts: now - 300000 }],
        [ID.dan]: [{ clientId: ID.ann, username: 'Ann', countryCode: 'DE', avatar: null, mode: 'chat', ts: now - 300000 }],
        [ID.eve]: [{ clientId: ID.ann, username: 'Ann', countryCode: 'DE', avatar: null, mode: 'chat', ts: now - 200000 }],
      },
      friendRequests: { [ID.ann]: { [ID.eve]: { username: 'Eve', countryCode: 'ES', temporary: true, avatar: null, ts: now - 100000, message: 'we talked about jazz' } } },
      sentRequests: { [ID.eve]: { [ID.ann]: { username: 'Ann', countryCode: 'DE', avatar: null, ts: now - 100000 } } },
      notifications: {
        [ID.ann]: [
          { id: 'n1', ts: now - 500000, type: 'message', fromClientId: ID.ben, username: 'Ben', text: 'hey ann', msgId: 's2' },
          { id: 'n2', ts: now - 400000, type: 'message', fromClientId: ID.ben, username: 'Ben', text: 'you there?', msgId: 's3' },
          { id: 'n3', ts: now - 100000, type: 'friend_request', fromClientId: ID.eve, username: 'Eve', countryCode: 'ES', temporary: true, message: 'we talked about jazz' },
          { id: 'n4', ts: now - 90000, type: 'friend_accepted', byClientId: ID.cat, username: 'Cat' },
        ],
      },
      blocks: {}, lastSeen: {}, blockMeta: {}, chatClears: {}, declinedRequests: {},
    },
  };
}

async function start({ port }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-social-ui-'));
  fs.writeFileSync(path.join(dir, 'owner-data.json'), JSON.stringify(seed()));
  const srv = spawn(process.execPath, [REPO + '/server/index.js'], {
    env: { ...process.env, PORT: String(port), DATA_DIR: dir, NODE_ENV: 'development', GIPHY_API_KEY: '', CALL_BACK_LIVE_MS: '500', IDENTITY_SECRET: SECRET },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  srv.logs = []; srv.stdout.on('data', (d) => srv.logs.push(String(d))); srv.stderr.on('data', (d) => srv.logs.push(String(d)));
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 80; i++) { try { await fetch(base + '/healthz'); break; } catch (_) { await wait(250); } }
  return { srv, base, dir };
}

function bot(base, name) {
  const s = io(base, { transports: ['websocket'], forceNew: true });
  s.lastSync = null; s.on('state-sync', (x) => { s.lastSync = x; });
  s.emit('register', { clientId: ID[name], identityToken: tokenFor(ID[name]), nickname: name[0].toUpperCase() + name.slice(1), gender: 'male' });
  return s;
}

async function browser(base, { path: p = '/', clientId = ID.ann, lang = 'en', init = null } = {}) {
  const args = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];
  const b = await (process.env.CHROMIUM_PATH
    ? chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args })
    : chromium.launch({ args }));
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['microphone'] });
  await ctx.addInitScript(([cid, lang, tok]) => {
    try {
      if (!localStorage.getItem('talklive_client_id')) {
        localStorage.setItem('talklive_client_id', cid);
        localStorage.setItem('talklive_identity_token', tok);
      }
      localStorage.setItem('talklive_lang', lang);
    } catch (_) {}
  }, [clientId, lang, tokenFor(clientId)]);
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push('console: ' + m.text()); });
  await page.goto(base + p, { waitUntil: 'domcontentloaded' });
  return { b, ctx, page };
}

let failed = 0;
const ok = (name, cond, extra) => { if (!cond) failed++; console.log(cond ? 'PASS' : 'FAIL', name, cond || extra === undefined ? '' : String(extra).slice(0, 400)); };
const once = (s, ev, ms = 4000) => new Promise((res, rej) => { const t = setTimeout(() => { s.off(ev, on); rej(new Error('timeout ' + ev)); }, ms); function on(d) { clearTimeout(t); s.off(ev, on); res(d); } s.on(ev, on); });
module.exports = { tokenFor, start, bot, browser, wait, ok, once, ID, failed: () => failed };
