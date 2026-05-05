# Server Guide

The server is a single-process Node app: Express for one HTTP route, Socket.IO for everything else. All state is in-memory; restarts wipe the world.

## File layout

```
server/
├── index.js              # ~770 LoC — http + sockets + sim loop + world gen
├── src/timeManager.js    # time:request / time:response
├── package.json          # express, socket.io, cors, nodemon
├── Procfile              # web: npm start
├── .ebextensions/
│   └── install_packages.config   # npm ci --omit=dev, rebuild, chown
└── tests/server.test.js  # supertest + socket.io-client integration tests
```

## What `index.js` is doing, top to bottom

1. **Bootstrap** — Loads `../.env` (and `../.env.${NODE_ENV}`), then Express + HTTP server + Socket.IO. CORS is driven by `process.env.CORS_ORIGINS` (comma-separated); empty falls back to `origin: true` (dev only).
2. **`TimeManager`** — listens for `time:request`, replies with server time. Used to sync day/night across clients.
3. **In-memory state**
   - `players: Map<socketId, Player>`
   - `projectiles: Map<projectileId, Projectile>` (server-owned simulation)
   - `worldData: { islands, collectibles, obstacles, buoys }` (immutable after boot, except collectibles which shrink)
4. **World generation** — `initializeWorld()` runs once at startup:
   - `ADVERTISED_ISLANDS.advertisers[]` are placed first by `priority`.
   - Remaining islands fill up to `WORLD_CONFIG.islands.count` at random valid positions.
   - Collectibles are scattered on each island (count between `min`/`max`).
   - Obstacles + 20 buoys complete the scene.
5. **HTTP** — `GET /status` returns players + connection count.
6. **Sim loop** — `setInterval(updateProjectilePhysics, 50)` advances projectiles, runs collisions, emits hit/kill events.
7. **Socket handlers** — see `docs/CONTRACTS.md` for the wire-level list. Each handler is wrapped in `try/catch` and logs errors.
8. **Listen** — port from `PORT` env or `3000`. On Railway, `PORT` is injected by the platform; Railway's edge terminates TLS and routes to that port.

## Tunables

All gameplay knobs live in two top-level objects in `index.js`:

- `WORLD_CONFIG` — world size, island count/range, collectible types, obstacle count.
- `ADVERTISED_ISLANDS` — fixed-position islands with names/sponsors. Add or remove entries here, then redeploy.

Physics knobs are loose constants (`GRAVITY`, `MAX_PROJECTILE_LIFETIME`, the hit radii inside `updateProjectilePhysics`). If they multiply, group them into a `PHYSICS` object.

## Logging

Structured logs via `pino` (`server/src/logger.js`). In dev, `pino-pretty` colourises stdout; in production, raw JSON goes to stdout for Railway to ingest. Tail with `yarn logs:server` (= `railway logs`).

Log level is set by `LOG_LEVEL` env var (`info` in prod, `debug` in dev). Sensitive paths (`req.headers.authorization`, `req.headers.cookie`, `*.password`, `*.token`) are redacted by config — don't log around the redactor.

All `console.*` calls in `server/index.js` and `server/src/timeManager.js` have been migrated to `logger.{info,debug,error}` — keep it that way. New code should `require('./src/logger')` and call `logger.info({ ... }, 'msg')`. Reserve `console.*` for ad-hoc local debugging that won't be committed.

## Adding a new socket event

1. Add the contract in `docs/CONTRACTS.md` first — direction, payload, side effects.
2. Add the handler inside `io.on('connection', socket => { ... })` in `index.js`. Wrap it in `try/catch` and `if (!players.has(socket.id)) return;` if it depends on a joined player.
3. Decide who to broadcast to:
   - Self only: `socket.emit(...)`.
   - All others: `socket.broadcast.emit(...)`.
   - Everyone including self: `io.emit(...)`.
4. Mirror the change in `client/src/js/SocketManager.js` (`setupSocketListeners` for incoming, a `send*` helper for outgoing).
5. Cover it with a server-side test in `server/tests/server.test.js`.

## Lifecycle and cleanup

On `disconnect`:

- All projectiles owned by that player are removed.
- The player entry is deleted from `players`.
- `player:left` is broadcast.

There is no inactivity timeout server-side — the client side prunes stale ghosts after 10 s of no updates (`SocketManager.updateOtherPlayersInterpolation`).

## Deploy artefacts

The server runs in a Docker container on Railway. Relevant files:

- `Dockerfile` (repo root) — multi-stage Node 20-alpine; runs as non-root `app`; `CMD ["node", "index.js"]`.
- `.dockerignore` — keeps `client/`, `docs/`, `node_modules` out of the image.
- `railway.json` (repo root) — `builder: DOCKERFILE`, `healthcheckPath: /status`, `restartPolicyType: ON_FAILURE`.
- `server/.ebextensions/`, `server/Procfile`, `server/readme.md` — historical AWS Elastic Beanstalk artefacts. Safe to ignore; do not extend.

DNS for the custom domain `socket.lokeshinumpudi.com` is at **Namecheap** with no Cloudflare proxy. Railway issues and renews the TLS cert directly. See `docs/DEPLOYMENT.md` and `docs/railway-deployment.md`.

## Performance budget

The server is sized for one Railway hobby instance. It can comfortably hold a couple of dozen sockets at 20 Hz. Before adding a feature that emits per-frame, ask: does it need to be 20 Hz, or can it ride along on `player:state`?

Horizontal scale on Socket.IO requires a Redis adapter (`@socket.io/redis-adapter`) to share state across replicas — not needed at this size, but a forced design discussion if you ever set `numReplicas > 1` in `railway.json`.
