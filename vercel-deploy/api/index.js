// StakePro backend as ONE Vercel serverless function.
//
// Why: the Hobby plan allows at most 12 serverless functions per
// deployment, and this engine has 20+ route modules. So the whole
// engine lives under engine/ (not api/, so Vercel does not turn each
// module into a function) and vercel.json rewrites every API path to
// this single function with the original path carried in __p. We
// restore req.url and hand off to the exact dispatcher server.js uses.
//
// bodyParser is off because the ShinobiPay webhook must verify the
// RAW body; every other handler reads the body through
// engine/_lib.readBody, which falls back to reading the stream.
const handler = require('../server');

module.exports = (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    const p = u.searchParams.get('__p');
    if (p) {
      u.searchParams.delete('__p');
      const qs = u.searchParams.toString();
      req.url = p + (qs ? '?' + qs : '');
    }
  } catch (e) { /* keep req.url as-is */ }
  return handler(req, res);
};

module.exports.config = { api: { bodyParser: false } };
