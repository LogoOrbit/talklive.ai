/*
 * Shared by the call app (/) and the chat app (/chat): the small picture of a
 * person, and the tappable face next to their messages.
 *
 * Both pages used to draw people differently - pictures on one, a first
 * letter on the other - and neither put a face in the conversation itself, so
 * there was no way to get from a message to the person who sent it.
 */
(function () {
  'use strict';

  var MAN = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="7.4" r="3.9"/><path d="M4.6 20.4c.5-4.3 3.5-6.9 7.4-6.9s6.9 2.6 7.4 6.9a.9.9 0 0 1-.9 1H5.5a.9.9 0 0 1-.9-1z"/></svg>';
  var WOMAN = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.6c-3.4 0-5.6 2.5-5.6 5.8 0 1.9.4 3.3 1 4.4l-.9 2.1a.7.7 0 0 0 .6 1h9.8a.7.7 0 0 0 .6-1l-.9-2.1c.6-1.1 1-2.5 1-4.4 0-3.3-2.2-5.8-5.6-5.8z" opacity="0.55"/><circle cx="12" cy="8" r="3.4"/><path d="M4.9 20.5c.5-4 3.4-6.4 7.1-6.4s6.6 2.4 7.1 6.4a.85.85 0 0 1-.85.95H5.75a.85.85 0 0 1-.85-.95z"/></svg>';

  function animalHtml(id, size) {
    var A = window.TalkLiveAnimals;
    if (!id || !A || !A.has(id)) return '';
    A.installSprite();
    return '<span class="avatar-animal" style="width:' + size + 'px;height:' + size + 'px">' + A.icon(id, size) + '</span>';
  }

  // A person's picture: their avatar (a spirit animal `a:<id>`, or a gendered
  // bust `m*`/`f*`) for friends and recent people; for a stranger in a live
  // chat, whose avatar is never shown, the spirit animal they picked.
  function face(avatarId, size, animal) {
    size = size || 30;
    if (typeof avatarId === 'string' && avatarId.slice(0, 2) === 'a:') {
      var a = animalHtml(avatarId.slice(2), size);
      if (a) return a;
    }
    var g = typeof avatarId === 'string' && (avatarId[0] === 'm' || avatarId[0] === 'f') ? avatarId[0] : null;
    if (!g && animal) {
      var s = animalHtml(animal, size);
      if (s) return s;
    }
    var cls = g === 'm' ? 'gender-male' : (g === 'f' ? 'gender-female' : 'gender-neutral');
    return '<span class="gender-icon ' + cls + '" style="width:' + size + 'px;height:' + size + 'px" aria-hidden="true">' + (g === 'f' ? WOMAN : MAN) + '</span>';
  }

  // Puts the other person's face beside their messages in `box`, on the last
  // bubble of each run (as messengers do), and makes it open their profile.
  //   opts.selector  bubble selector ('.msg', '.chat-msg')
  //   opts.them      class of the other person's bubbles
  //   opts.person()  { avatar, animal, name } of whoever the box is with
  //   opts.face(p)   optional: this page's own picture for a person
  //   opts.open(p)   what a tap does
  function attach(box, opts) {
    if (!box) return null;
    function paint(el) {
      if (!el.classList || !el.classList.contains(opts.them)) return;
      if (el.querySelector(':scope > .msg-av')) return;
      var p = opts.person() || {};
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'msg-av';
      b.setAttribute('aria-label', p.name || 'Profile');
      b.title = p.name || '';
      b.innerHTML = opts.face ? opts.face(p) : face(p.avatar, 26, p.animal);
      // Its own tap, not the bubble's: the bubble has swipe-to-reply and a
      // reaction menu of its own.
      ['pointerdown', 'touchstart', 'mousedown'].forEach(function (ev) {
        b.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true });
      });
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        opts.open(opts.person() || p);
      });
      el.classList.add('has-av');
      el.appendChild(b);
      // A bubble tucked under the previous one takes over the face.
      var prev = el.previousElementSibling;
      if (el.classList.contains('is-grouped') && prev && prev.classList.contains('has-av')) {
        prev.classList.add('av-hidden');
      }
    }
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        for (var i = 0; i < m.addedNodes.length; i++) {
          var n = m.addedNodes[i];
          if (n.nodeType === 1 && n.matches && n.matches(opts.selector)) paint(n);
        }
      });
    }).observe(box, { childList: true });
    return {
      // The person changed (a new chat in the same box, a new avatar): redraw.
      refresh: function () {
        var list = box.querySelectorAll(opts.selector + '.' + opts.them);
        for (var i = 0; i < list.length; i++) {
          var old = list[i].querySelector(':scope > .msg-av');
          if (old) old.remove();
          list[i].classList.remove('has-av', 'av-hidden');
        }
        for (var j = 0; j < list.length; j++) paint(list[j]);
      },
    };
  }

  // An ID is shaped as it is typed, like a Riot ID: letters, then # and four
  // numbers ("anakin#1101"). A number typed in the name starts the tag, so the
  // # arrives on its own; anything else simply does not go in.
  function idMask(v) {
    var name = '', tag = '', inTag = false;
    String(v || '').toLowerCase().split('').forEach(function (ch) {
      if (!inTag) {
        if (/[a-z]/.test(ch)) { if (name.length < 16) name += ch; }
        else if (name && (ch === '#' || /\d/.test(ch))) { inTag = true; if (ch !== '#') tag += ch; }
      } else if (/\d/.test(ch) && tag.length < 4) tag += ch;
    });
    return inTag ? name + '#' + tag : name;
  }
  function maskIdInput(input) {
    input.addEventListener('input', function () {
      var v = idMask(input.value);
      if (v !== input.value) input.value = v;
    });
  }

  window.TalkLiveSocial = { face: face, attachMessageAvatars: attach, idMask: idMask, maskIdInput: maskIdInput };
})();
