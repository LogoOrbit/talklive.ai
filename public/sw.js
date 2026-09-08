/*
 * TalkLive service worker.
 *
 * Three jobs, in order of how much they matter:
 *
 * 1. Make the site installable. Chrome and Edge only offer "Install app" when a
 *    manifest and a fetch-handling service worker are both present. Installed
 *    users are the retention story for a product with no app store listing: the
 *    icon on a home screen is the only thing that brings someone back on day
 *    three without an email address to mail them at.
 * 2. Receive push notifications, so a friend's message reaches someone who
 *    closed the tab. A push event has no client - only the service worker is
 *    woken - so this file is the only place that can display one.
 * 3. Serve an offline page instead of the browser's dinosaur.
 *
 * What it deliberately does NOT do: cache the app shell and serve it first.
 * Precaching index.html would pin users to a stale build across deploys, and a
 * random-chat app whose client and server disagree about the signalling
 * protocol does not fail gracefully - it fails as "searching forever". So HTML
 * is always network-first, and only genuinely static, versioned assets are
 * cached.
 */

const VERSION = 'v1';
const SHELL_CACHE = `talklive-shell-${VERSION}`;
const ASSET_CACHE = `talklive-assets-${VERSION}`;
// Extensionless on purpose: the server 301s /offline.html -> /offline to keep
// one crawlable URL per page, and cache.addAll rejects a redirected response,
// so precaching the .html form fails outright and leaves no offline page at all.
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, '/favicon.svg']))
      // A failed precache must not abort installation - without a service
      // worker at all the app is not installable, which is worse than having no
      // offline page.
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('talklive-') && k !== SHELL_CACHE && k !== ASSET_CACHE)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

const CACHEABLE = /\.(?:css|js|woff2?|png|svg|webp|jpg|jpeg|ico)$/i;

// Only cache an asset whose URL carries the site's ?v= cache-buster. That query
// changes on every deploy that changes the file, so a cached entry is only ever
// reused for the exact build it came from. Without this rule an unversioned
// asset would be pinned to whatever the first visit happened to fetch, and a
// later fix to it would never reach anyone who had already been here.
function isVersioned(url) {
  return url.searchParams.has('v');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never touch cross-origin requests (ad tags, fonts, analytics) or the
  // signalling transport - buffering a WebSocket handshake or an ad frame
  // through here can only break them.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/socket.io/')) return;
  // Anything that reports live state (online counts, premium, ICE credentials,
  // push keys) must never come from a cache: stale TURN credentials produce a
  // call that connects and carries no audio.
  if (/^\/(ice-servers|premium-status|events|config\.js|push|billing|owner)/.test(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error()))
    );
    return;
  }

  if (CACHEABLE.test(url.pathname) && isVersioned(url)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then((cache) => cache.match(request).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((response) => {
          // Opaque and error responses are not worth storing, and caching a 404
          // would keep serving it after the asset is fixed.
          if (response && response.ok && response.type === 'basic') cache.put(request, response.clone());
          return response;
        });
      }))
    );
  }
});

// --- Push --------------------------------------------------------------------

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = {};
  }
  const title = payload.title || 'TalkLive';
  event.waitUntil(self.registration.showNotification(title, {
    body: payload.body || '',
    icon: '/favicon-192.png',
    badge: '/favicon-48.png',
    // Same tag replaces rather than stacks, so ten messages from one friend
    // leave one notification instead of ten.
    tag: payload.tag || 'talklive',
    renotify: false,
    data: { url: payload.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focusing an already-open tab is the right behaviour and also avoids a
      // second socket connection for the same person, which the server would
      // treat as an identity takeover.
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
