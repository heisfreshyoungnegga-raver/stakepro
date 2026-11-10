-- 2026-11-10 (overnight parity run): matches.score_home_ht /
-- score_away_ht are written by the API-Football upsert and read by
-- settleMatch (api/_lib.js) when resolving half-time markets, but no
-- migration ever created them, so a database built purely from
-- db/*.sql failed every match settlement with a 500. Live Oddaroa's
-- matches table carries both columns. The engine also ensures them at
-- runtime (ensureMatchColumns in api/_lib.js); this file records the DDL.
alter table matches add column if not exists score_home_ht int;
alter table matches add column if not exists score_away_ht int;
