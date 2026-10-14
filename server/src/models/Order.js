import mongoose from 'mongoose';
import { imageSchema } from './imageSchema.js';
import { toJSON } from './plugins.js';

export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
export const PAYMENT_METHODS = ['cod', 'bank', 'jazzcash', 'easypaisa', 'card'];
export const MANUAL_METHODS = ['bank', 'jazzcash', 'easypaisa'];
export const PAYMENT_STATUSES = ['unpaid', 'awaiting_review', 'paid', 'rejected'];

// Allowed admin status changes. pending -> shipped is only allowed for cash on delivery.
export const TRANSITIONS = {
  pending: ['paid', 'shipped', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const lineSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    slug: String,
    sku: String,
    category: String,
    carat: Number,
    colorHex: String,
    image: { url: String, alt: String },
    unitPricePKR: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
    lineTotalPKR: { type: Number, required: true },
  },
  { _id: false },
);

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    city: { type: String, required: true },
    province: String, // province / state / region
    postalCode: String,
    country: { type: String, required: true }, // ISO 3166-1 alpha-2
  },
  { _id: false },
);

const proofSchema = new mongoose.Schema(
  {
    image: { type: imageSchema, required: true },
    reference: String, // transaction ID the customer typed
    uploadedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reason: String, // rejection reason shown to the customer
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
  },
  { _id: true },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true }, // GK-2026-000042
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, // set when placed while signed in
    contact: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, index: true },
      phone: { type: String, required: true },
    },
    items: { type: [lineSchema], required: true },
    shippingAddress: { type: addressSchema, required: true },
    shipping: {
      zone: { type: String, enum: ['domestic', 'international'], required: true },
      feePKR: { type: Number, required: true },
    },
    subtotalPKR: { type: Number, required: true },
    totalPKR: { type: Number, required: true },
    pkrPerUsd: { type: Number, required: true }, // exchange rate at order time
    notes: String,

    status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
    statusHistory: [
      {
        _id: false,
        status: String,
        at: { type: Date, default: Date.now },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: String,
      },
    ],
    tracking: { carrier: String, number: String },

    payment: {
      method: { type: String, enum: PAYMENT_METHODS, required: true },
      status: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid', index: true },
      paidAt: Date,
      proofs: { type: [proofSchema], default: [] },
      // card
      stripeSessionId: String,
      stripePaymentIntentId: String,
      chargeCurrency: String, // 'usd'
      chargeAmount: Number, // in the smallest unit (cents)
      needsRefund: { type: Boolean, default: false }, // paid after the order was cancelled
    },

    // Unpaid orders release their stock after this time (null = held until admin acts)
    expiresAt: { type: Date, default: null, index: true },
    stockReleased: { type: Boolean, default: false },
    confirmationSentAt: Date,
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'payment.status': 1, 'payment.paidAt': -1 }); // dashboard sales

orderSchema.set('toJSON', toJSON);

export const Order = mongoose.model('Order', orderSchema);
