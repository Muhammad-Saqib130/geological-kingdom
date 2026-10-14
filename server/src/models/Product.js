import mongoose from 'mongoose';
import { slugify } from '../utils/slugify.js';
import { imageSchema } from './imageSchema.js';
import { toJSON } from './plugins.js';

export const PRODUCT_SHAPES = ['Round', 'Oval', 'Cushion', 'Emerald', 'Pear', 'Marquise', 'Heart', 'Princess', 'Trillion', 'Radiant', 'Asscher', 'Cabochon', 'Rough', 'Other'];
export const PRODUCT_TREATMENTS = ['Natural', 'Heated', 'Oiled', 'Irradiated', 'Filled', 'Diffused', 'Unknown'];
export const MAX_PRODUCT_IMAGES = 12;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    // Stable once set: renaming a product does not change its URL. Editable explicitly by admins.
    slug: { type: String, unique: true, match: SLUG_PATTERN, maxlength: 140 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    sku: { type: String, trim: true, uppercase: true, unique: true, sparse: true },
    description: { type: String, trim: true, maxlength: 5000 },
    carat: { type: Number, required: true, min: 0.01 },
    dimensionsMm: { type: String, trim: true, maxlength: 60 }, // e.g. "8.1 x 6.2 x 4.0"
    color: { type: String, trim: true, maxlength: 60 },
    // Hex used for the placeholder visual when no photo is uploaded yet
    colorHex: { type: String, match: /^#[0-9a-fA-F]{6}$/ },
    clarity: { type: String, trim: true, maxlength: 60 },
    shape: { type: String, enum: PRODUCT_SHAPES, default: 'Other' }, // cut / shape
    origin: { type: String, trim: true, maxlength: 100, index: true }, // e.g. Swat, Pakistan
    treatment: { type: String, enum: PRODUCT_TREATMENTS, default: 'Unknown', index: true },
    certificate: {
      lab: { type: String, trim: true, maxlength: 80 },
      number: { type: String, trim: true, maxlength: 80 },
      image: { type: imageSchema, default: undefined },
    },
    // Stored in whole PKR. USD is always derived from the current exchange rate.
    pricePKR: { type: Number, required: true, min: 0, validate: Number.isInteger },
    stock: { type: Number, default: 1, min: 0, validate: Number.isInteger },
    isFeatured: { type: Boolean, default: false, index: true },
    // false = archived: hidden from the shop, kept for order history
    isActive: { type: Boolean, default: true, index: true },
    images: {
      type: [imageSchema],
      default: [],
      validate: [(v) => v.length <= MAX_PRODUCT_IMAGES, `At most ${MAX_PRODUCT_IMAGES} images`],
    },
  },
  { timestamps: true },
);

productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ isActive: 1, pricePKR: 1 });

// Picks "swat-emerald", or "swat-emerald-2", "-3"… when taken.
productSchema.statics.uniqueSlug = async function uniqueSlug(base, excludeId) {
  const root = slugify(base).slice(0, 120) || 'gemstone';
  const taken = new Set(
    await this.find({ slug: new RegExp(`^${root}(-\\d+)?$`), ...(excludeId && { _id: { $ne: excludeId } }) }).distinct('slug'),
  );
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
};

productSchema.pre('validate', async function setSlug() {
  if (!this.slug) this.slug = await this.constructor.uniqueSlug(this.name, this._id);
});

productSchema.set('toJSON', toJSON);

export const Product = mongoose.model('Product', productSchema);
