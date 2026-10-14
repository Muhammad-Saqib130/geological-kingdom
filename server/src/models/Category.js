import mongoose from 'mongoose';
import { slugify } from '../utils/slugify.js';
import { toJSON } from './plugins.js';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60, unique: true },
    slug: { type: String, unique: true },
    description: { type: String, trim: true, maxlength: 1000 },
    image: {
      url: String,
      publicId: String, // Cloudinary public_id, for deletion
    },
    // Tint for the category icon row when there is no image
    colorHex: { type: String, match: /^#[0-9a-fA-F]{6}$/ },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    showOnHome: { type: Boolean, default: false },
  },
  { timestamps: true },
);

categorySchema.index({ isActive: 1, sortOrder: 1 });

// Category slugs are human-readable and stable (no random suffix): /shop/emerald
categorySchema.pre('validate', function setSlug() {
  if (!this.slug || this.isModified('name')) this.slug = slugify(this.name);
});

categorySchema.set('toJSON', toJSON);

export const Category = mongoose.model('Category', categorySchema);
