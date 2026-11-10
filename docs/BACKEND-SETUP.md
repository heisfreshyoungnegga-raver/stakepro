# StakePro — Backend Setup

Status: database created and loaded, backend copied and boot-tested locally
on 2026-11-09. NOT yet hosted, and the frontend is NOT yet wired to it
(see the wiring note at the bottom).

## Railway

- Prince ordered Railway hosting + ShinobiPay as the payment rail on
  2026-11-09. Backend prepped: package.json name stakepro-backend with a
  start script, railway.json (NIXPACKS, `node server.js`), boot log
  rebranded, boot re-verified locally (healthy 503 guard).
- Railway connected via the custom.railway connector (GraphQL API,
  helper ~/workspace/custom-connectors/custom.railway/bin/railway_api.py).
  Project created 2026-11-09: name stakepro, id
  b2ec1e0a-b43a-4275-bb5c-1ddb3ebed083. The token behaves workspace-scoped
  (`me` returns Not Authorized, projects/projectCreate work) and its
  project list was empty before this create.
- SUPERSEDED 2026-11-09 17:48: Prince said skip GitHub/Railway, use
  Vercel only. The Railway project above stays empty and unused.

## Vercel backend (live)

- Packed single-function deploy copy: ~/workspace/stakepro-backend-deploy/
  (101 files; engine/ holds the backend's api/ tree incl. the unused
  adapter, api/index.js is the one serverless function, vercel.json has
  only the /api/:path* rewrite). Same pattern as stakeking-api.
- Project: stakepro-api, id prj_IgRJNc6dYJ6shw6HPawDc8y3vUnQ, team
  heis-fyns-projects. Deployment dpl_7gySXXtSE2bxQTYcYg1PzAaH2CVa READY.
- Live: https://stakepro-api.vercel.app — GET /api/matches and
  POST /api/auth/login verified answering the 503 backend_not_configured
  guard (function live, env not yet set).
- NEXT (Prince, in the stakepro-api project): Settings → Environment
  Variables, Production: DATABASE_URL (Neon stakepro connection string),
  SESSION_SECRET, SHINOBIPAY_SECRET_KEY, SHINOBIPAY_WEBHOOK_SECRET
  (optional SHINOBIPAY_API_BASE, default https://akwapayapi.onrender.com/v1).
  Then redeploy and verify /api/matches answers from Neon, and point the
  ShinobiPay dashboard webhook at
  https://stakepro-api.vercel.app/api/payments/shinobipay-webhook.

## Neon database

- Project name: stakepro
- Project ID: young-star-84380658
- Region: aws-us-west-2
- Postgres version: 18

### Schema applied

The same PrimeStake/Oddaroa statement set used for StakeKing, applied in
this order from `backend/db/`:

1. schema.sql — 36 statements
2. migration-2026-11-02.sql — 6 statements
3. migration-2026-11-04-games.sql — 5 statements
4. migration-2026-11-08.sql — 12 statements
5. migration-2026-11-09.sql — 3 statements
6. migration-2026-11-09-odds-full.sql — 1 statement
7. migration-2026-11-09-stakeking.sql — 4 statements (recreates
   booking_codes + commission_payout_requests)

67 statements from the files, applied in batches via run_sql_transaction.

Order fix (same lesson as the StakeKing setup): schema.sql's final
statement creates the `admin_pending_queue` view, which selects
`wallet_transactions.payout_meta` — a column the .sql files never add
(the live backend adds it at boot via its ensure step in api/_lib.js).
The batch failed with "column wt.payout_meta does not exist", so this
one compensating statement was run before the view, after which the
remaining batches applied cleanly:

```sql
alter table wallet_transactions add column if not exists payout_meta jsonb;
```

The three StakeKing adapter files (migration-2026-11-09-adapter*.sql)
were deliberately NOT applied — they are specific to the StakeKing UI.

### Verified tables (14 base tables + 1 view)

bet_selections, bets, booking_codes, commission_payout_requests,
commissions, game_rounds, invites, matches, operator_settings,
payment_attempts, support_messages, users, wallet_transactions,
webhook_events — plus the admin_pending_queue view.

## Backend code

- Location: ~/workspace/stakepro/backend/
- Copied as-is from the StakeKing backend (Prince's own Oddaroa backend):
  server.js, package.json ({"type":"commonjs"} intact), vercel.json,
  api/ (85 files) and db/.
- Cosmetic leftovers from the copy, deliberately untouched: the
  package.json name ("stakeking-backend") and the server start-up log
  line ("StakeKing backend listening"). No README in the package names
  StakeKing (db/README.md is the original Oddaroa package doc), so no
  branding edit was needed. API behaviour and env var names are
  unchanged.
- Boot test (2026-11-09, no env, local port): server starts, and both
  GET /api/matches and POST /api/auth/login answer the healthy guard:

```json
HTTP 503 {"error":"backend_not_configured","missing":["DATABASE_URL","SESSION_SECRET"]}
```

## Environment variables needed at hosting time

- DATABASE_URL — Prince copies this from the Neon Console for the
  stakepro project (young-star-84380658). The connector used for setup
  deliberately cannot fetch connection strings.
- SESSION_SECRET — a long random secret Prince generates at deploy time.
- SHINOBIPAY_SECRET_KEY — for MoMo deposits.
- SHINOBIPAY_WEBHOOK_SECRET — to verify ShinobiPay webhooks.
- API_FOOTBALL_KEY — the API-Football PRO key for the match feed.

Set these in the host's dashboard only — never in chat or in files.

## Hosting options

- Railway: run backend/server.js as its own service with the env vars
  above (the pattern the live Oddaroa backend uses).
- Vercel: a separate backend project like stakeking-api, using the
  backend's vercel.json (the pattern StakeKing used). Note the Hobby
  plan function cap shaped that deploy.
- Nothing has been deployed in this setup step.

## Frontend wiring note (separate job, not done here)

The StakePro frontend (live at stakepro-mu.vercel.app) is a static
Laravel/Inertia site capture. Its JS bundles expect the original
site's API shapes and Inertia page props, which are NOT the shapes
this backend serves. Wiring the UI to this backend is a separate
adapter job — the equivalent of StakeKing's adapter, but translating
Inertia shapes instead of Supabase shapes. Until that job is done,
the live preview stays a static site: login, bets and deposits remain
inactive even though the database and backend now exist.

## Migration 2026-11-10 (per-admin commission + minimum deposit)

- File: backend/db/migration-2026-11-10-commission.sql — adds
  `users.commission_pct numeric(6,2)` (nullable) and seeds
  `operator_settings.deposit_min_ghs = '210'`.
- Applied to the Neon stakepro project (young-star-84380658) on
  2026-11-10 via the Neon MCP connector: the ALTER and the settings
  insert ran in one transaction; verified by reading the column back
  from information_schema and the setting row from operator_settings.
- Both changes also self-apply at runtime through ensureAdminTables
  in api/_lib.js, so any fresh database converges without the file.
- Backend redeployed to stakepro-api afterwards
  (dpl_Ds42iU72u2NTq2zHmosjfDfa2M4W); /api/matches and the new
  /api/admin/set-commission route answer the 503
  backend_not_configured guard until env vars are set.
