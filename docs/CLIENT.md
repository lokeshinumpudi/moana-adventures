# Client Guide

The client is a Vite single-page app. There is **no framework** (no React, Vue, etc.) — `Game.js` mounts a Three.js scene directly into `#game-container`.

## Boot sequence

1. `client/index.html` defines `#game-container` and `#loading-screen`.
2. `client/src/main.js` waits for `DOMContentLoaded`, calls `inject()` (Vercel analytics), constructs `new Game(container)`, then `await game.init()` and finally `game.start()`.
3. `Game.init()` builds the scene (renderer, camera, lights, ocean, skybox, weather), instantiates managers (input, physics, sound, HUD), and connects via `SocketManager`.
4. `world:data` from the server populates islands, collectibles, obstacles, and buoys.
5. `game.start()` kicks off the rAF loop.

## Module map

| Module                                  | Role                                                              |
| --------------------------------------- | ----------------------------------------------------------------- |
| `Game.js`                               | Owns the scene, the loop, and references to every other manager. Big file (~2k LoC) by design — keep new feature wiring localised in named methods. |
| `SocketManager.js`                      | Singleton. All Socket.IO I/O. Contains the prediction/reconciliation primitives (most are wired but unused — see `docs/CONTRACTS.md`). |
| `components/Ship.js`                    | Local player ship: physics, controls, weapon mounts, health.      |
| `components/Ocean.js`                   | Wave shader / mesh.                                                |
| `components/SkyBox.js` + `effects/Weather.js` | Skybox, day/night driven by `time:response`, storms.        |
| `components/Island.js`                  | Renders an island from `Island` payload (advertised islands draw extra signage). |
| `components/Collectible.js`             | Pickup mesh + glow.                                               |
| `components/Obstacle.js`                | Rocks / logs / buoy obstacles.                                    |
| `components/Buoy.js`                    | Race track marker.                                                |
| `components/Projectile.js`              | Visual + local trajectory until the server broadcasts.            |
| `components/Character.js` / `Explorer.js` | On-foot avatar when the player docks.                           |
| `components/HUD.js` + `ui/hud.css`      | Health bar, score, kills, weapon cooldowns, minimap.              |
| `components/AudioControls.js`           | Mute / volume UI hooked to `SoundManager`.                        |
| `components/ParticleSystem.js`          | Reusable particle pool (impacts, water spray).                    |
| `utils/InputManager.js`                 | Keyboard + mouse capture; exposes booleans like `isMovingForward()`. |
| `utils/CameraManager.js`                | Camera modes (chase, free, top-down) + presets `1`–`4`.           |
| `utils/PhysicsManager.js`               | `cannon-es` world; collisions for ship vs island/obstacle.        |
| `utils/SoundManager.js`                 | Audio graph + asset loading.                                      |
| `utils/NotificationManager.js`          | Toast-style messages (kills, pickups, errors).                    |
| `utils/DebugOverlay.js`                 | Toggleable on-screen FPS / state panel.                           |
| `utils/ShipModelGenerator.js`           | Procedural ship geometry helper.                                  |

## State flow per frame

```
rAF tick
 ├─ inputManager updates internal flags
 ├─ ship.update(delta, inputManager)            // local physics + controls
 ├─ physicsManager.step(delta)                  // cannon-es world
 ├─ ocean / weather / particles update
 ├─ socketManager.update(delta)                 // gated to 50/80 ms
 │    └─ emits 'player:state'
 ├─ interpolate other-player ships
 ├─ camera follow
 └─ renderer.render(scene, camera)
```

## Conventions

- All `import` paths are relative and end in `.js` — there is no path alias. Adding one needs a `vite.config.js` change.
- `console.log/info/debug` is **stripped** in production by `vite-plugin-remove-console` and `esbuild.drop`. Use `console.warn` / `console.error` for anything you want to keep in prod.
- Three.js `Vector3`/`Euler` instances are reused where possible; do not allocate per-frame inside `update()`.
- Keep new managers under `js/utils/` if they're stateless helpers, `js/components/` if they own a Three.js object, and `js/effects/` if they layer on top of the scene globally.

## Adding a new networked entity

1. Define the wire shape in `docs/CONTRACTS.md`.
2. Add the server emit in `server/index.js` (and a handler if the client sends one).
3. Subscribe in `SocketManager.setupSocketListeners()`; forward to a method on `Game`.
4. Implement the visual in a new `components/<Thing>.js` exposing `update()` and `dispose()`.
5. Add a manager-style accessor on `Game` (`addThing` / `removeThing`) so other systems can react.

## Testing

- `yarn workspace client test` — Jest + jsdom. Tests live under `client/tests/{components,network,utils}`.
- The client mocks Three.js via `client/__mocks__/`. When you add a Three.js dependency, check whether it needs a mock.
- `yarn workspace client lint` — ESLint with the rules in `client/.eslintrc.cjs` (single quotes, 2-space indent, max-len 100).

## Local dev

```sh
yarn install
cp .env.example .env       # ensure VITE_SERVER_URL is set (default: http://localhost:3000)
yarn dev:server            # node + nodemon, port 3000   (terminal 1)
yarn dev:client            # vite, port 5173/5174        (terminal 2)
```

Open `http://localhost:5173`. The socket URL is driven by `VITE_SERVER_URL` (read at build time via Vite's `envDir: '..'`). The client throws on boot if the var is missing — don't try to fall back silently.

Full command reference is in `docs/RUNBOOK.md`.
