import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { createClient, signedInClient, startTestServer, stopTestServer, uploadDir } from './helpers.js';

let baseUrl;
let admin;
let customer;
const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415408d763f8cfc000000301010018dd8db00000000049454e44ae426082',
  'hex',
);

async function upload(folder = 'banners') {
  const res = await fetch(`${baseUrl}/api/admin/uploads/local?folder=${folder}`, {
    method: 'POST',
    headers: { 'content-type': 'image/png', cookie: admin.cookie },
    body: PNG,
  });
  assert.equal(res.status, 201);
  return res.json();
}
const onDisk = (img) => existsSync(path.join(uploadDir, img.publicId.slice('local/'.length)));

before(async () => {
  baseUrl = await startTestServer();
  admin = await signedInClient(baseUrl, 'admin');
  customer = await signedInClient(baseUrl, 'customer');

  const { Category } = await import('../src/models/Category.js');
  const { Product } = await import('../src/models/Product.js');
  const cat = await Category.create({ name: 'Emerald' });
  const p = (name, origin, extra = {}) => ({ name, origin, category: cat._id, carat: 1, pricePKR: 1000, ...extra });
  await Product.create([
    p('A', 'Swat, Pakistan', { colorHex: '#1f7a4d' }),
    p('B', 'Swat, Pakistan'),
    p('C', 'Hunza, Pakistan'),
    p('D', 'Hidden, Nowhere', { isActive: false }),
    p('E', ''),
  ]);
}, { timeout: 120_000 });

after(stopTestServer);

describe('GET /api/home additions', () => {
  it('lists active origins by count with a tint, and empty homepage slots', async () => {
    const { data } = await createClient(baseUrl).get('/api/home');
    assert.deepEqual(data.origins.map((o) => [o.name, o.count]), [['Swat, Pakistan', 2], ['Hunza, Pakistan', 1]]);
    assert.equal(data.origins[0].colorHex, '#1f7a4d');
    assert.deepEqual(data.homepage, { heroImage: null, promoImage: null, storyImage: null });
  });
});

describe('admin homepage settings', () => {
  it('is admin-only', async () => {
    assert.equal((await createClient(baseUrl).get('/api/admin/settings/homepage')).status, 401);
    assert.equal((await customer.put('/api/admin/settings/homepage', { heroImage: null })).status, 403);
  });

  it('sets, replaces and removes photos, deleting files that are no longer used', async () => {
    const first = await upload();
    const second = await upload();
    const story = await upload();

    let res = await admin.put('/api/admin/settings/homepage', { heroImage: { ...first, alt: 'Emeralds on slate' }, storyImage: story });
    assert.equal(res.status, 200);
    assert.equal(res.data.homepage.heroImage.alt, 'Emeralds on slate');

    res = await admin.put('/api/admin/settings/homepage', { heroImage: second });
    assert.equal(res.data.homepage.heroImage.publicId, second.publicId);
    assert.equal(res.data.homepage.storyImage.publicId, story.publicId); // untouched slot kept
    assert.equal(onDisk(first), false);
    assert.equal(onDisk(second), true);

    res = await admin.put('/api/admin/settings/homepage', { storyImage: null });
    assert.equal(res.data.homepage.storyImage, null);
    assert.equal(onDisk(story), false);

    const home = await createClient(baseUrl).get('/api/home');
    assert.equal(home.data.homepage.heroImage.url, second.url);
    assert.equal(home.data.homepage.storyImage, null);
  });

  it('rejects images that were not uploaded through the panel, and empty updates', async () => {
    const bad = await admin.put('/api/admin/settings/homepage', { promoImage: { url: 'https://evil.example/x.jpg', publicId: 'x' } });
    assert.equal(bad.status, 400);
    assert.equal(bad.data.details[0].path, 'promoImage');
    assert.equal((await admin.put('/api/admin/settings/homepage', {})).status, 400);
  });
});
