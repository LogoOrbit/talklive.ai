// A long direct-message history and a flaky connection, in a real browser
// (voice page and /chat page):
//  - a chat opens on its newest page, not the whole thread;
//  - scrolling up loads older messages without losing the reader's place;
//  - a message sent to a friend who is online shows "delivered";
//  - a message sent and an unsend made while the page was offline show up
//    after it reconnects, with the chat left open;
//  - screenshots at phone size, light and dark, for a human to look at.
//
//   node scripts/social-ui/history-sync.js [shots-dir]
const path = require('path');
const fs = require('fs');
const H = require('./harness');
const { ok, wait, ID } = H;

const SHOTS = process.argv[2] || null;
const TOTAL = 120;

function longChat(data) {
  const key = [ID.ann, ID.ben].sort().join('|');
  const base = Date.now() - TOTAL * 60000 - 500000;
  const list = [];
  for (let i = 1; i <= TOTAL; i++) {
    list.push({ from: i % 2 ? ID.ann : ID.ben, text: 'history line ' + i, ts: base + i * 60000, id: 'h' + i });
  }
  data.social.friendChats[key] = list;
  // No unread markers: the seed's own point to s2/s3, which this chat no longer has.
  data.social.notifications[ID.ann] = data.social.notifications[ID.ann].filter((n) => n.type !== 'message');
}

async function run(base, surface) {
  const onChat = surface === '/chat';
  const MSGS = onChat ? '#friendChatMsgs .msg' : '#friendChatMessages .chat-msg';
  const BOX = onChat ? '#friendChatMsgs' : '#friendChatMessages';
  const tag = (n) => `${surface} ${n}`;
  const ben = H.bot(base, 'ben');
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
  const texts = () => q((sel) => [...document.querySelectorAll(sel)].map((e) => (e.querySelector('.chat-msg-text, .msg-text') || e).innerText.trim()), MSGS);
  const open = () => q(([chat]) => {
    if (chat) {
      const row = [...document.querySelectorAll('#friendsList .friend-row')]
        .find((r) => r.querySelector('.friend-name').textContent.trim().startsWith('Ben'));
      if (row) row.querySelector('.friend-main').click();
    } else {
      openFriendChat('c_ben_bot_0001');
    }
  }, [onChat]);

  await open(); await wait(1200);
  let list = await texts();
  ok(tag('opens on the newest page only'), list.length === 40 && list[39] === 'history line ' + TOTAL && list[0] === 'history line ' + (TOTAL - 39), list.length + ' ' + list[0]);

  // Scroll to the top: the next page arrives above, the reader keeps their place.
  const anchorBefore = list[0];
  await q((box) => { document.querySelector(box).scrollTop = 0; }, BOX);
  await wait(1200);
  list = await texts();
  ok(tag('scrolling up loads the next page'), list.length === 80 && list[0] === 'history line ' + (TOTAL - 79), list.length + ' ' + list[0]);
  const place = await q(([box, sel, txt]) => {
    const el = document.querySelector(box);
    const row = [...document.querySelectorAll(sel)].find((e) => (e.querySelector('.chat-msg-text, .msg-text') || e).innerText.trim() === txt);
    const r = row.getBoundingClientRect(); const c = el.getBoundingClientRect();
    return { top: r.top - c.top, scrollTop: el.scrollTop };
  }, [BOX, MSGS, anchorBefore]);
  ok(tag('the reader keeps their place'), place.scrollTop > 0 && place.top >= -5 && place.top < 400, JSON.stringify(place));
  await q((box) => { document.querySelector(box).scrollTop = 0; }, BOX);
  await wait(1200);
  list = await texts();
  ok(tag('and the last page ends the history'), list.length === TOTAL && list[0] === 'history line 1', list.length);
  await q((box) => { document.querySelector(box).scrollTop = 0; }, BOX);
  await wait(800);
  ok(tag('nothing more is requested at the top'), (await texts()).length === TOTAL);
  await q((box) => { const el = document.querySelector(box); el.scrollTop = el.scrollHeight; }, BOX);

  // --- Delivered ---------------------------------------------------------
  await page.fill('#friendChatInput', 'are you around');
  await page.press('#friendChatInput', 'Enter');
  await wait(1200);
  const state = await q(([chat, sel]) => {
    const rows = [...document.querySelectorAll(sel)];
    const mine = rows.filter((e) => e.classList.contains('me')).pop();
    if (!mine) return null;
    if (chat) { const l = document.querySelector('#friendChatMsgs .chat-seen-label'); return l ? l.textContent : ''; }
    const tk = mine.querySelector('.chat-msg-ticks');
    return tk ? tk.className : '';
  }, [onChat, MSGS]);
  ok(tag('a message to an online friend shows delivered'), onChat ? state === 'Delivered' : /\bdelivered\b/.test(state || ''), state);
  if (SHOTS) {
    await page.setViewportSize({ width: 390, height: 844 });
    await wait(500);
    await page.screenshot({ path: path.join(SHOTS, `delivered${onChat ? '-chat' : ''}-light.png`) });
    await q(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await wait(400);
    await page.screenshot({ path: path.join(SHOTS, `delivered${onChat ? '-chat' : ''}-dark.png`) });
    await q(() => document.documentElement.setAttribute('data-theme', 'light'));
  }

  // --- Offline catch-up --------------------------------------------------
  await q(() => window.__tlSocket.disconnect());
  await wait(600);
  ben.emit('friend-message', { toClientId: ID.ann, text: 'sent while you were away', id: 'away1' });
  ben.emit('friend-message-delete', { toClientId: ID.ann, id: 'h' + TOTAL });
  await wait(900);
  await q(() => window.__tlSocket.connect());
  await wait(2500);
  list = await texts();
  ok(tag('a message sent while offline appears without reopening'), list.includes('sent while you were away'), list.slice(-4).join(' | '));
  ok(tag('an unsend made while offline is applied'), !list.includes('history line ' + TOTAL), list.slice(-4).join(' | '));

  const errs = page.errors.filter((e) => !/ERR_(CERT|TUNNEL|NAME|CONNECTION)|Failed to load resource/.test(e));
  ok(tag('no page errors'), !errs.length, errs.join(' | '));
  ben.disconnect();
  await b.close();
}

(async () => {
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const first = await H.start({ port: 6922, mutate: longChat });
  try { await run(first.base, '/'); } catch (e) { console.error(e); ok('voice page run', false, e.message); }
  first.srv.kill('SIGKILL');
  const second = await H.start({ port: 6923, mutate: longChat });
  try { await run(second.base, '/chat'); } catch (e) { console.error(e); ok('chat page run', false, e.message); }
  second.srv.kill('SIGKILL');
  console.log(H.failed() ? `\n${H.failed()} failed` : '\nall passed');
  process.exit(H.failed() ? 1 : 0);
})();
