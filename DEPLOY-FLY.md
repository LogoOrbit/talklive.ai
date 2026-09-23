# Deploying TalkLive to Fly.io

Migration off Render. Fly runs an always-on machine, so the app no longer
sleeps after 15 minutes idle or takes 30-60s to answer the first request.

The canonical domain is **talklive.app** (`CANONICAL_HOST` in `fly.toml`).
Every other host, including `talklive-ai.fly.dev`, is served
`X-Robots-Tag: noindex` - so that value must stay correct or the live site
drops out of Google.

**Cost:** Fly has no free tier as of 2024. A `shared-cpu-1x` / 512MB machine
runs roughly **$2-4/month**, billed per second.

---

## 1. Install flyctl and sign in

```sh
curl -L https://fly.io/install.sh | sh
fly auth signup   # or: fly auth login
```

You will need a card on file before the first deploy.

## 2. Pick your region

`fly.toml` ships with `primary_region = 'iad'` (US East). Change it **before**
the first deploy - it is baked in at launch. Judging by the locale directories
in `public/` (ur, hi, bn, fa, ar, id), a large share of traffic is South Asia
and the Middle East, so `bom` (Mumbai) or `sin` (Singapore) may serve users
better than `iad`. Full list: `fly platform regions`.

## 3. Persistence

The app `talklive-ai` already exists (created by `fly launch`).

`fly.toml` mounts the `talklive_data` volume at `/data` (`DATA_DIR`), so the
JSON store - accounts, friends, friend chats, call history, bans, analytics -
survives a deploy. A mount whose volume does not exist fails the deploy, and
volumes cannot be created from the Fly dashboard, so the deploy workflow
(`.github/workflows/fly-deploy.yml`) creates it once before the first deploy
that needs it. Nothing has to be run by hand.

To create or inspect it yourself:

```sh
fly scale count 1 --app talklive-ai   # a volume attaches to exactly one machine
fly volumes create talklive_data --region iad --size 1 --app talklive-ai
fly volumes list --app talklive-ai
```

**Postgres is still the better backend once there is more than one machine.**
It survives deploys, gets backed up, and does not pin the app to one machine.
`server/store.js` already supports it - set `DATABASE_URL` (Supabase and Neon
both have free tiers) and it switches backends automatically, ignoring
`DATA_DIR`. See step 4.

If you ever re-run `fly launch`, pass `--copy-config --no-deploy` so it uses
the committed `fly.toml` instead of regenerating one. The generated config sets
`auto_stop_machines = 'stop'` and `min_machines_running = 0`, which puts the
machine back to sleep and undoes the reason for this migration.

### Snapshots and recovery

The store keeps its own rotating snapshots in `/data/backups` - ten of them, at
most one every six hours, so a little over two days of history. They are copied
from the live file straight after a successful write, so a snapshot is always a
copy of something that already parsed and saved cleanly.

The rule the store follows is that **only a deliberate write of data it
actually loaded is allowed to destroy anything**. Three cases follow from it:

| What happened | What the store does |
| --- | --- |
| The file is missing (first ever boot) | Starts empty and saves normally. |
| The file exists but will not open | Touches nothing at all - no move, no write - and disables saving for the life of the process. The contents are probably fine and the fault is in the reading. |
| The file is there but is not valid JSON | Renames it to `owner-data.json.corrupt-<timestamp>`, loads the newest snapshot that parses, and writes that back as the live file. If no snapshot is usable it serves an empty store but **never saves**, so the quarantined file stays on disk for you. |

A store that has disabled saving says so loudly at boot and reports it in
`backendStatus.persistBlocked`, which the `/owner` login screen shows. If you
see it, the data is still on the volume - restore it by hand and restart:

```sh
fly ssh console --app talklive-ai
ls /data /data/backups                       # find the snapshot you want
cp /data/backups/owner-data.<stamp>.json /data/owner-data.json
exit
fly apps restart talklive-ai
```

To keep a copy off the machine entirely (the one thing a single volume cannot
give you), pull the live file down periodically:

```sh
fly ssh sftp get /data/owner-data.json ./owner-data-$(date +%F).json --app talklive-ai
```

`npm run test:durability` exercises every row of that table, including the
"database is unreachable" case below.

### Moving to Postgres without losing anyone

Setting `DATABASE_URL` is not a step before the cutover, it *is* the cutover:
from that moment Postgres is the only store and `DATA_DIR` is ignored, so
whatever is in Postgres right then becomes the whole world. A database that was
connected once and never written to again holds an empty document, and setting
the variable against it would make every account, friendship and chat on the
volume vanish from the app.

So the app carries them up itself. On the first boot with `DATABASE_URL` set,
if Postgres holds nothing and the volume still holds a real store, that file is
copied into Postgres before the first request is served and read back to check
it landed. The file then carries on as the live mirror (below), and the
original is kept in `/data/backups` first. The boot log says so, and
`backendStatus.seededFromFile` records it.

It only ever runs in that one direction and only when there is nothing to lose:
a populated database is never overwritten by a file, however stale, and a
restart after a successful cutover does not seed again. A file that is not
valid JSON is never used as a seed; its bytes are moved aside, not
overwritten.

So the whole migration is: set `DATABASE_URL` on the app and restart it.

```sh
fly secrets set DATABASE_URL='postgresql://...' --app talklive-ai
fly logs --app talklive-ai        # look for "FIRST RUN ON POSTGRES"
```

`scripts/migrate-to-postgres.js` does the same copy by hand if you ever need it
the other way round - from an exported file into a database that already has
something in it. It refuses to write when the destination holds more than the
source, and reads back what it wrote.

### Two copies, always

With `DATABASE_URL` set the store exists twice at every moment: the row in
Postgres (off this machine) and a mirror at `/data/owner-data.json` (on this
machine). Every save writes the mirror first and Postgres second, so the
mirror is never behind. Losing either one - the volume, or the whole Supabase
project - loses nobody's account.

| What happens | What the store does |
| --- | --- |
| Database unreachable at boot | Serves the mirror and keeps saving to it; pushes it up automatically when the database answers. The site keeps working. |
| Database has nothing, mirror has data | Copies the mirror up before serving (the cutover). |
| Mirror is a later version of the database | Brings the database up to date. |
| The two copies are different histories | Serves the database, keeps the other copy as `owner-data.conflict-<time>.json` and in `owner_store_history`, and reports a conflict. Nothing is overwritten. |
| A second copy of the app writes to the database | Stops writing there, keeps saving to disk, reports it. Run one machine. |
| A save suddenly drops 20%+ of accounts or chats | Keeps a copy of the state before it (on disk and in the database), then saves. Flagged in `backendStatus.lastShrink`. |

Every save is stamped with `_meta` (a lineage id, a version number and the
writing process), so which copy is newer is decided, never guessed.

**Free Supabase projects have no backups you can restore.** So the database
keeps its own: `owner_store_history` holds a snapshot every six hours (up to a
week, sized to stay under 150MB) plus every conflict and pre-drop copy for 90
days. To restore one:

```sql
UPDATE owner_store SET doc = (SELECT doc FROM owner_store_history WHERE id = <id>), updated_at = now() WHERE id = 1;
```

then restart the app. Use the **Session pooler** connection string for
`DATABASE_URL` (Supabase -> Connect -> Direct -> Session pooler); the direct
`db.<ref>.supabase.co` address needs IPv6 and may not be reachable from Fly.

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
  PREMIUM_CLIENT_IDS=... \
  TURN_URLS=... TURN_USERNAME=... TURN_CREDENTIAL=... \
  AD_DIRECT_LINK=...
```

Full list of variables the code reads: `GOOGLE_CLIENT_ID`, `OWNER_EMAIL`,
`SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM_NAME`, `SMTP_USER`, `SMTP_PASS`, `DATABASE_URL`,
`PREMIUM_CLIENT_IDS`, `TURN_*`, `METERED_*`, `AD_*`,
`LANDING_HOST`, `REPORT_TZ`, `ENFORCE_CANONICAL`.

## 5. Deploy

Pushing to `main` deploys automatically via
`.github/workflows/fly-deploy.yml` - that is the normal path, and it is what
keeps the running app from drifting behind `main`. It needs one repository
secret:

1. Mint a deploy token: `fly tokens create deploy -a talklive-ai` (or
   **Fly dashboard → talklive-ai → Tokens**).
2. Add it at **GitHub → repo → Settings → Secrets and variables → Actions →
   New repository secret**, named exactly `FLY_API_TOKEN`.

Without that secret the workflow fails at the deploy step with `unauthorized`.
Re-run a deploy without a new commit from the **Actions** tab
(*Deploy to Fly.io → Run workflow*).

To deploy by hand instead:

```sh
fly deploy
fly logs
```

Expect `TalkLive server running on port 8080` and
`[accounts] restored N account(s) from the store`.

A deploy token scoped to the app is enough for `fly certs`, `fly secrets` and
`fly logs`, but **not** for `fly deploy --depot=false`, which needs to create
the org's builder app and fails with `unauthorized`. Use an org-scoped token
if you deploy that way.

Smoke-test before touching DNS:

```sh
curl -I https://talklive-ai.fly.dev/healthz          # 200
curl -sI https://talklive-ai.fly.dev/ | grep -i robots   # noindex, nofollow
```

The `noindex` on `*.fly.dev` is deliberate - see "SEO notes" below.

## 6. Carry over the existing data

The JSON store on Render's free plan resets on redeploy, so there may be
nothing worth moving. If there is:

```sh
# from a Render shell, or wherever the current data/owner-data.json lives
fly ssh console -C "mkdir -p /data"
fly sftp shell
  put data/owner-data.json /data/owner-data.json
fly apps restart talklive-ai
```

## 7. Cut over DNS

Do this only once step 5 passes.

```sh
fly certs add talklive.app
fly certs add www.talklive.app
fly ips list          # note the v4 and v6 addresses
```

At your DNS provider:

1. **Lower the TTL on the existing records to 300s and wait for the old TTL to
   expire** - do this a day ahead if you can. Skipping it is what makes
   cutovers drag on.
2. Point `talklive.app` A → the Fly v4 IP, AAAA → the Fly v6 IP.
3. Point `www.talklive.app` the same way (the app 301s www → apex itself).
4. Wait for `fly certs show talklive.app` to report the cert as issued.
5. Verify: `curl -I https://talklive.app/` returns 200 with no `X-Robots-Tag`.
6. Raise the TTL back to 3600s.

Leave the Render service running until this is confirmed - it is your rollback.

## 8. Decommission Render

`render.yaml` has been removed from the repo. If you need it back as a
rollback, recover it from git history:

```sh
git show b4d9926:render.yaml > render.yaml
```

Delete the Render service itself from the Render dashboard once `talklive.app`
has served from Fly for a day or two with no errors.

---

## SEO notes

- **`*.fly.dev` is `noindex`.** `server/index.js` sends
  `X-Robots-Tag: noindex, nofollow` on any host that is not `CANONICAL_HOST`.
  Platform hostnames serve identical pages to the apex domain, so without this
  they are duplicate content. Previews and health checks still work.
- **No cold starts.** `auto_stop_machines = false` and
  `min_machines_running = 1` in `fly.toml`. Do not switch these on to save
  money - sleeping through Googlebot's crawl is what this migration is fixing.
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
| Machine restart loop, `exit 137` / "Out of memory" | The machine is too small. `geoip-lite` loads a 154MB database at require time; the server idles at ~218MB, so anything under 512MB gets OOM-killed. Check `[[vm]] memory` and `fly scale show` |
| "Proxy not finding machines to route requests" | Usually a symptom of the OOM loop above - no machine stays up long enough to serve. Fix the memory first |
| Health checks fail on deploy | `/healthz` must answer within the 20s `grace_period`; check `fly logs` for a crash at boot |
| `EACCES` writing `owner-data.json` | `docker-entrypoint.sh` should chown `/data`; confirm the volume is mounted with `fly ssh console -C "ls -la /data"` |
| Everything 301s to `talklive.app` | `CANONICAL_HOST` in `fly.toml` does not match the host you are testing; set `ENFORCE_CANONICAL=off` to debug |
| WebSockets disconnect | Raise the `hard_limit` in `[http_service.concurrency]` |
| Data gone after deploy | The volume is not mounted - `fly volumes list` should show `talklive_data` attached |
