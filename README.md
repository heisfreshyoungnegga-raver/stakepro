# StakePro

Betting platform built from the StakeNova capture Prince owns the rights to,
rebranded end to end as StakePro (98,219 replacements, zero old-brand hits).

## What's live

- Frontend preview (static capture): https://stakepro-mu.vercel.app
  Vercel project `stakepro`. Login, deposits and betting are inactive in the
  preview until the UI is wired to the backend (Inertia adapter job).
- Backend: https://stakepro-api.vercel.app
  Vercel project `stakepro-api` (single-function deploy, see vercel-deploy/).
  Answers the `backend_not_configured` guard until the env vars are set.
- Database: Neon project `stakepro` (id `young-star-84380658`, aws-us-west-2,
  Postgres 18), full PrimeStake/Oddaroa schema (14 tables +
  admin_pending_queue view).

## Layout in this repo

- `backend/` — the platform engine (Prince's Oddaroa/PrimeStake backend):
  Node server (`server.js`), route modules under `api/`, the Neon schema and
  migrations under `db/`. Payments via ShinobiPay (MoMo, webhook
  re-verification, anti-storm guard); Flutterwave handlers included.
- `vercel-deploy/` — the packed single-function copy that is actually
  deployed to `stakepro-api`: the engine lives under `engine/` so Vercel
  does not split it into 20+ functions (Hobby caps at 12), and
  `api/index.js` dispatches every `/api/*` path to it.
- `docs/BACKEND-SETUP.md` — the full setup record: Neon, Railway history,
  env vars, and the remaining go-live steps.

## Not in this repo

The frontend capture itself (1,134 files, ~236 MB of pages and images) is
too heavy for this push route. It lives in the local workspace as
`stakepro-site.zip` and is deployed to the `stakepro` Vercel project.

## Go-live steps remaining

1. In the `stakepro-api` Vercel project, set Production env vars:
   `DATABASE_URL` (Neon stakepro connection string), `SESSION_SECRET`,
   `SHINOBIPAY_SECRET_KEY`, `SHINOBIPAY_WEBHOOK_SECRET`. Redeploy.
2. Point the ShinobiPay dashboard webhook at
   `https://stakepro-api.vercel.app/api/payments/shinobipay-webhook`.
3. Wire the capture UI to the backend (Inertia adapter).
