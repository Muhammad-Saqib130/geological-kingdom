import { Order } from '../models/Order.js';
import { cancelOrder, markPaid, sendConfirmation } from '../services/orderService.js';
import { constructWebhookEvent, stripeClient } from '../services/payments/stripe.js';
import { env } from '../config/env.js';

// POST /api/webhooks/stripe (raw body). Stripe retries on non-2xx, so handlers are idempotent.
export async function stripeWebhook(req, res) {
  if (!stripeClient() || !env.STRIPE_WEBHOOK_SECRET) return res.status(404).json({ error: 'Not found' });

  let event;
  try {
    event = constructWebhookEvent(req.body, req.get('stripe-signature'));
  } catch (err) {
    return res.status(400).json({ error: `Invalid signature: ${err.message}` });
  }

  const session = event.data?.object ?? {};
  const orderId = session.metadata?.orderId ?? session.client_reference_id;
  const order = orderId ? await Order.findById(orderId).catch(() => null) : null;

  if (order && order.payment.method === 'card') {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        if (session.payment_status === 'paid') {
          await markPaid(order, { stripe: { sessionId: session.id, paymentIntentId: session.payment_intent } });
          await sendConfirmation(order);
        }
        break;
      case 'checkout.session.expired':
        // Only the current session expiring cancels the order (a retry may have replaced it)
        if (order.status === 'pending' && order.payment.status !== 'paid' && order.payment.stripeSessionId === session.id) {
          await cancelOrder(order, { note: 'Card payment not completed in time' });
        }
        break;
      default:
        break;
    }
  }

  res.json({ received: true });
}
