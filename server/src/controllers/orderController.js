import { z } from 'zod';
import { env } from '../config/env.js';
import { orderUrlFor } from '../emails/orderConfirmation.js';
import { MANUAL_METHODS, Order, PAYMENT_METHODS } from '../models/Order.js';
import { Settings } from '../models/Settings.js';
import { verifyOrderAccessToken, orderAccessToken } from '../services/orderAccess.js';
import {
  addProof,
  cancelOrder,
  createOrder,
  HOLD,
  markPaid,
  sendConfirmation,
} from '../services/orderService.js';
import { createCheckoutSession, stripeClient } from '../services/payments/stripe.js';
import { DOMESTIC_COUNTRY, priceCart } from '../services/pricing.js';
import * as local from '../services/storage/local.js';
import { MAX_UPLOAD_BYTES, storage } from '../services/storage/index.js';
import { AppError } from '../utils/AppError.js';
import { imageRef } from '../validators/image.js';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid product');
const text = (min, max, msg) => z.string().trim().min(min, msg).max(max);
const phone = z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number');
const country = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, 'Choose a country');

const cartItems = z
  .array(z.object({ productId: objectId, qty: z.number().int().min(1).max(100) }))
  .min(1, 'Your cart is empty')
  .max(50);

export const quoteBody = z.object({ items: cartItems, country });

const address = z
  .object({
    fullName: text(2, 80, 'Enter the recipient’s name'),
    phone,
    line1: text(3, 120, 'Enter the street address'),
    line2: z.string().trim().max(120).optional(),
    city: text(2, 60, 'Enter the city'),
    province: z.string().trim().max(60).optional(),
    postalCode: z.string().trim().max(12).optional(),
    country,
  })
  .refine((a) => a.country !== DOMESTIC_COUNTRY || a.province, { message: 'Choose a province', path: ['province'] });

export const createOrderBody = z.object({
  items: cartItems,
  contact: z.object({
    name: text(2, 80, 'Enter your name'),
    email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254)),
    phone,
  }),
  shippingAddress: address,
  paymentMethod: z.enum(PAYMENT_METHODS, { error: 'Choose a payment method' }),
  notes: z.string().trim().max(500).optional(),
  expectedTotalPKR: z.number().int().nonnegative().optional(),
});

export const orderParams = z.object({ number: z.string().regex(/^GK-\d{4}-\d{6}$/, 'Invalid order number') });
export const proofBody = z.object({
  image: imageRef.refine((img) => img.publicId.includes('/payment-proofs/'), 'Upload the proof through your order page'),
  reference: z.string().trim().max(80).optional(),
});

// What a customer may see of an order
function customerView(order) {
  const o = order.toJSON();
  for (const h of o.statusHistory ?? []) delete h.by;
  for (const p of o.payment?.proofs ?? []) delete p.reviewedBy;
  delete o.payment.stripePaymentIntentId;
  return o;
}

// Public payment details: which methods are offered and the accounts for manual transfers.
export async function checkoutSettings(_req, res) {
  const s = await Settings.get();
  res.json({
    shipping: s.shipping,
    pkrPerUsd: s.pkrPerUsd,
    methods: { cod: true, bank: true, jazzcash: true, easypaisa: true, card: env.stripeEnabled },
    paymentAccounts: s.paymentAccounts,
    holdHours: { manual: HOLD.manual / 3_600_000 },
  });
}

export async function quote(req, res) {
  const { items, country: c } = req.validated.body;
  const q = await priceCart(items, c);
  res.json({
    lines: q.lines.map((l) => ({ ...l, productId: String(l.product) })),
    unavailable: q.unavailable,
    subtotalPKR: q.subtotalPKR,
    shipping: q.shipping,
    totalPKR: q.totalPKR,
    pkrPerUsd: q.pkrPerUsd,
    codAvailable: c === DOMESTIC_COUNTRY,
  });
}

const redirectUrls = (order, token) => ({
  successUrl: `${orderUrlFor(order, token)}&session_id={CHECKOUT_SESSION_ID}`,
  cancelUrl: `${orderUrlFor(order, token)}&cancelled=1`,
});

async function startCardPayment(order, token) {
  const { session, amount } = await createCheckoutSession(order, redirectUrls(order, token));
  order.payment.stripeSessionId = session.id;
  order.payment.chargeCurrency = 'usd';
  order.payment.chargeAmount = amount;
  order.expiresAt = new Date(Date.now() + HOLD.card);
  await order.save();
  return session.url;
}

export async function placeOrder(req, res) {
  const { order, settings } = await createOrder({ ...req.validated.body, user: req.user });
  const token = orderAccessToken(order._id);

  if (order.payment.method === 'card') {
    try {
      const checkoutUrl = await startCardPayment(order, token);
      return res.status(201).json({ orderNumber: order.orderNumber, token, checkoutUrl });
    } catch (err) {
      console.error(`Stripe session for ${order.orderNumber} failed: ${err.message}`);
      await cancelOrder(order, { note: 'Card payment could not be started' });
      throw new AppError(502, 'Card payment is unavailable right now. Please choose another payment method.');
    }
  }

  await sendConfirmation(order, settings);
  res.status(201).json({ orderNumber: order.orderNumber, token });
}

// Loads an order the requester may see: its owner, an admin, or anyone with the order link token.
// Unknown and forbidden orders both answer 404, so order numbers cannot be probed.
async function findAccessibleOrder(req) {
  const order = await Order.findOne({ orderNumber: req.validated.params.number });
  const token = req.query.token ?? req.get('x-order-token');
  const allowed =
    order &&
    (req.user?.role === 'admin' ||
      (order.user && req.user && String(order.user) === String(req.user._id)) ||
      verifyOrderAccessToken(order._id, token));
  if (!allowed) throw new AppError(404, 'Order not found');
  return order;
}

export async function getOrder(req, res) {
  let order = await findAccessibleOrder(req);

  // Returning from Stripe: confirm the session directly in case the webhook is late or not configured.
  const sessionId = req.query.session_id;
  if (sessionId && order.payment.method === 'card' && order.payment.status !== 'paid' && sessionId === order.payment.stripeSessionId && stripeClient()) {
    try {
      const session = await stripeClient().checkout.sessions.retrieve(sessionId);
      if (session.payment_status === 'paid') {
        order = await markPaid(order, { stripe: { sessionId: session.id, paymentIntentId: session.payment_intent } });
        await sendConfirmation(order);
      }
    } catch (err) {
      console.warn(`Could not verify Stripe session ${sessionId}: ${err.message}`);
    }
  }

  res.set('Cache-Control', 'no-store');
  res.json({ order: customerView(order) });
}

// Starts a new card payment for an unpaid card order (after a cancelled or abandoned Stripe page).
export async function retryCardPayment(req, res) {
  const order = await findAccessibleOrder(req);
  if (order.payment.method !== 'card' || order.status !== 'pending' || order.payment.status === 'paid') {
    throw new AppError(400, 'This order cannot be paid by card now');
  }
  try {
    const checkoutUrl = await startCardPayment(order, orderAccessToken(order._id));
    res.json({ checkoutUrl });
  } catch (err) {
    console.error(`Stripe retry for ${order.orderNumber} failed: ${err.message}`);
    throw new AppError(502, 'Card payment is unavailable right now. Please try again later.');
  }
}

export async function cancelByCustomer(req, res) {
  const order = await findAccessibleOrder(req);
  if (order.status !== 'pending' || ['paid', 'awaiting_review'].includes(order.payment.status)) {
    throw new AppError(400, 'This order can no longer be cancelled online. Please contact us.');
  }
  await cancelOrder(order, { note: 'Cancelled by customer' });
  res.json({ order: customerView(order) });
}

// Payment proofs: signing / local upload / submit, all scoped to one order.
function assertCanUploadProof(order) {
  if (!MANUAL_METHODS.includes(order.payment.method) || order.status !== 'pending' || !['unpaid', 'rejected'].includes(order.payment.status)) {
    throw new AppError(400, 'This order is not waiting for a payment proof');
  }
}

export async function signProofUpload(req, res) {
  const order = await findAccessibleOrder(req);
  assertCanUploadProof(order);
  const ticket = storage.signUpload('payment-proofs', { maxBytes: MAX_UPLOAD_BYTES });
  if (ticket.provider === 'local') {
    ticket.uploadUrl = `/api/orders/${order.orderNumber}/proof/local?token=${encodeURIComponent(orderAccessToken(order._id))}`;
  }
  res.set('Cache-Control', 'no-store');
  res.json(ticket);
}

export async function uploadProofLocal(req, res) {
  if (storage.name !== 'local') throw new AppError(404, 'Not found');
  const order = await findAccessibleOrder(req);
  assertCanUploadProof(order);
  if (!Buffer.isBuffer(req.body) || !req.body.length) throw new AppError(400, 'No file received');
  const saved = await local.save('payment-proofs', req.body);
  if (!saved) throw new AppError(415, 'Upload a screenshot or photo (JPG, PNG or WebP)');
  res.status(201).json(saved);
}

export async function submitProof(req, res) {
  const order = await findAccessibleOrder(req);
  await addProof(order, req.validated.body);
  res.json({ order: customerView(order) });
}

export async function myOrders(req, res) {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
  res.json({ items: orders.map(customerView) });
}
