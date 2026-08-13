# Deploying TalkLive to Fly.io

Migration off Render. Fly runs an always-on machine (no sleep, no cold starts)
with a persistent volume, so `server/store.js` stops losing `owner-data.json`
on every deploy.

**Cost:** Fly has no free tier as of 2024. A `shared-cpu-1x` / 512MB machine
plus a 1GB volume runs roughly **$2–4/month**, billed per second.

---

## 1. Install flyctl and sign in

```sh
curl -L https://fly.io/install.sh | sh
fly auth signup   # or: fly auth login
```

You will need a card on file before the first deploy.

## 2. Pick your region

`fly.toml` ships with `primary_region = 'iad'` (US East). Change it **before**
the first deploy — it is baked in at launch. Judging by the locale directories
in `public/` (ur, hi, bn, fa, ar, id), a large share of traffic is South Asia
and the Middle East, so `bom` (Mumbai) or `sin` (Singapore) may serve users
better than `iad`. Full list: `fly platform regions`.

## 3. Create the app and the volume

```sh
fly launch --no-deploy --copy-config --name talklive
fly volumes create talklive_data --region <your-region> --size 1
```

`--copy-config` makes flyctl use the committed `fly.toml` instead of
regenerating one. The volume name must stay `talklive_data` to match the
`[[mounts]]` block.

## 4. Set secrets

`fly.toml` `[env]` holds only non-sensitive values. Everything else is a
secret. Copy the current values out of the Render dashboard first.

```sh
fly secrets set \
  GOOGLE_CLIENT_ID=... \
  OWNER_EMAIL=... \
  SMTP_USER=... \
  SMTP_PASS=...
```

Optional, only if you already use them on Render:

```sh
fly secrets set \
  DATABASE_URL=... \
  PADDLE_CLIENT_TOKEN=... PADDLE_PRICE_ID=... PADDLE_WEBHOOK_SECRET=... \
  PREMIUM_CLIENT_IDS=... \
  TURN_URLS=... TURN_USERNAME=... TURN_CREDENTIAL=... \
  AD_DIRECT_LINK=...
```

Full list of variables the code reads: `GOOGLE_CLIENT_ID`, `OWNER_EMAIL`,
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `DATABASE_URL`,
`PADDLE_*`, `PREMIUM_CLIENT_IDS`, `TURN_*`, `OPENRELAY_*`, `AD_*`,
`LANDING_HOST`, `REPORT_TZ`, `ENFORCE_CANONICAL`.

## 5. Deploy

```sh
fly deploy
fly logs
```

Expect `TalkLive server running on port 8080` and
`[accounts] restored N account(s) from the store`.

Smoke-test before touching DNS:

```sh
curl -I https://talklive.fly.dev/healthz          # 200
curl -sI https://talklive.fly.dev/ | grep -i robots   # noindex, nofollow
```

The `noindex` on `*.fly.dev` is deliberate — see "SEO notes" below.

## 6. Carry over the existing data

The JSON store on Render's free plan resets on redeploy, so there may be
nothing worth moving. If there is:

```sh
# from a Render shell, or wherever the current data/owner-data.json lives
fly ssh console -C "mkdir -p /data"
fly sftp shell
  put data/owner-data.json /data/owner-data.json
fly apps restart talklive
```

## 7. Cut over DNS

Do this only once step 5 passes.

```sh
fly certs add talklive.ai
fly certs add www.talklive.ai
fly ips list          # note the v4 and v6 addresses
```

At your DNS provider:

1. **Lower the TTL on the existing records to 300s and wait for the old TTL to
   expire** — do this a day ahead if you can. Skipping it is what makes
   cutovers drag on.
2. Point `talklive.ai` A → the Fly v4 IP, AAAA → the Fly v6 IP.
3. Point `www.talklive.ai` the same way (the app 301s www → apex itself).
4. Wait for `fly certs show talklive.ai` to report the cert as issued.
5. Verify: `curl -I https://talklive.ai/` returns 200 with no `X-Robots-Tag`.
6. Raise the TTL back to 3600s.

Leave the Render service running until this is confirmed — it is your rollback.

## 8. Decommission Render

`render.yaml` has been removed from the repo. If you need it back as a
rollback, recover it from git history:

```sh
git show b4d9926:render.yaml > render.yaml
```

Delete the Render service itself from the Render dashboard once `talklive.ai`
has served from Fly for a day or two with no errors.

---

## SEO notes

- **`*.fly.dev` is `noindex`.** `server/index.js` sends
  `X-Robots-Tag: noindex, nofollow` on any host that is not `CANONICAL_HOST`.
  Platform hostnames serve identical pages to the apex domain, so without this
  they are duplicate content. Previews and health checks still work.
- **No cold starts.** `auto_stop_machines = false` and
  `min_machines_running = 1` in `fly.toml`. Do not switch these on to save
  money — sleeping through Googlebot's crawl is what this migration is fixing.
- **IndexNow** pings 60s after boot whenever `NODE_ENV=production`, which
  `fly.toml` sets. No change needed.

## Scaling constraints

**Do not run more than one machine as configured.** Two reasons:

1. A Fly volume attaches to exactly one machine.
2. Socket.IO keeps matchmaking state in process memory. A second instance would
   put users in separate matchmaking pools and break pairing.

Growing past one machine means moving the store to Postgres via `DATABASE_URL`
(`pg` is already a dependency and `server/store.js` already supports it) *and*
adding a Socket.IO Redis adapter. Until then, scale up:

```sh
fly scale vm shared-cpu-1x --memory 1024
```

## Troubleshooting

| Symptom | Cause |
|---|---|
| Health checks fail on deploy | `/healthz` must answer within the 20s `grace_period`; check `fly logs` for a crash at boot |
| `EACCES` writing `owner-data.json` | `docker-entrypoint.sh` should chown `/data`; confirm the volume is mounted with `fly ssh console -C "ls -la /data"` |
| Everything 301s to `talklive.ai` | `CANONICAL_HOST` in `fly.toml` does not match the host you are testing; set `ENFORCE_CANONICAL=off` to debug |
| WebSockets disconnect | Raise the `hard_limit` in `[http_service.concurrency]` |
| Data gone after deploy | The volume is not mounted — `fly volumes list` should show `talklive_data` attached |
