/* Ambient video banner — a small, reusable, dependency-free component that turns
   any element carrying the [data-video-banner] attribute into a lazy-loaded,
   seamlessly looping background video with a still-poster placeholder and
   graceful fallbacks.

   Behaviour:
   - The heavy video is only fetched/played once the banner scrolls into view
     (IntersectionObserver + preload="none"); the lightweight poster shows first.
   - The lighter 320px asset is picked automatically on small screens, slow
     networks (effectiveType) or when Data Saver is on; otherwise the 480px asset.
   - prefers-reduced-motion, blocked autoplay, or a load error all fall back to
     the static poster frame instead of a blank/broken banner.
   - Playback pauses when scrolled out of view to save battery/CPU.

   Written in the plain IIFE style used by the other small modules in this app
   (see loading.js). */
(function () {
  'use strict';

  var reducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Prefer the lighter tier on small screens, slow links, or Data Saver.
  function wantsLightTier() {
    var conn =
      navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      if (conn.saveData) return true;
      var et = conn.effectiveType || '';
      if (et === 'slow-2g' || et === '2g' || et === '3g') return true;
    }
    return !!(window.matchMedia && window.matchMedia('(max-width: 599px)').matches);
  }

  // Show the poster frame as a still placeholder layer, kept behind the video.
  function paintPoster(fig, video) {
    var posterEl = fig.querySelector('.video-banner__poster');
    var src = video.getAttribute('poster');
    if (posterEl && src && !posterEl.style.backgroundImage) {
      posterEl.style.backgroundImage = 'url("' + src + '")';
    }
  }

  function activate(fig) {
    if (fig.dataset.vbActive) return;
    fig.dataset.vbActive = '1';

    var video = fig.querySelector('.video-banner__video');
    if (!video) return;

    paintPoster(fig, video);

    // Reduced motion: never load or play — the still poster is the whole banner.
    if (reducedMotion) {
      video.removeAttribute('autoplay');
      fig.classList.add('is-static');
      return;
    }

    // Keep only the chosen tier's <source>s so the browser can't pick the other,
    // and drop the media query hints now that JS is authoritative for tier.
    var tier = wantsLightTier() ? 'low' : 'high';
    Array.prototype.slice.call(video.querySelectorAll('source')).forEach(function (s) {
      if (s.getAttribute('data-tier') === tier) {
        s.removeAttribute('media');
        if (s.dataset.src) s.src = s.dataset.src;
      } else if (s.parentNode) {
        s.parentNode.removeChild(s);
      }
    });

    // The poster layer covers the loading state, so the <video>'s own poster can
    // go — that lets the video simply fade in over the placeholder when it plays.
    video.removeAttribute('poster');

    function showVideo() {
      fig.classList.add('is-playing');
    }
    function showPosterOnly() {
      fig.classList.add('is-static');
    }
    video.addEventListener('playing', showVideo);
    video.addEventListener('loadeddata', function () {
      if (!video.paused) showVideo();
    });
    video.addEventListener('error', showPosterOnly);

    video.load();

    function tryPlay() {
      var p = video.play();
      if (p && typeof p.catch === 'function') {
        // Autoplay blocked or unsupported — leave the poster showing.
        p.catch(showPosterOnly);
      }
    }
    tryPlay();

    // Pause off-screen, resume on return, to spare battery/CPU on long sessions.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              if (video.paused && !fig.classList.contains('is-static')) tryPlay();
            } else if (!video.paused) {
              video.pause();
            }
          });
        },
        { threshold: 0.05 }
      ).observe(fig);
    }
  }

  function init() {
    var banners = document.querySelectorAll('[data-video-banner]');
    if (!banners.length) return;

    // Paint every poster up front so the placeholder is instant, even before the
    // video is fetched.
    Array.prototype.slice.call(banners).forEach(function (fig) {
      var video = fig.querySelector('.video-banner__video');
      if (video) paintPoster(fig, video);
    });

    if (!('IntersectionObserver' in window)) {
      Array.prototype.slice.call(banners).forEach(activate);
      return;
    }

    var loader = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            activate(e.target);
            obs.unobserve(e.target);
          }
        });
      },
      { rootMargin: '200px 0px' } // start loading just before it scrolls in
    );

    Array.prototype.slice.call(banners).forEach(function (fig) {
      loader.observe(fig);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
