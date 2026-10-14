import Stripe from 'stripe';
import { env } from '../../config/env.js';

const SESSION_MINUTES = 30; // Stripe's minimum Checkout Session lifetime

let client = null;
export function stripeClient() {
  if (!client && env.STRIPE_SECRET_KEY) {
    const base = env.STRIPE_API_BASE && new URL(env.STRIPE_API_BASE);
    client = new Stripe(
      env.STRIPE_SECRET_KEY,
      base ? { host: base.hostname, port: Number(base.port) || undefined, protocol: base.protocol.replace(':', '') } : undefined,
    );
  }
  return client;
}
// Tests replace the network client with a stub.
export function setStripeClient(stub) {
  client = stub;
}

// PKR -> USD cents at the order's exchange rate (minimum 50 cents, Stripe's floor for USD)
export const toUsdCents = (pkr, pkrPerUsd) => Math.max(50, Math.round((pkr / pkrPerUsd) * 100));

// Creates a Stripe Checkout Session charging the order in USD.
export async function createCheckoutSession(order, { successUrl, cancelUrl }) {
  const lineItems = order.items.map((i) => ({
    quantity: i.qty,
    price_data: {
      currency: 'usd',
      unit_amount: toUsdCents(i.unitPricePKR, order.pkrPerUsd),
      product_data: { name: `${i.name}${i.carat ? `, ${i.carat} ct` : ''}`, metadata: { sku: i.sku ?? '' } },
    },
  }));
  if (order.shipping.feePKR > 0) {
    lineItems.push({
      quantity: 1,
      price_data: { currency: 'usd', unit_amount: toUsdCents(order.shipping.feePKR, order.pkrPerUsd), product_data: { name: 'Insured shipping' } },
    });
  }

  const session = await stripeClient().checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    customer_email: order.contact.email,
    client_reference_id: String(order._id),
    metadata: { orderId: String(order._id), orderNumber: order.orderNumber },
    payment_intent_data: { metadata: { orderId: String(order._id), orderNumber: order.orderNumber } },
    success_url: successUrl,
    cancel_url: cancelUrl,
    expires_at: Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60,
  });

  const amount = lineItems.reduce((sum, l) => sum + l.price_data.unit_amount * l.quantity, 0);
  return { session, amount };
}

export function constructWebhookEvent(rawBody, signature) {
  return stripeClient().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
}
