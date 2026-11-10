# StakePro Admin — back office

Built 2026-11-10 by combining the PrimeStake and Oddaroa admin systems
(Oddaroa is the superset — PrimeStake was ported into it and then
extended — so the Oddaroa portal is the base; the one real PrimeStake
extra, the Setup Guide, was grafted in).

## Live pieces

- **Admin app (this build):** https://stakepro-admin.vercel.app
  - `index.html` — landing, links to both portals
  - `admin.html` — Admin Portal (accounts with role `admin` or `super_admin`)
  - `super-admin.html` — Super Portal (role `super_admin` only)
  - Source: `~/workspace/stakepro/admin-app/` (plain HTML/CSS/JS, no build step)
  - Vercel project `stakepro-admin` (`prj_SeXs8bXrCiLtjAxd3V134jhTCx51`),
    first deployment `dpl_6jW9dcj9Ra672Z3VQVDK8wLWfW57` READY
- **Backend:** https://stakepro-api.vercel.app — the app calls it
  cross-origin (`API_BASE` constant at the top of `js/admin.js`).
  The backend dispatcher reflects any Origin and answers CORS
  preflights, and auth is a Bearer token, so this split is the
  intended setup. Verified live 2026-11-10: preflight from the admin
  origin returns 204 with `Access-Control-Allow-Origin:
  https://stakepro-admin.vercel.app`, and a login POST returns the
  expected `{"error":"backend_not_configured","missing":["DATABASE_URL","SESSION_SECRET"]}`
  until env is set (the app turns that 503 into a friendly
  "Backend not configured yet" message on the login screen).
- **Player site:** https://stakepro-mu.vercel.app — referral links
  (`/?ref=CODE`) generated inside the portals point here
  (`PLAYER_SITE` constant), never at the back-office origin. Admin
  invite links point at the admin app's own origin.

## Sections

- **Admin Portal:** Dashboard (stat tiles, per-admin Work Sheet,
  referral centre with commission payout card + daily earnings, ESPN
  sync card for super_admin role), Setup Guide + Platform Control
  (super_admin role, via the Super Portal rules below), Payout Queue
  (deposits; withdrawals visible with a "Super admin only" note),
  Users (block/unblock for all admins), My Earnings.
- **Super Portal:** everything above, plus Matches (featured-match
  builder with goal script + full-book editor, created-games editor,
  manual match form, go-live / score / settle / lock / postpone /
  delete), Messages (two-pane support chat with unread badges,
  auto-refresh), Platform Control (switches, commission/bonus/FX/
  cashout rates, bonus sender, admin invites, pending admin
  verifications, referral commission payouts), Setup Guide.

The tier split is presentation only in the UI; the server enforces
every gate (see the role matrix). Portal separation matches the
engine's rule set: super-only tools exist only inside the Super
Portal even for a super_admin signed into the Admin Portal.

## Endpoint map (all under https://stakepro-api.vercel.app)

Auth — `POST /api/auth/login {identifier, password}` → `{user, token}`
(401 wrong credentials, 403 blocked/pending, 429 after 10 fails);
`POST /api/auth/register {display_name, phone, email, password, admin_invite}`
→ `{pending:true}` for admin invites, `{user, token}` for super-admin
invites; `GET /api/auth/me` (Bearer) → `{user}`. The app stores the
token in `localStorage` as `sp_admin_token` and sends
`Authorization: Bearer <token>` on every call.

Admin — `/api/admin/<action>`, Bearer required:

| Action | Method | Gate | Shape |
|---|---|---|---|
| stats | GET | admin+ (scoped for regular admins) | `{stats}` |
| queue | GET | admin+ (withdrawals hidden from regular admins) | `{queue}` |
| confirm | POST `{id}` | admin+; withdrawals super-only | withdrawal → `{payout}` (drives the SMS receipt) |
| reject | POST `{id}` | admin+; withdrawals super-only | — |
| users | GET | admin+ (scoped for regular admins) | `{users}` |
| block | POST `{id, status}` | admin+ | — |
| promote | POST `{id, role}` | super | — |
| balance-edit | POST `{id, delta_ghs, note}` | super | `{balance_ghs}` |
| delete-user | POST `{id}` | super | `{deleted}` |
| matches | GET / POST / PATCH | admin+ | `{matches}`; POST = manual create, PATCH = go-live / score |
| matches?created=1 | GET | super | `{matches}` (own created games) |
| create-match | POST | super | featured match → `{match}` |
| edit-match | POST `{id, …}` or `{id, action: postpone\|delete}` | super | — |
| lock-match | POST `{id, locked}` | super | — |
| settle | POST `{match_id, score_home, score_away}` | admin+ | `{selections_scored, bets_won, bets_lost}` |
| espn-sync | POST `{leagues, days}` | super | `{imported, with_odds}` |
| odds-preview | POST `{o1, ox, o2}` or `{fav}` | super | `{odds, odds_full}` |
| settings | GET / POST | super | `{settings}`; POST toggles + rates |
| bonus | POST `{scope, user_id?, amount_ghs, note?}` | super | `{credited, amount_ghs}` |
| invite-admin | GET / POST `{kind, hours}` | super | `{invites}` / 201 `{token, kind, expires_at, path}` |
| verify-admin | POST `{id, action: verify\|remove}` | super | — |
| my-dashboard | GET | admin+ (own; super also gets `admins`) | `{invite_path, commissions, invited_users, recent, daily_earnings, payout_request, admins}` |
| worklog | GET `?date=` / `?from=&to=` | admin+ (own; super gets all admins + totals) | `{period, today, me, admins, totals}` |
| payout | POST `{earner_id}` | super | `{paid_ghs, entries}` |
| payout-request | POST `{}` | admin+ | `{request}` or `{already:true}` |
| support | GET | admin+ | `{messages}` (legacy inbox) |
| support?threads=1 / ?user=ID | GET | super | `{threads}` / `{messages}` |
| support | POST `{user_id, body}` or `{id, status}` | super | chat reply / mark answered |
| deposit-proof | GET `?id=` | admin+ | `{proof_image}` (data URL) |

## Role matrix (server-enforced, from `_lib.js` gates)

- **Any admin (admin or super_admin):** stats, queue, confirm/reject
  (deposits), users, block, matches list/create-manual/PATCH, settle,
  my-dashboard, worklog, payout-request, support inbox read,
  deposit-proof. Regular admins see scoped stats/users (own referrals)
  and never see withdrawals in the queue.
- **super_admin only (`requireSuperAdmin`):** settings, invite-admin,
  verify-admin, balance-edit, bonus, promote, delete-user,
  create-match, edit-match, lock-match, espn-sync, odds-preview,
  payout, support threads + replies, matches?created=1, and
  confirm/reject of withdrawals.

## What came from where

- **From Oddaroa (the base, near-verbatim):** the whole portal —
  two-portal split, work sheet, daily earnings, referral centre,
  payout requests + super payouts, featured-match builder (goal
  script, full-book editor, crest upload ladder), created-games
  editor, ESPN sync, Platform Control, admin invites + pending
  verifications, Messages chat, payout SMS receipt + "Withdrawal
  successful" card, deposit-proof viewer.
- **From PrimeStake:** the **Setup Guide** tab (super-only) — the one
  genuine gap in Oddaroa — rebranded to StakePro, its demo invite
  link pointed at stakepro-admin.vercel.app, and its box 8 rewritten:
  PrimeStake's box taught admin-minted **Booking Codes**, which this
  backend does not support (there is no `/admin/booking-codes` in the
  dispatcher — on this engine players mint codes themselves when
  booking a bet, via `/api/bets/book` + `load-code`). PrimeStake's
  Booking Codes tab was therefore **not** ported; shipping it would
  have meant a dead tab calling a 404 endpoint. The guide box now
  teaches Messages instead. The guide's CSS classes
  (`.ggrid/.gwrap/.gname/.gbox/.demotag/.gsteps`) were grafted from
  PrimeStake's stylesheet.
- **Adaptations for the standalone app:** `API_BASE` constant points
  every call at stakepro-api (was relative `/api`); `siteLink` split
  into player-site links (referrals) and `adminLink` (admin invites,
  this app's origin); token storage key renamed
  `ps_admin_token` → `sp_admin_token`; payout SMS text now reads
  "from StakePro"; an `index.html` landing was added (the portals
  were previously reached from the player site's own pages).

## Go-live steps

1. Prince pastes the env vars into the **stakepro-api** Vercel
   project (Production): `DATABASE_URL` (Neon `stakepro` connection
   string), `SESSION_SECRET`, `SHINOBIPAY_SECRET_KEY`,
   `SHINOBIPAY_WEBHOOK_SECRET` — then redeploys stakepro-api.
2. Prince registers a normal account on the backend (player signup
   on the site, or `POST /api/auth/register`).
3. Promote him to `super_admin` in Neon (SQL Editor on the
   `stakepro` project): `update users set role = 'super_admin' where phone = '<his phone>';`
4. He signs in at https://stakepro-admin.vercel.app/super-admin.html
   and mints admin invites from **Platform Control → Admin invites**;
   invited admins land on `admin.html?admin_invite=…`, create their
   account, and wait for his verification in the same tab.

## Dashboard restyle (2026-11-10, Prince's reference screenshot)

Scope decision (Prince, same day): the screenshot's partner/agent
layout is for the **Admin Portal only**. The renderer branches on
the portal (`window.PS_PORTAL`): `admin.html` gets the partner
dashboard; `super-admin.html` gets a new, deliberately more
advanced **command centre** dashboard. All other tabs in both
portals are unchanged.

### Admin Portal — partner dashboard (top of Dashboard tab)

Hero "PARTNER ACCESS CODE" + 2×2 stat grid (4 across ≥1024px) +
Betting Wallet card, then the existing work sheet, Daily earnings,
referred-users list and queue preview. Card → field mapping, all
from `/admin/my-dashboard` (`state.myDash`):

| Card | Source field |
|---|---|
| Hero code | `invite_code` (fallback: `?ref=` parsed from `invite_path`) |
| Hero copy button | copies `invite_code` (existing `data-copy` handler) |
| Invite pill | full link `PLAYER_SITE + invite_path`, truncated with ellipsis; pill button copies it |
| Hero explainer | `commission_pct`, the % highlighted in gold |
| Customers joined | `invited_users.length` — "came through your link" |
| Total deposits | Σ `invited_users[].deposits_ghs` — "All paid transactions from referrals" |
| Commission today | today's `daily_earnings[].earned_ghs` (Africa/Accra date) — caption counts today's `deposits_n` |
| Total earnings | `commissions.earned_ghs` — "Lifetime earnings from referrals" |
| Betting Wallet | `payoutCardHTML`: `commissions.pending_ghs` big, `payout_request` state, earned/paid rows, same `data-request-payout` action |

**Commission-today decision:** the screenshot's third card says
"Deposits today", but no loaded endpoint returns referral deposit
GHS for today — `daily_earnings` is commission per day, and the
worklog's `deposits_done_ghs` is deposits the admin *confirmed in
the queue*, not referral deposits. Rather than mislabel either,
the card is **COMMISSION TODAY**. The platform stats grid no longer
renders on the Admin Portal dashboard (it is scoped to the admin's
own referrals there anyway); it lives on in the Super KPI band.

### Super Portal — command centre (Dashboard tab)

Denser control-room layout (KPI band up to 8 across, two-column
panel grid ≥960px), all from endpoints the app already loads:

- **KPI band** — Total players + blocked (`/admin/stats.users`,
  `blocked_users`); Stakes today (`stakes_today_ghs`, sub: bets
  today / open bets); Deposits confirmed (`/admin/worklog` totals
  `deposits_done_ghs`/`_n` for the shown period — admin-team queue
  confirmations, labelled as such); Pending withdrawals /
  deposits (stats counts, sub: Σ amounts from `/admin/queue`);
  Commission liability (Σ `myDash.admins[].pending`); Payout
  requests (count + Σ of `admins[].payout_requested_ghs`); Open
  support (`open_support`).
- **Dropped as unsupported:** all-time / today deposit *totals* —
  `/admin/stats` returns counts and stakes only, so no deposit
  total is shown anywhere on the super dashboard.
- **Live queues snapshot** — payout requests first with the same
  `data-payout` Pay Out action, then the 5 newest pending queue
  rows (queue returns oldest-first, so the tail reversed), plus an
  "Open Payout Queue" jump (`data-atab="queue"`).
- **Quick controls** — the only two switches the settings endpoint
  actually exposes: ShinobiPay gateway (`data-toggle="gateway"`)
  and Payouts freeze (`data-toggle="freeze"`), wired exactly as
  Platform Control; admin commission % shown read-only; button to
  the Platform Control tab. No maintenance-mode / registration /
  betting-lock switch exists in the backend, so none is shown.
- **System status** — honest states only: backend from
  `state.offline` (set on the `backend_not_configured` 503 guard)
  / stats having loaded; Neon = whether queries are answering;
  ShinobiPay rail from the `gateway_enabled` setting; API base and
  player-site URLs printed verbatim.
- **Trend** — hand-rolled inline SVG bars of `daily_earnings`
  (last 30 days, gold bar = today). Labelled as the signed-in
  super admin's *own* commission: no endpoint returns a
  platform-wide daily series, so none is drawn.
- **Admin leaderboard** — `myDash.admins` sorted by earned desc
  with invited / earned / paid / pending columns, payout-request
  flags, and a totals row.
- Below the command centre: work sheet, Betting Wallet, and the
  queue preview, as before. The old "Referrals by admin" card is
  superseded by the leaderboard on this dashboard (it still exists
  in `referralCardHTML`, now unused by either dashboard).

## 2026-11-10 reconstruction — green rebrand + two new super powers

Palette: the admin app's `--gold` token family is now green
(`--gold: #00d563`, gradient `#00d563 → #00a86b`); every literal gold
hex in css/js was mapped to the green scale (see ../DESIGN.md). The
variable NAME is unchanged on purpose — only values moved. Orange
accent chips (`#ffb020`, `#ffa726`) and the bronze rank badge are not
brand gold and were left alone.

### Power 1 — custom commission per admin

- `POST /admin/set-commission` (super only, dispatcher action
  `set-commission`, handler `api/_handlers/admin/set-commission.js`):
  body `{ user_id, pct }`, pct 0–100, or `null` to clear. Rejects
  non-super callers (403 via requireSuperAdmin), non-admin targets
  (400 `not_an_admin`) and out-of-range rates (400 `invalid_percent`).
- Stored on `users.commission_pct` (nullable). At deposit time,
  `applyDepositRewards` in `api/_lib.js` uses the earner's override
  in place of the global `admin_commission_pct`; the first-deposit
  flat-GH₵70 split and all other mechanics are untouched.
- `/admin/my-dashboard` returns the EFFECTIVE rate as
  `commission_pct` (plus `commission_pct_custom` = the raw override
  or null), and each row of the super `admins` summary and of
  `/admin/users` carries `commission_pct`.
- UI: Super Portal → Users tab — admin/super_admin rows show their
  effective % labelled (custom) or (global), with an inline input,
  "Save %" and "Use global" wired to the endpoint.

### Power 2 — minimum deposit control

- New setting `deposit_min_ghs` (default `'210'`, seeded by
  ensureAdminTables and by db/migration-2026-11-10-commission.sql).
  Writable via `POST /admin/settings` (super only), validated
  10–5000 (`invalid_deposit_min`); returned by the settings GET.
- Enforced by the ShinobiPay MoMo handler
  (`api/_handlers/wallet/deposit-momo.js`): the floor and the error
  text read the setting, 210 fallback, ceiling stays GHS 5,000.
  Manual transfer and Flutterwave keep their per-currency
  `depositFloorFor` floors (GHS 120 / ₦25,000) — neither had the
  GHS 210 constant, so neither was changed.
- UI: Super Portal → Platform Control → Commission rates card —
  "Minimum deposit — Ghana MoMo (GHS)" field (`#rateMinDep`) saved
  with the rates form.
