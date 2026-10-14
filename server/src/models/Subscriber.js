import mongoose from 'mongoose';
import { toJSON } from './plugins.js';

const subscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 254 },
    source: { type: String, trim: true, maxlength: 40, default: 'footer' }, // where they signed up
    unsubscribedAt: Date,
  },
  { timestamps: true },
);

subscriberSchema.set('toJSON', toJSON);

export const Subscriber = mongoose.model('Subscriber', subscriberSchema);
