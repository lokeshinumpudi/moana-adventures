# Debugging Deployed Systems

Production triage playbook. Each entry has: **symptom → fastest signal → likely cause → fix**. Order matches frequency.

> Throughout this doc, `$SERVER` should normally be the production socket domain: `https://socket.lokeshinumpudi.com`. Keep the Railway-generated hostname (`https://moana-server-production.up.railway.app`) as the direct-to-origin fallback when diagnosing DNS or custom-domain issues. Set it once: `export SERVER=https://socket.lokeshinumpudi.com`.

## Quick triage commands

```sh
# Server alive?
curl -i $SERVER/status

# Server returns CORS for the prod client origin?
curl -sI -H "Origin: https://pirates.lokeshinumpudi.com" $SERVER/status \
  | grep -i access-control-allow-origin

# Client serving?
curl -I https://pirates.lokeshinumpudi.com

# DNS sane?
dig +short pirates.lokeshinumpudi.com cname     # → cname.vercel-dns.com.
dig +short socket.lokeshinumpudi.com  cname     # → <hash>.up.railway.app.
dig +short NS lokeshinumpudi.com                # → dns1/dns2.registrar-servers.com (Namecheap)

# TLS expiry on the live socket URL
echo | openssl s_client -servername $SERVER -connect ${SERVER#https://}:443 2>/dev/null \
  | openssl x509 -noout -dates
```

If `/status` returns 200 and `connections > 0` while a tab is open, the wire is fine and the bug is gameplay or client-side.

## 1. "Players see each other for a moment then ghost"

- **Symptom**: Other ships appear, freeze, then disappear after ~10 s.
- **Signal**: Browser devtools → Network → WS → no `player:updated` frames after a few seconds. Server `/status` still shows the missing player in `players`.
- **Cause**: Client's 10-second inactivity prune fired (`SocketManager.updateOtherPlayersInterpolation`). Usually means the other player's `player:state` emit stopped — either their tab was throttled (background), or `socketManager.update()` is gated and never running because `game.ship` was destroyed without restart.
- **Fix**: Reload. If reproducible, check `Game.restart()` — it must reset `socketManager`'s `lastUpdateTime` and the local ship reference.

## 2. CORS error in the browser

- **Symptom**: `Access to XMLHttpRequest at '<server>/socket.io/...' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present`.
- **First, rule out a TLS-as-CORS red herring**:
  ```sh
  curl -sI $SERVER/status
  ```
  If this returns HTTP 000 / SSL verify failed, the browser is hitting a TLS error and *reporting* it as CORS. This most often happens during a recent CNAME change or certificate reprovision. Either wait it out or temporarily point `VITE_SERVER_URL` at the Railway-generated URL.
- **If TLS is fine but CORS is genuinely missing**: the browser origin (e.g., a fresh Vercel preview URL) is not in `CORS_ORIGINS`.
  - **Fix**: add the origin to the Railway service env var (`CORS_ORIGINS` is comma-separated, no glob), then redeploy:
    ```sh
    railway variables --set "CORS_ORIGINS=<existing>,https://<new>.vercel.app"
    railway redeploy
    ```
  - **Don't** set the allow-list to `*` in production — Socket.IO with credentials misbehaves and the browser refuses anyway.

## 3. TLS error on the socket URL

- **Symptom**: `ERR_CERT_*` only on the socket subdomain.
- **Cause**: Railway hasn't issued the Let's Encrypt cert yet for the custom domain. Provisioning typically completes within minutes of DNS propagation, but can take longer if the CNAME just changed.
- **Signal**:
  ```sh
  curl -sI -o /dev/null -w "HTTP: %{http_code}  TLS: %{ssl_verify_result}\n" \
    https://socket.lokeshinumpudi.com/status
  ```
  HTTP 000 + non-zero TLS verify = cert not ready.
- **Fix**: temporarily move `VITE_SERVER_URL` to the Railway-generated URL until `curl -sfI https://socket.lokeshinumpudi.com/status` returns 200 again. Then switch back and redeploy the client. The Railway-issued cert auto-renews; nothing else to do.

## 4. Server returns 5xx through the socket URL but the Railway URL works

- **Cause**: misconfigured custom domain on Railway, or the service crashed and Railway is restarting it.
- **Signal**:
  ```sh
  curl -sI https://socket.lokeshinumpudi.com/status                 # production path
  curl -sI https://moana-server-production.up.railway.app/status    # direct Railway fallback
  ```
- **Fix**:
  - If the Railway URL is also down, see § 5.
  - If only the custom domain is down, check Railway → service → Settings → Domains. The custom domain must be listed and show "Verified". If not, re-run `railway domain socket.lokeshinumpudi.com --port 3000` and re-paste the CNAME target into Namecheap.

## 5. Pulling server logs

```sh
# Tail live (Railway streams pino JSON; the dashboard pretty-prints it)
railway logs

# Filter by level locally
railway logs --json | jq 'select(.level >= 50)'   # warn+error+fatal

# What level is in effect?
railway variables | grep LOG_LEVEL                # info in prod, debug elsewhere
```

The server logs are JSON via pino. Useful queries:

- `msg=="player joined"` for connection events.
- `level >= 50` for anything red.
- `socketId` to follow a single connection.

## 6. "Build deployed but client still old"

- **Symptom**: `pirates.lokeshinumpudi.com` shows old behavior; new behavior visible at the latest Vercel preview URL.
- **Cause**: Vercel didn't promote the latest preview, or browser cache.
- **Fix**:
  - Vercel dashboard → **Deployments** → confirm "Production" badge is on the latest deployment. If not, click → ⋯ → **Promote to Production**.
  - Hard reload (`Cmd+Shift+R`) or open in an incognito window.
  - `curl -I https://pirates.lokeshinumpudi.com/assets/index-<hash>.js` and confirm the hash matches the latest `client/dist/assets/`.
  - If `VITE_SERVER_URL` was just changed, the client needs a **fresh build** — env values are inlined at build time, not at runtime.

## 7. "Cannons don't hit" / projectiles drift

- **Symptom**: Projectiles render but never deal damage.
- **Cause**: Most likely the projectile owner ID. The server filters `if (playerId === projectile.ownerId) return;` per target — if ownership is misset, hits silently no-op.
- **Signal**: `projectile:added` arrives without an `ownerId` set, or `player:hit` never fires for the target. Inspect WS frames in devtools.
- **Fix**: Verify `projectile:fire` payloads carry no client-supplied `ownerId` (server stamps it from `socket.id`). If client sets it, drop that field.

## 8. World looks empty

- **Symptom**: Client connects, ocean visible, no islands.
- **Signal**: Devtools → WS → `world:data` frame is missing or has empty arrays.
- **Cause**: `initializeWorld()` errored before listen, or the connection arrived before `socket.emit('world:data', worldData)` (it shouldn't — the emit is synchronous on `connection`).
- **Fix**: `railway logs` and look for the boot sequence: `islands generated` → `collectibles generated` → `world generation complete`. If `worldData.islands` is empty, look for a bad `ADVERTISED_ISLANDS.advertisers[]` entry (e.g., `position: 'center'` referenced but undefined).

## 9. Day/night out of sync

- **Symptom**: One client is at noon, another at dusk.
- **Cause**: `time:request` was never sent, or `Weather.dayDuration` differs between clients.
- **Fix**: In devtools, run `socket.emit('time:request')` and watch for `time:response`. If absent, `SocketManager.init()` is connecting to the wrong URL or the server is on an older build that lacks `TimeManager`.

## 10. Memory creep on the server

- **Symptom**: Railway's metrics tab shows memory climbing without sockets being added.
- **Cause**: Most likely orphaned projectiles. The 10 s `MAX_PROJECTILE_LIFETIME` only applies during the sim loop's collision pass; if a projectile is created with a far-future `createdAt` it will never expire.
- **Fix**: instrument `logger.warn({ size: projectiles.size }, 'projectile pool size')` once per minute and redeploy. If it grows unbounded, check `projectile:fire` for clients spamming with synthetic IDs.

## Useful one-liners

```sh
# How many sockets are connected right now?
curl -s $SERVER/status | jq '.connections'

# Replay the smoke test from any box with socket.io-client installed
node -e "const io=require('socket.io-client'); \
  const s=io(process.env.SERVER); \
  s.on('connect', ()=>{console.log('ok',s.id); s.close();});"

# Force a Railway restart without a code change
railway redeploy
```

## Adding a new debug surface

If you find yourself adding `logger.info` (or worse, `console.log`) deep in the server, prefer extending `GET /status` with the metric instead. It's cheap, doesn't pollute logs, survives redeploys, and is queryable from any shell.
