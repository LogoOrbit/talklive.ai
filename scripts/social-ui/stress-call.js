const H = require('./harness');
const { ok, wait, ID } = H;
(async () => {
  const { srv, base } = await H.start({ port: 6812 });
  const ben = H.bot(base, 'ben'), cat = H.bot(base, 'cat'), dan = H.bot(base, 'dan'), eve = H.bot(base, 'eve');
  const { b, page } = await H.browser(base);
  await wait(2500);
  const q = (fn, arg) => page.evaluate(fn, arg);
  const snap = () => q(() => {
    const txt = (e) => e.innerText.replace(/\s+/g, ' ').trim();
    const badge = document.getElementById('friendsMsgBadge');
    return {
      badge: badge.classList.contains('hidden') ? 0 : Number(badge.textContent),
      friends: [...document.querySelectorAll('#friendsList .friend-item')].map(txt),
      notifs: [...document.querySelectorAll('#notifList .notif-item')].map(txt),
      history: [...document.querySelectorAll('#historyList > *')].map(txt),
      reqTab: document.getElementById('requestsTabCount').classList.contains('hidden') ? 0 : Number(document.getElementById('requestsTabCount').textContent),
      friendsTab: document.getElementById('friendsTabCount').classList.contains('hidden') ? 0 : Number(document.getElementById('friendsTabCount').textContent),
      blocked: [...document.querySelectorAll('#blockedList .blocked-row')].map(txt),
      sent: [...document.querySelectorAll('#sentRequestsList .tl-sent-item')].map(txt),
      title: document.title,
      unreadDot: (() => { const d = document.getElementById('friendsTabUnread'); return d && !d.classList.contains('hidden') ? Number(d.textContent) : 0; })(),
      activeTab: (document.querySelector('#friendsTabs .tl-tab.selected') || {}).dataset?.tab,
      toast: [...document.querySelectorAll('.toast, .tl-toast, #toast')].map(txt).join(' / '),
      chatOpen: document.getElementById('friendChatModal').classList.contains('open'),
      chatMsgs: [...document.querySelectorAll('#friendChatMessages .chat-msg')].map(txt),
      profileOpen: document.getElementById('friendProfileModal').classList.contains('open'),
      profileStatus: txt(document.getElementById('friendProfileStatus')),
      profileBtns: [...document.querySelectorAll('#friendProfileModal button')].filter((x) => !x.closest('.hidden') && !x.classList.contains('hidden') && x.offsetParent).map((x) => x.id || txt(x)),
    };
  });
  const click = async (sel) => { try { await page.click(sel, { timeout: 3000 }); return true; } catch (e) { console.log('   click failed', sel, e.message.split('\n')[0]); await q((s) => document.querySelector(s) && document.querySelector(s).click(), sel); return false; } };

  let s = await snap();
  ok('initial badge = 2 unread + request + accepted', s.badge === 4, JSON.stringify(s));
  ok('Ben row shows 2 unread', /Ben.* 2 /.test(s.friends[0] || ''), s.friends);
  ok('tab title carries the count', /^\(4\) /.test(s.title), s.title);
  ok('requests tab counts only what waits on me', s.reqTab === 2, s.reqTab);

  // Open friends panel: a request to answer, so it opens on Requests.
  await click('#friendsBtn'); await wait(500);
  s = await snap();
  ok('panel opens on Requests when a request waits', s.activeTab === 'requests', s.activeTab);
  ok('seeing Requests clears the accepted-news from the badge', s.badge === 3 && s.reqTab === 1, s.badge + '/' + s.reqTab);
  ok('Friends tab shows an unread dot', s.unreadDot === 2, s.unreadDot);
  await click('.tl-tab[data-tab="friends"]'); await wait(200);
  await click('#friendsList .friend-row-main[data-id="' + ID.ben + '"]'); await wait(700);
  s = await snap();
  ok('opening chat shows history', s.chatOpen && s.chatMsgs.length >= 3, JSON.stringify(s.chatMsgs));
  ok('opening chat clears Ben unread from badge', s.badge === 1, s.badge);

  // Live message while chat is open: no badge.
  ben.emit('friend-message', { toClientId: ID.ann, text: 'live one', id: 'l1' }); await wait(500);
  s = await snap();
  ok('live message appears in open chat', s.chatMsgs.some((m) => m.includes('live one')), JSON.stringify(s.chatMsgs));
  ok('no badge for a message being read', s.badge === 1, s.badge);

  // Send reply from browser.
  const got = H.once(ben, 'friend-message');
  await page.fill('#friendChatInput', 'reply from ann'); await page.press('#friendChatInput', 'Enter');
  const m = await got.catch(() => null);
  ok('browser reply reaches Ben', m && m.text === 'reply from ann', JSON.stringify(m));
  await wait(300);
  s = await snap();
  ok('reply shown once', s.chatMsgs.filter((x) => x.includes('reply from ann')).length === 1, JSON.stringify(s.chatMsgs));

  // Close chat, burst of messages.
  await click('#closeFriendChatBtn'); await wait(300);
  for (let i = 0; i < 5; i++) ben.emit('friend-message', { toClientId: ID.ann, text: 'burst ' + i, id: 'b' + i });
  await wait(800);
  s = await snap();
  ok('burst of 5 counts 5 unread', s.badge === 6, s.badge);
  ok('Ben row shows 5 unread + preview', /5/.test(s.friends[0]) && /burst 4/.test(s.friends[0]), s.friends[0]);
  ben.emit('friend-message-delete', { toClientId: ID.ann, id: 'b4' }); await wait(500);
  s = await snap();
  ok('unsent message drops the badge', s.badge === 5, s.badge);
  ok('preview falls back after unsend', !/burst 4/.test(s.friends.find((f) => f.includes('Ben')) || ''), s.friends);

  // Reload: counts persist.
  await page.reload({ waitUntil: 'domcontentloaded' }); await wait(2500);
  s = await snap();
  ok('badge survives reload (seen state too)', s.badge === 5, s.badge);

  // Accept Eve from the notification.
  await click('#friendsBtn'); await wait(300);
  await click('.tl-tab[data-tab="requests"]'); await wait(200);
  const eveAccepted = H.once(eve, 'notification').catch(() => null);
  await click('#notifList .notif-confirm-btn'); await wait(700);
  const en = await eveAccepted;
  s = await snap();
  ok('Eve told of acceptance', en && en.type === 'friend_accepted', JSON.stringify(en));
  ok('Eve now in friends', s.friends.some((f) => f.includes('Eve')), s.friends);
  ok('request row gone', !s.notifs.some((n) => n.includes('Eve wants')), s.notifs);
  ok('badge drops by one on accept', s.badge === 4, s.badge);
  ok('friends tab count = 3 (or unread shown instead)', s.friendsTab === 3 || (s.friendsTab === 0 && s.unreadDot > 0), s.friendsTab);

  // Remove Cat via profile.
  await click('.tl-tab[data-tab="friends"]'); await wait(200);
  await click('#friendsList .friend-avatar-btn[data-id="' + ID.cat + '"]'); await wait(400);
  s = await snap();
  ok('friend profile offers chat/rename/remove/block', ['friendProfileRemoveBtn', 'friendProfileBlockBtn'].every((x) => s.profileBtns.includes(x)), s.profileBtns);
  await click('#friendProfileRemoveBtn'); await wait(300);
  await click('.confirm-ok, #confirmOkBtn, [data-confirm-ok]'); await wait(700);
  s = await snap();
  ok('Cat removed from list', !s.friends.some((f) => f.includes('Cat')), s.friends);
  ok('"Cat accepted" notification gone after removing Cat', !s.notifs.some((n) => n.includes('Cat accepted')), s.notifs);
  ok('Cat side lost Ann', !(cat.lastSync.friends || []).some((f) => f.clientId === ID.ann));
  ok('Cat stays in recent people', s.history.some((h) => h.includes('Cat')), s.history);

  // Profile visit from history: Dan -> add friend.
  await click('#historyBtn'); await wait(400);
  s = await snap();
  ok('history lists Dan', s.history.some((h) => h.includes('Dan')), s.history);
  await click('#historyList .history-profile-btn[data-id="' + ID.dan + '"]');
  await wait(500);
  s = await snap();
  ok('Dan profile opens as stranger', s.profileOpen && s.profileBtns.includes('friendProfileAddBtn') && !s.profileBtns.includes('friendProfileRemoveBtn'), JSON.stringify([s.profileStatus, s.profileBtns]));
  const danReq = H.once(dan, 'notification').catch(() => null);
  await click('#friendProfileAddBtn'); await wait(500);
  const dr = await danReq;
  ok('Dan receives request', dr && dr.type === 'friend_request', JSON.stringify(dr));
  s = await snap();
  ok('profile flips to pending', s.profileBtns.includes('friendProfileCancelBtn'), s.profileBtns);
  dan.emit('friend-request-respond', { fromClientId: ID.ann, accept: true }); await wait(700);
  s = await snap();
  ok('Dan accepting updates open profile live to friend', s.profileBtns.includes('friendProfileRemoveBtn'), JSON.stringify([s.profileStatus, s.profileBtns]));
  ok('accepted notification appears', s.notifs.some((n) => n.includes('Dan accepted')), s.notifs);

  // Block Dan.
  await click('#friendProfileBlockBtn'); await wait(300);
  await click('.confirm-ok, #confirmOkBtn, [data-confirm-ok]'); await wait(700);
  s = await snap();
  ok('Dan gone from friends after block', !s.friends.some((f) => f.includes('Dan')), s.friends);
  ok('Dan accepted notif gone after block', !s.notifs.some((n) => n.includes('Dan')), s.notifs);
  ok('Dan in blocked list', s.blocked.some((x) => x.includes('Dan')), s.blocked);
  const blockedEv = H.once(dan, 'chat-blocked').catch(() => null);
  dan.emit('friend-message', { toClientId: ID.ann, text: 'let me in' });
  ok('Dan cannot message', (await blockedEv || {}).reason === 'unreachable');

  // Live request from someone met: Cat (still in history? after remove) asks again.
  const beforeBadge = (await snap()).badge;
  const catRes = H.once(cat, 'friend-request-result');
  cat.emit('friend-request', { targetClientId: ID.ann });
  ok('ex-friend can ask again', (await catRes).ok, '');
  await wait(600);
  s = await snap();
  ok('live request from ex-friend shows', s.notifs.some((n) => n.includes('Cat wants')), s.notifs);
  ok('live request bumps badge', s.badge === beforeBadge + 1, beforeBadge + ' -> ' + s.badge);
  // Its notification is gone (cleared elsewhere) but the request stands:
  // the row must still be there to answer.
  await q(() => { notifData = notifData.filter((n) => n.type !== 'friend_request'); renderNotifications(); });
  s = await snap();
  ok('a request without its notification is still listed', s.notifs.some((n) => n.includes('Cat wants')), s.notifs);
  await click('#notifList .notif-confirm-btn'); await wait(600);
  s = await snap();
  ok('answering it works', s.friends.some((f) => f.includes('Cat')), s.friends);
  // Renamed friends read by their label in history too.
  await q(() => { const f = friendsData.find((x) => x.username === 'Cat'); f.nickname = 'Kitty'; renderHistory(); });
  s = await snap();
  ok('history uses the private label', s.history.some((h) => h.includes('Kitty')), s.history);

  // Push-notification deep link opens the conversation itself.
  await page.goto(base + '/?open=chat&with=' + ID.ben, { waitUntil: 'domcontentloaded' }); await wait(2500);
  s = await snap();
  ok('message deep link opens that chat', s.chatOpen && s.chatMsgs.some((m) => m.includes('reply from ann')), JSON.stringify([s.chatOpen, s.chatMsgs.length]));
  await page.goto(base + '/?open=requests', { waitUntil: 'domcontentloaded' }); await wait(2000);
  s = await snap();
  ok('request deep link opens Requests', s.activeTab === 'requests', s.activeTab);

  const errs = page.errors.filter((e) => !/ERR_(CERT|TUNNEL|NAME|CONNECTION)|Failed to load resource/.test(e));
  ok('no page errors', !errs.length, errs.join('\n'));
  console.log(H.failed() ? `\n${H.failed()} failed` : '\nall passed');
  await b.close(); srv.kill('SIGKILL'); process.exit(H.failed() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
