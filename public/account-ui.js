/* Account moments, loaded only when needed (sign-in page, sign-out):
 * - a date-of-birth wheel (snaps, momentum, blur, a tick per value)
 * - 6-tile code entry that types, checks and submits itself
 * - the sign-out sheet and its "Signing out…" moment
 * - the "Continue as" card for the account last used here
 * app.js calls window.AccountUI; nothing here talks to the server itself. */
(function () {
  'use strict';
  var DOB_KEY = 'talklive_dob';
  var BLOCK_KEY = 'talklive_underage';
  var SAVED_KEY = 'talklive_saved_account';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function tt(key, fallback, vars) {
    var s = fallback;
    try { if (typeof window.t === 'function') { var v = window.t(key, vars); if (v && v !== key) return v; } } catch (_) {}
    if (vars) Object.keys(vars).forEach(function (k) { s = s.replace('{' + k + '}', vars[k]); });
    return s;
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function read(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function write(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (_) {} }
  function tick() { try { if (navigator.vibrate) navigator.vibrate(4); } catch (_) {} }

  // --- Wheel ----------------------------------------------------------------
  // A column you flick or drag. Native scrolling gives touch momentum; a mouse
  // drag gets its own momentum. Each row scales, fades and blurs with its
  // distance from the middle, and every new value ticks.
  var ROW = 44;
  function wheel(items, selected, onChange, label) {
    var box = el('div', 'tlw');
    var list = el('div', 'tlw-list');
    list.tabIndex = 0;
    list.setAttribute('role', 'listbox');
    if (label) list.setAttribute('aria-label', label);
    var rows = items.map(function (txt, i) {
      var r = el('div', 'tlw-row', txt);
      r.setAttribute('role', 'option');
      r.addEventListener('click', function () { go(i, true); });
      list.appendChild(r);
      return r;
    });
    box.appendChild(list);
    var cur = -1;
    var raf = 0;
    function paint() {
      raf = 0;
      var mid = list.scrollTop / ROW;
      var idx = Math.max(0, Math.min(items.length - 1, Math.round(mid)));
      var from = Math.max(0, idx - 4), to = Math.min(items.length - 1, idx + 4);
      for (var i = from; i <= to; i++) {
        var d = Math.min(2.5, Math.abs(i - mid));
        var s = rows[i].style;
        s.transform = 'scale(' + (1 - d * 0.09).toFixed(3) + ')';
        s.opacity = Math.max(0.12, 1 - d * 0.34).toFixed(3);
        s.filter = reduce || d < 0.15 ? 'none' : 'blur(' + (d * 1.4).toFixed(2) + 'px)';
      }
      if (idx !== cur) {
        if (cur >= 0) { rows[cur].classList.remove('on'); rows[cur].removeAttribute('aria-selected'); tick(); }
        cur = idx;
        rows[cur].classList.add('on');
        rows[cur].setAttribute('aria-selected', 'true');
        onChange(cur);
      }
    }
    function later() { if (!raf) raf = requestAnimationFrame(paint); }
    function go(i, smooth) {
      i = Math.max(0, Math.min(items.length - 1, i));
      list.scrollTo({ top: i * ROW, behavior: smooth && !reduce ? 'smooth' : 'auto' });
      later();
    }
    list.addEventListener('scroll', later, { passive: true });
    list.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); go(cur + 1, true); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); go(cur - 1, true); }
    });
    // Mouse drag with momentum (touch already has it natively).
    var drag = null;
    list.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      drag = { y: e.clientY, top: list.scrollTop, v: 0, t: performance.now() };
      list.classList.add('drag');
      list.setPointerCapture(e.pointerId);
    });
    list.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var now = performance.now();
      var top = drag.top - (e.clientY - drag.y);
      drag.v = (top - list.scrollTop) / Math.max(1, now - drag.t);
      drag.t = now;
      list.scrollTop = top;
    });
    function release() {
      if (!drag) return;
      var v = drag.v * 16;
      drag = null;
      (function coast() {
        if (Math.abs(v) < 0.6) { list.classList.remove('drag'); go(Math.round(list.scrollTop / ROW), true); return; }
        list.scrollTop += v;
        v *= 0.93;
        requestAnimationFrame(coast);
      })();
    }
    list.addEventListener('pointerup', release);
    list.addEventListener('pointercancel', release);
    requestAnimationFrame(function () { go(selected, false); paint(); });
    return { el: box, set: function (i) { if (i !== cur) go(i, true); }, get: function () { return cur; } };
  }

  // --- Sheet ----------------------------------------------------------------
  function sheet(cls) {
    var scrim = el('div', 'tlx-scrim');
    var card = el('div', 'tlx-sheet ' + (cls || ''));
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    scrim.appendChild(card);
    document.body.appendChild(scrim);
    requestAnimationFrame(function () { scrim.classList.add('in'); });
    function close() {
      scrim.classList.remove('in');
      setTimeout(function () { scrim.remove(); }, reduce ? 0 : 220);
    }
    return { scrim: scrim, card: card, close: close };
  }
  function button(cls, text, onClick) {
    var b = el('button', cls, text);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  // --- Date of birth -------------------------------------------------------
  function ageOf(y, m, d) {
    var now = new Date();
    var a = now.getFullYear() - y;
    if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) a--;
    return a;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function askDob() {
    if (read(BLOCK_KEY)) { blocked(); return Promise.resolve(null); }
    return new Promise(function (resolve) {
      var s = sheet('tlx-dob');
      var title = el('h2', 'tlx-title', tt('dobTitle', 'When were you born?'));
      title.id = 'tlxDobTitle';
      s.card.setAttribute('aria-labelledby', title.id);
      var note = el('p', 'tlx-note', tt('dobNote', 'You need to be 18 or older. Only you see this.'));
      var lang = document.documentElement.lang || undefined;
      var months = [];
      for (var i = 0; i < 12; i++) {
        try { months.push(new Date(2000, i, 1).toLocaleString(lang, { month: 'short' })); } catch (_) { months.push(String(i + 1)); }
      }
      var now = new Date().getFullYear();
      var years = [];
      for (var y = now; y >= 1900; y--) years.push(String(y));
      var days = [];
      for (var d = 1; d <= 31; d++) days.push(String(d));
      var pick = { m: 0, d: 0, y: 25 };
      var row = el('div', 'tlx-wheels');
      var band = el('div', 'tlx-band');
      row.appendChild(band);
      var dayW;
      function clampDay() {
        var yy = +years[pick.y], max = new Date(yy, pick.m + 1, 0).getDate();
        if (pick.d + 1 > max && dayW) dayW.set(max - 1);
      }
      var mW = wheel(months, 0, function (i) { pick.m = i; clampDay(); }, tt('dobMonth', 'Month'));
      dayW = wheel(days, 0, function (i) { pick.d = i; clampDay(); }, tt('dobDay', 'Day'));
      var yW = wheel(years, 25, function (i) { pick.y = i; clampDay(); }, tt('dobYear', 'Year'));
      mW.el.classList.add('tlw-month');
      yW.el.classList.add('tlw-year');
      row.appendChild(mW.el); row.appendChild(dayW.el); row.appendChild(yW.el);
      var go = button('tl-submit tlx-primary', tt('continue', 'Continue'), function () {
        var Y = +years[pick.y], M = pick.m + 1, D = pick.d + 1;
        s.close();
        if (ageOf(Y, M, D) < 18) { write(BLOCK_KEY, '1'); blocked(); resolve(null); return; }
        var dob = Y + '-' + pad(M) + '-' + pad(D);
        write(DOB_KEY, dob);
        resolve(dob);
      });
      var cancel = button('tlx-link', tt('cancel', 'Cancel'), function () { s.close(); resolve(null); });
      [title, note, row, go, cancel].forEach(function (n) { s.card.appendChild(n); });
      setTimeout(function () { yW.el.firstChild.focus({ preventScroll: true }); }, 60);
    });
  }

  function blocked(save) {
    if (save) write(BLOCK_KEY, '1');
    if (document.querySelector('.tlx-blocked')) return;
    var s = sheet('tlx-blocked');
    s.scrim.classList.add('solid');
    s.card.appendChild(el('h2', 'tlx-title', tt('underageTitle', 'TalkLive is for adults')));
    s.card.appendChild(el('p', 'tlx-note', tt('underageBody', 'You need to be 18 or older to use TalkLive. Thanks for being honest.')));
    s.card.appendChild(button('tl-submit tlx-primary', tt('authBackHome', 'Back to TalkLive'), function () { location.href = '/'; }));
  }

  // --- Code entry ----------------------------------------------------------
  // The real <input> (one-time-code autofill, paste, screen readers) sits
  // invisibly over six tiles that mirror it.
  function otp(input, submit) {
    if (!input || input.dataset.tiles) return;
    input.dataset.tiles = '1';
    input.removeAttribute('placeholder');
    var wrap = el('div', 'tlo');
    var tiles = [];
    for (var i = 0; i < 6; i++) { var tl = el('span', 'tlo-t'); tiles.push(tl); wrap.appendChild(tl); }
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    var state = el('p', 'tlo-state');
    state.setAttribute('aria-live', 'polite');
    wrap.after(state);
    var paste = null;
    if (navigator.clipboard && navigator.clipboard.readText) {
      paste = button('tlo-paste', tt('pasteCode', 'Paste code'), function () {
        navigator.clipboard.readText().then(function (txt) {
          var m = /\b(\d{6})\b/.exec(txt || '');
          if (m) { input.value = m[1]; render(true); }
        }).catch(function () {});
      });
      state.after(paste);
    }
    var last = '';
    function render(fromUser) {
      var v = input.value.replace(/\D/g, '').slice(0, 6);
      if (input.value !== v) input.value = v;
      tiles.forEach(function (t, i) {
        var ch = v[i] || '';
        if (t.textContent !== ch) {
          t.textContent = ch;
          if (ch && i >= last.length) { t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop'); }
        }
        t.classList.toggle('full', !!ch);
        t.classList.toggle('cur', document.activeElement === input && i === Math.min(v.length, 5) && v.length < 6);
      });
      wrap.classList.remove('err');
      if (v.length === 6 && last.length !== 6 && fromUser !== false) {
        wrap.classList.add('checking');
        state.textContent = tt('checkingCode', 'Checking…');
        state.className = 'tlo-state';
        if (paste) paste.hidden = true;
        setTimeout(function () { submit.click(); }, 120);
      } else if (v.length < 6) {
        wrap.classList.remove('checking');
        if (state.textContent === tt('checkingCode', 'Checking…')) state.textContent = '';
        if (paste) paste.hidden = false;
      }
      last = v;
    }
    input.addEventListener('input', function () { render(true); });
    input.addEventListener('focus', function () { render(false); });
    input.addEventListener('blur', function () { render(false); });
    input.addEventListener('keyup', function () { render(false); });
    wrap.addEventListener('click', function () { input.focus(); });
    otpParts.push({ wrap: wrap, state: state, input: input, reset: function () { last = ''; render(false); } });
    render(false);
  }
  var otpParts = [];
  // app.js calls this when the server answers a code: wrong code shakes and clears.
  function otpResult(ok, message) {
    otpParts.forEach(function (p) {
      if (!p.wrap.classList.contains('checking')) return;
      p.wrap.classList.remove('checking');
      if (ok) { p.wrap.classList.add('ok'); p.state.textContent = ''; return; }
      p.wrap.classList.add('err');
      p.state.textContent = message || tt('wrongCode', 'That code didn’t work. Try again.');
      p.state.className = 'tlo-state is-err';
      setTimeout(function () { p.input.value = ''; p.reset(); p.input.focus(); }, 420);
    });
  }

  // --- Sign out ------------------------------------------------------------
  // Resolves with { all } when confirmed, or null.
  function confirmSignOut(who) {
    return new Promise(function (resolve) {
      var s = sheet('tlx-out');
      var av = el('div', 'tlx-avatar');
      av.innerHTML = who.avatarHtml || '';
      s.card.appendChild(av);
      s.card.appendChild(el('h2', 'tlx-title', tt('signOutQ', 'Sign out of {name}?', { name: who.name || '' })));
      if (who.email) s.card.appendChild(el('p', 'tlx-note', who.email));
      function done(v) { s.close(); resolve(v); }
      s.card.appendChild(button('tl-submit tlx-primary tlx-danger', tt('signOut', 'Sign out'), function () { done({ all: false }); }));
      s.card.appendChild(button('tlx-link', tt('signOutAll', 'Sign out on all devices'), function () { done({ all: true }); }));
      s.card.appendChild(button('tlx-link', tt('cancel', 'Cancel'), function () { done(null); }));
      s.scrim.addEventListener('click', function (e) { if (e.target === s.scrim) done(null); });
      document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { document.removeEventListener('keydown', esc); done(null); } });
    });
  }
  function signingOut() {
    var s = sheet('tlx-busy');
    s.scrim.classList.add('solid');
    s.card.appendChild(el('span', 'tlx-spin'));
    s.card.appendChild(el('p', 'tlx-title', tt('loggingOut', 'Signing out…')));
    return s.close;
  }

  // The whole sign-out: confirm, "Signing out…" until the server has ended the
  // session (and this browser's push is unlinked), then remember the account.
  function signOut(ctx) {
    return confirmSignOut(ctx).then(function (r) {
      if (!r) return;
      signingOut();
      var started = Date.now();
      var reg = navigator.serviceWorker ? navigator.serviceWorker.getRegistration() : Promise.resolve(null);
      return reg.then(function (g) { return g && g.pushManager.getSubscription(); }).catch(function () { return null; })
        .then(function (sub) {
          if (sub) sub.unsubscribe().catch(function () {});
          return ctx.send({ pushEndpoint: sub ? sub.endpoint : null, all: r.all });
        })
        .then(function () { return new Promise(function (res) { setTimeout(res, Math.max(0, 700 - (Date.now() - started))); }); })
        .then(function () { remember({ name: ctx.name, email: ctx.email, animal: ctx.animal }); ctx.done(); });
    });
  }

  // --- Continue as ---------------------------------------------------------
  function remember(acc) { write(SAVED_KEY, acc ? JSON.stringify(acc) : null); }
  function saved() { try { return JSON.parse(read(SAVED_KEY) || 'null'); } catch (_) { return null; } }
  function savedCard(form, onUse) {
    var old = form.querySelector('.tlx-saved');
    if (old) old.remove();
    var acc = saved();
    if (!acc || !acc.name) return;
    var card = el('div', 'tlx-saved');
    var av = el('span', 'tlx-saved-av');
    av.innerHTML = acc.animal && window.Animals ? window.Animals.icon(acc.animal, 44) : '';
    var txt = el('span', 'tlx-saved-txt');
    txt.appendChild(el('strong', null, tt('continueAs', 'Continue as {name}', { name: acc.name })));
    if (acc.email) txt.appendChild(el('span', null, acc.email));
    var use = button('tlx-saved-go', '', function () { onUse(acc); card.classList.add('used'); });
    use.setAttribute('aria-label', tt('continueAs', 'Continue as {name}', { name: acc.name }));
    use.appendChild(av); use.appendChild(txt);
    var other = button('tlx-link', tt('useAnother', 'Use another account'), function () { remember(null); card.remove(); });
    card.appendChild(use); card.appendChild(other);
    form.insertBefore(card, form.firstChild);
  }


  // The rows of the profile sheet (same layout as the app's Profile tab).
  function profileRows(sheet, ctx) {
    function mpText(key, fallback, vars) { var v = ctx.t(key, vars); return v && v !== key ? v : fallback; }
    function mpRow(act, hue, icon, label, sub, danger) {
      return `<button type="button" class="mp-row${danger ? ' danger' : ''}" data-act="${act}">`
        + `<span class="mp-ico ${hue}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></span>`
        + `<span class="mp-row-text"><strong>${ctx.escapeHtml(label)}</strong>${sub ? `<small>${ctx.escapeHtml(sub)}</small>` : ''}</span>`
        + (danger ? '' : '<span class="mp-go" aria-hidden="true"></span>') + '</button>';
    }
    
sheet.querySelector('.mp-legend').textContent = mpText('you', 'You');
  sheet.querySelector('.mp-you').innerHTML =
    mpRow('passport', 'hue-blue', '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>', mpText('engagePassport', 'Passport'), mpText('passportCount', `${ctx.stamps} countries`, { n: ctx.stamps }))
    + mpRow('films', 'hue-orange', '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="m3 6 3-3h4L7 6m6 0 3-3h4l-3 3"/>', mpText('favFilmsTitle', 'Favourite films and shows'), ctx.film)
    + mpRow('likes', 'hue-pink', '<path d="M12 20s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9Z"/>', mpText('likes', 'Likes'), '')
    + mpRow('invite', 'hue-green', '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8S10 3 7.5 3a2.5 2.5 0 0 0 0 5M12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>', mpText('inviteFriends', 'Invite friends'), '');
  sheet.querySelector('.my-profile-actions').innerHTML =
    mpRow('more', 'hue-grey', '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>', ctx.t('settings'), '')
    + (ctx.signedIn
      ? mpRow('logout', 'hue-red', '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>', mpText('signOut', 'Sign out'), '', true)
      : mpRow('login', 'hue-violet', '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>', ctx.t('signIn'), mpText('accountGuestHint', 'Keep your name, avatar and friends on any device')));

  }

  window.AccountUI = {
    profileRows: profileRows,
    dob: function () { return read(DOB_KEY); },
    isBlocked: function () { return !!read(BLOCK_KEY); },
    askDob: askDob,
    blocked: blocked,
    otp: otp,
    otpResult: otpResult,
    signOut: signOut,
    remember: remember,
    savedCard: savedCard,
    wheel: wheel,
  };
})();
