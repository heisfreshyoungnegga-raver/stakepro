-- 2026-11-10 (overnight parity run): bets.booking_code is written by
-- api/_handlers/bets/place.js on every ticket, but no migration ever
-- created the column, so a database built purely from db/*.sql failed
-- the first bet placement with a 500. Live Oddaroa carries the column
-- from an unsaved live change. The engine also ensures it at runtime
-- (ensureBetColumns in api/_lib.js); this file records the DDL.
alter table bets add column if not exists booking_code text;
