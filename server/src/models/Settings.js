import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { imageSchema } from './imageSchema.js';

// Single-document store for admin-editable settings.
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'store', unique: true },
    pkrPerUsd: { type: Number, required: true, min: 1 },
    // Photos for the home page; the storefront shows illustrated fallbacks when empty.
    homepage: {
      heroImage: { type: imageSchema, default: undefined }, // full-width hero background
      promoImage: { type: imageSchema, default: undefined }, // "verified" banner, right side
      storyImage: { type: imageSchema, default: undefined }, // beside the testimonial
    },
  },
  { timestamps: true },
);

settingsSchema.statics.get = async function get() {
  return this.findOneAndUpdate(
    { key: 'store' },
    { $setOnInsert: { pkrPerUsd: env.DEFAULT_PKR_PER_USD } },
    { upsert: true, returnDocument: 'after' },
  );
};

export const Settings = mongoose.model('Settings', settingsSchema);
