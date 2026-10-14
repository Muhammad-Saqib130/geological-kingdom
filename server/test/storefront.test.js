import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createClient, startTestServer, stopTestServer } from './helpers.js';

let client;
let Subscriber;
const ids = {};

before(async () => {
  const baseUrl = await startTestServer();
  client = createClient(baseUrl);
  const { Category } = await import('../src/models/Category.js');
  const { Product } = await import('../src/models/Product.js');
  const { Testimonial } = await import('../src/models/Testimonial.js');
  ({ Subscriber } = await import('../src/models/Subscriber.js'));

  const cat = await Category.create({ name: 'Emerald' });
  const make = (o) => Product.create({ category: cat._id, carat: 1, ...o });
  ids.available = String((await make({ name: 'Swat Emerald', pricePKR: 100000, stock: 1, isFeatured: true }))._id);
  ids.multi = String((await make({ name: 'Peridot Pair', pricePKR: 20000, stock: 3 }))._id);
  ids.sold = String((await make({ name: 'Sold Ruby', pricePKR: 50000, stock: 0 }))._id);
  ids.archived = String((await make({ name: 'Old Stone', pricePKR: 9000, isActive: false, isFeatured: true }))._id);
  await Testimonial.create([
    { name: 'Real Buyer', quote: 'Lovely stone.', sortOrder: 1 },
    { name: 'Hidden', quote: 'Draft', isPublished: false },
  ]);
}, { timeout: 120_000 });

after(stopTestServer);

describe('GET /api/home', () => {
  it('returns categories, active featured products, new arrivals and published testimonials', async () => {
    const { status, data } = await client.get('/api/home');
    assert.equal(status, 200);
    assert.deepEqual(data.categories.map((c) => c.name), ['Emerald']);
    assert.deepEqual(data.featured.map((p) => p.name), ['Swat Emerald']); // archived featured excluded
    assert.ok(!data.newArrivals.some((p) => p.name === 'Sold Ruby')); // sold-out not "new"
    assert.deepEqual(data.testimonials.map((t) => t.name), ['Real Buyer']);
    assert.equal(data.featured[0].category.name, 'Emerald');
  });
});

describe('POST /api/newsletter', () => {
  it('stores a normalised email once and answers the same for repeats', async () => {
    const first = await client.post('/api/newsletter', { email: '  Reader@Example.COM ' });
    const again = await client.post('/api/newsletter', { email: 'reader@example.com' });
    assert.equal(first.status, 201);
    assert.equal(again.status, 201);
    assert.equal(first.data.message, again.data.message);
    assert.equal(await Subscriber.countDocuments({ email: 'reader@example.com' }), 1);
  });

  it('rejects invalid addresses', async () => {
    const res = await client.post('/api/newsletter', { email: 'not-an-email' });
    assert.equal(res.status, 400);
    assert.equal(res.data.details[0].path, 'email');
  });
});

describe('POST /api/cart/quote', () => {
  it('prices from the database and ignores anything the client claims', async () => {
    const res = await client.post('/api/cart/quote', { items: [{ productId: ids.available, qty: 1, pricePKR: 1 }] });
    assert.equal(res.status, 200);
    assert.equal(res.data.lines[0].pricePKR, 100000);
    assert.equal(res.data.subtotalPKR, 100000);
  });

  it('clamps quantity to stock and flags sold-out or unlisted items', async () => {
    const res = await client.post('/api/cart/quote', {
      items: [
        { productId: ids.multi, qty: 5 },
        { productId: ids.sold, qty: 1 },
        { productId: ids.archived, qty: 1 },
        { productId: '0'.repeat(24), qty: 1 },
      ],
    });
    const [multi, sold, archived, missing] = res.data.lines;
    assert.deepEqual([multi.qty, multi.adjusted, multi.lineTotalPKR], [3, true, 60000]);
    assert.deepEqual([sold.available, sold.reason], [false, 'sold_out']);
    assert.deepEqual([archived.available, archived.reason], [false, 'no_longer_listed']);
    assert.equal(archived.name, undefined); // archived details are not exposed
    assert.equal(missing.available, false);
    assert.equal(res.data.subtotalPKR, 60000);
  });

  it('validates the request', async () => {
    assert.equal((await client.post('/api/cart/quote', { items: [{ productId: 'x', qty: 1 }] })).status, 400);
    assert.equal((await client.post('/api/cart/quote', { items: [{ productId: ids.available, qty: 0 }] })).status, 400);
  });
});
