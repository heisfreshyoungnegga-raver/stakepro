-- StakePro go-live audit additions (2026-11-10).
-- tips + users.vip_until existed only on live Oddaroa; the adapter
-- tables lived in migration-2026-11-09-adapter*.sql, which was
-- skipped when this Neon project was built. All of this also
-- self-applies at runtime (ensureTipsTables in api/_lib.js,
-- ensureAdapterTables in api/adapter/index.js); this file is the
-- recorded DDL, matching those ensures exactly for tips/vip_until.
alter table users add column if not exists vip_until timestamptz;
create table if not exists tips (
  id uuid primary key default gen_random_uuid(),
  match text,
  league text,
  pick text,
  odds numeric(10, 3),
  tier text not null default 'free',
  result text,
  play_date date not null default current_date,
  created_at timestamptz not null default now()
);
