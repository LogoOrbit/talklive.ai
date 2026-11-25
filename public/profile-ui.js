// My Profile and Edit profile (docs/SPEC-PROFILE-PROGRESS-POSTS.md section 10).
//
//   Profile       one card on its cover: face (pencil -> Edit profile, Avatar
//                 tab), name, ID, top badge, streak chip and a "N countries"
//                 dropdown. Under it: one Edit profile button, the badge shelf
//                 with its Show badges switch, and a compact grouped settings
//                 list. Guests and signed-in people see the same page.
//   Edit profile a live preview of that card above three tabs (Avatar, Cover,
//                 Name) and Save / Cancel. Locked Plus and level faces and Plus
//                 covers can be previewed; Save is what refuses them.
//
// Loaded the first time the header avatar is tapped (app.js openMyProfile), so
// the landing page never pays for it. It reads app.js's globals (myAvatar,
// myCover, myBadges, isPremiumUser, socket, t, ...) and engage.js's numbers.
(function () {
  'use strict';

  var SVG = function (body, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  };
  var ICON = {
    pencil: '<path d="M4 20h4L19 9a2.5 2.5 0 0 0-3.5-3.5L4 16z"/>',
    flame: '<path d="M12 3c1 3.500 5 5.500 5 10a5 5 0 0 1-10 0c0-2 1-3.500 2-4.500 0 2 1 2.500 2 2.500 0-3-1-5 1-8z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    gem: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M9 3l3 18M15 3l-3 18"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    shield: '<path d="M12 3.200 19 6v6c0 4.400-3 7.600-7 8.800-4-1.200-7-4.400-7-8.800V6z"/><path d="m9 12 2.200 2.200L15.400 10"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.100 0 1.600-.7 1.600-1.500 0-.9-.8-1.300-.8-2.200 0-.9.7-1.600 1.600-1.600H16a5 5 0 0 0 5-5C21 6.400 17 3 12 3z"/><circle cx="7.500" cy="11" r="1.200" fill="currentColor"/><circle cx="10.500" cy="7" r="1.200" fill="currentColor"/><circle cx="15.500" cy="7.500" r="1.200" fill="currentColor"/>',
    user: '<circle cx="12" cy="8.500" r="3.600"/><path d="M4.800 20a7.200 7.200 0 0 1 14.400 0"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.800 9.400a2.300 2.300 0 1 1 3 2.200v1.200M12 16.600h.01"/>',
    news: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5"/>',
    gift: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8S10 3 7.500 3a2.500 2.500 0 0 0 0 5M12 8s2-5 4.500-5a2.500 2.500 0 0 1 0 5"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    in: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>',
  };

  // Its styles come with it (kept out of style.css: the landing page never needs them).
  var cssReady = new Promise(function (resolve) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/profile-ui.css?v=7743deeca8';
    link.onload = resolve;
    link.onerror = resolve;
    setTimeout(resolve, 3000);
    document.head.appendChild(link);
  });

  var sheet = null;      // the Profile sheet
  var editSheet = null;  // the Edit profile sheet
  var draft = null;      // what the editor currently shows
  var tab = 'avatar';

  function esc(s) { return escapeHtml(String(s == null ? '' : s)); }
  function tx(key, fallback, vars) { return mpText(key, fallback, vars); }
  function engage() { return window.TalkLiveEngage || null; }
  function isOpen() { return !!((sheet && sheet.classList.contains('open')) || (editSheet && editSheet.classList.contains('open'))); }
  function isEditOpen() { return !!(editSheet && editSheet.classList.contains('open')); }
  function syncBody() {
    document.body.classList.toggle('tlp-open', !!((sheet && sheet.classList.contains('shown')) || (editSheet && editSheet.classList.contains('shown'))));
  }

  function shownName() {
    return currentDisplayName() || (myProfile && myProfile.username) || t('you');
  }

  // --- A card: cover, face, name, ID and top badge (shared by both sheets) ----
  function cardHtml(extra) {
    return '<div class="mp-cover" aria-hidden="true"></div>'
      + '<span class="mp-face-wrap">' + extra.face + '</span>'
      + '<h2 class="my-profile-name"' + (extra.id ? ' id="' + extra.id + '"' : '') + '></h2>'
      + extra.idRow
      + '<span class="mp-badge"></span>';
  }
  function paintCard(root, o) {
    root.querySelector('.my-profile-face').innerHTML = o.avatar ? avatarFaceHtml(o.avatar, o.size, isPremiumUser) : genderIcon(null, o.size);
    root.querySelector('.my-profile-name').textContent = o.name;
    var idv = root.querySelector('.my-profile-id-value');
    if (idv) idv.textContent = o.handle || '…';
    paintCover(root.querySelector('.mp-cover'), o.cover, !!o.ownCover);
    paintBadgeChip(root.querySelector('.mp-badge'), myBadges, 22);
  }

  // --- Profile sheet ----------------------------------------------------------
  function build() {
    sheet = document.createElement('div');
    sheet.id = 'myProfileSheet';
    sheet.className = 'my-profile';
    sheet.innerHTML = '<div class="my-profile-backdrop"></div>'
      + '<section class="my-profile-sheet" role="dialog" aria-modal="true" aria-labelledby="myProfileName" tabindex="-1">'
      + '<div class="my-profile-grab" aria-hidden="true"></div>'
      + '<button type="button" class="my-profile-close">&times;</button>'
      + '<div class="my-profile-scroll">'
      + '<div class="my-profile-card tlp-card">'
      + cardHtml({
        id: 'myProfileName',
        face: '<button type="button" class="mp-face" data-act="edit-avatar"><span class="my-profile-face"></span><span class="mp-pencil">' + SVG(ICON.pencil) + '</span></button>',
        idRow: '<button type="button" class="mp-id my-profile-copy"><span class="my-profile-id-value"></span>' + SVG(ICON.copy) + '</button>',
      })
      + '<div class="tlp-stats">'
      + '<button type="button" class="tlp-chip tlp-streak" data-act="streak">' + SVG(ICON.flame) + '<b></b><small></small></button>'
      + '<button type="button" class="tlp-chip tlp-world" data-act="countries" aria-expanded="false" aria-haspopup="true">' + SVG(ICON.globe) + '<b></b>' + SVG(ICON.chev, 'tlp-chev') + '</button>'
      + '</div>'
      + '<div class="tlp-countries" hidden></div>'
      + '</div>'
      + '<button type="button" class="tlp-edit-btn" data-act="edit">' + SVG(ICON.pencil) + '<span></span></button>'
      + '<section class="tlp-badges" hidden>'
      + '<div class="tlp-badges-head"><strong></strong><label class="tlp-switch"><span></span><span class="switch"><input type="checkbox" id="mpShowBadges" /><span class="switch-slider" aria-hidden="true"></span></span></label></div>'
      + '<div class="tlp-shelf"></div>'
      + '</section>'
      + '<div class="tlp-settings"></div>'
      + '</div></section>';
    document.body.appendChild(sheet);
    sheet.querySelector('.my-profile-backdrop').addEventListener('click', function () { close(false); });
    sheet.querySelector('.my-profile-close').addEventListener('click', function () { close(false); });
    sheet.querySelector('.my-profile-copy').addEventListener('click', function () { copyFriendIdBtn.click(); });
    sheet.querySelector('.my-profile-scroll').addEventListener('click', onAction);
    sheet.querySelector('#mpShowBadges').addEventListener('change', onShowBadges);
    swipeDown(sheet, function () { close(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !isOpen()) return;
      if (document.querySelector('.modal-overlay:not(.hidden)')) return;
      close(false);
    });
    document.addEventListener('click', function (e) {
      // The countries list is a dropdown: a tap elsewhere puts it away.
      var list = sheet.querySelector('.tlp-countries');
      if (list.hidden || e.target.closest('.tlp-countries') || e.target.closest('.tlp-world')) return;
      toggleCountries(false);
    });
    document.addEventListener('tl-engage', function () { if (isOpen()) renderProfile(); });
  }

  // Drag the top of a sheet down to put it away, as a phone sheet does.
  function swipeDown(root, done) {
    var box = root.querySelector('.my-profile-sheet');
    var scroller = root.querySelector('.my-profile-scroll');
    var startY = null;
    var dy = 0;
    box.addEventListener('touchstart', function (e) {
      if (scroller.scrollTop > 0 || !e.target.closest('.my-profile-grab, .tlp-card, .tlp-edit-head, .tlp-preview')) { startY = null; return; }
      startY = e.touches[0].clientY;
      dy = 0;
    }, { passive: true });
    box.addEventListener('touchmove', function (e) {
      if (startY === null) return;
      dy = Math.max(0, e.touches[0].clientY - startY);
      if (dy > 0) box.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: true });
    box.addEventListener('touchend', function () {
      if (startY === null) return;
      startY = null;
      box.style.transform = '';
      if (dy > 90) done();
    });
  }

  function row(act, hue, icon, label, sub, danger) {
    return '<button type="button" class="mp-row' + (danger ? ' danger' : '') + '" data-act="' + act + '">'
      + '<span class="mp-ico ' + hue + '" aria-hidden="true">' + SVG(icon) + '</span>'
      + '<span class="mp-row-text"><strong>' + esc(label) + '</strong>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>'
      + (danger ? '' : '<span class="mp-go" aria-hidden="true"></span>') + '</button>';
  }

  function settingsHtml() {
    var E = engage();
    var ntf = E && E.pushState ? E.pushState() : 'none';
    var ntfSub = { on: tx('ntfOn', 'Notifications are on'), off: tx('ntfTurnOn', 'Turn on'), blocked: tx('ntfBlocked', 'Blocked in this browser'), ios: tx('ntfIosHow', 'Add to Home Screen') }[ntf] || '';
    var posts = document.getElementById('tlPosts');
    var news = !!(posts && !posts.hidden && callPanel.classList.contains('hidden'));
    var plusSub = isPremiumUser
      ? (premiumUntil ? tx('plusActiveUntil', 'Active until {date}', { date: new Date(premiumUntil).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) }) : tx('plusActive', 'Active'))
      : tx('plusPitchShort', 'Priority matching, every filter, gold ring');
    var g1 = row('plus', 'hue-gold', ICON.gem, 'TalkLive Plus', plusSub);
    var g2 = (ntf !== 'none' ? row('notify', 'hue-blue', ICON.bell, tx('notifications', 'Notifications'), ntfSub) : '')
      + row('privacy', 'hue-green', ICON.shield, tx('catPrivacy', 'Privacy & safety'), '')
      + row('appearance', 'hue-orange', ICON.palette, tx('settingsAppearanceSound', 'Appearance & sound'), '')
      + row('account', 'hue-brand', ICON.user, tx('catAccount', 'Account'), '');
    var g3 = row('help', 'hue-pink', ICON.help, tx('catAbout', 'Help & About'), '')
      + (news ? row('news', 'hue-grey', ICON.news, tx('settingsNews', 'News'), '') : '')
      + row('invite', 'hue-green', ICON.gift, tx('inviteFriends', 'Invite friends'), '');
    var g4 = accountNickname
      ? row('logout', 'hue-red', ICON.out, tx('signOut', 'Sign out'), '', true)
      : row('login', 'hue-brand', ICON.in, t('signIn'), tx('accountGuestHint', 'Keep your name, avatar and friends on any device'));
    return '<div class="mp-rows">' + g1 + '</div><div class="mp-rows">' + g2 + '</div><div class="mp-rows">' + g3 + '</div><div class="mp-rows">' + g4 + '</div>';
  }

  function renderProfile() {
    if (!sheet) return;
    var q = function (sel) { return sheet.querySelector(sel); };
    paintCard(sheet, { avatar: myAvatar, size: 92, name: shownName(), handle: myFriendId, cover: myCover, ownCover: true });
    q('.my-profile-copy').setAttribute('aria-label', t('copyFriendId'));
    q('.my-profile-close').setAttribute('aria-label', t('close'));
    q('.mp-face').setAttribute('aria-label', tx('editAvatar', 'Edit avatar'));
    q('.tlp-edit-btn span').textContent = tx('editProfile', 'Edit profile');
    var E = engage();
    var s = E ? E.streak() : { count: 0 };
    var list = E ? E.countries() : [];
    q('.tlp-streak b').textContent = String(s.count || 0);
    q('.tlp-streak small').textContent = tx('engageStreakLabel', 'day streak');
    q('.tlp-streak').classList.toggle('is-done', !!s.doneToday);
    q('.tlp-world b').textContent = list.length === 1 ? tx('countryOne', '1 country') : tx('countryMany', '{n} countries', { n: list.length });
    q('.tlp-world').disabled = false;
    paintCountries(list);
    // Badges: one horizontal row and the switch. Hidden until the server sends them.
    var badgesBox = q('.tlp-badges');
    badgesBox.hidden = !serverSendsExtras;
    if (serverSendsExtras) {
      q('.tlp-badges-head strong').textContent = t('badgesTitle') === 'badgesTitle' ? 'Badges' : t('badgesTitle');
      q('.tlp-switch > span:first-child').textContent = tx('showBadges', 'Show badges');
      q('#mpShowBadges').checked = !myBadgesHidden;
      withBadges(function (B) { q('.tlp-shelf').innerHTML = B.shelf(myBadges || { earned: [], hours: 0 }); });
    }
    q('.tlp-settings').innerHTML = settingsHtml();
  }

  function paintCountries(list) {
    var E = engage();
    var box = sheet.querySelector('.tlp-countries');
    if (!list.length) {
      box.innerHTML = '<p class="tlp-countries-empty">' + esc(tx('engagePassportEmptyLong', 'Every country you talk to gets a stamp. Have a 30-second call to collect your first one.')) + '</p>';
      return;
    }
    box.innerHTML = list.map(function (c) {
      return '<div class="tlp-country" role="listitem">' + E.flagImg(c.code, 24)
        + '<span class="tlp-country-name">' + esc(E.countryName(c.code)) + '</span>'
        + (c.n > 0 ? '<span class="tlp-country-n">' + c.n + '</span>' : '') + '</div>';
    }).join('');
    box.setAttribute('role', 'list');
  }
  function toggleCountries(open) {
    var box = sheet.querySelector('.tlp-countries');
    var btn = sheet.querySelector('.tlp-world');
    var on = typeof open === 'boolean' ? open : box.hidden;
    box.hidden = !on;
    btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    btn.classList.toggle('open', on);
  }

  function onShowBadges(e) {
    var on = e.target.checked;
    myBadgesHidden = !on;
    socket.emit('show-badges', { on: on }, function (r) {
      if (r && r.ok) { myBadgesHidden = !r.on; return; }
      myBadgesHidden = !myBadgesHidden;
      e.target.checked = !myBadgesHidden;
      showToast(t('coverFailed'), 'warn');
    });
  }

  function onAction(e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var act = btn.dataset.act;
    var E = engage();
    if (act === 'edit-avatar') { edit('avatar'); return; }
    if (act === 'edit') { edit('avatar'); return; }
    if (act === 'streak') { if (E) E.streakTap(); return; }
    if (act === 'countries') { toggleCountries(); return; }
    if (act === 'plus') { leaveMyProfileFor('settings'); if (isPremiumUser) openBilling(); else showPremiumUpsell('', 'general'); return; }
    if (act === 'notify') { if (E) E.notifyTap(); setTimeout(function () { if (isOpen()) renderProfile(); }, 600); return; }
    if (act === 'privacy') { leaveMyProfileFor('settings'); openAppSettings('privacy'); return; }
    if (act === 'appearance') { leaveMyProfileFor('settings'); openAppSettings('app'); return; }
    if (act === 'account') { leaveMyProfileFor('settings'); openAppSettings('profile'); return; }
    if (act === 'help') { leaveMyProfileFor('settings'); openAppSettings('about'); return; }
    if (act === 'news') {
      leaveMyProfileFor('none');
      var posts = document.getElementById('tlPosts');
      if (posts) setTimeout(function () { posts.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 320);
      return;
    }
    if (act === 'invite') { leaveMyProfileFor('none'); showSharePrompt(); return; }
    if (act === 'logout') { logoutBtn.click(); return; }
    if (act === 'login') { leaveMyProfileFor('auth'); openAuthPage('login'); }
  }

  // --- Opening and closing ----------------------------------------------------
  function show(el) {
    el.classList.add('shown');
    syncBody();
    updateScrollLock();
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('open'); }); });
  }
  function hide(el, now) {
    el.classList.remove('open');
    var finish = function () {
      if (el.classList.contains('open')) return;
      el.classList.remove('shown');
      syncBody();
      updateScrollLock();
    };
    if (now) finish(); else setTimeout(finish, 280);
  }

  function open() {
    if (!sheet) build();
    renderIdEditor();
    toggleCountries(false);
    renderProfile();
    sheet.querySelector('.my-profile-scroll').scrollTop = 0;
    show(sheet);
    try { sheet.querySelector('.my-profile-sheet').focus({ preventScroll: true }); } catch (_) { /* detached */ }
  }
  // `all`: both sheets go (leaving for Settings, a modal, another page).
  function close(all) {
    if (isEditOpen()) {
      hide(editSheet, all);
      if (!all) return;
    }
    if (sheet && sheet.classList.contains('shown')) hide(sheet, all);
  }

  // --- Edit profile -----------------------------------------------------------
  function ownCoverNow() { return effectiveCover(myCover); }
  function dirty() {
    if (!draft) return false;
    return draft.avatar !== myAvatar || (draft.cover || null) !== (ownCoverNow() || null)
      || draft.name.trim() !== (currentDisplayName() || '') || (myFriendIdEditable && draft.handle.trim() !== (myFriendId || ''));
  }

  function buildEdit() {
    editSheet = document.createElement('div');
    editSheet.id = 'editProfileSheet';
    editSheet.className = 'my-profile tlp-edit';
    editSheet.innerHTML = '<div class="my-profile-backdrop"></div>'
      + '<section class="my-profile-sheet" role="dialog" aria-modal="true" aria-labelledby="tlpEditTitle" tabindex="-1">'
      + '<header class="tlp-edit-head">'
      + '<button type="button" class="tlp-head-btn" data-act="cancel"></button>'
      + '<strong id="tlpEditTitle"></strong>'
      + '<button type="button" class="tlp-head-btn is-primary" data-act="save"></button>'
      + '</header>'
      + '<div class="my-profile-card tlp-preview">'
      + cardHtml({
        face: '<span class="mp-face is-static"><span class="my-profile-face"></span></span>',
        idRow: '<span class="mp-id is-static"><span class="my-profile-id-value"></span></span>',
      })
      + '</div>'
      + '<p class="tlp-lock-note" role="status" hidden></p>'
      + '<div class="tlp-tabs" role="tablist">'
      + ['avatar', 'cover', 'name'].map(function (k) { return '<button type="button" role="tab" class="tlp-tab" data-tab="' + k + '"></button>'; }).join('')
      + '</div>'
      + '<div class="my-profile-scroll tlp-body">'
      + '<div class="tlp-panel" data-panel="avatar"></div>'
      + '<div class="tlp-panel" data-panel="cover" hidden></div>'
      + '<div class="tlp-panel tlp-name-panel" data-panel="name" hidden>'
      + '<label class="tlp-field"><span class="tlp-field-label" data-l="name"></span><input type="text" id="tlpName" class="search-input" maxlength="40" autocomplete="off" aria-describedby="tlpNameRules" /></label>'
      + '<p class="tlp-field-note" id="tlpNameRules"></p>'
      + '<label class="tlp-field"><span class="tlp-field-label" data-l="id"></span><input type="text" id="tlpHandle" class="search-input" maxlength="21" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="name#1234" /></label>'
      + '<p class="tlp-field-note" id="tlpNameNote"></p>'
      + '</div>'
      + '</div></section>';
    document.body.appendChild(editSheet);
    var $ = function (sel) { return editSheet.querySelector(sel); };
    $('.my-profile-backdrop').addEventListener('click', cancelEdit);
    editSheet.addEventListener('click', onEditClick);
    $('#tlpName').addEventListener('input', function (e) { draft.name = e.target.value; refreshEdit(); });
    $('#tlpHandle').addEventListener('input', function (e) { draft.handle = e.target.value; noteDefault(); refreshEdit(); });
    if (window.TalkLiveSocial && window.TalkLiveSocial.maskIdInput) window.TalkLiveSocial.maskIdInput($('#tlpHandle'));
    // The avatar grid keeps its own (app.js) handlers; it tells us what was picked.
    document.addEventListener('tl-avatar-preview', function (e) { if (draft) { draft.avatar = e.detail; refreshEdit(); } });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isEditOpen() && !document.querySelector('.modal-overlay:not(.hidden)')) { e.stopPropagation(); cancelEdit(); }
    }, true);
  }

  function noteDefault() {
    var n = editSheet.querySelector('#tlpNameNote');
    n.classList.remove('is-error');
    n.textContent = myFriendIdEditable ? t('idHint') : t('idSignInHint');
  }

  function renderEditStatic() {
    var $ = function (sel) { return editSheet.querySelector(sel); };
    $('[data-act="cancel"]').textContent = tx('cancel', 'Cancel');
    $('#tlpNameRules').textContent = tx('nickRulesHint', "2 to 20 characters: letters and numbers in any language, with spaces or . _ - ' between them. No emoji, symbols or tags.");
    $('[data-act="save"]').textContent = tx('save', 'Save');
    $('#tlpEditTitle').textContent = tx('editProfile', 'Edit profile');
    var labels = { avatar: tx('avatar', 'Avatar'), cover: tx('coverTitle', 'Cover'), name: tx('mpTabName', 'Name') };
    editSheet.querySelectorAll('.tlp-tab').forEach(function (b) { b.textContent = labels[b.dataset.tab]; });
    $('[data-l="name"]').textContent = tx('tempUsername', 'Display name');
    $('[data-l="id"]').textContent = tx('mpYourId', 'Your ID');
    $('#tlpName').placeholder = (myProfile && myProfile.username) || t('tempUsernamePlaceholder');
    var h = $('#tlpHandle');
    h.disabled = !myFriendIdEditable;
    noteDefault();
  }

  function renderCoverPanel() {
    var host = editSheet.querySelector('[data-panel="cover"]');
    withCovers(function (C) {
      var box = host.querySelector('[data-cvp-box]');
      var top = box ? box.scrollTop : 0;
      host.innerHTML = C.picker(draft.cover, isPremiumUser);
      var nb = host.querySelector('[data-cvp-box]');
      if (nb) nb.scrollTop = top;
    });
  }

  function lockNote() {
    var C = window.TalkLiveCovers;
    if (draft.avatar !== myAvatar && !faceAllowed(draft.avatar)) {
      return specialTierOf(draft.avatar) ? specialHint(draft.avatar) : tx('premiumFaceLocked', 'This avatar comes with TalkLive Plus.');
    }
    if (draft.cover && C && C.isPlus(draft.cover) && !isPremiumUser) return tx('coverPlusLocked', 'This animated cover comes with TalkLive Plus.');
    return '';
  }

  // Everything on screen that depends on the draft: the live card, the lock
  // note and whether Save is available.
  function refreshEdit() {
    if (!editSheet || !draft) return;
    paintCard(editSheet.querySelector('.tlp-preview'), {
      avatar: draft.avatar, size: 76, name: draft.name.trim() || (myProfile && myProfile.username) || t('you'),
      handle: myFriendIdEditable && draft.handle.trim() ? draft.handle.trim() : myFriendId, cover: draft.cover, ownCover: false,
    });
    var note = lockNote();
    var n = editSheet.querySelector('.tlp-lock-note');
    n.hidden = !note;
    n.textContent = note;
    editSheet.querySelector('[data-act="save"]').disabled = !dirty();
  }

  function setTab(k) {
    tab = k;
    editSheet.querySelectorAll('.tlp-tab').forEach(function (b) {
      var on = b.dataset.tab === k;
      b.classList.toggle('selected', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    editSheet.querySelectorAll('.tlp-panel').forEach(function (p) { p.hidden = p.dataset.panel !== k; });
    if (k === 'avatar') { renderAvatarGrid(); revealSelectedAvatar(); }
    if (k === 'cover') renderCoverPanel();
    if (k === 'name') setTimeout(function () { try { editSheet.querySelector('#tlpName').focus({ preventScroll: true }); } catch (_) { /* hidden */ } }, 50);
  }

  function edit(which) {
    if (!editSheet) buildEdit();
    toggleCountries(false);
    renderIdEditor();
    draft = {
      avatar: myAvatar, cover: ownCoverNow() || null,
      name: currentDisplayName() || '', handle: myFriendId || '',
    };
    editSheet.querySelector('#tlpName').value = draft.name;
    editSheet.querySelector('#tlpHandle').value = draft.handle;
    // The grid is app.js's: it is adopted for as long as the editor exists.
    var panel = editSheet.querySelector('[data-panel="avatar"]');
    if (!panel.contains(avatarGrid)) panel.appendChild(avatarGrid);
    pendingAvatar = draft.avatar;
    renderEditStatic();
    refreshEdit();
    setTab(which || 'avatar');
    show(editSheet);
    try { editSheet.querySelector('.my-profile-sheet').focus({ preventScroll: true }); } catch (_) { /* detached */ }
  }

  function cancelEdit() {
    if (!isEditOpen()) return;
    draft = null;
    pendingAvatar = myAvatar;
    hide(editSheet, false);
  }

  function onEditClick(e) {
    var tb = e.target.closest('.tlp-tab');
    if (tb) { setTab(tb.dataset.tab); return; }
    var cv = e.target.closest('[data-cover]');
    if (cv && editSheet.contains(cv)) {
      // Anyone can preview any cover here; Save is what asks for Plus.
      draft.cover = cv.dataset.cover;
      renderCoverPanel();
      refreshEdit();
      vibrate(8);
      return;
    }
    if (e.target.closest('[data-cover-upsell]')) { askPlus(); return; }
    var b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'cancel') cancelEdit();
    if (b.dataset.act === 'save') save();
  }

  // Locked: the one Plus popup, over the editor so the draft is kept.
  function askPlus() {
    showPremiumUpsell('', 'avatars');
  }
  function blockedSave() {
    if (draft.avatar !== myAvatar && !faceAllowed(draft.avatar)) {
      setTab('avatar');
      askPlus();
      return true;
    }
    var C = window.TalkLiveCovers;
    if (draft.cover && C && C.isPlus(draft.cover) && !isPremiumUser) { askPlus(); return true; }
    return false;
  }

  function nameError(text) {
    setTab('name');
    var n = editSheet.querySelector('#tlpNameNote');
    n.classList.add('is-error');
    n.textContent = text;
  }

  // The ID is the one part the server can refuse for a reason the person must
  // read ("already in use"), so it goes first: a refusal leaves nothing half-saved.
  function sendHandle(handle) {
    return new Promise(function (resolve) {
      if (!socket.connected) { resolve({ ok: false, error: t('errNoConnection') }); return; }
      var done = false;
      var finish = function (r) { if (done) return; done = true; clearTimeout(timer); socket.off('set-handle-result', on); resolve(r); };
      var on = function (r) { finish(r && r.ok ? { ok: true } : { ok: false, error: (r && r.error) || 'Could not save that ID.' }); };
      var timer = setTimeout(function () { finish({ ok: false, error: t('errNoServerReply') }); }, 10000);
      socket.on('set-handle-result', on);
      socket.emit('set-handle', { handle: handle });
    });
  }

  function sendCover(id) {
    var before = myCover;
    myCover = id;
    socket.emit('set-cover', { cover: id }, function (r) {
      if (r && r.ok) myCover = typeof r.cover === 'string' ? r.cover : id;
      else {
        myCover = before;
        if (r && r.reason === 'plus') showPremiumUpsell('', 'avatars');
        else if (r) showToast(t('coverFailed'), 'warn');
      }
      renderMyProfileCard();
    });
    renderMyProfileCard();
  }

  var saving = false;
  function save() {
    if (saving || !draft || !dirty()) return;
    if (blockedSave()) return;
    var name = draft.name.trim();
    var nameChanged = name !== (currentDisplayName() || '');
    if (nameChanged) {
      if (!name) { nameError(tx('nameRequired', 'Enter a name')); return; }
      var chk = window.TalkLiveNickname ? window.TalkLiveNickname.check(name) : { ok: true, value: name };
      if (!chk.ok) { nameError(t(chk.error)); return; }
      name = chk.value;
    }
    var handle = draft.handle.trim();
    var handleChanged = myFriendIdEditable && handle && handle.toLowerCase() !== (myFriendId || '').toLowerCase();
    saving = true;
    var saveBtn = editSheet.querySelector('[data-act="save"]');
    saveBtn.disabled = true;
    (handleChanged ? sendHandle(handle) : Promise.resolve({ ok: true })).then(function (r) {
      saving = false;
      if (!r.ok) {
        setTab('name');
        var n = editSheet.querySelector('#tlpNameNote');
        n.classList.add('is-error');
        n.textContent = r.error;
        refreshEdit();
        return;
      }
      if (draft.avatar !== myAvatar) {
        setMyAvatarChoice(draft.avatar);
        document.dispatchEvent(new CustomEvent('tl-avatar-saved'));
      }
      if ((draft.cover || null) !== (ownCoverNow() || null) && draft.cover) sendCover(draft.cover);
      if (nameChanged) {
        tempUsernameInput.value = name;
        syncSaveNameBtn();
        saveTempNameBtn.click();
      }
      if (handleChanged) renderIdEditor();
      showToast(tx('profileSaved', 'Profile saved'), 'success');
      vibrate(15);
      draft = null;
      hide(editSheet, false);
      renderProfile();
    });
  }

  window.TalkLiveProfile = {
    ready: cssReady,
    open: open,
    close: close,
    edit: edit,
    isOpen: isOpen,
    render: function () {
      if (sheet && sheet.classList.contains('shown')) renderProfile();
      if (isEditOpen() && draft) refreshEdit();
    },
  };
}());
