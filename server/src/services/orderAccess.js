import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

// Guest access links (order pages, investigation tracking) use a token derived from the record id
// and the server secret. Nothing is stored, so emails and payment redirects can always include a
// working link; rotating JWT_SECRET invalidates all such links.
const accessToken = (scope, id) => createHmac('sha256', env.JWT_SECRET).update(`${scope}:${id}`).digest('base64url').slice(0, 32);

function verify(scope, id, token) {
  if (typeof token !== 'string' || token.length !== 32) return false;
  const expected = Buffer.from(accessToken(scope, id));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export const orderAccessToken = (orderId) => accessToken('order-access', orderId);
export const verifyOrderAccessToken = (orderId, token) => verify('order-access', orderId, token);

export const investigationAccessToken = (id) => accessToken('investigation-access', id);
export const verifyInvestigationAccessToken = (id, token) => verify('investigation-access', id, token);
