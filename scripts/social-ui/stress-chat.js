const H = require('./harness');
const { ok, wait, ID } = H;
(async () => {
  const { srv, base } = await H.start({ port: 6815 });
  const ben = H.bot(base, 'ben'), cat = H.bot(base, 'cat'), dan = H.bot(base, 'dan'), eve = H.bot(base, 'eve');
  const { b, page } = await H.browser(base, { path: '/chat' });
  await wait(3000);
  const q = (fn, arg) => page.evaluate(fn, arg);
  const snap = () => q(() => {
    const txt = (e) => e.innerText.replace(/\s+/g, ' ').trim();
    const badge = document.getElementById('friendsBadge');
    return {
      badge: badge.classList.contains('hidden') ? 0 : Number(badge.textContent),
      title: document.title,
      friends: [...document.querySelectorAll('#friendsList .friend-row')].map(txt),
      requests: [...document.querySelectorAll('#requestsList .request-row')].map(txt),
      history: [...document.querySelectorAll('#historyList .friend-row')].map(txt),
      chatOpen: document.getElementById('friendChatPanel').classList.contains('open'),
      msgs: [...document.querySelectorAll('#friendChatMsgs .msg')].map(txt),
      toast: (document.querySelector('.social-toast.show') || {}).textContent || '',
    };
  });
  const click = async (sel) => { try { await page.click(sel, { timeout: 3000 }); } catch (e) { console.log('   click failed', sel, e.message.split('\n')[0]); await q((s) => document.querySelector(s) && document.querySelector(s).click(), sel); } };

  let s = await snap();
  ok('/chat badge = request + 2 unread', s.badge === 3, JSON.stringify(s));
  ok('/chat title carries the count', /^\(3\) /.test(s.title), s.title);

  await click('#friendsBtn'); await wait(400);
  await click('.tl-tab[data-tab="friends"]'); await wait(200);
  s = await snap();
  ok('friends listed with unread', s.friends.some((f) => f.includes('Ben') && /2/.test(f)), s.friends);
  await click('#friendsList .friend-row .friend-main'); await wait(700);
  s = await snap();
  ok('chat opens with history', s.chatOpen && s.msgs.length >= 3, s.msgs);
  ok('badge drops on open', s.badge === 1, s.badge);

  // Close the chat by opening another panel (not its own button).
  await click('#historyBtn'); await wait(400);
  s = await snap();
  ok('chat closed by another panel', !s.chatOpen);
  ben.emit('friend-message', { toClientId: ID.ann, text: 'are you still there', id: 'x1' }); await wait(600);
  s = await snap();
  ok('message after closing via another panel counts as unread', s.badge === 2, s.badge);

  // Live social toasts.
  cat.emit('remove-friend', { friendClientId: ID.ann }); await wait(500);
  s = await snap();
  ok('removed-by-friend list updates live', !s.friends.some((f) => f.includes('Cat')), s.friends);
  const res = H.once(cat, 'friend-request-result');
  cat.emit('friend-request', { targetClientId: ID.ann });
  ok('ex-friend can re-ask', (await res).ok);
  await wait(400);
  s = await snap();
  ok('request toast on /chat', /Cat wants to be friends/.test(s.toast), s.toast);
  ok('badge counts new request', s.badge === 3, s.badge);

  // Accept Eve's request.
  await click('#friendsBtn'); await wait(300);
  await click('.tl-tab[data-tab="requests"]'); await wait(200);
  const eveN = H.once(eve, 'notification').catch(() => null);
  await q((id) => { const rows = [...document.querySelectorAll('#requestsList .request-row')]; const r = rows.find((x) => x.innerText.includes('Eve')); r.querySelector('.mini-btn.accept').click(); }, ID.eve);
  ok('Eve informed', ((await eveN) || {}).type === 'friend_accepted');
  await wait(400);
  s = await snap();
  ok('Eve in friends', s.friends.some((f) => f.includes('Eve')), s.friends);
  ok('badge drops on accept', s.badge === 2, s.badge);
  // Dan (a recent match) asks; Ann accepts from the list.
  dan.emit('friend-request', { targetClientId: ID.ann }); await wait(300);
  const danTold = H.once(dan, 'notification').catch(() => null);
  await q(() => { const row = [...document.querySelectorAll('#requestsList .request-row')].find((x) => x.innerText.includes('Dan')); row && row.querySelector('.mini-btn.accept').click(); });
  ok('Dan told of acceptance', ((await danTold) || {}).type === 'friend_accepted');
  await wait(300);

  // Block Dan from the chat header.
  await q(() => { const row = [...document.querySelectorAll('#friendsList .friend-row')].find((x) => x.innerText.includes('Dan')); row.querySelector('.friend-main').click(); });
  await wait(500);
  await click('#friendChatBlockBtn'); await wait(150);
  s = await snap();
  ok('first tap only arms block', s.chatOpen);
  await click('#friendChatBlockBtn'); await wait(600);
  s = await snap();
  ok('second tap blocks and closes', !s.chatOpen && /Blocked/.test(s.toast), s.toast);
  ok('Dan gone from friends', !s.friends.some((f) => f.includes('Dan')), s.friends);
  const blocked = H.once(dan, 'chat-blocked').catch(() => null);
  dan.emit('friend-message', { toClientId: ID.ann, text: 'hello?' });
  ok('Dan cannot message', ((await blocked) || {}).reason === 'unreachable');

  // Duplicate delivery of the same id is painted once.
  await q(() => { const row = [...document.querySelectorAll('#friendsList .friend-row')].find((x) => x.innerText.includes('Ben')); row.querySelector('.friend-main').click(); });
  await wait(600);
  ben.emit('friend-message', { toClientId: ID.ann, text: 'once only', id: 'o1' }); await wait(400);
  s = await snap();
  ok('message shown once', s.msgs.filter((m) => m.includes('once only')).length === 1, s.msgs);

  const errs = page.errors.filter((e) => !/ERR_(CERT|TUNNEL|NAME|CONNECTION)|Failed to load resource/.test(e));
  ok('no page errors', !errs.length, errs.join('\n'));
  console.log(H.failed() ? `\n${H.failed()} failed` : '\nall passed');
  await b.close(); srv.kill('SIGKILL'); process.exit(H.failed() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
