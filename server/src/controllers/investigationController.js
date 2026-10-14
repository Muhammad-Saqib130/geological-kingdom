import { z } from 'zod';
import { Investigation, MAX_GEMS, MAX_PHOTOS, normalizeTrackingId } from '../models/Investigation.js';
import { createInvestigation } from '../services/investigationService.js';
import { investigationAccessToken, verifyInvestigationAccessToken } from '../services/orderAccess.js';
import * as local from '../services/storage/local.js';
import { MAX_UPLOAD_BYTES, storage } from '../services/storage/index.js';
import { AppError } from '../utils/AppError.js';
import { imageRef } from '../validators/image.js';

const text = (min, max, msg) => z.string().trim().min(min, msg).max(max);
const optionalText = (max) => z.string().trim().max(max).optional();
// Photos must come from this form's own upload folder
const customerPhoto = imageRef.refine((img) => img.publicId.includes('/investigations/'), 'Upload photos through this form');

export const createBody = z.object({
  contact: z.object({
    name: text(2, 80, 'Enter your name'),
    email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254)),
    whatsapp: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a WhatsApp number with country code'),
    country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, 'Choose a country'),
  }),
  gem: z.object({
    type: text(2, 80, 'Tell us what gemstone it is said to be'),
    count: z.number({ error: 'Enter how many gemstones' }).int().min(1, 'At least one gemstone').max(MAX_GEMS, `Up to ${MAX_GEMS} gemstones per request`),
    purchasedFrom: text(2, 160, 'Tell us where you bought it'),
    sellerClaims: optionalText(1000),
    description: optionalText(2000),
  }),
  photos: z.array(customerPhoto).min(1, 'Add at least one photo').max(MAX_PHOTOS, `Up to ${MAX_PHOTOS} photos`),
  certificate: customerPhoto.optional(),
});

export const trackBody = z
  .object({
    trackingId: z.string().max(20).transform((v, ctx) => normalizeTrackingId(v) ?? (ctx.addIssue({ code: 'custom', message: 'Enter the tracking ID from your email, e.g. GI-7K3M-9QX2' }), z.NEVER)),
    email: z.string().trim().toLowerCase().max(254).optional(),
    token: z.string().max(64).optional(),
  })
  .refine((b) => b.email || b.token, { message: 'Enter the email address you used', path: ['email'] });

// What the customer may see: no internal notes, no admin names, the result only once completed
export function customerView(inv) {
  const o = inv.toJSON();
  delete o.notes;
  delete o.user;
  delete o.receivedEmailAt;
  delete o.completedEmailAt;
  o.statusHistory = (o.statusHistory ?? []).map(({ status, at }) => ({ status, at }));
  o.contact = { name: o.contact.name, country: o.contact.country };
  if (o.status !== 'completed') delete o.result;
  return o;
}

export function signUpload(_req, res) {
  res.set('Cache-Control', 'no-store');
  const ticket = storage.signUpload('investigations', { maxBytes: MAX_UPLOAD_BYTES });
  if (ticket.provider === 'local') ticket.uploadUrl = '/api/investigations/uploads/local';
  res.json(ticket);
}

export async function uploadLocal(req, res) {
  if (storage.name !== 'local') throw new AppError(404, 'Not found');
  if (!Buffer.isBuffer(req.body) || !req.body.length) throw new AppError(400, 'No file received');
  const saved = await local.save('investigations', req.body);
  if (!saved) throw new AppError(415, 'Upload a photo (JPG, PNG or WebP)');
  res.status(201).json(saved);
}

export async function submit(req, res) {
  const inv = await createInvestigation({ ...req.validated.body, user: req.user });
  res.status(201).json({ trackingId: inv.trackingId, token: investigationAccessToken(inv._id), feeUSD: inv.feeUSD });
}

// Tracking ID + the email used, or the link token from the email. Any mismatch is the same 404.
export async function track(req, res) {
  const { trackingId, email, token } = req.validated.body;
  const inv = await Investigation.findOne({ trackingId });
  const allowed = inv && ((email && inv.contact.email === email) || verifyInvestigationAccessToken(inv._id, token));
  if (!allowed) throw new AppError(404, 'We could not find a request with that tracking ID and email address');
  res.set('Cache-Control', 'no-store');
  res.json({ investigation: customerView(inv) });
}
