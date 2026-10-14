import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const message = (text) => ({ error: text });

// Keyed on email + IP, so many shoppers behind one carrier NAT do not lock each other out,
// while guessing passwords for a single account is still throttled.
export const loginLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: env.LOGIN_RATE_LIMIT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${String(req.body?.email ?? '').trim().toLowerCase()}`,
  message: message('Too many sign-in attempts. Please wait 15 minutes and try again.'),
});

// Coarse per-IP ceiling for all auth endpoints (stops spraying many emails from one address).
export const authIpLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit: env.AUTH_IP_RATE_LIMIT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: message('Too many requests. Please try again later.'),
});

// Failed sign-ins per account regardless of IP: a slow guess spread over many addresses still stops.
export const accountLoginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.ACCOUNT_LOGIN_LIMIT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `account:${String(req.body?.email ?? '').trim().toLowerCase()}`,
  message: message('Too many failed sign-ins for this account. Please wait an hour or contact us.'),
});

// Ceiling for every API request from one IP
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.API_RATE_LIMIT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: message('Too many requests. Please slow down and try again in a minute.'),
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.REGISTER_RATE_LIMIT,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: message('Too many accounts created from this network. Please try again later.'),
});
