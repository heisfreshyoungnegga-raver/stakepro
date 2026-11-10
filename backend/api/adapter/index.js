const { send, sql } = require('../_lib');

// The adapter's own tables (adapter_user_meta, adapter_hidden_bets,
// payment_credentials, site_content, promotions, sports_categories,
// referral_codes, odds_sync_state, user_feedback,
// adapter_shinobipay_deposits) were defined in db/migration-2026-11-09
// -adapter*.sql, but those files were skipped when the StakePro Neon
// project was built, and nothing created the tables lazily — so every
// /auth/v1 and /rest/v1 call 500'd on a fresh database (go-live
// audit, 2026-11-10). Self-heal them here, once per process, with
// exactly the migration DDL.
let adapterTablesReady = null;
function ensureAdapterTables() {
  if (!adapterTablesReady) {
    adapterTablesReady = (async () => {
      const ddl = [
        `create table if not exists adapter_user_meta (user_id uuid primary key, meta jsonb not null default '{}'::jsonb)`,
        `create table if not exists adapter_hidden_bets (bet_id uuid primary key, user_id uuid not null, hidden_at timestamptz not null default now())`,
        `create table if not exists payment_credentials (provider text primary key, api_key_ciphertext text, webhook_secret_ciphertext text, updated_at timestamptz not null default now())`,
        `create table if not exists site_content (key text primary key, value text not null default '')`,
        `create table if not exists promotions (id uuid primary key default gen_random_uuid(), title text not null, description text not null default '', active boolean not null default true, created_at timestamptz not null default now())`,
        `create table if not exists sports_categories (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, icon text not null default '', sort_order int not null default 0, active boolean not null default true)`,
        `create table if not exists referral_codes (id uuid primary key default gen_random_uuid(), code text not null unique, bonus numeric not null default 0, uses int not null default 0, active boolean not null default true, created_at timestamptz not null default now())`,
        `create table if not exists odds_sync_state (sport_key text primary key, requests_remaining int, synced_at timestamptz not null default now())`,
        `create table if not exists user_feedback (id uuid primary key default gen_random_uuid(), user_id uuid not null, kind text not null default 'idea', message text not null, rating int, created_at timestamptz not null default now())`,
        `create table if not exists adapter_shinobipay_deposits (id uuid primary key default gen_random_uuid(), user_id uuid not null, intent_id text, reference text not null, amount_minor int not null, status text not null default 'pending', mode text not null default 'live', network text, payment_method text not null default 'mobile_money', last_sequence int not null default 0, webhook_verified_at timestamptz, credited_at timestamptz, created_at timestamptz not null default now())`,
        `create unique index if not exists adapter_shinobipay_deposits_reference_ux on adapter_shinobipay_deposits (reference)`,
        `insert into sports_categories (name, slug, icon, sort_order) values ('Football','football','⚽',1),('Basketball','basketball','🏀',2),('Tennis','tennis','🎾',3),('Volleyball','volleyball','🏐',4),('Ice Hockey','ice-hockey','🏒',5),('Table Tennis','table-tennis','🏓',6),('Esports','esports','🎮',7) on conflict (slug) do nothing`,
        `insert into site_content (key, value) values ('shinobipay_mode','live'),('shinobipay_enabled_requested','true') on conflict (key) do nothing`,
      ];
      for (const q of ddl) await sql(q);
    })().catch(e => { adapterTablesReady = null; throw e; });
  }
  return adapterTablesReady;
}
const gotrue = require('./gotrue');
const postgrest = require('./postgrest');
const rpc = require('./rpc');

// Adapter entry point. Mounted by server.js for /auth/v1/* and
// /rest/v1/* — the two surfaces the frontend's Supabase client uses.
// Auth (gotrue.js), the table surface (postgrest.js) and the RPC
// dispatcher (rpc.js) are all live.

// CORS for the per-file Vercel mount, where server.js (which carries
// the same logic for the Railway / single-function mounts) is
// bypassed: the frontend's browser calls need the headers and a
// preflight answer or every response is blocked client-side.
function applyCors(req, res) {
  const origin = req.headers.origin;
  if (!origin) return;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, apikey, content-type, prefer, x-client-info, x-supabase-api-version');
  res.setHeader('Access-Control-Expose-Headers', 'content-range, content-profile, www-authenticate');
  res.setHeader('Access-Control-Max-Age', '86400');
}

module.exports = async (req, res) => {
  applyCors(req, res);
  await ensureAdapterTables().catch(() => {});
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
  let path = String((req.url || '').split('?')[0]);
  // On Vercel the /auth/v1/* and /rest/v1/* surfaces reach this handler
  // either through catch-all route files (req.url stays original) or
  // through vercel.json rewrites that carry the original path in the
  // __sk query param. Normalise both; downstream handlers then see the
  // original path + query exactly as the Railway mount presents them.
  try {
    const raw = String(req.url || '');
    const qs = new URLSearchParams(raw.split('?')[1] || '');
    const sk = qs.get('__sk');
    if (sk) {
      path = sk;
      qs.delete('__sk');
      const rest = qs.toString();
      req.url = sk + (rest ? '?' + rest : '');
    }
  } catch (_) { /* keep the raw path */ }
  if (path.startsWith('/auth/v1/')) return gotrue(req, res);
  if (path.startsWith('/rest/v1/rpc/')) return rpc(req, res);
  if (path.startsWith('/rest/v1/')) return postgrest(req, res);
  return send(res, 404, { error: 'not_found' });
};
