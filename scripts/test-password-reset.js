/*
 * End-to-end test of "forgot password", driven through Socket.IO against a
 * running server - the same surface the browser uses, so it exercises the real
 * OTP issue/verify/reset path rather than the store in isolation.
 *
 * Run (no SMTP credentials, so the server prints the code instead of mailing
 * it - see the forgot-password handler in server/index.js):
 *   DATA_DIR=/tmp/tl-reset-test PORT=5098 node server/index.js > /tmp/tl.log 2>&1 &
 *   URL=http://localhost:5098 LOG=/tmp/tl.log node scripts/test-password-reset.js
 */
const fs = require('fs');
const { io } = require('socket.io-client');

const URL = process.env.URL || 'http://localhost:5098';
const LOG = process.env.LOG || '/tmp/tl.log';
let failed = 0;
const ok = (name, cond, extra) => {
  if (!cond) failed++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra === undefined ? '' : JSON.stringify(extra)));
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function connect() {
  return io(URL, { transports: ['websocket'] });
}

// Emit one event and resolve with the matching *-result reply.
function ask(socket, event, payload, resultEvent) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${resultEvent}`)), 10000);
    socket.once(resultEvent, (res) => { clearTimeout(timer); resolve(res); });
    socket.emit(event, payload);
  });
}

// The code the server printed for this address, newest first.
function codeFromLog(email) {
  const log = fs.readFileSync(LOG, 'utf8');
  const matches = [...log.matchAll(new RegExp(`reset code for ${email} is (\\d{6})`, 'g'))];
  return matches.length ? matches[matches.length - 1][1] : null;
}

(async () => {
  const stamp = Date.now().toString().slice(-8);
  const username = `reset${stamp}`;
  const email = `reset${stamp}@example.com`;
  const socket = connect();
  await new Promise((r) => socket.on('connect', r));

  // --- Sign up with a recovery email ---------------------------------------
  const signup = await ask(socket, 'signup', { username, password: 'first-pass', email }, 'signup-result');
  ok('signup with recovery email succeeds', signup.ok === true, signup);
  ok('signup echoes the recovery email', signup.email === email, signup);

  const dupe = await ask(connect(), 'signup',
    { username: `${username}b`, password: 'first-pass', email }, 'signup-result');
  ok('a second account cannot claim the same email', dupe.ok === false, dupe);

  const badEmail = await ask(connect(), 'signup',
    { username: `${username}c`, password: 'first-pass', email: 'not-an-email' }, 'signup-result');
  ok('a malformed email is rejected at signup', badEmail.ok === false, badEmail);

  // --- Request a code -------------------------------------------------------
  const unknown = connect();
  await new Promise((r) => unknown.on('connect', r));
  const forgot = await ask(unknown, 'forgot-password', { email }, 'forgot-password-result');
  ok('forgot-password accepts a known address', forgot.ok === true, forgot);

  const stranger = await ask(unknown, 'forgot-password',
    { email: `nobody${stamp}@example.com` }, 'forgot-password-result');
  ok('an unknown address gets the same answer (no account enumeration)',
    stranger.ok === true && stranger.message === forgot.message, stranger);

  await wait(200);
  const code = codeFromLog(email);
  ok('a 6-digit code was issued', !!code && /^\d{6}$/.test(code), code);

  // --- Verify the code ------------------------------------------------------
  const wrong = await ask(unknown, 'verify-reset-code',
    { email, code: code === '000000' ? '111111' : '000000' }, 'verify-reset-code-result');
  ok('a wrong code is rejected', wrong.ok === false, wrong);

  const verified = await ask(unknown, 'verify-reset-code', { email, code }, 'verify-reset-code-result');
  ok('the right code is accepted', verified.ok === true, verified);
  ok('verification returns a reset token', /^[a-f0-9]{64}$/.test(verified.resetToken || ''), verified);

  const replay = await ask(unknown, 'verify-reset-code', { email, code }, 'verify-reset-code-result');
  ok('the same code cannot be verified twice', replay.ok === false, replay);

  // --- Set the new password -------------------------------------------------
  const tooShort = await ask(unknown, 'reset-password',
    { resetToken: verified.resetToken, newPassword: 'ab' }, 'reset-password-result');
  ok('a too-short new password is rejected', tooShort.ok === false, tooShort);

  const reset = await ask(unknown, 'reset-password',
    { resetToken: verified.resetToken, newPassword: 'second-pass' }, 'reset-password-result');
  ok('the password is restored', reset.ok === true, reset);
  ok('the reset signs this device in', /^[a-f0-9]{64}$/.test(reset.sessionToken || ''), reset);

  const reuse = await ask(unknown, 'reset-password',
    { resetToken: verified.resetToken, newPassword: 'third-pass' }, 'reset-password-result');
  ok('a spent reset token cannot be reused', reuse.ok === false, reuse);

  // --- The new password is the only one that works now ----------------------
  const oldLogin = await ask(connect(), 'login', { username, password: 'first-pass' }, 'login-result');
  ok('the old password no longer works', oldLogin.ok === false, oldLogin);

  const newLogin = await ask(connect(), 'login', { username, password: 'second-pass' }, 'login-result');
  ok('the new password works', newLogin.ok === true, newLogin);
  ok('login reports the recovery email', newLogin.email === email, newLogin);

  // --- The old session token was invalidated by the reset -------------------
  const stale = await ask(connect(), 'resume-session', { token: signup.sessionToken }, 'resume-session-result');
  ok('sessions from before the reset are signed out', stale.ok === false, stale);

  // --- Changing the recovery email needs the current password ---------------
  const authed = connect();
  await new Promise((r) => authed.on('connect', r));
  const relogin = await ask(authed, 'login', { username, password: 'second-pass' }, 'login-result');
  ok('re-login for the recovery-email checks', relogin.ok === true, relogin);

  const noPass = await ask(authed, 'update-recovery-email',
    { email: `moved${stamp}@example.com`, currentPassword: 'wrong' }, 'update-recovery-email-result');
  ok('changing the recovery email without the password fails', noPass.ok === false, noPass);

  const moved = await ask(authed, 'update-recovery-email',
    { email: `moved${stamp}@example.com`, currentPassword: 'second-pass' }, 'update-recovery-email-result');
  ok('changing the recovery email with the password works', moved.ok === true, moved);

  const oldAddress = await ask(connect(), 'forgot-password', { email }, 'forgot-password-result');
  await wait(200);
  ok('the released address no longer issues codes',
    oldAddress.ok === true && codeFromLog(email) === code, codeFromLog(email));

  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error('FAIL harness error:', err.message);
  process.exit(1);
});
