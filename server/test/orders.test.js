import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';
import Stripe from 'stripe';
import * as helpers from './helpers.js';
import { STRIPE_WEBHOOK_SECRET, createClient, mailDir, signedInClient, startTestServer, stopTestServer } from './helpers.js';

let baseUrl;
let anon;
let admin;
let Product;
let Order;
let Settings;
let orderService;
let category;
const stripeCalls = { create: [], retrieve: [] };
let stripeFails = false;
let retrieveResult = { payment_status: 'unpaid' };
const realStripe = new Stripe('sk_test_dummy'); // only used offline, to sign webhook payloads

const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415408d763f8cfc000000301010018dd8db00000000049454e44ae426082',
  'hex',
);

before(async () => {
  baseUrl = await startTestServer();
  ({ Product } = await import('../src/models/Product.js'));
  ({ Order } = await import('../src/models/Order.js'));
  ({ Settings } = await import('../src/models/Settings.js'));
  orderService = await import('../src/services/orderService.js');
  const { Category } = await import('../src/models/Category.js');
  const { setStripeClient } = await import('../src/services/payments/stripe.js');

  // Stub Stripe client: records calls, never touches the network
  setStripeClient({
    checkout: {
      sessions: {
        create: async (params) => {
          stripeCalls.create.push(params);
          if (stripeFails) throw new Error('Stripe is down');
          const id = `cs_test_${stripeCalls.create.length}`;
          return { id, url: `https://checkout.stripe.test/${id}` };
        },
        retrieve: async (id) => {
          stripeCalls.retrieve.push(id);
          return { id, payment_intent: 'pi_test_1', ...retrieveResult };
        },
      },
    },
    webhooks: realStripe.webhooks,
  });

  category = await Category.create({ name: 'Emerald' });
  const s = await Settings.get();
  s.pkrPerUsd = 280;
  s.shipping = { domesticPKR: 300, internationalUSD: 35, freeDomesticOverPKR: 500000 };
  s.paymentAccounts = { bank: { bankName: 'Meezan Bank', accountTitle: 'Geological Kingdom', accountNumber: '0101-0101', iban: 'PK00MEZN0001' } };
  await s.save();

  anon = createClient(baseUrl);
  admin = await signedInClient(baseUrl, 'admin');
}, { timeout: 120_000 });

after(stopTestServer);

beforeEach(() => {
  stripeFails = false;
  retrieveResult = { payment_status: 'unpaid' };
});

let n = 0;
const stone = (o = {}) => Product.create({ name: `Stone ${++n}`, category: category._id, carat: 1.2, pricePKR: 100000, stock: 1, ...o });
const stockOf = async (p) => (await Product.findById(p._id)).stock;

const contact = { name: 'Ayesha Khan', email: 'ayesha@example.com', phone: '+92 300 1234567' };
const pkAddress = { fullName: 'Ayesha Khan', phone: '+92 300 1234567', line1: '12 Mall Road', city: 'Lahore', province: 'Punjab', postalCode: '54000', country: 'PK' };
const ukAddress = { fullName: 'Sam Lee', phone: '+44 20 7946 0000', line1: '1 High St', city: 'London', postalCode: 'SW1A 1AA', country: 'GB' };

const order = (client, products, overrides = {}) =>
  client.post('/api/orders', {
    items: products.map((p) => ({ productId: String(p._id), qty: 1 })),
    contact,
    shippingAddress: pkAddress,
    paymentMethod: 'cod',
    ...overrides,
  });

const openOrder = (res) => anon.get(`/api/orders/${res.data.orderNumber}?token=${res.data.token}`);

async function outboxWith(text) {
  const files = await readdir(mailDir).catch(() => []);
  const bodies = await Promise.all(files.map((f) => readFile(path.join(mailDir, f), 'utf8')));
  return bodies.filter((b) => b.includes(text));
}

async function signedWebhook(type, object) {
  const payload = JSON.stringify({ id: `evt_${Date.now()}`, type, data: { object } });
  const signature = realStripe.webhooks.generateTestHeaderString({ payload, secret: STRIPE_WEBHOOK_SECRET });
  const res = await fetch(`${baseUrl}/api/webhooks/stripe`, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': signature }, body: payload });
  return res.status;
}

describe('POST /api/checkout/quote', () => {
  it('charges the Pakistan flat rate, waives it over the threshold, and converts the international USD rate', async () => {
    const small = await stone({ pricePKR: 100000 });
    const big = await stone({ pricePKR: 600000 });

    const pk = await anon.post('/api/checkout/quote', { items: [{ productId: String(small._id), qty: 1 }], country: 'PK' });
    assert.deepEqual([pk.data.shipping.zone, pk.data.shipping.feePKR, pk.data.totalPKR, pk.data.codAvailable], ['domestic', 300, 100300, true]);

    const free = await anon.post('/api/checkout/quote', { items: [{ productId: String(big._id), qty: 1 }], country: 'pk' });
    assert.equal(free.data.shipping.feePKR, 0);

    const intl = await anon.post('/api/checkout/quote', { items: [{ productId: String(small._id), qty: 1 }], country: 'GB' });
    assert.deepEqual([intl.data.shipping.zone, intl.data.shipping.feePKR, intl.data.codAvailable], ['international', 9800, false]); // 35 USD x 280
  });
});

describe('placing an order', () => {
  it('creates a COD order from database prices, reserves the stone and emails a confirmation', async () => {
    const p = await stone({ pricePKR: 185000 });
    const res = await order(anon, [p]);

    assert.equal(res.status, 201);
    assert.match(res.data.orderNumber, /^GK-\d{4}-\d{6}$/);
    assert.equal(res.data.token.length, 32);
    assert.equal(await stockOf(p), 0);

    const { data } = await openOrder(res);
    assert.equal(data.order.totalPKR, 185300);
    assert.equal(data.order.status, 'pending');
    assert.equal(data.order.payment.method, 'cod');
    assert.equal(data.order.expiresAt, null); // COD is held until shipped or cancelled

    const mails = await outboxWith(res.data.orderNumber);
    assert.equal(mails.length, 1);
    assert.match(mails[0], /To: ayesha@example\.com/);
    assert.match(mails[0], /cash/i);
    assert.ok(mails[0].includes(`http://shop.test/order/${res.data.orderNumber}?token=3D`) || mails[0].includes(res.data.token.slice(0, 10)));
  });

  it('refuses cash on delivery outside Pakistan', async () => {
    const p = await stone();
    const res = await order(anon, [p], { shippingAddress: ukAddress });
    assert.equal(res.status, 400);
    assert.equal(res.data.details[0].path, 'paymentMethod');
    assert.equal(await stockOf(p), 1);
  });

  it('rejects a stale total so customers are never charged a price they did not see', async () => {
    const p = await stone({ pricePKR: 50000 });
    const res = await order(anon, [p], { expectedTotalPKR: 1 });
    assert.equal(res.status, 409);
    assert.equal(res.data.details.reason, 'price_changed');
    assert.equal(res.data.details.totalPKR, 50300);
    assert.equal(await stockOf(p), 1);
  });

  // Relies on MongoDB's atomic single-document updates. FerretDB (sometimes used as a local
  // stand-in) does not provide them, so this check only runs against real MongoDB.
  it('sells a one-of-a-kind stone only once, even to simultaneous buyers', async (t) => {
    if (helpers.isFerretDB) return t.skip('FerretDB does not make conditional updates atomic; run against MongoDB');
    const p = await stone();
    const [a, b] = await Promise.all([order(anon, [p]), order(anon, [p], { contact: { ...contact, email: 'other@example.com' } })]);
    assert.deepEqual([a.status, b.status].sort(), [201, 409]);
    assert.equal(await stockOf(p), 0);
  });

  it('puts back already-reserved stones when another item in the order is gone', async () => {
    const ok = await stone();
    const sold = await stone({ stock: 0 });
    const res = await order(anon, [ok, sold]);
    assert.equal(res.status, 409);
    assert.equal(res.data.details.unavailable[0].reason, 'sold_out');
    assert.equal(await stockOf(ok), 1);
  });

  it('validates the address (province is required in Pakistan)', async () => {
    const p = await stone();
    const res = await order(anon, [p], { shippingAddress: { ...pkAddress, province: undefined } });
    assert.equal(res.status, 400);
    assert.equal(res.data.details[0].path, 'shippingAddress.province');
  });
});

describe('order access', () => {
  it('needs the link token, ownership or admin; everything else looks like a missing order', async () => {
    const owner = await signedInClient(baseUrl, 'customer');
    const stranger = await signedInClient(baseUrl, 'customer');
    const res = await order(owner, [await stone()]);
    const url = `/api/orders/${res.data.orderNumber}`;

    assert.equal((await anon.get(url)).status, 404);
    assert.equal((await anon.get(`${url}?token=${'x'.repeat(32)}`)).status, 404);
    assert.equal((await anon.get(`${url}?token=${res.data.token}`)).status, 200);
    assert.equal((await owner.get(url)).status, 200);
    assert.equal((await stranger.get(url)).status, 404);
    assert.equal((await admin.get(url)).status, 200);

    const mine = await owner.get('/api/me/orders');
    assert.deepEqual(mine.data.items.map((o) => o.orderNumber), [res.data.orderNumber]);
    assert.equal((await stranger.get('/api/me/orders')).data.items.length, 0);
    assert.equal((await anon.get('/api/me/orders')).status, 401);
  });

  it('lets the customer cancel an unpaid order, which frees the stone', async () => {
    const p = await stone();
    const res = await order(anon, [p]);
    const cancel = await anon.post(`/api/orders/${res.data.orderNumber}/cancel?token=${res.data.token}`);
    assert.equal(cancel.data.order.status, 'cancelled');
    assert.equal(await stockOf(p), 1);
    assert.equal((await anon.post(`/api/orders/${res.data.orderNumber}/cancel?token=${res.data.token}`)).status, 400);
  });
});

describe('manual transfer with payment proof', () => {
  async function uploadProof(res, body = PNG) {
    const sign = await anon.post(`/api/orders/${res.data.orderNumber}/proof/sign?token=${res.data.token}`);
    assert.equal(sign.status, 200);
    const up = await fetch(baseUrl + sign.data.uploadUrl, { method: 'POST', headers: { 'content-type': 'image/png' }, body });
    return { status: up.status, data: await up.json() };
  }
  const submit = (res, image, reference = 'TXN-123') => anon.post(`/api/orders/${res.data.orderNumber}/proof?token=${res.data.token}`, { image, reference });

  it('holds the stone 48 hours, accepts a proof, and stops the clock while it is reviewed', async () => {
    const p = await stone();
    const res = await order(anon, [p], { paymentMethod: 'bank' });
    const before = (await openOrder(res)).data.order;
    const hours = (new Date(before.expiresAt) - Date.now()) / 3_600_000;
    assert.ok(hours > 47.9 && hours <= 48, `hold ${hours}h`);

    const mail = (await outboxWith(res.data.orderNumber))[0];
    assert.match(mail, /Meezan Bank/);
    assert.match(mail, /PK00MEZN0001/);

    const up = await uploadProof(res);
    assert.equal(up.status, 201);
    assert.match(up.data.publicId, /^local\/payment-proofs\//);

    const sent = await submit(res, up.data);
    assert.equal(sent.status, 200);
    assert.equal(sent.data.order.payment.status, 'awaiting_review');
    assert.equal(sent.data.order.expiresAt, null);
    assert.equal(sent.data.order.payment.proofs[0].reference, 'TXN-123');

    assert.equal((await submit(res, up.data)).status, 409); // one review at a time
  });

  it('only accepts images uploaded as payment proofs, and rejects non-images', async () => {
    const res = await order(anon, [await stone()], { paymentMethod: 'jazzcash' });
    assert.equal((await uploadProof(res, Buffer.from('not an image'))).status, 415);
    const bad = await submit(res, { url: '/uploads/products/' + 'a'.repeat(32) + '.png', publicId: `local/products/${'a'.repeat(32)}.png` });
    assert.equal(bad.status, 400);
  });

  it('admin rejection gives the customer a reason and another 48 hours; approval marks the order paid', async () => {
    const res = await order(anon, [await stone()], { paymentMethod: 'easypaisa' });
    const url = `/api/admin/orders/${res.data.orderNumber}`;
    await submit(res, (await uploadProof(res)).data);

    assert.equal((await admin.post(`${url}/payment/reject`, { reason: '' })).status, 400);
    const rejected = await admin.post(`${url}/payment/reject`, { reason: 'Amount does not match' });
    assert.equal(rejected.data.order.payment.status, 'rejected');
    const customerView = (await openOrder(res)).data.order;
    assert.equal(customerView.payment.proofs[0].reason, 'Amount does not match');
    assert.ok(new Date(customerView.expiresAt) > Date.now());

    await submit(res, (await uploadProof(res)).data, 'TXN-456');
    const approved = await admin.post(`${url}/payment/approve`);
    assert.equal(approved.data.order.status, 'paid');
    assert.equal(approved.data.order.payment.status, 'paid');
    assert.deepEqual(approved.data.order.payment.proofs.map((p) => p.status), ['rejected', 'approved']);
    assert.equal((await admin.post(`${url}/payment/approve`)).status, 400); // nothing left to review
  });

  it('expires unpaid transfers after their hold, but never ones under review', async () => {
    const a = await stone();
    const b = await stone();
    const unpaid = await order(anon, [a], { paymentMethod: 'bank' });
    const reviewing = await order(anon, [b], { paymentMethod: 'bank' });
    await submit(reviewing, (await uploadProof(reviewing)).data);

    await Order.updateMany({ orderNumber: { $in: [unpaid.data.orderNumber, reviewing.data.orderNumber] } }, { expiresAt: new Date(Date.now() - 1000) });
    await orderService.expireOverdueOrders();

    assert.equal((await openOrder(unpaid)).data.order.status, 'cancelled');
    assert.equal(await stockOf(a), 1);
    assert.equal((await openOrder(reviewing)).data.order.status, 'pending');
    assert.equal(await stockOf(b), 0);
  });
});

describe('admin order management', () => {
  const setStatus = (res, body) => admin.patch(`/api/admin/orders/${res.data.orderNumber}/status`, body);

  it('follows the allowed status flow', async () => {
    const cod = await order(anon, [await stone()]);
    assert.equal((await setStatus(cod, { status: 'delivered' })).status, 400);
    const shipped = await setStatus(cod, { status: 'shipped', tracking: { carrier: 'TCS', number: '77001234' } });
    assert.equal(shipped.data.order.status, 'shipped');
    assert.equal(shipped.data.order.tracking.number, '77001234');
    const delivered = await setStatus(cod, { status: 'delivered' });
    assert.equal(delivered.data.order.payment.status, 'paid'); // cash collected
    assert.equal((await setStatus(cod, { status: 'cancelled' })).status, 400);

    const bank = await order(anon, [await stone()], { paymentMethod: 'bank' });
    assert.equal((await setStatus(bank, { status: 'shipped' })).status, 400); // unpaid transfers cannot ship
  });

  it('cancelling a paid order frees the stone', async () => {
    const p = await stone();
    const res = await order(anon, [p], { paymentMethod: 'bank' });
    await setStatus(res, { status: 'paid' });
    const cancelled = await setStatus(res, { status: 'cancelled', note: 'Customer changed their mind' });
    assert.equal(cancelled.data.order.status, 'cancelled');
    assert.equal(await stockOf(p), 1);
  });

  it('lists orders with counts and filters, admin only', async () => {
    const customer = await signedInClient(baseUrl, 'customer');
    assert.equal((await customer.get('/api/admin/orders')).status, 403);
    const list = await admin.get('/api/admin/orders?status=review');
    assert.equal(list.status, 200);
    assert.ok(list.data.counts.pending >= 1);
    assert.ok(list.data.items.every((o) => o.payment.status === 'awaiting_review'));
    const search = await admin.get('/api/admin/orders?q=ayesha');
    assert.ok(search.data.total >= 1);
  });

  it('updates store settings used by the next quote', async () => {
    const put = await admin.put('/api/admin/settings/store', { pkrPerUsd: 300, shipping: { domesticPKR: 450 }, paymentAccounts: { jazzcash: { accountTitle: 'GK', number: '03001234567' } } });
    assert.equal(put.status, 200);
    assert.equal(put.data.settings.shipping.domesticPKR, 450);
    assert.equal(put.data.settings.shipping.internationalUSD, 35); // untouched
    assert.equal(put.data.settings.paymentAccounts.bank.bankName, 'Meezan Bank'); // untouched
    const q = await anon.post('/api/checkout/quote', { items: [{ productId: String((await stone())._id), qty: 1 }], country: 'PK' });
    assert.equal(q.data.shipping.feePKR, 450);
    assert.equal((await admin.put('/api/admin/settings/store', { shipping: { domesticPKR: -5 } })).status, 400);
    await admin.put('/api/admin/settings/store', { pkrPerUsd: 280, shipping: { domesticPKR: 300 } });
  });
});

describe('card payments (Stripe Checkout)', () => {
  const cardOrder = (p, extra = {}) => order(anon, [p], { paymentMethod: 'card', shippingAddress: ukAddress, ...extra });

  it('creates a USD Checkout Session for the order and waits for payment before emailing', async () => {
    const p = await stone({ pricePKR: 140000 });
    const res = await cardOrder(p);
    assert.equal(res.status, 201);
    assert.match(res.data.checkoutUrl, /^https:\/\/checkout\.stripe\.test\//);

    const params = stripeCalls.create.at(-1);
    assert.equal(params.mode, 'payment');
    assert.equal(params.line_items[0].price_data.currency, 'usd');
    assert.equal(params.line_items[0].price_data.unit_amount, 50000); // Rs 140,000 / 280 = $500.00
    assert.equal(params.line_items[1].price_data.unit_amount, 3500); // $35 shipping
    assert.match(params.success_url, new RegExp(`/order/${res.data.orderNumber}\\?token=.+&session_id=\\{CHECKOUT_SESSION_ID\\}$`));
    assert.ok(params.expires_at - Date.now() / 1000 >= 29 * 60);

    const o = (await openOrder(res)).data.order;
    assert.equal(o.payment.chargeAmount, 53500);
    assert.equal((await outboxWith(res.data.orderNumber)).length, 0);
  });

  it('marks the order paid from a signed webhook (once) and sends the confirmation', async () => {
    const res = await cardOrder(await stone());
    const o = await Order.findOne({ orderNumber: res.data.orderNumber });
    const session = { id: o.payment.stripeSessionId, payment_status: 'paid', payment_intent: 'pi_1', metadata: { orderId: String(o._id) } };

    const bad = await fetch(`${baseUrl}/api/webhooks/stripe`, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=forged' }, body: JSON.stringify({ type: 'checkout.session.completed', data: { object: session } }) });
    assert.equal(bad.status, 400);
    assert.equal((await openOrder(res)).data.order.payment.status, 'unpaid');

    assert.equal(await signedWebhook('checkout.session.completed', session), 200);
    assert.equal(await signedWebhook('checkout.session.completed', session), 200); // Stripe retries
    const paid = (await openOrder(res)).data.order;
    assert.equal(paid.status, 'paid');
    assert.equal(paid.statusHistory.filter((h) => h.status === 'paid').length, 1);
    assert.equal((await outboxWith(res.data.orderNumber)).length, 1);
  });

  it('cancels and frees the stone when the session expires', async () => {
    const p = await stone();
    const res = await cardOrder(p);
    const o = await Order.findOne({ orderNumber: res.data.orderNumber });
    await signedWebhook('checkout.session.expired', { id: o.payment.stripeSessionId, metadata: { orderId: String(o._id) } });
    assert.equal((await openOrder(res)).data.order.status, 'cancelled');
    assert.equal(await stockOf(p), 1);
  });

  it('handles payment that arrives after cancellation: re-reserves if possible, otherwise flags a refund', async () => {
    const free = await stone();
    const res1 = await cardOrder(free);
    const o1 = await Order.findOne({ orderNumber: res1.data.orderNumber });
    await orderService.cancelOrder(o1, { note: 'expired' });
    await signedWebhook('checkout.session.completed', { id: o1.payment.stripeSessionId, payment_status: 'paid', metadata: { orderId: String(o1._id) } });
    assert.equal((await openOrder(res1)).data.order.status, 'paid');
    assert.equal(await stockOf(free), 0);

    const contested = await stone();
    const res2 = await cardOrder(contested);
    const o2 = await Order.findOne({ orderNumber: res2.data.orderNumber });
    await orderService.cancelOrder(o2, { note: 'expired' });
    assert.equal((await order(anon, [contested])).status, 201); // someone else buys it meanwhile
    await signedWebhook('checkout.session.completed', { id: o2.payment.stripeSessionId, payment_status: 'paid', metadata: { orderId: String(o2._id) } });
    const late = (await admin.get(`/api/admin/orders/${res2.data.orderNumber}`)).data.order;
    assert.equal(late.status, 'cancelled');
    assert.equal(late.payment.status, 'paid');
    assert.equal(late.payment.needsRefund, true);
  });

  it('confirms payment from the return URL when the webhook has not arrived', async () => {
    const res = await cardOrder(await stone());
    const o = await Order.findOne({ orderNumber: res.data.orderNumber });
    retrieveResult = { payment_status: 'paid' };
    const back = await anon.get(`/api/orders/${res.data.orderNumber}?token=${res.data.token}&session_id=${o.payment.stripeSessionId}`);
    assert.equal(back.data.order.status, 'paid');
    assert.equal(stripeCalls.retrieve.at(-1), o.payment.stripeSessionId);
  });

  it('cancels the order and frees the stone if Stripe is unavailable', async () => {
    const p = await stone();
    stripeFails = true;
    const res = await cardOrder(p);
    assert.equal(res.status, 502);
    assert.equal(await stockOf(p), 1);
  });
});
