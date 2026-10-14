import { env } from '../config/env.js';
import { orderConfirmationEmail, orderUrlFor } from '../emails/orderConfirmation.js';
import { Counter } from '../models/Counter.js';
import { MANUAL_METHODS, Order, TRANSITIONS } from '../models/Order.js';
import { Settings } from '../models/Settings.js';
import { AppError } from '../utils/AppError.js';
import { sendMail } from './mail.js';
import { orderAccessToken } from './orderAccess.js';
import { DOMESTIC_COUNTRY, priceCart } from './pricing.js';
import { releaseLines, reserveStock } from './stock.js';

const MINUTE = 60 * 1000;
export const HOLD = {
  card: 35 * MINUTE, // Stripe session lasts 30 minutes; 5 minutes grace for late webhooks
  manual: 48 * 60 * MINUTE, // time to transfer and upload a proof
};

async function nextOrderNumber() {
  const year = new Date().getFullYear();
  const seq = await Counter.next(`order-${year}`);
  return `GK-${year}-${String(seq).padStart(6, '0')}`;
}

function holdFor(method) {
  if (method === 'card') return new Date(Date.now() + HOLD.card);
  if (MANUAL_METHODS.includes(method)) return new Date(Date.now() + HOLD.manual);
  return null; // cash on delivery: held until shipped or cancelled
}

// Prices the cart from the database, reserves stock and saves the order.
// `expectedTotalPKR` (what the shopper saw) guards against silent price changes.
export async function createOrder({ items, contact, shippingAddress, paymentMethod, notes, expectedTotalPKR, user }) {
  if (paymentMethod === 'cod' && shippingAddress.country !== DOMESTIC_COUNTRY) {
    throw new AppError(400, 'Cash on delivery is only available in Pakistan', [{ path: 'paymentMethod', message: 'Cash on delivery is only available in Pakistan' }]);
  }
  if (paymentMethod === 'card' && !env.stripeEnabled) {
    throw new AppError(400, 'Card payments are not available yet', [{ path: 'paymentMethod', message: 'Card payments are not available yet' }]);
  }

  const quote = await priceCart(items, shippingAddress.country);
  if (quote.unavailable.length || !quote.lines.length) {
    throw new AppError(409, 'Some items are no longer available', { reason: 'unavailable', unavailable: quote.unavailable });
  }
  if (expectedTotalPKR !== undefined && expectedTotalPKR !== quote.totalPKR) {
    throw new AppError(409, 'Prices have changed since you loaded the page. Please review your order.', { reason: 'price_changed', totalPKR: quote.totalPKR });
  }

  const reserved = await reserveStock(quote.lines);
  if (!reserved.ok) {
    throw new AppError(409, `${reserved.failed.name} has just been sold`, {
      reason: 'unavailable',
      unavailable: [{ productId: String(reserved.failed.product), name: reserved.failed.name, reason: 'sold_out' }],
    });
  }

  try {
    const order = await Order.create({
      orderNumber: await nextOrderNumber(),
      user: user?._id,
      contact,
      items: quote.lines,
      shippingAddress,
      shipping: { zone: quote.shipping.zone, feePKR: quote.shipping.feePKR },
      subtotalPKR: quote.subtotalPKR,
      totalPKR: quote.totalPKR,
      pkrPerUsd: quote.pkrPerUsd,
      notes,
      payment: { method: paymentMethod },
      expiresAt: holdFor(paymentMethod),
      statusHistory: [{ status: 'pending', note: 'Order placed' }],
    });
    return { order, settings: quote.settings };
  } catch (err) {
    await releaseLines(quote.lines); // never strand reserved stock
    throw err;
  }
}

// Sends the confirmation email once per order.
export async function sendConfirmation(order, settings) {
  if (order.confirmationSentAt) return;
  const s = settings ?? (await Settings.get());
  const mail = orderConfirmationEmail(order, { orderUrl: orderUrlFor(order, orderAccessToken(order._id)), paymentAccounts: s.paymentAccounts });
  if (await sendMail(mail)) {
    order.confirmationSentAt = new Date();
    await order.save();
  }
}

// Returns reserved stock exactly once (guarded by an atomic flag flip).
async function releaseStockOnce(order) {
  const claimed = await Order.findOneAndUpdate({ _id: order._id, stockReleased: false }, { $set: { stockReleased: true } });
  if (claimed) await releaseLines(order.items);
  order.stockReleased = true;
}

export async function cancelOrder(order, { by, note } = {}) {
  if (!TRANSITIONS[order.status].includes('cancelled')) throw new AppError(400, `A ${order.status} order cannot be cancelled`);
  await releaseStockOnce(order);
  order.status = 'cancelled';
  order.expiresAt = null;
  order.statusHistory.push({ status: 'cancelled', by: by?._id, note });
  await order.save();
  return order;
}

// Marks an order paid (card webhook, proof approval, or admin). Idempotent.
export async function markPaid(order, { by, note, stripe } = {}) {
  if (order.payment.status === 'paid') return order;

  if (stripe) {
    order.payment.stripeSessionId = stripe.sessionId ?? order.payment.stripeSessionId;
    order.payment.stripePaymentIntentId = stripe.paymentIntentId;
  }
  order.payment.status = 'paid';
  order.payment.paidAt = new Date();
  order.expiresAt = null;

  if (order.status === 'cancelled') {
    // Paid after the hold expired: take the stones back if they are still available.
    const again = await reserveStock(order.items);
    if (again.ok) {
      order.stockReleased = false;
      order.status = 'paid';
      order.statusHistory.push({ status: 'paid', note: 'Payment arrived after cancellation; stones reserved again' });
    } else {
      order.payment.needsRefund = true;
      order.statusHistory.push({ status: 'cancelled', note: 'Payment arrived after cancellation and a stone was no longer available: refund needed' });
    }
  } else if (order.status === 'pending') {
    order.status = 'paid';
    order.statusHistory.push({ status: 'paid', by: by?._id, note: note ?? 'Payment received' });
  }
  await order.save();
  return order;
}

// Cancels unpaid orders whose hold has run out. Returns the number cancelled.
export async function expireOverdueOrders(now = new Date()) {
  const overdue = await Order.find({ status: 'pending', 'payment.status': { $in: ['unpaid', 'rejected'] }, expiresAt: { $ne: null, $lte: now } });
  for (const order of overdue) {
    await cancelOrder(order, { note: order.payment.method === 'card' ? 'Card payment not completed in time' : 'No payment proof received within 48 hours' });
  }
  return overdue.length;
}

// Admin status change with transition rules.
export async function changeStatus(order, { status, note, tracking, by }) {
  if (status === order.status) throw new AppError(400, `The order is already ${status}`);
  if (!TRANSITIONS[order.status].includes(status)) {
    throw new AppError(400, `Cannot change a ${order.status} order to ${status}`);
  }
  if (status === 'cancelled') return cancelOrder(order, { by, note });
  if (status === 'paid') return markPaid(order, { by, note: note ?? 'Marked paid by admin' });
  if (status === 'shipped' && order.status === 'pending' && order.payment.method !== 'cod') {
    throw new AppError(400, 'Only cash-on-delivery orders can ship before payment');
  }

  if (tracking) order.tracking = { ...order.tracking?.toObject?.(), ...tracking };
  if (status === 'delivered' && order.payment.method === 'cod' && order.payment.status !== 'paid') {
    order.payment.status = 'paid'; // cash collected on delivery
    order.payment.paidAt = new Date();
  }
  order.status = status;
  order.expiresAt = null;
  order.statusHistory.push({ status, by: by?._id, note });
  await order.save();
  return order;
}

// Customer uploads a manual payment proof.
export async function addProof(order, { image, reference }) {
  if (!MANUAL_METHODS.includes(order.payment.method)) throw new AppError(400, 'This order is not paid by transfer');
  if (order.status !== 'pending') throw new AppError(400, `This order is ${order.status}`);
  if (order.payment.status === 'paid') throw new AppError(400, 'This order is already paid');
  if (order.payment.status === 'awaiting_review') throw new AppError(409, 'A payment proof is already being reviewed');

  order.payment.proofs.push({ image, reference });
  order.payment.status = 'awaiting_review';
  order.expiresAt = null; // reviewed by a person; no automatic cancellation
  order.statusHistory.push({ status: 'pending', note: 'Payment proof uploaded' });
  await order.save();
  return order;
}

export async function reviewProof(order, { approve, reason, by }) {
  const proof = order.payment.proofs.at(-1);
  if (!proof || proof.status !== 'pending' || order.payment.status !== 'awaiting_review') {
    throw new AppError(400, 'There is no payment proof waiting for review');
  }
  proof.status = approve ? 'approved' : 'rejected';
  proof.reviewedBy = by?._id;
  proof.reviewedAt = new Date();

  if (approve) return markPaid(order, { by, note: 'Payment proof approved' });

  proof.reason = reason;
  order.payment.status = 'rejected';
  order.expiresAt = new Date(Date.now() + HOLD.manual); // another 48 hours to send a correct proof
  order.statusHistory.push({ status: 'pending', by: by?._id, note: `Payment proof rejected: ${reason}` });
  await order.save();
  return order;
}
