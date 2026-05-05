# CLAUDE.md — agent entry point

Read this file first when working in this repo. It tells you where to look, what to touch, and what not to.

## What this project is

Moana's Wake is a 3D multiplayer browser game (Three.js + Socket.IO). Two workspaces, both JavaScript:

- `client/` — Vite SPA, deployed to Vercel at `https://pirates.lokeshinumpudi.com`.
- `server/` — Node + Express + Socket.IO, deployed to Railway (Docker). Public URL is `https://moana-server-production.up.railway.app` (currently the value of `VITE_SERVER_URL`). The custom domain `socket.lokeshinumpudi.com` is registered with Railway and CNAME'd at Namecheap; swap `VITE_SERVER_URL` to it once Railway finishes issuing the Let's Encrypt cert.

DNS for `lokeshinumpudi.com` is **Namecheap BasicDNS** — there is no Cloudflare proxy in front of either subdomain.

In-memory state only — no database, no auth, single global world.

## Authoritative docs

Always read the relevant file in `docs/` before acting:

| If the task is...                           | Read first                          |
| ------------------------------------------- | ----------------------------------- |
| Big-picture, "where does X live"            | `docs/ARCHITECTURE.md`              |
| Build / run-locally / deploy commands       | `docs/RUNBOOK.md`                   |
| Anything touching client ↔ server messages  | `docs/CONTRACTS.md` (source of truth) |
| Frontend / Three.js / HUD                   | `docs/CLIENT.md`                    |
| Socket handlers / world gen / sim loop      | `docs/SERVER.md`                    |
| Vercel / Railway / Namecheap DNS            | `docs/DEPLOYMENT.md`                |
| Production incident                         | `docs/DEBUGGING.md`                 |

If you change a wire shape, **update `docs/CONTRACTS.md` in the same change** as the client and server edits.

## Repo layout, fast

```
client/src/js/
  Game.js              # ~2k LoC main loop / scene wiring
  SocketManager.js     # all Socket.IO I/O (singleton)
  components/          # Three.js entities (Ship, Ocean, Island, …)
  utils/               # InputManager, PhysicsManager, HUD helpers, sound
  effects/Weather.js
server/
  index.js             # express + sockets + 20 Hz projectile sim + world gen
  src/timeManager.js
  src/logger.js        # pino instance
  .ebextensions/       # legacy EB hooks — retired, kept for historical reference
```

## Working rules

- **Don't add a database, auth, or rooms** without an explicit design discussion. The whole stack assumes single-process in-memory state.
- **Don't use `console.log` in client code paths you want to keep in production.** Vite strips `log/info/debug` in prod (`client/vite.config.js`). Use `console.warn` or `console.error`.
- **Don't allocate per frame** in `update()` paths in `client/src/js/`. Reuse `THREE.Vector3` / `THREE.Euler` instances.
- **Don't widen CORS to `*`** on the server. Add the specific origin.
- **Don't change `ADVERTISED_ISLANDS` on a whim** — those are sponsor placements.
- **Don't rename socket events without a deprecation step.** There is no protocol version.
- **Test before you deploy.** Server: `yarn workspace server test`. Client: `yarn workspace client test` and `yarn workspace client lint`.
- **Coordinate deploys.** A wire change requires both client (Vercel) and server (Railway) in the same window. See `docs/DEPLOYMENT.md`.

## Skills you can invoke

Skills live in `.claude/skills/` and cover the recurring tasks:

- `debug-deployed` — production incident triage (see `docs/DEBUGGING.md`).
- `socket-debug` — diagnose a client/server message problem.
- `change-contract` — safely add or modify a Socket.IO event.
- `three-perf` — investigate FPS or render perf regressions.

Read the SKILL.md inside each before starting that kind of work.

## Commands you'll use most

```sh
yarn install
yarn dev:server           # node + nodemon, port 3000   (terminal 1)
yarn dev:client           # vite, port 5173/5174        (terminal 2)
yarn lint                 # client eslint
yarn test                 # all workspace tests
yarn build                # client production build → client/dist/

yarn deploy:client        # vercel --prod
yarn deploy:server        # railway up --service moana-server
yarn logs:client          # vercel logs --prod
yarn logs:server          # railway logs
```

Pushes to `release` auto-deploy both tiers via the Vercel + Railway GitHub integrations. Manual deploys are listed above. Full command reference: `docs/RUNBOOK.md`.

## When in doubt

1. Read `docs/ARCHITECTURE.md`.
2. Find the file in the table above.
3. If the task spans both tiers, write the contract change first, then implement.
4. Run both ends locally and watch the WebSocket frames in devtools before pushing.
