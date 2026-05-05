# Deployment

Two independent deploys. Both are env-var driven (`.env` at repo root is the source of truth).

- **Client** → Vercel at `https://pirates.lokeshinumpudi.com` (alt: `moana-adventures.vercel.app`).
- **Server** → Railway. Two URLs:
  - `https://socket.lokeshinumpudi.com` — custom domain, CNAME'd at Namecheap, **what `VITE_SERVER_URL` points at in `.env.production`**.
  - `https://moana-server-production.up.railway.app` — Railway-provided fallback hostname for direct health checks, rollback, or bypassing the custom domain.

DNS for `lokeshinumpudi.com` lives at **Namecheap BasicDNS** — no Cloudflare proxy. TLS is terminated by Vercel and Railway directly.

Older deploys (DigitalOcean App Platform / AWS Elastic Beanstalk) are decommissioned; if you find scripts referring to `eb`, DO droplets, nginx, certbot, or Route 53, they're stale.

## Configuration model

There is **one** `.env` at the repo root. Both tiers read it:

- Server: `dotenv` loads `../.env` then `../.env.${NODE_ENV}` (override).
- Client: Vite's `envDir: '..'` makes `VITE_*` vars available at build time.

`.env.example` documents every var. `.env.production` is committed for reference values; secrets (none today) would go elsewhere.

| Var               | Tier   | Required | Notes                                              |
| ----------------- | ------ | -------- | -------------------------------------------------- |
| `NODE_ENV`        | both   | yes      | `development` locally, `production` in hosts.       |
| `PORT`            | server | no       | Defaults `3000`. Railway injects.                  |
| `CORS_ORIGINS`    | server | yes (prod) | Comma-separated allow-list.                       |
| `LOG_LEVEL`       | server | no       | `info` in prod, `debug` in dev.                    |
| `VITE_SERVER_URL` | client | yes      | Browser → server URL.                              |

## Client (Vercel)

Build is governed by `vercel.json` at repo root:

```json
{
  "buildCommand": "yarn build:client",
  "outputDirectory": "client/dist",
  "installCommand": "yarn install",
  "framework": "vite"
}
```

### Deploying

- **Auto**: push to `release` → Vercel GitHub integration deploys.
- **Manual**: `yarn deploy:client` (= `vercel --prod`).

### Env vars on Vercel

Set under Production / Preview / Development scopes:

- `VITE_SERVER_URL=https://socket.lokeshinumpudi.com` *(current production value)*
- Keep the Railway-generated URL available as a temporary fallback during DNS or certificate incidents.

Redeploy after changing — Vercel does not hot-swap env into existing builds (`VITE_*` is inlined at build time).

```sh
# add or update
echo "<value>" | vercel env add VITE_SERVER_URL production
vercel --prod --yes
```

### Rollback

```sh
vercel ls
vercel promote <deployment-url>      # promote a known-good build
vercel rollback                       # to previous prod
```

Full Vercel ops + log retrieval in `docs/vercel-debugging.md`.

## Server (Railway)

Built from a Dockerfile at repo root:

- `Dockerfile` is multi-stage (deps → runtime), ships as non-root `app` user, exposes `:3000`.
- `railway.json` pins `builder: DOCKERFILE`, `healthcheckPath: /status`, `restartPolicyType: ON_FAILURE`.
- `.dockerignore` excludes `client/`, `docs/`, etc., so the image only contains `server/`.

### Project / service

- Project: **`imaginative-cat`** (Railway workspace: Lokesh Inumpudis Projects).
- Service: **`moana-server`**, environment `production`.
- Service Source → **Root Directory: `/`** (repo root, *not* `server/`). The Dockerfile cherry-picks `server/`.
- Build/Start commands left empty — `railway.json` + `Dockerfile` drive everything.

### Deploying

- **Auto**: connect the GitHub repo in Railway → service auto-deploys on push.
- **Manual**: `yarn deploy:server` (= `railway up --service moana-server`). Run `railway link` once per workstation.

### Env vars on Railway

Set under Variables:

```
NODE_ENV=production
CORS_ORIGINS=https://pirates.lokeshinumpudi.com,https://moana-adventures.vercel.app
LOG_LEVEL=info
```

Don't set `PORT` — Railway sets it.

### Custom domain (Namecheap → Railway)

`lokeshinumpudi.com` is registered with Namecheap BasicDNS — there is no Cloudflare proxy, no SSL/TLS toggle, no WebSockets toggle.

The custom socket domain is already the active production endpoint. Use the steps below when repairing the domain, rotating it to a new Railway-generated target, or recreating the mapping from scratch.

```sh
dig +short NS lokeshinumpudi.com
# dns1.registrar-servers.com.    (Namecheap)
# dns2.registrar-servers.com.
```

To map `socket.lokeshinumpudi.com` to the Railway service:

1. Register the domain on Railway — prints the exact CNAME target:
   ```sh
   railway domain socket.lokeshinumpudi.com --port 3000
   # → CNAME   socket   <hash>.up.railway.app
   ```
2. **Namecheap** → Domain List → `lokeshinumpudi.com` → **Manage** → **Advanced DNS**:
   - Edit the existing CNAME with Host `socket`.
   - Set Value to the `<hash>.up.railway.app.` target Railway returned. TTL: Automatic.
3. Wait 2–10 minutes for Namecheap TTL to propagate and Railway to issue the Let's Encrypt cert.
4. Verify:
   ```sh
   dig +short socket.lokeshinumpudi.com cname
   curl -sfI https://socket.lokeshinumpudi.com/status
   ```
5. Keep Vercel `VITE_SERVER_URL` on `https://socket.lokeshinumpudi.com`; only point it at the Railway-generated hostname temporarily if the custom domain is broken or mid-repair.

### Rollback

```sh
railway deployments
railway rollback <id>
```

Historical migration notes live in `docs/railway-deployment.md`; the active runbook is this file plus `docs/RUNBOOK.md`.

## Local Docker

```sh
yarn docker:build
yarn docker:run         # uses .env
curl http://localhost:3000/status
```

## CI

`.github/workflows/ci.yml` runs on every PR + push to `release`:

- **Build client** — `yarn install --frozen-lockfile` + `yarn build:client` with `VITE_SERVER_URL=https://socket.lokeshinumpudi.com`.
- **Build server image** — Buildx with GHA cache → `docker build .` → boots the container and curls `/status` to assert the bundle actually runs (not just compiles).

Don't gate Vercel/Railway auto-deploys on CI — they each have their own build/health checks. CI runs in parallel and catches what the platforms can't (server `/status` smoke test).

## Release checklist

- [ ] `yarn lint` clean.
- [ ] `yarn test` green.
- [ ] If `docs/CONTRACTS.md` changed, both tiers deploy in the same window.
- [ ] `curl -sf <VITE_SERVER_URL>/status` returns 200 (whichever URL is currently configured).
- [ ] Two browsers on `https://pirates.lokeshinumpudi.com` see each other moving.
- [ ] `yarn logs:server` shows no `error`-level pino entries during smoke test.

## Decommissioned hosts

| Host | State | Notes |
| --- | --- | --- |
| AWS Elastic Beanstalk (`moana-city`, `ap-south-1`) | retired | Former server host; nginx + certbot + Route 53 recipe lives in `server/readme.md` for historical reference only. `.ebextensions/` and `Procfile` in `server/` are inert artefacts. |
| DigitalOcean App Platform (`moana-socket-3j3fv.ondigitalocean.app`) | retired (stopped) | Returned a 530 from DO's edge after the app was stopped — same status code as Cloudflare's "origin unreachable" but a different provider. That was the incident that prompted the Railway migration. |

If anyone asks "should we deploy to X" — start with `RUNBOOK.md` and `ARCHITECTURE.md` first.
