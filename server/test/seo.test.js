import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createClient, startTestServer, stopTestServer } from './helpers.js';

let baseUrl;
let anon;
let Product;
let category;

before(async () => {
  baseUrl = await startTestServer();
  ({ Product } = await import('../src/models/Product.js'));
  const { Category } = await import('../src/models/Category.js');
  category = await Category.create({ name: 'Emerald' });
  anon = createClient(baseUrl);
}, { timeout: 120_000 });

after(stopTestServer);

const page = async (path) => {
  const res = await fetch(baseUrl + path, { headers: { 'user-agent': 'facebookexternalhit/1.1' } });
  return { status: res.status, html: await res.text(), type: res.headers.get('content-type') };
};
const meta = (html, prop) => html.match(new RegExp(`<meta data-seo (?:property|name)="${prop}" content="([^"]*)"`))?.[1];

describe('server-rendered page metadata', () => {
  it('fills in a product’s title, description, Open Graph tags and structured data', async () => {
    await Product.create({
      name: 'Swat Emerald Oval',
      slug: 'swat-emerald-oval',
      category: category._id,
      carat: 1.42,
      pricePKR: 280000,
      stock: 1,
      origin: 'Swat, Pakistan',
      sku: 'GK-EM-900',
      images: [{ url: 'https://res.cloudinary.com/demo/image/upload/v1/geological-kingdom/products/abc.jpg', publicId: 'geological-kingdom/products/abc' }],
    });
    const { status, html, type } = await page('/gems/swat-emerald-oval');
    assert.equal(status, 200);
    assert.match(type, /html/);
    assert.match(html, /<title data-seo>Swat Emerald Oval, 1.42 ct · Geological Kingdom<\/title>/);
    assert.equal(meta(html, 'og:type'), 'product');
    assert.equal(meta(html, 'og:url'), 'http://shop.test/gems/swat-emerald-oval');
    assert.equal(meta(html, 'og:image'), 'https://res.cloudinary.com/demo/image/upload/c_pad,w_1200,h_630,b_rgb:fbf9f4,f_jpg,q_auto/v1/geological-kingdom/products/abc.jpg');
    assert.equal(meta(html, 'product:price:amount'), '280000');
    assert.equal(meta(html, 'product:price:currency'), 'PKR');
    assert.match(html, /<link data-seo rel="canonical" href="http:\/\/shop.test\/gems\/swat-emerald-oval">/);

    const ld = [...html.matchAll(/<script data-seo type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const product = ld.find((d) => d['@type'] === 'Product');
    assert.equal(product.offers.price, 280000);
    assert.equal(product.offers.priceCurrency, 'PKR');
    assert.equal(product.offers.availability, 'https://schema.org/InStock');
    assert.equal(product.sku, 'GK-EM-900');
    assert.equal(product.weight.value, 1.42);
    assert.ok(ld.some((d) => d['@type'] === 'BreadcrumbList'));
  });

  it('escapes hostile product text in tags and structured data', async () => {
    await Product.create({ name: 'Evil </script><script>alert(1)</script> "quote"', slug: 'evil-stone', category: category._id, carat: 1, pricePKR: 1, description: '<img src=x onerror=alert(1)>' });
    const { html } = await page('/gems/evil-stone');
    assert.ok(!html.includes('<script>alert(1)'));
    assert.ok(!html.includes('<img src=x'));
    assert.match(html, /&lt;\/script&gt;/);
    assert.match(html, /\\u003c\/script>/);
  });

  it('answers 404 with noindex for unknown and archived products', async () => {
    await Product.create({ name: 'Archived Ruby', slug: 'archived-ruby', category: category._id, carat: 1, pricePKR: 1, isActive: false });
    for (const path of ['/gems/no-such-stone', '/gems/archived-ruby', '/no-such-page']) {
      const { status, html } = await page(path);
      assert.equal(status, 404, path);
      assert.equal(meta(html, 'robots'), 'noindex');
    }
  });

  it('keeps private pages out of search results and describes public ones', async () => {
    for (const path of ['/cart', '/checkout', '/admin', '/admin/orders', '/order/GK-2026-000001']) {
      const { status, html } = await page(path);
      assert.equal(status, 200, path);
      assert.equal(meta(html, 'robots'), 'noindex', path);
    }
    const home = await page('/');
    assert.match(home.html, /<title data-seo>Geological Kingdom · Natural gemstones/);
    assert.equal(meta(home.html, 'og:image'), 'http://shop.test/og-default.jpg');
    assert.equal(meta(home.html, 'robots'), undefined);
    const shop = await page('/shop?category=emerald');
    assert.match(shop.html, /Emerald gemstones/);
    assert.match(shop.html, /canonical" href="http:\/\/shop.test\/shop\?category=emerald"/);
  });
});

describe('sitemap and robots', () => {
  it('lists public pages, categories and active products only', async () => {
    const res = await anon.get('/sitemap.xml');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /xml/);
    assert.match(res.data, /<loc>http:\/\/shop.test\/gems\/swat-emerald-oval<\/loc><lastmod>\d{4}-\d\d-\d\d<\/lastmod>/);
    assert.match(res.data, /<loc>http:\/\/shop.test\/shop\?category=emerald<\/loc>/);
    assert.match(res.data, /<loc>http:\/\/shop.test\/investigation<\/loc>/);
    assert.ok(!res.data.includes('archived-ruby'));
  });

  it('points crawlers at the sitemap and away from private pages', async () => {
    const res = await anon.get('/robots.txt');
    assert.match(res.data, /Sitemap: http:\/\/shop.test\/sitemap.xml/);
    assert.match(res.data, /Disallow: \/admin/);
    assert.match(res.data, /Disallow: \/checkout/);
  });
});
