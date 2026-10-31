#!/usr/bin/env node
// Used by .github/workflows/pin-identity-secret.yml over `fly ssh`.
//   node scripts/identity-secret.js print   stored secret, no newline
//   node scripts/identity-secret.js check   "match" if the running server's
//                                            IDENTITY_SECRET equals the stored one
const fs = require('fs');
const path = require('path');

const file = path.join(process.env.DATA_DIR || '/data', 'owner-data.json');
const stored = String(((JSON.parse(fs.readFileSync(file, 'utf8')).secrets) || {}).identity || '');

if (process.argv[2] === 'print') {
  process.stdout.write(stored);
} else if (process.argv[2] === 'check') {
  // PID 1 is Fly's init, not the app: find the node process running the server.
  let live = '';
  for (const pid of fs.readdirSync('/proc').filter((d) => /^\d+$/.test(d))) {
    try {
      const argv = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0');
      if (Number(pid) === process.pid || !/(^|\/)node$/.test(argv[0]) || !argv.some((a) => /server\/index\.js$/.test(a))) continue;
      const line = fs.readFileSync(`/proc/${pid}/environ`, 'utf8').split('\0').find((l) => l.startsWith('IDENTITY_SECRET='));
      live = line ? line.slice('IDENTITY_SECRET='.length) : '';
      break;
    } catch (_) { /* gone or not readable */ }
  }
  process.stdout.write(live && live === stored ? 'match' : (live ? 'MISMATCH' : 'UNSET'));
} else {
  console.error('usage: identity-secret.js print|check');
  process.exit(2);
}
