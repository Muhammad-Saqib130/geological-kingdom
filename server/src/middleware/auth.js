import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { SESSION_COOKIE, clearSessionCookie, verifySession } from '../services/authService.js';

// Attaches req.user when a valid session cookie is present. Never rejects on its own:
// an invalid, expired or revoked session is cleared and the request continues anonymously.
export async function authenticate(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next();

  const payload = verifySession(token);
  const user = mongoose.isValidObjectId(payload?.sub) ? await User.findById(payload.sub).select('+tokenVersion') : null;

  if (!user || user.tokenVersion !== payload.ver) {
    clearSessionCookie(res);
    return next();
  }

  req.user = user;
  next();
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(new AppError(401, 'Please sign in to continue'));
  next();
}

// Use after requireAuth, or alone (it also rejects anonymous requests).
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(new AppError(401, 'Please sign in to continue'));
    if (!roles.includes(req.user.role)) return next(new AppError(403, 'You do not have access to this resource'));
    next();
  };

export const requireAdmin = requireRole('admin');
