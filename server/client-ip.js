const net = require('net');

// The real address of the person connected, for rate limits, bans and logs.
//
// Fly's edge sets Fly-Client-IP itself and overwrites whatever the client sent,
// so it is trusted when present; on Fly it always is. The X-Forwarded-For
// fallback is for hosts with a single proxy that appends the client address
// last. It must not be relied on behind Fly, whose last entry is the app's own
// address. The leftmost entry is whatever the client typed, so it is never
// used: a banned or rate-limited person could pick a new one on every request.
// Cloudflare's published edge ranges (https://www.cloudflare.com/ips/). When
// the site sits behind Cloudflare, Fly sees one of these as the client; the
// visitor's own address is then in CF-Connecting-IP. That header is trusted
// only when the request really came from Cloudflare, so nobody can set it to
// dodge a ban by connecting to Fly directly.
const CLOUDFLARE = new net.BlockList();
for (const r of ['173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18',
  '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17',
  '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22']) {
  const [a, n] = r.split('/'); CLOUDFLARE.addSubnet(a, Number(n), 'ipv4');
}
for (const r of ['2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32',
  '2a06:98c0::/29', '2c0f:f248::/32']) {
  const [a, n] = r.split('/'); CLOUDFLARE.addSubnet(a, Number(n), 'ipv6');
}
function fromCloudflare(ip) {
  const v = net.isIP(ip);
  return v ? CLOUDFLARE.check(ip, v === 6 ? 'ipv6' : 'ipv4') : false;
}

function clientIpFrom(headers = {}, remoteAddress = '') {
  const flyIp = headers['fly-client-ip'];
  let ip = flyIp ? String(flyIp).trim() : '';
  const cf = headers['cf-connecting-ip'];
  if (ip && cf && fromCloudflare(ip) && net.isIP(String(cf).trim())) ip = String(cf).trim();
  if (!ip) {
    const fwd = headers['x-forwarded-for'];
    const hops = fwd ? String(fwd).split(',').map((s) => s.trim()).filter(Boolean) : [];
    ip = hops.length ? hops[hops.length - 1] : String(remoteAddress || '');
  }
  // Only a whole IPv4-mapped address loses its prefix; "::ffff:" can also
  // appear inside an ordinary IPv6 address, which must stay intact.
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  return mapped ? mapped[1] : ip;
}

// The bucket an address is counted in for rate limits and lockouts. An IPv6
// host is usually given a whole /64, so counting each address separately would
// let one machine rotate through millions of them; IPv6 counts per /64 instead.
// IPv4 addresses are their own bucket.
function ipBucket(ip) {
  let s = String(ip || '').trim();
  // Some proxies append "1.2.3.4:5678" or "[2001:db8::1]:5678".
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(s);
  if (bracketed) s = bracketed[1];
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(s)) s = s.slice(0, s.lastIndexOf(':'));
  s = s.split('%')[0];
  if (net.isIP(s) !== 6) return s;
  const [head, tail] = s.split('::');
  const h = head ? head.split(':') : [];
  const t = tail ? tail.split(':') : [];
  const groups = s.includes('::')
    ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t]
    : h;
  return groups.slice(0, 4).map((g) => (parseInt(g, 16) || 0).toString(16)).join(':') + '::/64';
}

module.exports = { clientIpFrom, ipBucket, fromCloudflare };
