import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { createClient, signedInClient, startTestServer, stopTestServer, uploadDir } from './helpers.js';

let baseUrl;
let anon;
let admin;
let customer;
let Product;
let Category;
let mongoose;
const cat = {};

// 1x1 PNG
const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415408d763f8cfc000000301010018dd8db00000000049454e44ae426082',
  'hex',
);

async function upload(client, folder = 'products', body = PNG) {
  const res = await fetch(`${baseUrl}/api/admin/uploads/local?folder=${folder}`, {
    method: 'POST',
    headers: { 'content-type': 'image/png', cookie: client.cookie },
    body,
  });
  return { status: res.status, data: await res.json() };
}

const fileOnDisk = (img) => existsSync(path.join(uploadDir, img.publicId.slice('local/'.length)));

before(async () => {
  baseUrl = await startTestServer();
  mongoose = (await import('mongoose')).default;
  ({ Product } = await import('../src/models/Product.js'));
  ({ Category } = await import('../src/models/Category.js'));

  for (const [key, name] of [['emerald', 'Emerald'], ['ruby', 'Ruby'], ['sapphire', 'Sapphire']]) {
    cat[key] = await Category.create({ name });
  }
  const p = (o) => ({ shape: 'Oval', treatment: 'Natural', ...o });
  await Product.create([
    p({ name: 'Swat Emerald', category: cat.emerald._id, carat: 1.4, pricePKR: 185000, origin: 'Swat, Pakistan', treatment: 'Oiled', isFeatured: true }),
    p({ name: 'Panjshir Emerald', category: cat.emerald._id, carat: 2.1, pricePKR: 320000, origin: 'Panjshir, Afghanistan', treatment: 'Oiled' }),
    p({ name: 'Hunza Ruby', category: cat.ruby._id, carat: 0.95, pricePKR: 140000, origin: 'Hunza, Pakistan' }),
    p({ name: 'Jegdalek Ruby', category: cat.ruby._id, carat: 1.3, pricePKR: 175000, origin: 'Jegdalek, Afghanistan', stock: 0 }),
    p({ name: 'Cornflower Sapphire', category: cat.sapphire._id, carat: 1.15, pricePKR: 210000, origin: 'Sri Lanka', treatment: 'Heated' }),
    p({ name: 'Archived Sapphire', category: cat.sapphire._id, carat: 9, pricePKR: 999999, origin: 'Hidden Valley', isActive: false }),
  ]);

  anon = createClient(baseUrl);
  admin = await signedInClient(baseUrl, 'admin');
  customer = await signedInClient(baseUrl, 'customer');
}, { timeout: 120_000 });

after(stopTestServer);

const names = (res) => res.data.items.map((p) => p.name).sort();

describe('GET /api/products', () => {
  it('lists only active products, with pagination info and populated category', async () => {
    const res = await anon.get('/api/products?limit=2&sort=price-asc');
    assert.equal(res.status, 200);
    assert.equal(res.data.total, 5);
    assert.equal(res.data.totalPages, 3);
    assert.deepEqual(res.data.items.map((p) => p.name), ['Hunza Ruby', 'Jegdalek Ruby']);
    assert.deepEqual(Object.keys(res.data.items[0].category).sort(), ['id', 'name', 'slug']);

    const page3 = await anon.get('/api/products?limit=2&page=3&sort=price-asc');
    assert.deepEqual(page3.data.items.map((p) => p.name), ['Panjshir Emerald']);
  });

  it('filters by one or more category slugs', async () => {
    assert.deepEqual(names(await anon.get('/api/products?category=ruby')), ['Hunza Ruby', 'Jegdalek Ruby']);
    assert.equal((await anon.get('/api/products?category=ruby,sapphire')).data.total, 3);
    assert.equal((await anon.get('/api/products?category=no-such-category')).data.total, 0);
  });

  it('filters by price and carat ranges (inclusive)', async () => {
    assert.deepEqual(names(await anon.get('/api/products?minPrice=175000&maxPrice=210000')), ['Cornflower Sapphire', 'Jegdalek Ruby', 'Swat Emerald']);
    assert.deepEqual(names(await anon.get('/api/products?minCarat=1.3&maxCarat=1.4')), ['Jegdalek Ruby', 'Swat Emerald']);
  });

  it('filters by origin and treatment', async () => {
    assert.deepEqual(names(await anon.get(`/api/products?origin=${encodeURIComponent('Hunza, Pakistan')}`)), ['Hunza Ruby']);
    assert.deepEqual(names(await anon.get('/api/products?treatment=Heated,Oiled')), ['Cornflower Sapphire', 'Panjshir Emerald', 'Swat Emerald']);
    // Origins contain commas, so several are passed as repeated params
    const two = `origin=${encodeURIComponent('Hunza, Pakistan')}&origin=${encodeURIComponent('Sri Lanka')}`;
    assert.deepEqual(names(await anon.get(`/api/products?${two}`)), ['Cornflower Sapphire', 'Hunza Ruby']);
    assert.deepEqual(names(await anon.get('/api/products?treatment=Heated&treatment=Oiled')), ['Cornflower Sapphire', 'Panjshir Emerald', 'Swat Emerald']);
  });

  it('searches name, origin and category name (case-insensitive, regex-safe)', async () => {
    assert.deepEqual(names(await anon.get('/api/products?q=swat')), ['Swat Emerald']);
    assert.deepEqual(names(await anon.get('/api/products?q=afghan')), ['Jegdalek Ruby', 'Panjshir Emerald']);
    assert.equal((await anon.get('/api/products?q=SAPPHIRE')).data.total, 1); // archived one excluded
    assert.equal((await anon.get(`/api/products?q=${encodeURIComponent('(.*')}`)).status, 200);
  });

  it('sorts and supports featured / in-stock flags', async () => {
    const byCarat = await anon.get('/api/products?sort=carat-desc');
    assert.equal(byCarat.data.items[0].name, 'Panjshir Emerald');
    assert.deepEqual(names(await anon.get('/api/products?featured=true')), ['Swat Emerald']);
    assert.equal((await anon.get('/api/products?inStock=true')).data.total, 4);
  });

  it('rejects invalid query values', async () => {
    for (const qs of ['sort=random', 'limit=500', 'minPrice=-1', 'treatment=Magic', 'page=0']) {
      assert.equal((await anon.get(`/api/products?${qs}`)).status, 400, qs);
    }
  });
});

describe('GET /api/products/:slug and /filters', () => {
  it('returns a product with related items from the same category', async () => {
    const res = await anon.get('/api/products/swat-emerald');
    assert.equal(res.status, 200);
    assert.equal(res.data.product.name, 'Swat Emerald');
    assert.equal(res.data.product.category.slug, 'emerald');
    assert.deepEqual(res.data.related.map((p) => p.name), ['Panjshir Emerald']);
  });

  it('returns 404 for archived or unknown products', async () => {
    assert.equal((await anon.get('/api/products/archived-sapphire')).status, 404);
    assert.equal((await anon.get('/api/products/nope')).status, 404);
  });

  it('builds facets from active products only', async () => {
    const { data } = await anon.get('/api/products/filters');
    assert.deepEqual(data.categories.map((c) => c.slug).sort(), ['emerald', 'ruby', 'sapphire']);
    assert.ok(!data.origins.includes('Hidden Valley'));
    assert.deepEqual(data.treatments, ['Natural', 'Heated', 'Oiled']);
    assert.equal(data.maxPrice, 320000);
    assert.equal(data.minCarat, 0.95);
  });
});

describe('admin access control', () => {
  const endpoints = [
    ['get', '/api/admin/products'],
    ['post', '/api/admin/products'],
    ['get', '/api/admin/categories'],
    ['post', '/api/admin/uploads/sign'],
  ];

  it('rejects anonymous users (401) and customers (403)', async () => {
    for (const [method, url] of endpoints) {
      assert.equal((await anon[method](url, method === 'post' ? {} : undefined)).status, 401, `anon ${url}`);
      assert.equal((await customer[method](url, method === 'post' ? {} : undefined)).status, 403, `customer ${url}`);
    }
    assert.equal((await upload(customer)).status, 403);
  });
});

describe('admin product CRUD', () => {
  const minimal = () => ({ name: 'Test Topaz', category: String(cat.sapphire._id), carat: 2.5, pricePKR: 50000 });

  it('lists all products with status counts and filters', async () => {
    const all = await admin.get('/api/admin/products');
    assert.equal(all.status, 200);
    assert.deepEqual(all.data.counts, { active: 5, archived: 1 });
    assert.equal((await admin.get('/api/admin/products?status=archived')).data.items[0].name, 'Archived Sapphire');
    assert.equal((await admin.get('/api/admin/products?stock=out')).data.items[0].name, 'Jegdalek Ruby');
  });

  it('creates a product with defaults and an auto slug', async () => {
    const res = await admin.post('/api/admin/products', minimal());
    assert.equal(res.status, 201);
    const p = res.data.product;
    assert.equal(p.slug, 'test-topaz');
    assert.equal(p.category.name, 'Sapphire');
    assert.equal(p.stock, 1);
    assert.equal(p.treatment, 'Unknown');
    assert.equal(p.isActive, true);

    const again = await admin.post('/api/admin/products', minimal());
    assert.equal(again.data.product.slug, 'test-topaz-2');
  });

  it('reports missing and invalid fields', async () => {
    const res = await admin.post('/api/admin/products', { pricePKR: 10.5, colorHex: 'green', treatment: 'Magic' });
    assert.equal(res.status, 400);
    const paths = res.data.details.map((d) => d.path);
    for (const field of ['name', 'category', 'carat', 'pricePKR', 'colorHex', 'treatment']) assert.ok(paths.includes(field), field);
  });

  it('rejects an unknown category, a taken slug and a duplicate SKU', async () => {
    const badCat = await admin.post('/api/admin/products', { ...minimal(), category: '0'.repeat(24) });
    assert.equal(badCat.status, 400);
    assert.equal(badCat.data.details[0].path, 'category');

    const takenSlug = await admin.post('/api/admin/products', { ...minimal(), slug: 'swat-emerald' });
    assert.equal(takenSlug.status, 409);
    assert.equal(takenSlug.data.details[0].path, 'slug');

    assert.equal((await admin.post('/api/admin/products', { ...minimal(), sku: 'gk-dup-1' })).status, 201);
    const dupSku = await admin.post('/api/admin/products', { ...minimal(), sku: 'GK-DUP-1' });
    assert.equal(dupSku.status, 409);
    assert.equal(dupSku.data.details[0].path, 'sku');
  });

  it('only accepts images uploaded through the admin panel', async () => {
    const res = await admin.post('/api/admin/products', {
      ...minimal(),
      images: [{ url: 'https://evil.example/x.jpg', publicId: 'local/products/x.jpg' }],
    });
    assert.equal(res.status, 400);
    assert.equal(res.data.details[0].path, 'images.0');
  });

  it('updates partially; renaming keeps the slug, an empty slug regenerates it', async () => {
    const { data } = await admin.post('/api/admin/products', { ...minimal(), name: 'Rename Me', sku: 'GK-RN-1' });
    const url = `/api/admin/products/${data.product.id}`;

    const patch = (body) => admin.patch(url, body);

    let res = await patch({ name: 'Renamed Stone', stock: 3 });
    assert.equal(res.status, 200);
    assert.equal(res.data.product.slug, 'rename-me');
    assert.equal(res.data.product.stock, 3);
    assert.equal(res.data.product.carat, 2.5); // untouched

    res = await patch({ slug: '' });
    assert.equal(res.data.product.slug, 'renamed-stone');

    res = await patch({ sku: '' });
    assert.equal(res.data.product.sku, undefined);

    assert.equal((await patch({})).status, 400);
  });

  it('deletes replaced images and certificate scans from storage', async () => {
    const a = (await upload(admin)).data;
    const b = (await upload(admin)).data;
    const cert = (await upload(admin, 'certificates')).data;
    assert.ok([a, b, cert].every(fileOnDisk));

    const { data } = await admin.post('/api/admin/products', {
      ...minimal(),
      images: [{ ...a, alt: 'front' }, b],
      certificate: { lab: 'GIA', number: '123', image: cert },
    });
    const patch = (body) => admin.patch(`/api/admin/products/${data.product.id}`, body);

    const res = await patch({ images: [b], certificate: { image: null } });
    assert.equal(res.status, 200);
    assert.deepEqual(res.data.product.images.map((i) => i.publicId), [b.publicId]);
    assert.equal(res.data.product.certificate.lab, 'GIA'); // other certificate fields kept
    assert.equal(res.data.product.certificate.image, undefined);
    assert.equal(fileOnDisk(a), false);
    assert.equal(fileOnDisk(cert), false);
    assert.equal(fileOnDisk(b), true);
  });

  it('archiving hides a product from the shop; restoring brings it back', async () => {
    const { data } = await admin.post('/api/admin/products', { ...minimal(), name: 'Seasonal Spinel' });
    const patch = (body) => admin.patch(`/api/admin/products/${data.product.id}`, body);

    await patch({ isActive: false });
    assert.equal((await anon.get('/api/products/seasonal-spinel')).status, 404);
    await patch({ isActive: true });
    assert.equal((await anon.get('/api/products/seasonal-spinel')).status, 200);
  });

  it('hard-deletes an unsold product and its files', async () => {
    const img = (await upload(admin)).data;
    const { data } = await admin.post('/api/admin/products', { ...minimal(), images: [img] });
    const del = await admin.delete(`/api/admin/products/${data.product.id}`);

    assert.equal(del.status, 204);
    assert.equal(fileOnDisk(img), false);
    assert.equal((await admin.get(`/api/admin/products/${data.product.id}`)).status, 404);
  });

  it('refuses to delete a product that appears in an order', async () => {
    const { data } = await admin.post('/api/admin/products', minimal());
    await mongoose.connection.db.collection('orders').insertOne({ items: [{ product: new mongoose.Types.ObjectId(data.product.id) }] });

    const del = await admin.delete(`/api/admin/products/${data.product.id}`);
    assert.equal(del.status, 409);
    assert.match(del.data.error, /Archive it instead/);
    assert.equal((await admin.get(`/api/admin/products/${data.product.id}`)).status, 200);
  });
});

describe('admin uploads (local development storage)', () => {
  it('signs uploads for the local provider', async () => {
    const res = await admin.post('/api/admin/uploads/sign', { folder: 'products' });
    assert.equal(res.status, 200);
    assert.equal(res.data.provider, 'local');
    assert.equal(res.data.uploadUrl, '/api/admin/uploads/local?folder=products');
    assert.equal((await admin.post('/api/admin/uploads/sign', { folder: '../etc' })).status, 400);
  });

  it('stores real images and serves them', async () => {
    const { status, data } = await upload(admin);
    assert.equal(status, 201);
    assert.match(data.publicId, /^local\/products\/[a-f0-9]{32}\.png$/);
    const served = await fetch(baseUrl + data.url);
    assert.equal(served.status, 200);
    assert.equal(served.headers.get('content-type'), 'image/png');
  });

  it('rejects non-images, empty bodies, oversized files and unknown folders', async () => {
    assert.equal((await upload(admin, 'products', Buffer.from('<svg onload=alert(1)>'))).status, 415);
    assert.equal((await upload(admin, 'products', Buffer.alloc(0))).status, 400);
    assert.equal((await upload(admin, 'products', Buffer.concat([PNG, Buffer.alloc(10 * 1024 * 1024)]))).status, 413);
    assert.equal((await upload(admin, 'avatars')).status, 400);
  });
});
