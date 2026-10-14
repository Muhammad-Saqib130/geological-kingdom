import mongoose from 'mongoose';
import { toJSON } from './plugins.js';

export const ROLES = ['customer', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 254 },
    // Never returned by queries unless explicitly selected
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, trim: true, maxlength: 30 },
    role: { type: String, enum: ROLES, default: 'customer' },
    // Bumped to invalidate every issued session (logout everywhere, password change)
    tokenVersion: { type: Number, default: 0, select: false },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

userSchema.set('toJSON', {
  ...toJSON,
  transform: (doc, ret, options) => {
    toJSON.transform(doc, ret, options);
    delete ret.passwordHash;
    delete ret.tokenVersion;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
