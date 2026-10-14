import mongoose from 'mongoose';

// A stored image (Cloudinary or local dev storage). Shared by products and site settings.
export const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true }, // storage key, used to delete the file
    alt: { type: String, trim: true, maxlength: 160 },
    width: Number,
    height: Number,
  },
  { _id: false },
);
