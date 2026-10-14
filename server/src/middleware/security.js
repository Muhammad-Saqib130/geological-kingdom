import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// CSRF defence in depth. The session cookie is SameSite=Lax, which already keeps it off cross-site
// POSTs; this also rejects any state-changing request whose Origin is a site we don't serve (it
// matters if COOKIE_SAMESITE is ever set to 'none'). Requests without an Origin header (curl,
// server-to-server, Stripe webhooks) are not browser form posts and pass through.
export function checkOrigin(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (!origin || env.clientOrigins.includes(origin)) return next();
  // Same host as the API itself (single-service deploys, or a request through the site's proxy)
  const host = req.get('x-forwarded-host') ?? req.get('host');
  try {
    if (new URL(origin).host === host) return next();
  } catch {
    // malformed Origin: reject below
  }
  next(new AppError(403, 'Request blocked: unexpected origin'));
}

// API responses carry personal data (sessions, orders); never let browsers or shared caches keep
// them unless a route opts in with its own Cache-Control (public catalogue data does).
export function noStoreByDefault(_req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}
