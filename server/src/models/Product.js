import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { slugify } from '../utils/slugify.js';
import { toJSON } from './plugins.js';

export const PRODUCT_SHAPES = ['Round', 'Oval', 'Cushion', 'Emerald', 'Pear', 'Marquise', 'Heart', 'Princess', 'Trillion', 'Cabochon', 'Rough', 'Other'];
export const PRODUCT_TREATMENTS = ['None', 'Heated', 'Oiled', 'Irradiated', 'Filled', 'Unknown'];

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: String, // Cloudinary public_id, for deletion
    alt: String,
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, unique: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    sku: { type: String, trim: true, uppercase: true, unique: true, sparse: true },
    color: { type: String, trim: true },
    // Hex used for the placeholder visual when no photo is uploaded yet
    colorHex: { type: String, match: /^#[0-9a-fA-F]{6}$/ },
    carat: { type: Number, required: true, min: 0.01 },
    dimensionsMm: { type: String, trim: true }, // e.g. "8.1 x 6.2 x 4.0"
    shape: { type: String, enum: PRODUCT_SHAPES, default: 'Other' },
    clarity: { type: String, trim: true },
    origin: { type: String, trim: true, index: true }, // e.g. Swat, Pakistan
    treatment: { type: String, enum: PRODUCT_TREATMENTS, default: 'Unknown' },
    certificate: { type: String, trim: true }, // lab name / report number
    description: { type: String, maxlength: 5000 },
    // Stored in whole PKR. USD is always derived from the current exchange rate.
    pricePKR: { type: Number, required: true, min: 0, validate: Number.isInteger },
    images: { type: [imageSchema], default: [] },
    stock: { type: Number, default: 1, min: 0 },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ isActive: 1, pricePKR: 1 });

productSchema.pre('validate', function setSlug() {
  if (!this.slug || this.isModified('name')) {
    this.slug = `${slugify(this.name)}-${randomBytes(3).toString('hex')}`;
  }
});

productSchema.set('toJSON', toJSON);

export const Product = mongoose.model('Product', productSchema);
