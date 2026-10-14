import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const SESSION_COOKIE = 'gk_session';
const BCRYPT_ROUNDS = 12;
const JWT_ALGORITHM = 'HS256';
const sessionMs = () => env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

// Compared against when the email is unknown, so both failure paths take the same time.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-password', BCRYPT_ROUNDS);

export const verifyPassword = (password, hash) => bcrypt.compare(password, hash ?? DUMMY_HASH);

export function signSession(user) {
  return jwt.sign({ ver: user.tokenVersion ?? 0 }, env.JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    subject: String(user._id),
    expiresIn: env.SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

// Returns the payload, or null for any invalid, expired or tampered token.
export function verifySession(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
  } catch {
    return null;
  }
}

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd || env.COOKIE_SAMESITE === 'none',
  sameSite: env.COOKIE_SAMESITE,
  path: '/',
});

export function setSessionCookie(res, user) {
  res.cookie(SESSION_COOKIE, signSession(user), { ...cookieOptions(), maxAge: sessionMs() });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}
