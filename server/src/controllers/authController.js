import { z } from 'zod';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { clearSessionCookie, hashPassword, setSessionCookie, verifyPassword } from '../services/authService.js';

// Trim and lowercase before checking the format, so a pasted "  Name@Mail.com " is accepted.
const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254));

// bcrypt only uses the first 72 bytes of a password, so longer ones are rejected outright.
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((p) => Buffer.byteLength(p, 'utf8') <= 72, 'Password is too long');

// Unknown keys (e.g. "role") are stripped, so nobody can register as an admin.
export const registerBody = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email,
  password,
  phone: z.string().trim().max(30).optional(),
});

export const loginBody = z.object({
  email,
  password: z.string().min(1, 'Enter your password').max(1024),
});

export async function register(req, res) {
  const { name, email, password, phone } = req.validated.body;

  const taken = () => new AppError(409, 'An account with this email already exists');
  if (await User.exists({ email })) throw taken();

  let user;
  try {
    user = await User.create({ name, email, phone, passwordHash: await hashPassword(password) });
  } catch (err) {
    // Two sign-ups racing for the same email: the unique index rejects the second one
    if (err?.code === 11000) throw taken();
    throw err;
  }
  setSessionCookie(res, user);
  res.status(201).json({ user });
}

export async function login(req, res) {
  const { email, password } = req.validated.body;

  const user = await User.findOne({ email }).select('+passwordHash +tokenVersion');
  const valid = await verifyPassword(password, user?.passwordHash);
  if (!user || !valid) throw new AppError(401, 'Invalid email or password');

  user.lastLoginAt = new Date();
  await user.save();

  setSessionCookie(res, user);
  res.json({ user });
}

// Ends this browser's session.
export function logout(_req, res) {
  clearSessionCookie(res);
  res.status(204).end();
}

// Ends every session for this account (e.g. "I left myself signed in somewhere").
export async function logoutAll(req, res) {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  clearSessionCookie(res);
  res.status(204).end();
}

export function me(req, res) {
  res.json({ user: req.user });
}

// Like /me, but answers 200 { user: null } for guests, so storefront pages can check the
// session on every load without logging an error for each anonymous visitor.
export function session(req, res) {
  res.set('Cache-Control', 'no-store');
  res.json({ user: req.user ?? null });
}
