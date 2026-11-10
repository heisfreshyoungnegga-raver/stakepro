-- StakePro 2026-11-10: per-admin commission override + super-admin
-- controlled minimum deposit (Prince's reconstruction order).
-- Both changes also self-apply at runtime via ensureAdminTables in
-- api/_lib.js; this file is the recorded migration for the Neon
-- stakepro project (young-star-84380658).

alter table users add column if not exists commission_pct numeric(6,2);

insert into operator_settings (key, value) values ('deposit_min_ghs', '210')
on conflict (key) do nothing;
