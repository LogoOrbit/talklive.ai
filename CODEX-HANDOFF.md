# TalkLive - remaining setup tasks

Handoff for a fresh agent. Everything here is blocked on credentials that
cannot be read from a sandbox; the code and infrastructure work is done.

## Current state (verified, do not redo)

- **Live**: `https://talklive.app` returns 200, serves the real homepage, no
  `X-Robots-Tag`. Hosted on Fly.io, app `talklive-ai`, org `personal`,
  region `iad`, one `shared-cpu-1x` / 512MB machine.
- **Repo**: `LogoOrbit/talklive.ai`, branch `main`.
- **DNS**: registrar NameSilo, nameservers `ns1/2/3.dnsowl.com`. Three domains
  (`talklive.app`, `talklive.xyz`, `talklive.site`) each have
  `A @ -> 66.241.124.128`, `AAAA @ -> 2a09:8280:1::169:a88f:0`,
  `CNAME www -> <the domain>`.
- **Certificates**: all six hostnames issued on Fly.
- **Redirects**: `talklive.xyz`, `talklive.site` and all `www.` variants 301 to
  `https://talklive.app` (env `ALIAS_HOSTS` in `fly.toml`).
- **Auto-deploy**: `.github/workflows/fly-deploy.yml` deploys on push to `main`.
- **Migrated off Render.** The Render service is deleted. Do not look for it.

## Task 1 - Make auto-deploy work (blocked: GitHub secret)

The workflow exists but its first run **failed**: the `FLY_API_TOKEN`
repository secret does not exist, so `flyctl deploy` exits `unauthorized`.

1. Mint a token: `fly tokens create deploy -a talklive-ai`
   (an **org-scoped** token is required if you ever run
   `fly deploy --depot=false` - an app-scoped deploy token cannot create the
   org's builder app and fails with `unauthorized`).
2. GitHub -> repo -> Settings -> Secrets and variables -> Actions ->
   New repository secret, named exactly `FLY_API_TOKEN`.
3. Actions tab -> *Deploy to Fly.io* -> Re-run the failed run.

Verify: the run goes green and `fly releases -a talklive-ai` shows a new
version.

## Task 2 - Reconnect the database (blocked: DB password) - HIGHEST VALUE

The app currently boots with `[accounts] restored 0 account(s) from the store`
because `DATABASE_URL` is unset, so it falls back to a JSON file on the
container filesystem. **There is no volume mounted**, so that file is destroyed
on every deploy - and deploys are automatic now.

The real data already exists and is intact in Supabase:

- Project **TalkLive**, ref `kcamfetippgrawhgiabo`, region `ap-south-1`
- Table `public.owner_store`, row `id = 1`, column `doc` (jsonb), ~106 kB
- Contains: **10 accounts**, 10-entry registry, 3 reports, and the owner
  dashboard's password hash + TOTP 2FA secret
- Last written `2026-08-13 02:20 UTC` (the final Render write)

`server/store.js:139` reads exactly `SELECT doc FROM owner_store WHERE id = 1`,
so **setting `DATABASE_URL` restores all of it - no migration, no schema work.**

Get the URI from Supabase -> TalkLive -> Settings -> Database ->
Connection string -> **URI**. If the password is unknown, use *Reset database
password*; nothing else consumes it.

```sh
fly secrets set DATABASE_URL='postgresql://postgres.kcamfetippgrawhgiabo:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres' -a talklive-ai
```

Verify: `fly logs -a talklive-ai` must show
`[accounts] restored 10 account(s) from the store`. **If it still says 0, stop
and diagnose - do not proceed.** The `/owner` login page surfaces backend
status (`mode: postgres` vs `file`) without leaking secrets.

## Task 3 - Restore Google Sign-In (blocked: client ID)

`GOOGLE_CLIENT_ID` is empty, so `server/index.js:1146` rejects every attempt
with *"Google Sign-In is not configured on this server."*

The value was never committed to git (verified) and the Render dashboard that
held it is gone. Retrieve it from **Google Cloud Console -> APIs & Services ->
Credentials -> OAuth 2.0 Client IDs -> Web application**. It ends in
`.apps.googleusercontent.com` and is a public value, not a secret.

Also confirm **Authorized JavaScript origins** contains `https://talklive.app`.
If it only lists the old Render URL, sign-in fails with `origin_mismatch` even
once the ID is set.

```sh
fly secrets set GOOGLE_CLIENT_ID='...apps.googleusercontent.com' -a talklive-ai
```

Verify: `curl -s https://talklive.app/config.js` shows a non-empty
`window.GOOGLE_CLIENT_ID`, then complete a real sign-in in a browser.

## Task 4 - Email alerts (optional, blocked: Gmail app password)

`server/admin.js:22` only builds a mailer when both SMTP values are present,
and `:33` drops every send when `OWNER_EMAIL` is empty. Currently there is **no
notification** for user reports, feedback, error spikes or server crashes.

`SMTP_PASS` must be a Gmail **App Password** (Google Account -> Security ->
2-Step Verification -> App passwords), never the account password. `SMTP_HOST`
and `SMTP_PORT` default to `smtp.gmail.com:465`.

```sh
fly secrets set OWNER_EMAIL='...' SMTP_USER='...' SMTP_PASS='...' -a talklive-ai
```

## Efficiency note

`fly secrets set` restarts the machine, and boot takes ~20s because
`geoip-lite` loads a 154MB database at require time. **Set every secret in one
command** to incur a single restart rather than four.

## Guardrails - these will break production

- **Never commit a secret.** Use `fly secrets` and GitHub Actions secrets only.
- **Do not change `CANONICAL_HOST`** in `fly.toml`. Any host that is not
  `talklive.app` is served `X-Robots-Tag: noindex`; a wrong value deindexes the
  live site.
- **Do not add `*.fly.dev` to `ALIAS_HOSTS`.** Fly's health check needs a 200
  from `/healthz` on that host; a 301 fails it and takes the machine down.
- **Do not enable `auto_stop_machines` or set `min_machines_running = 0`.**
  Never sleeping is the entire reason for the move off Render's free tier.
- **Do not lower `[[vm]] memory` below 512MB**, and never set both `memory` and
  `memory_mb`. The app idles at ~218MB RSS; 256MB caused an OOM restart loop
  (exit 137).
- **Do not run more than one machine.** Socket.IO keeps matchmaking state in
  process memory; a second instance splits users into separate matchmaking
  pools. Scaling out needs a Socket.IO Redis adapter first.

## Final verification

```sh
curl -sI https://talklive.app/            # 200, and NO x-robots-tag
curl -sI https://www.talklive.app/        # 301 -> https://talklive.app/
curl -sI https://talklive.xyz/            # 301 -> https://talklive.app/
curl -sI https://talklive.site/           # 301 -> https://talklive.app/
curl -s  https://talklive.app/config.js   # non-empty GOOGLE_CLIENT_ID
fly logs -a talklive-ai | grep accounts   # restored 10 account(s)
fly status -a talklive-ai                 # 1 machine, checks passing
```
