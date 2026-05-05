# Debugging the Vercel Frontend

The client (`client/`) is deployed to Vercel — built from the monorepo root via `vercel.json` (`yarn build:client`, output `client/dist`).

## Quick links

- Project: https://vercel.com/dashboard → `moana-adventures`
- Production domain: https://pirates.lokeshinumpudi.com (alt: https://moana-adventures.vercel.app)
- Build settings: governed by `vercel.json` at repo root — do **not** override in the Vercel UI unless you also delete the file.

## CLI setup

```bash
npm i -g vercel
vercel login
vercel link            # run inside repo root, links to the Vercel project
```

## Reading logs

| Need | Command |
| --- | --- |
| Tail latest production runtime logs | `vercel logs --prod` |
| Logs for a specific deployment | `vercel logs <deployment-url>` |
| Build logs for last deploy | `vercel inspect <deployment-url> --logs` |
| Open the live deploy in browser | `vercel open` |

Runtime logs only show output from serverless / edge functions. **For a static SPA like this client, runtime logs will be empty** — there is no server-side code on Vercel. All "errors" you see in production come from the browser, not Vercel logs. Use:

- Browser DevTools → Console + Network tab
- Vercel **Speed Insights** + **Web Analytics** (already wired via `@vercel/analytics` and `@vercel/speed-insights`)
- Sentry / error tracking if added later

## Environment variables

Client env vars **must be prefixed `VITE_`** to be exposed to the browser. Configure them in:

- Vercel Dashboard → Project → Settings → Environment Variables (per env: Production / Preview / Development)
- Or via CLI: `vercel env add VITE_SERVER_URL production`

Local: keep them in the root `.env` (consumed via `envDir` in `client/vite.config.js`). **Never commit `.env`** — only `.env.example`.

After changing env vars in Vercel, you must **redeploy** for them to take effect (Vercel does not hot-swap env into existing builds).

## Common failure modes

1. **White screen / 404 on refresh** — SPA routing not configured. Add a rewrite in `vercel.json`:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
   ```
2. **`VITE_SERVER_URL is not defined`** — env var missing in Vercel. Add it under Production scope and redeploy.
3. **CORS errors connecting to socket server** — backend `CORS_ORIGINS` doesn't include the Vercel domain. Update server `.env.production` (or Railway env vars) and redeploy the server.
4. **Old assets served after deploy** — Vercel CDN cache. Hard refresh (Cmd+Shift+R) or check the deployment's `x-vercel-cache` header.
5. **Build fails with "command not found"** — `vercel.json` install/build command runs at repo root, not `client/`. The current config is correct (`yarn install` then `yarn build:client`).

## Promoting / rolling back

```bash
vercel ls                                  # list deployments
vercel promote <deployment-url>            # make a preview the new production
vercel rollback                            # rollback to the previous production deploy
```

## Inspecting a specific deploy

```bash
vercel inspect <deployment-url>            # metadata, env, build duration
vercel inspect <deployment-url> --logs     # full build log
```
