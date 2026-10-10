// The real address of the person connected, for rate limits, bans and logs.
//
// Fly's edge sets Fly-Client-IP itself and overwrites whatever the client sent,
// so it is trusted when present; on Fly it always is. The X-Forwarded-For
// fallback is for hosts with a single proxy that appends the client address
// last. It must not be relied on behind Fly, whose last entry is the app's own
// address. The leftmost entry is whatever the client typed, so it is never
// used: a banned or rate-limited person could pick a new one on every request.
function clientIpFrom(headers = {}, remoteAddress = '') {
  const flyIp = headers['fly-client-ip'];
  let ip = flyIp ? String(flyIp).trim() : '';
  if (!ip) {
    const fwd = headers['x-forwarded-for'];
    const hops = fwd ? String(fwd).split(',').map((s) => s.trim()).filter(Boolean) : [];
    ip = hops.length ? hops[hops.length - 1] : String(remoteAddress || '');
  }
  return ip.replace('::ffff:', '');
}

// The bucket an address is counted in for rate limits and lockouts. An IPv6
// host is usually given a whole /64, so counting each address separately would
// let one machine rotate through millions of them; IPv6 counts per /64 instead.
// IPv4 addresses are their own bucket.
function ipBucket(ip) {
  const s = String(ip || '').split('%')[0];
  if (!s.includes(':')) return s;
  const [head, tail] = s.split('::');
  const h = head ? head.split(':') : [];
  const t = tail ? tail.split(':') : [];
  const groups = s.includes('::')
    ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t]
    : h;
  return groups.slice(0, 4).map((g) => (parseInt(g, 16) || 0).toString(16)).join(':') + '::/64';
}

module.exports = { clientIpFrom, ipBucket };
