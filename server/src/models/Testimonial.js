import mongoose from 'mongoose';
import { toJSON } from './plugins.js';

const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    location: { type: String, trim: true, maxlength: 80 }, // e.g. "Lahore" or "London, UK"
    quote: { type: String, required: true, trim: true, maxlength: 600 },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    // Development placeholders are flagged so they are never mistaken for real reviews.
    isSample: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

testimonialSchema.index({ isPublished: 1, sortOrder: 1 });
testimonialSchema.set('toJSON', toJSON);

export const Testimonial = mongoose.model('Testimonial', testimonialSchema);
