# Runbook — build, run, deploy

Single-page reference for the everyday loop. For deeper context see `ARCHITECTURE.md`, `CONTRACTS.md`, `DEPLOYMENT.md`, and `DEBUGGING.md`.

## Prerequisites

- Node.js ≥ 18 (Railway and Dockerfile use Node 20).
- Yarn 1.x (`yarn.lock` is v1; do **not** migrate to npm/pnpm).
- macOS / Linux. Windows works via WSL.
- Optional CLIs:
  - `vercel` — client deploys.
  - `railway` — server deploys.
  - `docker` — local server image build.

## First-time setup

```sh
git clone <repo>
cd moana-adventures
yarn install                          # installs root + client + server workspaces
cp .env.example .env                  # configure local dev (see below)
```

### `.env` (single source of truth)

Both client and server read `.env` from the **monorepo root** (the server uses `dotenv`, the client uses Vite's `envDir`). Override per-environment via `.env.${NODE_ENV}` (e.g. `.env.production`).

Variables that matter:

| Var                | Tier   | Notes                                                                      |
| ------------------ | ------ | -------------------------------------------------------------------------- |
| `NODE_ENV`         | both   | `development` locally, `production` in Vercel/Railway.                      |
| `PORT`             | server | Defaults `3000`. Railway injects its own; don't hardcode.                   |
| `CORS_ORIGINS`     | server | Comma-separated allow-list. Empty → allow any (dev only).                   |
| `LOG_LEVEL`        | server | `trace|debug|info|warn|error|fatal`. Defaults `debug` (dev) / `info` (prod). |
| `VITE_SERVER_URL`  | client | Browser → server URL. Required (client throws if missing).                  |

> `VITE_*` is the only prefix exposed to the browser. Never put secrets there.

## Run locally

The Yarn 1 `workspaces run` runs serially, so launch each tier in its **own terminal**:

```sh
# Terminal 1 — server (port 3000)
yarn dev:server

# Terminal 2 — client (port 5173/5174)
yarn dev:client
```

Open `http://localhost:5173`. Two browsers see each other through the local server.

### Available scripts

| Script              | What it does                                                       |
| ------------------- | ------------------------------------------------------------------ |
| `yarn dev:client`   | Vite dev server with HMR.                                          |
| `yarn dev:server`   | Node + nodemon. Reloads on file changes.                           |
| `yarn build`        | Production build → `client/dist/`.                                 |
| `yarn preview`      | Serve the built client locally (sanity-check the prod bundle).     |
| `yarn lint`         | ESLint on the client. Server has no installed linter today.         |
| `yarn lint:fix`     | Auto-fix client lint issues.                                       |
| `yarn test`         | Runs each workspace's `test` script.                               |
| `yarn test:client`  | Jest + jsdom (`client/tests/`).                                    |
| `yarn test:server`  | Placeholder; no runner installed.                                  |
| `yarn docker:build` | Build the server image from the root `Dockerfile`.                 |
| `yarn docker:run`   | Run the image locally with `.env` mounted.                         |
| `yarn deploy:client`| `vercel --prod` (requires `vercel login` + `vercel link`).         |
| `yarn deploy:server`| `railway up --service moana-server` (requires `railway login`).    |
| `yarn logs:client`  | Tail Vercel production logs.                                       |
| `yarn logs:server`  | Tail Railway logs.                                                 |

## Build

```sh
yarn build              # client only — outputs client/dist/
yarn preview            # serve the built bundle on http://localhost:4173
```

The server has no build step (plain CommonJS).

## Deploy

### Client → Vercel

- **Auto:** push to `release` triggers the Vercel GitHub integration.
- **Manual:** `yarn deploy:client` (alias for `vercel --prod`).
- **Build settings:** `vercel.json` at repo root pins `buildCommand: yarn build:client` and `outputDirectory: client/dist`. Don't override in the Vercel UI.
- **Env:** set `VITE_SERVER_URL` (and any other `VITE_*` vars) under Production scope. Redeploy after changes.

Rollback:

```sh
vercel ls
vercel rollback                       # to previous prod
vercel promote <deployment-url>        # specific deploy
```

See `docs/vercel-debugging.md` for full Vercel ops.

### Server → Railway

- **Auto:** Railway GitHub integration deploys on push to `release` (root directory `server/`).
- **Manual:** `yarn deploy:server` (alias for `railway up`).
- **Image:** uses the repo-root `Dockerfile` (per `railway.json`). Health check is `GET /status`.
- **Env:** set on Railway → Variables. Mirror `.env.production` (`NODE_ENV`, `CORS_ORIGINS`, `LOG_LEVEL`).
- **Custom domain:** `socket.lokeshinumpudi.com` is registered at Railway and CNAME'd at **Namecheap** (no Cloudflare proxy). Until Railway has issued the cert for it, keep `VITE_SERVER_URL` pointed at the Railway-provided URL. See `docs/DEPLOYMENT.md` → "Custom domain" for the swap.

Rollback:

```sh
railway deployments
railway rollback <id>
```

See `docs/railway-deployment.md` for the full migration runbook.

### Docker (server, local or any container host)

```sh
yarn docker:build
yarn docker:run                       # honours .env
```

## Smoke tests after deploy

`SERVER` below is whichever URL `VITE_SERVER_URL` currently uses (the Railway public URL or `socket.lokeshinumpudi.com` once its cert is live):

```sh
SERVER=https://moana-server-production.up.railway.app   # or https://socket.lokeshinumpudi.com

# Server health
curl -i $SERVER/status

# Server CORS check (must echo your origin back)
curl -sI -H "Origin: https://pirates.lokeshinumpudi.com" $SERVER/status \
  | grep -i access-control-allow-origin

# Client
curl -I https://pirates.lokeshinumpudi.com

# WebSocket round-trip (uses installed socket.io-client)
node -e "const io=require('socket.io-client'); \
  const s=io(process.env.SERVER); \
  s.on('connect', ()=>{console.log('ok',s.id); s.close();});"
```

If anything goes red, jump to `docs/DEBUGGING.md` (production playbook).

## Things to never do

- Don't commit `.env` (only `.env.example`).
- Don't hardcode the socket URL in `client/src/js/SocketManager.js` — read from `VITE_SERVER_URL`.
- Don't widen `CORS_ORIGINS` to `*` in production.
- Don't add a database/auth without an architecture discussion (see `CLAUDE.md`).
- Don't add a Cloudflare proxy in front of either subdomain without an explicit reason — the current stack is direct DNS → Vercel/Railway, and any proxy in between needs its own WebSocket-upgrade story.
