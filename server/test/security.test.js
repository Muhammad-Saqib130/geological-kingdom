import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createClient, signedInClient, startTestServer, stopTestServer, uniqueEmail } from './helpers.js';

// Small per-account limit so it trips before the per-IP+email limit (5) in this file
process.env.ACCOUNT_LOGIN_LIMIT = '3';

let baseUrl;
let anon;
let admin;

before(async () => {
  baseUrl = await startTestServer();
  anon = createClient(baseUrl);
  admin = await signedInClient(baseUrl, 'admin');
}, { timeout: 120_000 });

after(stopTestServer);

describe('NoSQL injection', () => {
  it('rejects operator objects in JSON bodies', async () => {
    const login = await anon.post('/api/auth/login', { email: { $ne: null }, password: { $ne: null } });
    assert.equal(login.status, 400);
    const track = await anon.post('/api/investigations/track', { trackingId: 'GI-2222-2222', email: { $gt: '' } });
    assert.equal(track.status, 400);
    const quote = await anon.post('/api/cart/quote', { items: [{ productId: { $ne: null }, qty: 1 }] });
    assert.equal(quote.status, 400);
  });

  it('treats bracketed query keys as plain strings, not operators', async () => {
    const res = await anon.get('/api/products?category[$ne]=x&minPrice[$gt]=0');
    assert.equal(res.status, 200); // unknown keys are ignored, no filter injection
    const orders = await anon.get('/api/orders/GK-2026-000001?token[$ne]=x');
    assert.equal(orders.status, 404);
  });

  it('escapes regular-expression characters in search', async () => {
    const res = await anon.get(`/api/products?q=${encodeURIComponent('(a+)+$')}`);
    assert.equal(res.status, 200);
    assert.equal(res.data.total, 0);
  });

  it('caps page numbers', async () => {
    assert.equal((await anon.get('/api/products?page=999999999')).status, 400);
    assert.equal((await admin.get('/api/admin/orders?page=5000')).status, 400);
  });
});

describe('cross-site requests', () => {
  it('blocks state-changing requests from another website', async () => {
    const evil = await anon.post('/api/auth/logout', undefined, { headers: { origin: 'https://evil.example' } });
    assert.equal(evil.status, 403);
    const nullOrigin = await anon.post('/api/newsletter', { email: 'a@example.com' }, { headers: { origin: 'null' } });
    assert.equal(nullOrigin.status, 403);
  });

  it('allows the shop’s own origin, same-host requests and requests without an Origin', async () => {
    assert.equal((await anon.post('/api/auth/logout', undefined, { headers: { origin: 'http://localhost:5173' } })).status, 204);
    const host = new URL(baseUrl).host;
    assert.equal((await anon.post('/api/auth/logout', undefined, { headers: { origin: `http://${host}` } })).status, 204);
    assert.equal((await anon.post('/api/auth/logout')).status, 204);
    // Reading is never blocked
    assert.equal((await anon.get('/api/products', { headers: { origin: 'https://evil.example' } })).status, 200);
  });

  it('only sends CORS headers to the shop’s own origin', async () => {
    const ok = await anon.get('/api/products', { headers: { origin: 'http://localhost:5173' } });
    assert.equal(ok.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.equal(ok.headers.get('access-control-allow-credentials'), 'true');
    const evil = await anon.get('/api/products', { headers: { origin: 'https://evil.example' } });
    assert.equal(evil.headers.get('access-control-allow-origin'), null);
  });
});

describe('headers and cookies', () => {
  it('marks private API responses no-store and keeps public catalogue data cacheable', async () => {
    assert.equal((await admin.get('/api/admin/orders')).headers.get('cache-control'), 'no-store');
    assert.equal((await anon.get('/api/auth/session')).headers.get('cache-control'), 'no-store');
    assert.match((await anon.get('/api/settings/store')).headers.get('cache-control'), /public/);
  });

  it('sends security headers', async () => {
    const res = await anon.get('/api/health');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(res.headers.get('content-security-policy'));
    assert.equal(res.headers.get('x-powered-by'), null);
  });

  it('sets the session cookie HttpOnly and SameSite=Lax', async () => {
    const email = uniqueEmail('cookie');
    const res = await anon.post('/api/auth/register', { name: 'Cookie Test', email, password: 'a long enough password' });
    assert.equal(res.status, 201);
    const cookie = res.setCookies.find((c) => c.startsWith('gk_session='));
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
  });
});

describe('rate limits', () => {
  it('locks an account after repeated failed sign-ins, even from different addresses', async () => {
    const email = uniqueEmail('target');
    await anon.post('/api/auth/register', { name: 'Target', email, password: 'the real password!' });
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await createClient(baseUrl).post('/api/auth/login', { email, password: `guess-${i}` })).status);
    assert.deepEqual(statuses, [401, 401, 401, 429]);
    const locked = await createClient(baseUrl).post('/api/auth/login', { email, password: 'the real password!' });
    assert.equal(locked.status, 429);
    assert.match(locked.data.error, /this account/);
  });
});

describe('uploads', () => {
  it('rejects files over the size limit', async () => {
    const big = Buffer.alloc(10 * 1024 * 1024 + 1, 0);
    const res = await anon.post('/api/investigations/uploads/local', undefined, { rawBody: big, headers: { 'content-type': 'application/octet-stream' } });
    assert.equal(res.status, 413);
  });

  it('rejects SVG and HTML disguised as images', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>');
    const res = await anon.post('/api/investigations/uploads/local', undefined, { rawBody: svg, headers: { 'content-type': 'image/svg+xml' } });
    assert.equal(res.status, 415);
  });
});
