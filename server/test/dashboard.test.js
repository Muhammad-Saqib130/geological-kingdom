import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Types } from 'mongoose';
import { createClient, signedInClient, startTestServer, stopTestServer } from './helpers.js';

let baseUrl;
let anon;
let admin;
let customer;
let Order;
let Product;
let Investigation;
let category;

const DAY = 86_400_000;
let seq = 0;

// Inserts an order directly, so payment dates can be placed in the past
function order({ totalPKR = 10_000, status = 'paid', payment = {}, product, name = 'Stone', createdAt = new Date() }) {
  seq += 1;
  return Order.create({
    orderNumber: `GK-2026-${String(900_000 + seq).padStart(6, '0')}`,
    contact: { name: 'Test Buyer', email: 'buyer@example.com', phone: '+92 300 0000000' },
    items: [{ product: product?._id ?? new Types.ObjectId(), name, slug: 'stone', category: 'Emerald', unitPricePKR: totalPKR, qty: 1, lineTotalPKR: totalPKR }],
    shippingAddress: { fullName: 'Test Buyer', phone: '+92 300 0000000', line1: '1 Road', city: 'Lahore', country: 'PK' },
    shipping: { zone: 'domestic', feePKR: 0 },
    subtotalPKR: totalPKR,
    totalPKR,
    pkrPerUsd: 280,
    status,
    payment: { method: 'bank', status: 'paid', paidAt: new Date(), ...payment },
    createdAt,
  });
}

before(async () => {
  baseUrl = await startTestServer();
  ({ Order } = await import('../src/models/Order.js'));
  ({ Product } = await import('../src/models/Product.js'));
  ({ Investigation } = await import('../src/models/Investigation.js'));
  const { Category } = await import('../src/models/Category.js');
  category = await Category.create({ name: 'Emerald' });
  anon = createClient(baseUrl);
  admin = await signedInClient(baseUrl, 'admin');
  customer = await signedInClient(baseUrl, 'customer');
}, { timeout: 120_000 });

after(stopTestServer);

describe('admin dashboard', () => {
  it('is admin-only', async () => {
    assert.equal((await anon.get('/api/admin/dashboard')).status, 401);
    assert.equal((await customer.get('/api/admin/dashboard')).status, 403);
  });

  it('counts money received by payment date and leaves out unpaid and cancelled orders', async () => {
    const ruby = await Product.create({ name: 'Ruby Oval', category: category._id, carat: 1, pricePKR: 50_000, stock: 0 });
    const now = Date.now();
    await order({ totalPKR: 50_000, product: ruby, name: 'Ruby Oval' }); // today
    await order({ totalPKR: 20_000, status: 'delivered', payment: { method: 'cod' } }); // COD collected today
    await order({ totalPKR: 30_000, payment: { paidAt: new Date(now - 3 * DAY) } });
    await order({ totalPKR: 40_000, payment: { paidAt: new Date(now - 45 * DAY) } }); // outside 30 days
    await order({ totalPKR: 99_000, status: 'pending', payment: { status: 'unpaid', paidAt: undefined } });
    await order({ totalPKR: 77_000, status: 'shipped', payment: { method: 'cod', status: 'unpaid', paidAt: undefined } });
    await order({ totalPKR: 88_000, status: 'cancelled' }); // paid then cancelled (refunded)

    const res = await admin.get('/api/admin/dashboard');
    assert.equal(res.status, 200);
    const d = res.data;
    assert.equal(d.daily.length, 30);
    assert.equal(d.monthly.length, 12);
    assert.deepEqual(d.sales.today, { date: d.daily.at(-1).date, totalPKR: 70_000, orders: 2 });
    assert.equal(d.sales.last7Days.totalPKR, 100_000);
    assert.equal(d.sales.last30Days.totalPKR, 100_000);
    assert.equal(d.sales.last30Days.orders, 3);
    assert.equal(d.sales.last12Months.totalPKR, 140_000);
    assert.equal(d.sales.averageOrderPKR, 33_333);
    assert.equal(d.monthly.reduce((n, m) => n + m.totalPKR, 0), 140_000);

    assert.equal(d.orders.byStatus.pending, 1);
    assert.equal(d.orders.byStatus.cancelled, 1);
    assert.equal(d.topProducts[0].name, 'Ruby Oval');
    assert.equal(d.topProducts[0].revenuePKR, 50_000);
    assert.equal(d.recentOrders.length, 7);
    assert.ok(d.recentOrders[0].orderNumber);
  });

  it('lists active products at or below the low-stock threshold', async () => {
    await Product.create({ name: 'Last Emerald', category: category._id, carat: 1, pricePKR: 1, stock: 1 });
    await Product.create({ name: 'Plenty Peridot', category: category._id, carat: 1, pricePKR: 1, stock: 5 });
    await Product.create({ name: 'Hidden Topaz', category: category._id, carat: 1, pricePKR: 1, stock: 0, isActive: false });

    let d = (await admin.get('/api/admin/dashboard')).data;
    assert.equal(d.lowStock.threshold, 1);
    assert.deepEqual(d.lowStock.items.map((p) => p.name), ['Ruby Oval', 'Last Emerald']); // sold out first
    assert.equal(d.lowStock.count, 2);

    await admin.put('/api/admin/settings/store', { lowStockThreshold: 5 });
    d = (await admin.get('/api/admin/dashboard')).data;
    assert.ok(d.lowStock.items.some((p) => p.name === 'Plenty Peridot'));
    await admin.put('/api/admin/settings/store', { lowStockThreshold: 1 });
  });

  it('counts open and new investigations', async () => {
    const base = { contact: { name: 'A', email: 'a@example.com', whatsapp: '+923000000000', country: 'PK' }, gem: { type: 'Ruby', count: 1, purchasedFrom: 'X' }, photos: [{ url: '/uploads/x.png', publicId: 'x' }], feeUSD: 10 };
    let n = 0;
    for (const status of ['received', 'received', 'in_progress', 'completed', 'cancelled']) {
      await Investigation.create({ ...base, status, trackingId: `GI-2222-22${String(++n).padStart(2, '2')}`.replace(/1/g, 'A') });
    }
    const d = (await admin.get('/api/admin/dashboard')).data;
    assert.equal(d.investigations.new, 2);
    assert.equal(d.investigations.open, 3);
    assert.equal(d.investigations.byStatus.completed, 1);
  });
});

describe('store settings', () => {
  it('saves the WhatsApp number as digits and shows it on the public store endpoint', async () => {
    const put = await admin.put('/api/admin/settings/store', { whatsappNumber: '+92 (300) 123-4567' });
    assert.equal(put.status, 200);
    assert.equal(put.data.settings.whatsappNumber, '923001234567');
    const pub = await anon.get('/api/settings/store');
    assert.equal(pub.data.whatsappNumber, '923001234567');
    assert.equal(typeof pub.data.pkrPerUsd, 'number');

    assert.equal((await admin.put('/api/admin/settings/store', { whatsappNumber: '0092 300 1234567' })).data.settings.whatsappNumber, '923001234567');
    assert.equal((await admin.put('/api/admin/settings/store', { whatsappNumber: 'call me' })).status, 400);
    assert.equal((await admin.put('/api/admin/settings/store', { whatsappNumber: '' })).data.settings.whatsappNumber, '');
    assert.equal((await anon.get('/api/settings/store')).data.whatsappNumber, null);
  });

  it('validates the low-stock threshold', async () => {
    assert.equal((await admin.put('/api/admin/settings/store', { lowStockThreshold: -1 })).status, 400);
    assert.equal((await admin.put('/api/admin/settings/store', { lowStockThreshold: 2.5 })).status, 400);
    assert.equal((await admin.put('/api/admin/settings/store', { lowStockThreshold: 3 })).data.settings.lowStockThreshold, 3);
  });
});
