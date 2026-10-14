import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { imageSchema } from './imageSchema.js';

// Single-document store for admin-editable settings.
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'store', unique: true },
    pkrPerUsd: { type: Number, required: true, min: 1 },
    shipping: {
      domesticPKR: { type: Number, min: 0, default: 300 }, // flat rate within Pakistan
      internationalUSD: { type: Number, min: 0, default: 35 }, // flat rate elsewhere, converted at checkout
      freeDomesticOverPKR: { type: Number, min: 0, default: 0 }, // 0 = no free shipping
    },
    // Shown to customers who choose a manual transfer
    paymentAccounts: {
      bank: { bankName: String, accountTitle: String, accountNumber: String, iban: String },
      jazzcash: { accountTitle: String, number: String },
      easypaisa: { accountTitle: String, number: String },
    },
    // Public contact number for WhatsApp links, digits in international format (e.g. 923001234567).
    // Empty = the storefront falls back to its build-time VITE_WHATSAPP_NUMBER.
    whatsappNumber: { type: String, default: '' },
    // Dashboard alert when an active product has this many or fewer in stock
    lowStockThreshold: { type: Number, min: 0, default: 1 },
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
