// The real address of the person connected, for rate limits, bans and logs.
//
// Fly's edge sets Fly-Client-IP itself and overwrites whatever the client sent,
// so it is trusted when present. Elsewhere the rightmost X-Forwarded-For entry
// is the one the immediate proxy appended. The leftmost entry is whatever the
// client typed, so it must never be used: a banned or rate-limited person could
// otherwise pick a new address on every request.
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

module.exports = { clientIpFrom };
