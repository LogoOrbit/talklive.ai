#!/usr/bin/env node
// Runs the test suites one after another and exits non-zero if any fails.
//
//   npm test                 every suite
//   npm run test:critical    auth, payments, friends, messaging, calls
//
// Each suite starts its own server on a random port with a throwaway
// DATA_DIR. test-password-reset expects a server already running, so this
// starts one for it.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const DIR = __dirname;
const CRITICAL = [
  'test-billing', 'test-auth-sessions', 'test-client-ip', 'test-password-reset',
  'test-referral', 'test-premium-perks', 'test-subscribe',
  'test-social', 'test-social-safety', 'test-social-delivery', 'test-social-extras',
  'test-social-privacy', 'test-social-edit', 'test-friend-id', 'test-discovery',
  'test-chat-extras', 'test-chat-away', 'test-chat-guard', 'test-chat-spam',
  'test-matchmaking', 'test-malformed-packets', 'test-voice-notes',
];
const ALL = fs.readdirSync(DIR).filter((f) => /^test-.*\.js$/.test(f)).map((f) => f.slice(0, -3)).sort();
const suites = process.argv.includes('--critical') ? CRITICAL : ALL;

async function withServer(fn) {
  const port = 5900 + Math.floor(Math.random() * 500);
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-run-'));
  const log = path.join(dataDir, 'server.log');
  const out = fs.openSync(log, 'w');
  const srv = spawn(process.execPath, [path.join(DIR, '..', 'server', 'index.js')], {
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, DATABASE_URL: '', NODE_ENV: 'development' },
    stdio: ['ignore', out, out],
  });
  try {
    for (let i = 0; i < 60; i++) {
      try { await fetch(`http://localhost:${port}/healthz`); break; } catch (_) { await new Promise((r) => setTimeout(r, 250)); }
    }
    return fn({ URL: `http://localhost:${port}`, LOG: log });
  } finally {
    srv.kill('SIGKILL');
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}

function run(name, env = {}) {
  const t = Date.now();
  const r = spawnSync(process.execPath, [path.join(DIR, `${name}.js`)], {
    env: { ...process.env, ...env }, encoding: 'utf8', timeout: 180000,
  });
  const output = `${r.stdout || ''}${r.stderr || ''}`;
  const passed = r.status === 0;
  const fails = output.split('\n').filter((l) => /^(FAIL|not ok)/.test(l));
  console.log(`${passed ? 'ok  ' : 'FAIL'} ${name} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
  if (!passed) console.log((fails.length ? fails : output.split('\n').slice(-15)).map((l) => '     ' + l).join('\n'));
  return passed;
}

(async () => {
  const failedSuites = [];
  for (const name of suites) {
    const ok = name === 'test-password-reset'
      ? await withServer((env) => run(name, env))
      : run(name);
    if (!ok) failedSuites.push(name);
  }
  console.log(`\n${suites.length - failedSuites.length}/${suites.length} suites passed`);
  if (failedSuites.length) console.log('failed: ' + failedSuites.join(', '));
  process.exit(failedSuites.length ? 1 : 0);
})();
