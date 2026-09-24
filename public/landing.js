// /landing: the live line and the little match demo in the hero, and the
// scroll reveals. Everything here is decoration over a page that is complete
// without it - any failure leaves the static page as it was.
(function () {
  'use strict';
  window.TLLanding = true;
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Live line: real numbers or nothing. ---------------------------------
  function compact(n) {
    n = Number(n) || 0;
    if (n < 1000) return String(n);
    if (n < 10000) return (Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, '') + 'k';
    return Math.floor(n / 1000) + 'k';
  }
  var line = document.getElementById('liveLine');
  var text = document.getElementById('liveText');
  if (line && text && window.fetch) {
    fetch('/api/live', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.visitors) { line.hidden = true; return; }
        var s = compact(d.visitors) + (d.visitors === 1 ? ' person' : ' people') + ' visited today';
        if (d.online > 1) s += ' · ' + compact(d.online) + ' online now';
        text.textContent = s;
        line.classList.add('is-on');
      })
      .catch(function () { line.hidden = true; });
  }

  // --- Match demo: search, match, talk, next. --------------------------------
  var demo = document.getElementById('matchDemo');
  var A = window.TalkLiveAnimals;
  if (demo && A) {
    A.installSprite();
    var you = document.getElementById('matchYou');
    var them = document.getElementById('matchThem');
    var themName = document.getElementById('matchThemName');
    var themWhere = document.getElementById('matchThemWhere');
    var status = document.getElementById('matchStatus');
    var PLACES = ['Brazil', 'Japan', 'Nigeria', 'Germany', 'India', 'Mexico', 'Canada', 'Turkey', 'Philippines', 'Egypt', 'Spain', 'Pakistan'];
    var NAMES = ['Sleepy Comet', 'Quiet Mango', 'Brave Pixel', 'Lucky Otter', 'Midnight Jazz', 'Paper Rocket', 'Mellow Cactus', 'Swift Lantern'];
    var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
    var mine = A.stored() || A.random();
    you.innerHTML = A.icon(mine, 44);
    var timer = null;
    var secs = 0;

    function search() {
      demo.dataset.state = 'search';
      them.innerHTML = '';
      themName.innerHTML = '&nbsp;';
      themWhere.innerHTML = '&nbsp;';
      status.textContent = 'Finding someone to talk to…';
      timer = setTimeout(match, 1600);
    }
    function match() {
      var animal = A.random();
      if (animal === mine) animal = A.random();
      them.innerHTML = A.icon(animal, 44);
      themName.textContent = pick(NAMES);
      themWhere.textContent = pick(PLACES);
      demo.dataset.state = 'talk';
      secs = 0;
      tick();
    }
    function tick() {
      var m = Math.floor(secs / 60);
      var ss = secs % 60;
      status.innerHTML = '<b>Connected</b> · ' + m + ':' + (ss < 10 ? '0' : '') + ss;
      if (secs++ >= 6) { timer = setTimeout(search, 700); return; }
      timer = setTimeout(tick, 1000);
    }
    if (still) {
      match();
      status.innerHTML = '<b>Connected</b> · a stranger, one tap away';
      clearTimeout(timer);
    } else if ('IntersectionObserver' in window) {
      // Runs only while on screen; nothing ticks for a page nobody is looking at.
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          clearTimeout(timer);
          if (e.isIntersecting) search();
        });
      }).observe(demo);
    } else {
      search();
    }
  }

  // --- Scroll reveals. -----------------------------------------------------
  var items = document.querySelectorAll('.reveal');
  if (still || !('IntersectionObserver' in window)) {
    document.documentElement.classList.remove('js-reveal');
    return;
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach(function (el) { io.observe(el); });
})();
