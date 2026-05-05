# Client ↔ Server Contracts

The only protocol between the client and the server is **Socket.IO** plus a single HTTP route. This document is the source of truth for event names, payload shapes, and direction. If you change a payload, change it here in the same PR, on both sides.

> Coordinates use Three.js conventions: `+y` is up, ocean plane is `y = 0`. All positions/velocities are `{ x, y, z }` numbers in world units. Rotations are Euler radians `{ x, y, z }` (Y is yaw).

## HTTP

### `GET /status`

Server-only. Used for health checks (e.g., `curl $VITE_SERVER_URL/status`).

**Response:**

```json
{
  "status": "ok",
  "players": ["<socketId>", "..."],
  "connections": 2
}
```

`connections` is `io.engine.clientsCount` (raw socket count). `players` is the keys of the in-memory `players` Map (joined-and-named).

## Socket.IO transport

- Path: default (`/socket.io`).
- Transport: WebSocket preferred; long-poll fallback. Railway's edge handles the `Upgrade` handshake natively — no proxy config to manage in this repo.
- Auth: none — `socket.id` is the player identity for the lifetime of the connection.

## Events — server → client

| Event                  | When                                              | Payload                                                                                                       |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `world:data`           | Once per connection, on connect                   | `{ islands: Island[], collectibles: Collectible[], obstacles: Obstacle[], buoys: Buoy[] }`                    |
| `players:list`         | Reply to a `player:join`                          | `Player[]` (everyone except the joiner)                                                                       |
| `player:joined`        | A new player joined                                | `Player` (just the new one)                                                                                   |
| `player:updated`       | After another player's `player:state` or kill     | `{ id, ship?, score?, kills?, timestamp? }` (sparse)                                                          |
| `player:left`          | A player disconnected                              | `string` (socket id)                                                                                          |
| `player:hit`           | Targeted at the player who took damage             | `{ damage: number, position: Vec3, fromPlayerId: string }`                                                    |
| `player:kill`          | Targeted at the killer                             | `{ targetId: string, kills: number }`                                                                         |
| `projectile:added`     | A projectile was spawned (any player)              | `{ id, playerId, type: 'cannon' \| 'machineGun', position: Vec3, velocity: Vec3 }`                            |
| `projectile:updated`   | Owner re-sent the projectile state                 | `{ id, playerId, position: Vec3, velocity: Vec3 }`                                                            |
| `projectile:hit`       | Targeted at the projectile owner only              | `{ id, targetId, position: Vec3 }`                                                                            |
| `projectile:removed`   | Server retired a projectile (hit / expired)        | `{ id, playerId, reason: 'hit' \| 'expired', hitPosition?, targetId? }`                                       |
| `collectible:removed`  | Anyone picked up a collectible                     | `{ id, playerId }`                                                                                            |
| `explorer:state`       | Another player's explorer (on-foot mode) updated   | `{ playerId, isActive, position: Vec3, rotation: Vec3, islandId, timestamp }`                                 |
| `time:response`        | Reply to `time:request`                            | `{ serverTime: number, startTime: number }` (ms since epoch)                                                  |
| `pong`                 | Reply to `ping`                                    | _(no payload)_                                                                                                |

> **`reconcile`, `input:ack`, `players:batch`** are subscribed to by the client (`SocketManager.setupSocketListeners`) but are **not currently emitted by the server**. They are wired for future server-authoritative reconciliation. Do not rely on them today.

## Events — client → server

| Event                  | When                                       | Payload                                                                                              |
| ---------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `player:join`          | After socket `connect`, once               | `{ id, name, ship: ShipState }`                                                                      |
| `player:state`         | Every 50 ms (80 ms with active projectiles)| `{ ship: ShipState, score, kills, projectiles?: Projectile[], inputSequence }`                       |
| `projectile:fire`      | When a weapon fires                        | `{ id, type, position: Vec3, velocity: Vec3 }`                                                       |
| `projectile:hit`       | Reserved (currently emitted as `sendProjectileHit`) | `{ projectileId, targetId, position: Vec3 }` _(server has no handler for this today)_       |
| `projectile:remove`    | Reserved                                    | `{ id }` _(server has no handler for this today)_                                                    |
| `explorer:state`       | While on foot                              | `{ playerId, isActive, position, rotation, islandId, timestamp }`                                    |
| `collectible:pickup`   | When the player walks over a collectible    | `{ playerId, collectibleId }`                                                                        |
| `time:request`         | On connect, then every 60 s                 | _(no payload)_                                                                                       |
| `ping`                 | Every 5 s when connected                    | _(no payload)_                                                                                       |

## Type shapes

```ts
type Vec3 = { x: number; y: number; z: number };

type ShipState = {
  position: Vec3;
  rotation: Vec3;          // Euler radians; y = yaw
  direction: Vec3;          // unit forward vector
  speed: number;
  health: number;
  maxHealth: number;
};

type Player = {
  id: string;               // socket.id
  name: string;
  ship?: ShipState;
  score?: number;
  kills?: number;
  explorer?: ExplorerState;
};

type Island = {
  id: string;
  name: string;
  advertiser?: string;      // present only on advertised islands
  position: Vec3;
  radius: number;           // world units
  height: number;
  hasDock: boolean;
  dockAngle?: number;       // radians
  dockPosition?: Vec3;
  dockDirection?: { x: number; z: number };
  vegetation: boolean;
  customModel: string | null;
};

type Collectible = {
  id: string;
  type: 'treasure' | 'gem' | 'fruit' | 'wood'
      | 'powerup_health' | 'powerup_speed' | 'powerup_shield' | 'powerup_weapon';
  value: number;
  position: Vec3;
  islandId: string;
};

type Obstacle = {
  id: string;
  type: 'rock' | 'log' | 'buoy';
  position: Vec3;
  rotation: number;
  scale: number;
};

type Buoy = {
  id: string;
  position: Vec3;
  order: number;            // race track index
};

type Projectile = {
  id: string;
  ownerId: string;          // server-side only
  type: 'cannon' | 'machineGun';
  position: Vec3;
  velocity: Vec3;           // world units / second
  createdAt: number;        // server ms
};
```

## Server-side rules and invariants

These behaviors live in `server/index.js`. Clients should not duplicate them; they should react to broadcasts.

- **Projectile lifetime:** `MAX_PROJECTILE_LIFETIME = 10_000 ms`. Older projectiles are GC'd silently (no `projectile:removed` event for `expired`-by-age via the sim loop — only via explicit removal).
- **Gravity:** `9.8` units/s², applied each tick to `velocity.y`.
- **Hit radius:** `1.5` for `machineGun`, `3.0` for `cannon`.
- **Damage:** `1` for `machineGun`, `10` for `cannon`. Both subtract from `players.get(targetId).ship.health`.
- **Kill credit:** when a hit drops health ≤ 0, the killer's `kills` increments and is broadcast via `player:updated`. The killer also receives `player:kill`.
- **Spawn buffer:** islands are placed at least 100 units from the origin (`isPositionValid` filters spawn-clear zone).
- **Self-damage:** projectiles never collide with their owner (`if (playerId === projectile.ownerId) return;`).

## Versioning

There is no protocol version field today. Backward-compat is enforced socially: if you must break the wire, search for the event name in `client/src/js/SocketManager.js` and `server/index.js` and update both atomically. Add a deprecation log on the legacy path for one release before removal.

## When you change this file

- Update `client/src/js/SocketManager.js` and `server/index.js` in the same PR.
- Run both ends locally (`yarn start:server`, `yarn start:client`) and verify with browser devtools (Network → WS frames) before pushing.
- If the change affects deployed behavior, check `docs/DEPLOYMENT.md` and `docs/DEBUGGING.md` for any references that need updating.
