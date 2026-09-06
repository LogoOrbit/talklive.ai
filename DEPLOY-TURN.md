# Setting up TURN

Without a TURN relay, calls fail for anyone behind symmetric NAT or a strict
firewall - a large share of mobile carriers and virtually every corporate or
school network. The two peers exchange SDP successfully and then find no
network path between them.

This is also the setting that produced the "connected but silent" bug: the
client used to force `iceTransportPolicy: 'relay'` while the server published no
relay at all, so the browser gathered **zero** ICE candidates. The handshake
still completed, the UI said "You're connected", and no audio could ever flow.
The guard rails below exist so that cannot recur.

## The rule

`TURN_FORCE_RELAY=1` is only honoured when a TURN relay is actually configured.
Never set it without running the verifier first:

```bash
npm run check:turn -- --from-url https://talklive.app/ice-servers
```

Exit code 0 means at least one relay handed out a real allocation.

## Step 1 - get a relay

### Option A: managed TURN (fastest)

Two providers are wired into the server directly, so there is nothing to run and
no hostnames to keep in sync - set two secrets and every restrictive network
gets a relay. The server mints short-lived credentials from the provider's API,
caches them for the hour they are valid, and publishes them from `/ice-servers`
alongside STUN. If the provider's API is down the app falls back to STUN plus
whatever `TURN_URLS` provides, never to an error.

**Cloudflare Realtime TURN** (recommended - global anycast, free monthly tier):

1. Cloudflare dashboard → **Realtime** → **TURN Keys** → *Create*.
2. Copy the key ID and API token.

```sh
fly secrets set \
  TURN_KEY_ID='<key id>' \
  TURN_KEY_API_TOKEN='<api token>' \
  -a talklive-ai
```

**Metered** (alternative, also has a free tier):

```sh
fly secrets set \
  METERED_SUBDOMAIN='<your subdomain>' \
  METERED_API_KEY='<api key>' \
  -a talklive-ai
```

Both may be set at once; their relays are published together and the browser
uses whichever answers first. Then verify against the live app:

```bash
npm run check:turn -- --from-url https://talklive.app/ice-servers
```

### Option A2: any other managed provider

Any provider that supports the standard coturn "shared secret" scheme works
(Twilio Network Traversal, Xirsys, and Metered's coturn-compatible endpoints).
You need either a shared secret or a static username/password pair, configured
through `TURN_URLS` as in step 3 below.

Prefer a provider with a point of presence near your users. Relay adds a hop, so
a relay in the wrong region shows up directly as call latency.

### Option B: self-host coturn on a small VPS

A relay is bandwidth-bound, not CPU-bound; the smallest instance at any provider
handles a lot of concurrent calls. **Do not run coturn on Fly.io** - relay
allocations need a wide contiguous UDP port range, and Fly only routes ports you
declare explicitly.

```bash
apt update && apt install -y coturn
```

`/etc/turnserver.conf` - this matches exactly what `server/index.js`
`buildIceServers()` mints, so the two must not drift:

```conf
listening-port=3478
tls-listening-port=5349

# The server sends username "<expiry>:<random>" and credential
# base64(HMAC-SHA1(secret, username)). That is coturn's use-auth-secret scheme.
use-auth-secret
static-auth-secret=REPLACE_WITH_TURN_SHARED_SECRET

realm=turn.yourdomain.com
fingerprint

# Relay allocation range. Must match the firewall rule below.
min-port=49160
max-port=49200

# If the box is behind NAT (most clouds), map public to private:
# external-ip=203.0.113.10/10.0.0.5

no-multicast-peers
no-cli
# Never let the relay be used to reach internal networks.
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
```

Generate the secret with `openssl rand -hex 32`.

Firewall - the relay port range matters as much as the listener:

```bash
ufw allow 3478/tcp && ufw allow 3478/udp
ufw allow 5349/tcp && ufw allow 5349/udp
ufw allow 49160:49200/udp
```

For `turns:` (TLS on 5349), point coturn at a real certificate:

```conf
cert=/etc/letsencrypt/live/turn.yourdomain.com/fullchain.pem
pkey=/etc/letsencrypt/live/turn.yourdomain.com/privkey.pem
```

TLS on 443 is what gets through the most restrictive corporate firewalls, so it
is worth having even though it is the slowest path.

Then `systemctl enable --now coturn`.

## Step 2 - verify the relay before wiring it in

Test it directly, before the app depends on it:

```bash
npm run check:turn -- --url 'turn:turn.yourdomain.com:3478' --secret "$SECRET"
npm run check:turn -- --url 'turn:turn.yourdomain.com:3478?transport=tcp' --secret "$SECRET"
npm run check:turn -- --url 'turns:turn.yourdomain.com:5349?transport=tcp' --secret "$SECRET"
```

A working endpoint prints `OK` and the relayed address it allocated. `TURN error
401` means the secret does not match; a timeout means a firewall or wrong port.

## Step 3 - configure the app

```sh
fly secrets set \
  TURN_URLS='turn:turn.yourdomain.com:3478,turn:turn.yourdomain.com:3478?transport=tcp,turns:turn.yourdomain.com:5349?transport=tcp' \
  TURN_SHARED_SECRET='<the secret>' \
  -a talklive-ai
```

List several transports. UDP is the fastest and works for most users; TCP and
TLS exist so the calls that UDP cannot carry still connect.

For a provider that issues static credentials instead of a shared secret, use
`TURN_USERNAME` / `TURN_CREDENTIAL` in place of `TURN_SHARED_SECRET`.

Then confirm the live app publishes them:

```bash
npm run check:turn -- --from-url https://talklive.app/ice-servers
```

## Step 4 - optionally force relay-only

Only after step 3 reports `OK`:

```sh
fly secrets set TURN_FORCE_RELAY=1 -a talklive-ai
```

This routes all media through the relay so neither caller learns the other's IP
address. The costs are real and worth stating: every call consumes relay
bandwidth, and latency rises. Without it, TURN is still used - just only as a
fallback when a direct path cannot be found.

The server ignores this flag when no relay is configured, so it cannot
resurrect the silent-call bug on its own. It cannot tell whether a configured
relay is *healthy*, though - that is what step 2 is for.

## Ongoing

Re-run the verifier after any change to the relay, its certificate, or its
credentials, and periodically - an expired TLS certificate or a lapsed provider
account degrades calls silently for exactly the users least able to report it.

Credentials minted by `/ice-servers` last one hour, so a browser that sits on
the page longer than that picks up fresh ones on its next call.
