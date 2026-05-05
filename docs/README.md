# Docs index

Canonical reference for both humans and agents working in this repo.

| File                  | Read it for                                               |
| --------------------- | --------------------------------------------------------- |
| `ARCHITECTURE.md`     | High-level system, repo layout, runtime model            |
| `CONTRACTS.md`        | **Wire protocol** — every Socket.IO event, payload shape, and HTTP route |
| `CLIENT.md`           | Vite app, Three.js modules, frame loop, conventions      |
| `SERVER.md`           | Express + Socket.IO server, world gen, sim loop          |
| `RUNBOOK.md`          | **Day-to-day commands** — run locally, build, deploy      |
| `DEPLOYMENT.md`       | Vercel (client) + Railway (server) deploy and rollback    |
| `DEBUGGING.md`        | Production incident playbook                              |

## Supporting docs

- `vercel-debugging.md` — Vercel-specific CLI/log appendix.
- `railway-deployment.md` — historical Railway migration record from the DigitalOcean cutover. Do not treat it as the active deploy runbook.

## Existing planning docs (kept for context)

- `feature-roadmap.md`, `optimization-plan.md`, `organization-plan.md`,
  `refactoring-plan.md`, `testing-guide.md`, `testing-summary.md`,
  `test-implementation-summary.md` — historical planning notes.

If any supporting or planning doc drifts from the canonical docs above, the canonical docs win.
