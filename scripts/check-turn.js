#!/usr/bin/env node
//
// Verify that a TURN relay actually hands out allocations.
//
// This exists because the app shipped a bug where TURN was configured to be
// mandatory (`iceTransportPolicy: 'relay'`) while no reachable relay existed.
// Nothing failed loudly: the SDP handshake still completed, so every call
// reported "connected" and carried no audio. A relay that is misconfigured,
// expired, firewalled or simply gone looks exactly like a working one until a
// real user cannot hear anybody.
//
// Run this before turning TURN_FORCE_RELAY on, and after any change to
// TURN_URLS / credentials.
//
//   node scripts/check-turn.js --from-url https://talklive.app/ice-servers
//   node scripts/check-turn.js --url turn:turn.example.com:3478 --secret "$TURN_SHARED_SECRET"
//   node scripts/check-turn.js --url turn:turn.example.com:3478 --user alice --pass s3cr3t
//
// Exit code 0 only if at least one endpoint returned a relayed address.
//
// Speaks enough of STUN (RFC 5389) and TURN (RFC 5766) to perform a real
// Allocate with long-term credentials. No dependencies - this has to be
// runnable from a bare deploy shell.

const dgram = require('dgram');
const net = require('net');
const tls = require('tls');
const crypto = require('crypto');

const MAGIC_COOKIE = 0x2112a442;
const METHOD_ALLOCATE = 0x003;
const CLASS_REQUEST = 0x00;
const CLASS_SUCCESS = 0x02;
const CLASS_ERROR = 0x03;

const ATTR = {
  USERNAME: 0x0006,
  MESSAGE_INTEGRITY: 0x0008,
  ERROR_CODE: 0x0009,
  REALM: 0x0014,
  NONCE: 0x0015,
  XOR_RELAYED_ADDRESS: 0x0016,
  REQUESTED_TRANSPORT: 0x0019,
  SOFTWARE: 0x8022,
};

function messageType(method, cls) {
  // Type layout interleaves the class bits into the method bits (RFC 5389 §6).
  return ((method & 0x0f80) << 2) | ((cls & 0x02) << 7) | ((method & 0x0070) << 1)
    | ((cls & 0x01) << 4) | (method & 0x000f);
}

function pad4(n) {
  return (4 - (n % 4)) % 4;
}

function encodeAttr(type, value) {
  const head = Buffer.alloc(4);
  head.writeUInt16BE(type, 0);
  head.writeUInt16BE(value.length, 2);
  return Buffer.concat([head, value, Buffer.alloc(pad4(value.length))]);
}

// Builds a STUN/TURN message. When `key` is given a MESSAGE-INTEGRITY attribute
// is appended, computed over the message with the header length already
// extended to cover it - getting that ordering wrong is the classic reason a
// hand-rolled TURN client gets 401s forever against a correct server.
function buildMessage({ method, cls, transactionId, attrs = [], key = null }) {
  const body = Buffer.concat(attrs);
  const header = Buffer.alloc(20);
  header.writeUInt16BE(messageType(method, cls), 0);
  header.writeUInt32BE(MAGIC_COOKIE, 4);
  transactionId.copy(header, 8);

  if (!key) {
    header.writeUInt16BE(body.length, 2);
    return Buffer.concat([header, body]);
  }
  header.writeUInt16BE(body.length + 24, 2); // + MESSAGE-INTEGRITY (4 + 20)
  const mac = crypto.createHmac('sha1', key)
    .update(Buffer.concat([header, body]))
    .digest();
  return Buffer.concat([header, body, encodeAttr(ATTR.MESSAGE_INTEGRITY, mac)]);
}

function parseMessage(buf) {
  if (!buf || buf.length < 20) return null;
  if (buf.readUInt32BE(4) !== MAGIC_COOKIE) return null;
  const length = buf.readUInt16BE(2);
  if (buf.length < 20 + length) return null;

  const type = buf.readUInt16BE(0);
  const cls = ((type >> 7) & 0x02) | ((type >> 4) & 0x01);
  const attrs = {};
  let off = 20;
  const end = 20 + length;
  while (off + 4 <= end) {
    const aType = buf.readUInt16BE(off);
    const aLen = buf.readUInt16BE(off + 2);
    if (off + 4 + aLen > end) break;
    attrs[aType] = buf.slice(off + 4, off + 4 + aLen);
    off += 4 + aLen + pad4(aLen);
  }
  return { cls, attrs, transactionId: buf.slice(8, 20), raw: buf.slice(0, 20 + length) };
}

// XOR-MAPPED/RELAYED-ADDRESS obfuscates the address against the magic cookie
// and transaction id so middleboxes cannot rewrite it.
function decodeXorAddress(value, transactionId) {
  if (!value || value.length < 8) return null;
  const family = value.readUInt8(1);
  const port = value.readUInt16BE(2) ^ (MAGIC_COOKIE >>> 16);
  if (family === 0x01) {
    const cookie = Buffer.alloc(4);
    cookie.writeUInt32BE(MAGIC_COOKIE, 0);
    const ip = [];
    for (let i = 0; i < 4; i += 1) ip.push(value.readUInt8(4 + i) ^ cookie.readUInt8(i));
    return { address: ip.join('.'), port };
  }
  if (family === 0x02) {
    const mask = Buffer.concat([Buffer.from([0x21, 0x12, 0xa4, 0x42]), transactionId]);
    const parts = [];
    for (let i = 0; i < 16; i += 2) {
      parts.push((((value.readUInt8(4 + i) ^ mask.readUInt8(i)) << 8)
        | (value.readUInt8(5 + i) ^ mask.readUInt8(i + 1))).toString(16));
    }
    return { address: parts.join(':'), port };
  }
  return null;
}

function longTermKey(username, realm, password) {
  return crypto.createHash('md5').update(`${username}:${realm}:${password}`).digest();
}

// coturn's `use-auth-secret` (the TURN REST API scheme): the username is an
// expiry timestamp and the password is its HMAC. Must match the server's
// buildIceServers() exactly or every allocation is rejected.
function ephemeralCredentials(secret, ttlSeconds = 600) {
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const username = `${expiry}:turncheck`;
  const credential = crypto.createHmac('sha1', secret).update(username).digest('base64');
  return { username, credential };
}

function parseTurnUri(uri) {
  const m = /^(turns?):([^:?]+)(?::(\d+))?(?:\?transport=(udp|tcp))?$/i.exec(String(uri).trim());
  if (!m) return null;
  const scheme = m[1].toLowerCase();
  const secure = scheme === 'turns';
  const transport = (m[4] || (secure ? 'tcp' : 'udp')).toLowerCase();
  return {
    uri,
    host: m[2],
    port: m[3] ? Number(m[3]) : (secure ? 5349 : 3478),
    transport,
    secure,
  };
}

// --- transports -------------------------------------------------------------
// Each returns { send(buf), onMessage(cb), close() }. TCP needs its own framing:
// STUN over TCP is a stream, so messages must be reassembled by header length.

function udpTransport(endpoint) {
  const sock = dgram.createSocket(net.isIPv6(endpoint.host) ? 'udp6' : 'udp4');
  let handler = () => {};
  let onFail = () => {};
  sock.on('message', (msg) => handler(msg));
  sock.on('error', (e) => onFail(`socket error: ${e.code || e.message}`));
  return {
    send: (buf) => sock.send(buf, endpoint.port, endpoint.host, (e) => {
      if (e) onFail(`send failed: ${e.code || e.message}`);
    }),
    onMessage: (cb) => { handler = cb; },
    onError: (cb) => { onFail = cb; },
    close: () => { try { sock.close(); } catch (_) { /* already closed */ } },
  };
}

function streamTransport(endpoint) {
  let buffer = Buffer.alloc(0);
  let handler = () => {};
  let onFail = () => {};
  const opts = { host: endpoint.host, port: endpoint.port };
  const sock = endpoint.secure
    ? tls.connect({ ...opts, servername: endpoint.host, rejectUnauthorized: false })
    : net.connect(opts);
  // Surfacing the real socket error matters: a refused connection, a DNS
  // failure and a TLS handshake rejection are each a different fix, and
  // collapsing them all into "timed out" sends whoever runs this hunting in the
  // wrong direction.
  sock.on('error', (e) => onFail(`connection failed: ${e.code || e.message}`));
  sock.on('close', () => onFail('connection closed by peer before any TURN response'));
  sock.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    // Drain every complete message currently in the stream.
    for (;;) {
      if (buffer.length < 20) return;
      const total = 20 + buffer.readUInt16BE(2);
      if (buffer.length < total) return;
      const msg = buffer.slice(0, total);
      buffer = buffer.slice(total);
      handler(msg);
    }
  });
  return {
    send: (buf) => sock.write(buf),
    onMessage: (cb) => { handler = cb; },
    onError: (cb) => { onFail = cb; },
    close: () => { try { sock.destroy(); } catch (_) { /* already gone */ } },
  };
}

// --- the actual check -------------------------------------------------------

function allocate(endpoint, creds, timeoutMs) {
  return new Promise((resolve) => {
    const transport = endpoint.transport === 'tcp' || endpoint.secure
      ? streamTransport(endpoint)
      : udpTransport(endpoint);

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      transport.close();
      resolve(result);
    };
    transport.onError((reason) => finish({ ok: false, error: reason }));
    const timer = setTimeout(
      () => finish({ ok: false, error: `no response within ${timeoutMs}ms (blocked, wrong port, or host unreachable)` }),
      timeoutMs
    );

    const transactionId = crypto.randomBytes(12);
    const requestedTransport = Buffer.alloc(4);
    requestedTransport.writeUInt8(17, 0); // UDP relay transport
    const baseAttrs = [
      encodeAttr(ATTR.REQUESTED_TRANSPORT, requestedTransport),
      encodeAttr(ATTR.SOFTWARE, Buffer.from('talklive-turn-check')),
    ];

    transport.onMessage((raw) => {
      const msg = parseMessage(raw);
      if (!msg) return;

      if (msg.cls === CLASS_SUCCESS) {
        const relayed = decodeXorAddress(msg.attrs[ATTR.XOR_RELAYED_ADDRESS], msg.transactionId);
        return finish(relayed
          ? { ok: true, relayed }
          : { ok: false, error: 'allocation succeeded but returned no XOR-RELAYED-ADDRESS' });
      }

      if (msg.cls === CLASS_ERROR) {
        const err = msg.attrs[ATTR.ERROR_CODE];
        const code = err && err.length >= 4 ? err.readUInt8(2) * 100 + err.readUInt8(3) : 0;
        const reason = err && err.length > 4 ? err.slice(4).toString('utf8') : '';

        // 401/438 carry the realm+nonce needed to authenticate; that is the
        // expected first response, not a failure.
        const realm = msg.attrs[ATTR.REALM];
        const nonce = msg.attrs[ATTR.NONCE];
        if ((code === 401 || code === 438) && realm && nonce && !settled) {
          const realmStr = realm.toString('utf8');
          const key = longTermKey(creds.username, realmStr, creds.credential);
          return transport.send(buildMessage({
            method: METHOD_ALLOCATE,
            cls: CLASS_REQUEST,
            transactionId: crypto.randomBytes(12),
            attrs: [
              ...baseAttrs,
              encodeAttr(ATTR.USERNAME, Buffer.from(creds.username, 'utf8')),
              encodeAttr(ATTR.REALM, realm),
              encodeAttr(ATTR.NONCE, nonce),
            ],
            key,
          }));
        }
        return finish({ ok: false, error: `TURN error ${code}${reason ? ` ${reason}` : ''}` });
      }
    });

    transport.send(buildMessage({
      method: METHOD_ALLOCATE,
      cls: CLASS_REQUEST,
      transactionId,
      attrs: baseAttrs,
    }));
  });
}

// --- CLI --------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) args[key] = true;
    else { args[key] = next; i += 1; }
  }
  return args;
}

async function endpointsFromUrl(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  const data = await res.json();
  const servers = Array.isArray(data.iceServers) ? data.iceServers : [];
  const out = [];
  for (const s of servers) {
    for (const u of [].concat(s.urls || [])) {
      if (!/^turns?:/i.test(String(u))) continue;
      out.push({ uri: u, username: s.username, credential: s.credential });
    }
  }
  return { endpoints: out, policy: data.iceTransportPolicy, rawCount: servers.length };
}

async function main() {
  const args = parseArgs(process.argv);
  const timeoutMs = Number(args.timeout || 6000);
  let targets = [];
  let policy = null;

  if (args['from-url']) {
    const info = await endpointsFromUrl(args['from-url']);
    policy = info.policy;
    targets = info.endpoints;
    if (!targets.length) {
      console.error(`No TURN endpoints published by ${args['from-url']}.`);
      console.error(policy === 'relay'
        ? 'iceTransportPolicy is "relay" with no relay - every call will connect and carry no audio.'
        : 'Calls fall back to direct/STUN paths; users behind symmetric NAT or strict firewalls cannot connect.');
      process.exit(1);
    }
  } else if (args.url) {
    const creds = args.secret
      ? ephemeralCredentials(String(args.secret))
      : { username: args.user, credential: args.pass };
    if (!creds.username || !creds.credential) {
      console.error('Provide --secret <shared-secret>, or --user <name> --pass <password>.');
      process.exit(2);
    }
    targets = [].concat(args.url).map((u) => ({ uri: u, ...creds }));
  } else {
    console.error('Usage: check-turn.js --from-url <ice-servers URL> | --url <turn URI> [--secret S | --user U --pass P]');
    process.exit(2);
  }

  if (policy) console.log(`iceTransportPolicy: ${policy}`);
  console.log(`Testing ${targets.length} TURN endpoint(s), ${timeoutMs}ms timeout each\n`);

  let anyOk = false;
  for (const target of targets) {
    const endpoint = parseTurnUri(target.uri);
    if (!endpoint) {
      console.log(`  FAIL  ${target.uri}\n        unparseable TURN URI`);
      continue;
    }
    if (!target.username || !target.credential) {
      console.log(`  FAIL  ${target.uri}\n        no credentials published alongside this URI`);
      continue;
    }
    const result = await allocate(endpoint, target, timeoutMs);
    if (result.ok) {
      anyOk = true;
      console.log(`  OK    ${target.uri}\n        relayed address ${result.relayed.address}:${result.relayed.port}`);
    } else {
      console.log(`  FAIL  ${target.uri}\n        ${result.error}`);
    }
  }

  console.log('');
  if (anyOk) {
    console.log('At least one relay works. Safe to set TURN_FORCE_RELAY=1.');
  } else {
    console.log('No relay allocated. Do NOT set TURN_FORCE_RELAY=1 - relay-only with no');
    console.log('working relay makes every call report "connected" while carrying no audio.');
  }
  process.exit(anyOk ? 0 : 1);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(`check-turn failed: ${e.message}`);
    process.exit(2);
  });
}

module.exports = {
  buildMessage, parseMessage, encodeAttr, decodeXorAddress,
  longTermKey, ephemeralCredentials, parseTurnUri, allocate, messageType, ATTR,
};
