# Deploying the Socket Server to Railway

The Socket.IO server (`server/`) used to run on DigitalOcean. The DO instance was stopped, which is why `https://socket.lokeshinumpudi.com` currently returns Cloudflare **530** (origin unreachable). This doc walks through bringing the server back up on Railway and re-pointing the custom domain.

## How the repo is wired for Railway

- **`Dockerfile`** (repo root) — multi-stage build, installs only `server/`'s production deps as a standalone package, runs as non-root, exposes port 3000, logs JSON to stdout.
- **`railway.json`** (repo root) — tells Railway to use the Dockerfile, healthcheck `/status`, restart on failure.
- **`.dockerignore`** — keeps the client, docs, and secrets out of the image (≈40 MB final image instead of dragging in `three.js`, `cannon-es`, etc.).
- **Root Directory in Railway service settings: leave as `/`** (the repo root). The Dockerfile is responsible for picking up just the `server/` folder.

## Why Railway

- First-class long-running TCP / WebSocket support (Vercel + Netlify can't host a Socket.IO server cleanly).
- Auto-detects the `Dockerfile` — reproducible builds, no Nixpacks surprises.
- Built-in env vars, logs, metrics, deploy previews per branch.

## One-time CLI setup (optional — dashboard works too)

```bash
npm i -g @railway/cli
railway login
railway link            # link this directory to the existing Railway project
```

## Configure the service

In the Railway dashboard, on the service connected to this repo:

1. **Settings → Source**
   - Root Directory: `/`  *(repo root, not `server/`)*
   - Build / Start commands: leave **empty** — `railway.json` + `Dockerfile` drive everything.
2. **Settings → Networking** → **Generate Domain** — gives you a `*.up.railway.app` URL for testing.
3. **Variables** — set these (mirror of `.env.production`):
   ```
   NODE_ENV=production
   CORS_ORIGINS=https://pirates.lokeshinumpudi.com,https://moana-adventures.vercel.app
   LOG_LEVEL=info
   ```
   Do **not** set `PORT` — Railway injects it automatically and `server/index.js` already honours `process.env.PORT`.

## Deploy

If you connected the repo via the dashboard, every push to the tracked branch (`release`) auto-deploys. Manual trigger:

```bash
railway up
```

## Verify

```bash
curl https://<your-service>.up.railway.app/status
# → { "status": "ok", "players": [], "connections": 0 }

railway logs            # tails JSON pino logs (Railway pretty-prints them in the UI)
```

Local sanity check before pushing:

```bash
docker build -t moana-server:test .
docker run --rm -p 3001:3000 \
  -e NODE_ENV=production \
  -e CORS_ORIGINS=https://example.com \
  moana-server:test
curl http://localhost:3001/status
```

## Re-point the custom domain

`socket.lokeshinumpudi.com` is currently fronted by Cloudflare pointing at the dead DO box. Two options:

### Option A — keep Cloudflare (recommended; free TLS + DDoS)

1. Railway → Settings → Networking → **Custom Domain** → enter `socket.lokeshinumpudi.com`. Railway shows a CNAME target like `xyz.up.railway.app`.
2. Cloudflare DNS → edit the `socket` CNAME record → point at the Railway target.
3. Cloudflare → SSL/TLS → set mode to **Full (strict)** — Railway issues a real cert.
4. **Important for WebSockets:** Cloudflare → Network → ensure **WebSockets = ON**. Without this, Socket.IO will fail to upgrade to WS (and may error out entirely).
5. Wait for DNS propagation (usually <5 min). The 530 should clear immediately once the CNAME resolves to a live origin.

### Option B — direct (no Cloudflare proxy)

1. Cloudflare → set the `socket` record to **DNS only** (grey cloud) or remove it.
2. Add the Railway-issued CNAME target directly at your registrar.

## Update the Vercel client

After the Railway URL is live, point the frontend at it:

- Vercel Dashboard → Project → Settings → Environment Variables (Production)
- Set `VITE_SERVER_URL=https://socket.lokeshinumpudi.com` (or the `*.up.railway.app` URL)
- Redeploy the Vercel project so the new env value gets baked into the build.

## Local development still works

`server/index.js` loads `../.env` (then `../.env.${NODE_ENV}` if set). With `NODE_ENV` unset locally, you get the dev `.env` values automatically — no Railway interaction needed for local runs.

## Cost / scaling notes

- Hobby plan: $5/mo flat + usage. Idle CPU on Socket.IO is tiny; expect to stay well under the included usage.
- Railway sleeps trial services after inactivity but **not** hobby/pro — for a multiplayer server you want the paid tier so the socket stays warm.
- Horizontal scale on Socket.IO requires a Redis adapter — not needed at this size.

## Rollback

```bash
railway deployments     # list past deploys
railway rollback <id>
```

Or in the dashboard: Deployments → ⋯ → Redeploy on any past green build.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| 530 from `socket.lokeshinumpudi.com` | DNS still points at the dead DO box — update Cloudflare CNAME |
| `polling` works, `websocket` upgrade fails | Cloudflare WebSockets toggle is off |
| `CORS error` in browser | `CORS_ORIGINS` env var on Railway is missing the Vercel domain |
| Container crash-loops on boot | `railway logs` — usually a missing env var; pino logs the cause as `error` |
| Build is slow / huge | Confirm `.dockerignore` is excluding `client/`; final image should be <200 MB |
| Healthcheck failing | `/status` route must respond <30s — that's the timeout in `railway.json` |
