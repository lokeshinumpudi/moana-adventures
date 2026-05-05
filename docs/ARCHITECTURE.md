# Architecture

Moana's Wake is a 3D multiplayer browser game. Two tiers, both JavaScript:

- **`client/`** — Vite + Three.js single-page app, deployed to **Vercel**.
- **`server/`** — Node + Express + Socket.IO authoritative state hub, deployed to **Railway** as a Docker container (Node 20-alpine, non-root). Railway terminates TLS and issues the cert.

They communicate over a single Socket.IO connection. There is no database; all world state is generated on server boot and held in memory.

## High-level diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser (Vercel: pirates.lokeshinumpudi.com)                        │
│                                                                      │
│  main.js → Game.js                                                   │
│            │                                                         │
│            ├── Three.js scene (Ship, Ocean, Island, Explorer, ...)   │
│            ├── InputManager (keyboard + mouse)                       │
│            ├── PhysicsManager (cannon-es) + client prediction        │
│            ├── HUD / NotificationManager / DebugOverlay              │
│            ├── SoundManager / Weather                                │
│            └── SocketManager (singleton) ──── Socket.IO ─────┐       │
└──────────────────────────────────────────────────────────────┼───────┘
                                                               │
              wss://socket.lokeshinumpudi.com  (fallback: moana-server-production.up.railway.app)
                                                               │
┌──────────────────────────────────────────────────────────────┼───────┐
│  Railway edge (TLS) → container (node :3000)                 │       │
│                                                              ▼       │
│  server/index.js                                                     │
│      ├── Express ( GET /status )                                     │
│      ├── Socket.IO event handlers (player:*, projectile:*, ...)      │
│      ├── pino structured logging → stdout (Railway ingests)          │
│      ├── World generator (islands / collectibles / obstacles / buoys)│
│      ├── 20 Hz projectile physics simulation loop                    │
│      └── TimeManager (server time / day-night sync)                  │
│                                                                      │
│  In-memory:  players Map · projectiles Map · worldData               │
└──────────────────────────────────────────────────────────────────────┘
```

## Domains and origins

| Surface                       | URL                                                       | Notes                                                                           |
| ----------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Client (prod)             | `https://pirates.lokeshinumpudi.com`             | Vercel; Namecheap CNAME `pirates` → `cname.vercel-dns.com.`                    |
| Client (Vercel alt)       | `https://moana-adventures.vercel.app`            | Allow-listed in server CORS                                                    |
| Socket server (prod)      | `https://socket.lokeshinumpudi.com`              | Value of `VITE_SERVER_URL` in `.env.production`; Railway serves TLS directly.  |
| Socket server (fallback)  | `https://moana-server-production.up.railway.app` | Railway-generated hostname; useful for direct health checks or bypassing DNS.  |
| Client dev                | `http://localhost:5173` / `:5174`                | Vite dev server                                                                |
| Server dev                | `http://localhost:3000`                          | `yarn dev:server` (nodemon)                                                    |

The hostname the client uses is `import.meta.env.VITE_SERVER_URL` (read by `client/src/js/SocketManager.js` on boot — fail-loud if missing). The committed production value is `https://socket.lokeshinumpudi.com`. The server CORS allow-list is `process.env.CORS_ORIGINS` (`server/index.js`). Changing either requires a coordinated change on both sides — see `docs/CONTRACTS.md` and `docs/DEPLOYMENT.md`.

DNS reality check:

```sh
$ dig +short NS lokeshinumpudi.com
dns1.registrar-servers.com.        # Namecheap
dns2.registrar-servers.com.
```

There is **no Cloudflare** proxy. Older docs that referenced Cloudflare/EB are wrong and have been updated.

## Repository layout

```
moana-adventures/
├── client/                 # Vite app (workspace)
│   ├── index.html
│   ├── vite.config.js      # terser + remove-console in prod
│   └── src/
│       ├── main.js         # entry: instantiates Game
│       ├── style.css, ui/hud.css
│       └── js/
│           ├── Game.js              # ~2k LoC monolith — main loop, world wiring
│           ├── SocketManager.js     # network, prediction, reconciliation
│           ├── components/          # Three.js entities (Ship, Ocean, Island, ...)
│           ├── effects/Weather.js   # sky / day-night / storms
│           └── utils/               # InputManager, PhysicsManager, HUD helpers, sound
├── server/                 # Socket.IO server (workspace)
│   ├── index.js            # all routes + handlers + sim loop
│   ├── src/
│   │   ├── timeManager.js  # time:request / time:response
│   │   └── logger.js       # pino logger (level from LOG_LEVEL)
│   ├── .ebextensions/      # legacy AWS EB hooks — retired, kept for history
│   ├── readme.md           # legacy AWS EB / Route 53 / nginx setup notes — historical
│   └── Procfile            # legacy `web: npm start` — Railway uses Dockerfile/CMD
├── docs/                   # this directory
├── scripts/                # asset generators
├── Dockerfile              # repo-root multi-stage build (Railway)
├── railway.json            # Railway build/deploy config
├── .dockerignore           # keeps client/, docs/ out of the image
├── vercel.json             # Vercel build config
└── package.json            # yarn workspaces (client, server)
```

## Runtime model

### Authority

The server is **soft-authoritative**:

- Player ship position/rotation/health is sent by the client (`player:state`); the server stores and rebroadcasts.
- Projectiles are simulated **on the server** (gravity, collisions, lifetime); clients render the broadcast.
- Collectible pickups, kills, and scores are server-authoritative.
- Time-of-day is driven by `TimeManager` so all clients render the same dawn/dusk.

This is intentional for a small project: it keeps the server cheap (a single small Railway instance) while still preventing the worst forms of weapon abuse.

### Client tick

`Game.update()` runs at `requestAnimationFrame` rate. `SocketManager.update()` is gated to **20 Hz** (50 ms), or 12.5 Hz (80 ms) when projectiles are flying, so we don't saturate the socket. Other-player ships are interpolated between received snapshots; large jumps (> 50 units) teleport instead of lerp.

### Server tick

`updateProjectilePhysics` runs every 50 ms (20 Hz). It applies gravity, advances positions, runs sphere-vs-sphere collision against all players, and emits `projectile:hit` / `player:hit` / `projectile:removed`.

### World generation

On boot, `initializeWorld()` deterministically seeds five islands (one advertised — "Loki's Island" at primaryNorth — plus four random), per-island collectibles, obstacles, and a 20-buoy oval race track. The result is broadcast to each new client via `world:data` on connect.

## Key entry points

| Concern                       | File                                              |
| ----------------------------- | ------------------------------------------------- |
| Boot the game                 | `client/src/main.js`                              |
| Frame loop / scene wiring     | `client/src/js/Game.js`                           |
| Socket I/O + prediction       | `client/src/js/SocketManager.js`                  |
| Local physics + collisions    | `client/src/js/utils/PhysicsManager.js`           |
| Server connection list / sim  | `server/index.js`                                 |
| World tunables                | `WORLD_CONFIG` in `server/index.js`               |
| Advertised islands            | `ADVERTISED_ISLANDS` in `server/index.js`         |
| CORS allow-list               | `server/index.js` (top)                           |

## Things that are deliberately not here

- No DB, no Redis, no auth. Player IDs are Socket.IO connection IDs; sessions die on disconnect.
- No build step on the server (plain CommonJS).
- No bundler chunking on the client (`manualChunks: undefined`); Three.js is shipped as one bundle.
- No room or matchmaking — every connected socket is in one global world.

These are constraints to keep in mind when reviewing PRs and when an agent is asked to "add X". If a feature requires persistence, it needs a design discussion first.
