import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { slugify } from '../utils/slugify.js';

export const GEM_SHAPES = ['Round', 'Oval', 'Cushion', 'Emerald', 'Pear', 'Marquise', 'Heart', 'Princess', 'Trillion', 'Cabochon', 'Rough', 'Other'];
export const GEM_TREATMENTS = ['None', 'Heated', 'Oiled', 'Irradiated', 'Filled', 'Unknown'];

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: String, // Cloudinary public_id, for deletion
    alt: String,
  },
  { _id: false },
);

const gemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, unique: true, index: true },
    type: { type: String, required: true, trim: true, index: true }, // e.g. Emerald, Ruby, Tourmaline
    color: { type: String, trim: true },
    // Hex used for the placeholder visual when no photo is uploaded yet
    colorHex: { type: String, match: /^#[0-9a-fA-F]{6}$/ },
    carat: { type: Number, required: true, min: 0.01 },
    dimensionsMm: { type: String, trim: true }, // e.g. "8.1 x 6.2 x 4.0"
    shape: { type: String, enum: GEM_SHAPES, default: 'Other' },
    clarity: { type: String, trim: true },
    origin: { type: String, trim: true, index: true }, // e.g. Swat, Pakistan
    treatment: { type: String, enum: GEM_TREATMENTS, default: 'Unknown' },
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

gemSchema.index({ name: 'text', type: 'text', color: 'text', origin: 'text' });

gemSchema.pre('validate', function setSlug() {
  if (!this.slug || this.isModified('name')) {
    this.slug = `${slugify(this.name)}-${randomBytes(3).toString('hex')}`;
  }
});

gemSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

export const Gem = mongoose.model('Gem', gemSchema);
