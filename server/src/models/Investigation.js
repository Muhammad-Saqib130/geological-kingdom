import { randomInt } from 'node:crypto';
import mongoose from 'mongoose';
import { imageSchema } from './imageSchema.js';
import { toJSON } from './plugins.js';

export const INVESTIGATION_FEE_USD = 10; // per gemstone
export const MAX_GEMS = 20;
export const MAX_PHOTOS = 5;

// cancelled is for spam or withdrawn requests; customers are never emailed about it
export const INVESTIGATION_STATUSES = ['received', 'contacted', 'payment_arranged', 'in_progress', 'completed', 'cancelled'];
export const VERDICTS = ['natural', 'natural_treated', 'synthetic', 'imitation', 'inconclusive'];

// Tracking IDs look like GI-7K3M-9QX2: random (so they cannot be enumerated) and free of
// look-alike characters (no 0/O, 1/I/L), so they can be read out over the phone.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const TRACKING_ID = /^GI-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/;

export function newTrackingId() {
  const pick = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  return `GI-${pick()}-${pick()}`;
}

// Accepts what customers type (lowercase, spaces, missing dashes) and returns the
// canonical form, or null when it cannot be a tracking ID.
export function normalizeTrackingId(input) {
  const raw = String(input ?? '').toUpperCase().replace(/[\s-]/g, '').replace(/^GI/, '');
  if (raw.length !== 8) return null;
  const id = `GI-${raw.slice(0, 4)}-${raw.slice(4)}`;
  return TRACKING_ID.test(id) ? id : null;
}

// An uploaded result report: an image or a PDF
const fileSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    format: String,
    bytes: Number,
  },
  { _id: false },
);

const investigationSchema = new mongoose.Schema(
  {
    trackingId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, // set when submitted while signed in
    contact: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, index: true },
      whatsapp: { type: String, required: true },
      country: { type: String, required: true }, // ISO 3166-1 alpha-2
    },
    gem: {
      type: { type: String, required: true }, // what the customer was told it is, e.g. "Blue sapphire"
      count: { type: Number, required: true, min: 1, max: MAX_GEMS },
      purchasedFrom: { type: String, required: true }, // seller / market / city / website
      sellerClaims: String, // origin, treatment, weight... as stated by the seller
      description: String,
    },
    photos: { type: [imageSchema], required: true },
    certificate: { type: imageSchema, default: undefined },
    feeUSD: { type: Number, required: true }, // INVESTIGATION_FEE_USD x count, fixed at submission

    status: { type: String, enum: INVESTIGATION_STATUSES, default: 'received', index: true },
    statusHistory: [
      {
        _id: false,
        status: String,
        at: { type: Date, default: Date.now },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: String,
      },
    ],
    // Internal notes, never shown to the customer
    notes: [
      {
        text: { type: String, required: true },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],
    // Shown to the customer once the status is completed
    result: {
      verdict: { type: String, enum: VERDICTS },
      summary: String,
      report: { type: fileSchema, default: undefined },
      updatedAt: Date,
    },

    receivedEmailAt: Date,
    completedEmailAt: Date,
  },
  { timestamps: true },
);

investigationSchema.index({ createdAt: -1 });
investigationSchema.set('toJSON', toJSON);

export const Investigation = mongoose.model('Investigation', investigationSchema);
