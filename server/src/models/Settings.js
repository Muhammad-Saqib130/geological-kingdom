import mongoose from 'mongoose';
import { env } from '../config/env.js';

// Single-document store for admin-editable settings.
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'store', unique: true },
    pkrPerUsd: { type: Number, required: true, min: 1 },
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
