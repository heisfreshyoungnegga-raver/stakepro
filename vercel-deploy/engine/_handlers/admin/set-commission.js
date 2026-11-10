const { sql, readBody, send, guard, requireSuperAdmin, ensureAdminTables } = require('../../_lib');

// Super admin only: set a custom referral commission % on one admin or
// super admin (Prince, 2026-11-10). POST { user_id, pct } — pct is a
// number 0-100, or null to clear the override and fall back to the
// global admin_commission_pct. The override is read at deposit time by
// applyDepositRewards in _lib.js; it changes future commissions only.
module.exports = guard(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  const auth = requireSuperAdmin(req, res);
  if (!auth) return;
  await ensureAdminTables();
  const { user_id, pct } = await readBody(req);
  if (!user_id) return send(res, 400, { error: 'invalid_user', detail: 'user_id is required.' });
  let value = null;
  if (pct !== null && pct !== undefined && pct !== '') {
    value = Number(pct);
    if (!(value >= 0 && value <= 100)) return send(res, 400, { error: 'invalid_percent', detail: 'Commission must be between 0 and 100, or null to clear.' });
  }
  const target = await sql('select id, role from users where id = $1', [user_id]);
  if (!target.length) return send(res, 404, { error: 'user_not_found' });
  if (!['admin', 'super_admin'].includes(target[0].role)) return send(res, 400, { error: 'not_an_admin', detail: 'Custom commission can only be set on an admin or super admin.' });
  await sql('update users set commission_pct = $1 where id = $2', [value, user_id]);
  send(res, 200, { ok: true, user_id, commission_pct: value });
});
