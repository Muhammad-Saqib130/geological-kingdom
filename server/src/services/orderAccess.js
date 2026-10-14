import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

// Guest access to an order page uses a token derived from the order id and the server secret.
// Nothing is stored, so emails and payment redirects can always include a working link;
// rotating JWT_SECRET invalidates all such links.
export function orderAccessToken(orderId) {
  return createHmac('sha256', env.JWT_SECRET).update(`order-access:${orderId}`).digest('base64url').slice(0, 32);
}

export function verifyOrderAccessToken(orderId, token) {
  if (typeof token !== 'string' || token.length !== 32) return false;
  const expected = Buffer.from(orderAccessToken(orderId));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
