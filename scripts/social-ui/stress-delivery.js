// Direct-message delivery in a real browser (voice page and /chat page):
// per-conversation drafts, a message sent while the socket is down, a message
// the server refuses, and read receipts from a chat left open in a background tab.
const H = require('./harness');
const { ok, wait, ID } = H;

function setVisibility(page, state) {
  return page.evaluate((s) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => s });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => s === 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}

async function run(base, surface) {
  const onChat = surface === '/chat';
  const MSGS = onChat ? '#friendChatMsgs .msg' : '#friendChatMessages .chat-msg';
  const ben = H.bot(base, 'ben');
  const cat = H.bot(base, 'cat');
  // Both pages create their socket with io(); keep a handle on it so the test
  // can drop and restore the connection the way a phone in a tunnel would.
  const init = () => {
    let real;
    Object.defineProperty(window, 'io', {
      configurable: true,
      get() { return real; },
      set(v) {
        real = function (...args) { const s = v(...args); window.__tlSocket = s; return s; };
        Object.assign(real, v);
      },
    });
  };
  const { b, page } = await H.browser(base, { path: surface, init });
  await wait(2500);
  const q = (fn, arg) => page.evaluate(fn, arg);
  const NAMES = { [ID.ben]: 'Ben', [ID.cat]: 'Cat' };
  const open = (id) => q(([cid, name, chat]) => {
    if (chat) {
      // /chat keeps its functions inside a closure: go through the list.
      const row = [...document.querySelectorAll('#friendsList .friend-row')]
        .find((r) => r.querySelector('.friend-name').textContent.trim().startsWith(name));
      if (row) row.querySelector('.friend-main').click();
    } else {
      openFriendChat(cid);
    }
  }, [id, NAMES[id], onChat]);
  const input = onChat ? '#friendChatInput' : '#friendChatInput';
  const bubbles = () => q((sel) => [...document.querySelectorAll(sel)].map((e) => ({
    text: e.innerText.replace(/\s+/g, ' ').trim(),
    pending: e.classList.contains('is-pending'),
    failed: e.classList.contains('is-failed'),
  })), MSGS);
  const tag = (name) => `${surface} ${name}`;

  // --- Drafts belong to their conversation ------------------------------
  await open(ID.ben); await wait(600);
  await page.fill(input, 'half a thought for ben');
  await page.dispatchEvent(input, 'input');
  await open(ID.cat); await wait(600);
  ok(tag('another chat opens with an empty composer'), (await page.inputValue(input)) === '', await page.inputValue(input));
  await open(ID.ben); await wait(600);
  ok(tag('the draft comes back with its chat'), (await page.inputValue(input)) === 'half a thought for ben', await page.inputValue(input));
  await page.fill(input, '');
  await page.dispatchEvent(input, 'input');

  // --- Sent while offline: pending, then delivered ------------------------
  await q(() => { window.__tlSocket.disconnect(); });
  await wait(300);
  const got = H.once(ben, 'friend-message', 8000);
  await page.fill(input, 'sent from a tunnel');
  await page.press(input, 'Enter');
  await wait(200);
  let list = await bubbles();
  const mine = list.find((m) => m.text.includes('sent from a tunnel'));
  ok(tag('shown at once while offline'), !!mine, JSON.stringify(list));
  ok(tag('marked as on its way'), mine && mine.pending, JSON.stringify(mine));
  await q(() => { window.__tlSocket.connect(); });
  const delivered = await got.then((m) => m, () => null);
  ok(tag('delivered after reconnecting'), delivered && delivered.text === 'sent from a tunnel', JSON.stringify(delivered));
  await wait(600);
  list = await bubbles();
  const settled = list.find((m) => m.text.includes('sent from a tunnel'));
  ok(tag('settles once acknowledged'), settled && !settled.pending && !settled.failed, JSON.stringify(settled));
  ok(tag('shown once'), list.filter((m) => m.text.includes('sent from a tunnel')).length === 1, JSON.stringify(list));

  // --- Background tab: no "Seen", and it counts as unread ----------------
  await setVisibility(page, 'hidden');
  let seen = false;
  const onSeen = () => { seen = true; };
  ben.on('chat-seen', onSeen);
  ben.emit('friend-message', { toClientId: ID.ann, text: 'are you there', id: 'bg' + surface.length });
  await wait(700);
  ok(tag('no receipt from a background tab'), !seen);
  await setVisibility(page, 'visible');
  await wait(700);
  ok(tag('receipt once the tab is looked at'), seen);
  ben.off('chat-seen', onSeen);

  // --- Refused by the server: bubble taken back, text returned ------------
  ben.emit('block-friend', { friendClientId: ID.ann });
  await wait(700);
  if (!onChat) await open(ID.ben); // the block closed nothing on Ann's side
  await wait(300);
  await page.fill(input, 'anyone?');
  await page.press(input, 'Enter');
  await wait(900);
  list = await bubbles();
  ok(tag('refused message is taken back'), !list.some((m) => m.text.includes('anyone?') && !/could not|no longer/i.test(m.text)), JSON.stringify(list));
  ok(tag('its text goes back to the composer'), (await page.inputValue(input)) === 'anyone?', await page.inputValue(input));
  ben.emit('unblock-user', { targetClientId: ID.ann });

  // The sandbox has no route to third-party hosts (fonts, ads): not ours.
  const errs = page.errors.filter((e) => !/ERR_(CERT|TUNNEL|NAME|CONNECTION)|Failed to load resource/.test(e));
  ok(tag('no page errors'), !errs.length, errs.join(' | '));
  ben.disconnect(); cat.disconnect();
  await b.close();
}

(async () => {
  const { srv, base } = await H.start({ port: 6912 });
  try {
    await run(base, '/');
    // The block above ended Ann and Ben's friendship; /chat gets a fresh server.
  } catch (e) { console.error(e); ok('voice page run', false, e.message); }
  srv.kill('SIGKILL');
  const second = await H.start({ port: 6913 });
  try {
    await run(second.base, '/chat');
  } catch (e) { console.error(e); ok('chat page run', false, e.message); }
  second.srv.kill('SIGKILL');
  console.log(H.failed() ? `\n${H.failed()} failed` : '\nall passed');
  process.exit(H.failed() ? 1 : 0);
})();
