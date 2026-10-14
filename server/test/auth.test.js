import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { TEST_JWT_SECRET, createClient, startTestServer, stopTestServer, uniqueEmail } from './helpers.js';

let baseUrl;
let User;
let hashPassword;
let jwt;

before(async () => {
  baseUrl = await startTestServer();
  ({ User } = await import('../src/models/User.js'));
  ({ hashPassword } = await import('../src/services/authService.js'));
  jwt = (await import('jsonwebtoken')).default;
}, { timeout: 120_000 });

after(stopTestServer);

const PASSWORD = 'correct horse battery';
const register = (client, overrides = {}) =>
  client.post('/api/auth/register', { name: 'Test User', email: uniqueEmail(), password: PASSWORD, ...overrides });

const sessionCookie = (res) => res.setCookies.find((c) => c.startsWith('gk_session='));

// Signs a token with the given payload/options, for crafting expired or forged sessions.
const forge = (payload, secret = TEST_JWT_SECRET, options = {}) =>
  `gk_session=${jwt.sign(payload, secret, { algorithm: 'HS256', ...options })}`;

describe('POST /api/auth/register', () => {
  it('creates a customer, returns it without secrets and starts a session', async () => {
    const client = createClient(baseUrl);
    const email = uniqueEmail('new');
    const res = await register(client, { email, phone: '+92 300 1234567' });

    assert.equal(res.status, 201);
    assert.equal(res.data.user.email, email);
    assert.equal(res.data.user.role, 'customer');
    assert.equal(res.data.user.phone, '+92 300 1234567');
    assert.ok(res.data.user.id);
    assert.equal(res.data.user.passwordHash, undefined);
    assert.equal(res.data.user.tokenVersion, undefined);
    assert.ok(client.cookie, 'session cookie should be set');
  });

  it('sets a hardened session cookie', async () => {
    const res = await register(createClient(baseUrl));
    const cookie = sessionCookie(res);

    assert.ok(cookie);
    assert.match(cookie, /; HttpOnly/);
    assert.match(cookie, /; SameSite=Lax/);
    assert.match(cookie, /; Path=\//);
    assert.match(cookie, /; Max-Age=604800/); // 7 days
    assert.doesNotMatch(cookie, /; Secure/); // only in production
  });

  it('stores a bcrypt hash, never the plain password', async () => {
    const email = uniqueEmail('hash');
    await register(createClient(baseUrl), { email });
    const user = await User.findOne({ email }).select('+passwordHash');

    assert.match(user.passwordHash, /^\$2[aby]\$12\$/);
    assert.notEqual(user.passwordHash, PASSWORD);
  });

  it('ignores a role sent by the client (no self-promotion to admin)', async () => {
    const res = await register(createClient(baseUrl), { role: 'admin' });
    assert.equal(res.status, 201);
    assert.equal(res.data.user.role, 'customer');
  });

  it('normalises email and rejects duplicates case-insensitively', async () => {
    const email = uniqueEmail('dup');
    const first = await register(createClient(baseUrl), { email: `  ${email.toUpperCase()} ` });
    assert.equal(first.status, 201);
    assert.equal(first.data.user.email, email);

    const second = await register(createClient(baseUrl), { email });
    assert.equal(second.status, 409);
    assert.equal(second.data.error, 'An account with this email already exists');
  });

  it('returns 409 (not 500) when two sign-ups race for the same email', async () => {
    const email = uniqueEmail('race');
    const results = await Promise.all([register(createClient(baseUrl), { email }), register(createClient(baseUrl), { email })]);

    assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
    assert.equal(await User.countDocuments({ email }), 1);
  });

  it('validates input and reports each invalid field', async () => {
    const res = await createClient(baseUrl).post('/api/auth/register', { name: 'A', email: 'not-an-email', password: 'short' });

    assert.equal(res.status, 400);
    const fields = res.data.details.map((d) => d.path).sort();
    assert.deepEqual(fields, ['email', 'name', 'password']);
  });

  it('rejects passwords longer than bcrypt can use (72 bytes)', async () => {
    const res = await register(createClient(baseUrl), { password: 'é'.repeat(37) }); // 74 bytes
    assert.equal(res.status, 400);
    assert.equal(res.data.details[0].path, 'password');
  });

  it('returns 400 for a malformed JSON body', async () => {
    const res = await createClient(baseUrl).post('/api/auth/register', undefined, { rawBody: '{"name": ' });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'Request body is not valid JSON');
  });
});

describe('POST /api/auth/login', () => {
  let email;
  before(async () => {
    email = uniqueEmail('login');
    await register(createClient(baseUrl), { email });
  });

  it('signs in with valid credentials (email is case-insensitive)', async () => {
    const client = createClient(baseUrl);
    const res = await client.post('/api/auth/login', { email: email.toUpperCase(), password: PASSWORD });

    assert.equal(res.status, 200);
    assert.equal(res.data.user.email, email);
    assert.ok(res.data.user.lastLoginAt);
    assert.equal(res.data.user.passwordHash, undefined);
    assert.ok(sessionCookie(res));
  });

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const wrongPassword = await createClient(baseUrl).post('/api/auth/login', { email, password: 'wrong password' });
    const unknownEmail = await createClient(baseUrl).post('/api/auth/login', { email: uniqueEmail('ghost'), password: PASSWORD });

    for (const res of [wrongPassword, unknownEmail]) {
      assert.equal(res.status, 401);
      assert.equal(res.data.error, 'Invalid email or password');
      assert.equal(sessionCookie(res), undefined);
    }
  });

  it('requires both fields', async () => {
    const res = await createClient(baseUrl).post('/api/auth/login', { email });
    assert.equal(res.status, 400);
    assert.equal(res.data.details[0].path, 'password');
  });

  it('throttles repeated failures for one account without blocking other accounts', async () => {
    const victim = uniqueEmail('victim');
    await register(createClient(baseUrl), { email: victim });
    const attempt = (e, password = 'wrong password') => createClient(baseUrl).post('/api/auth/login', { email: e, password });

    for (let i = 0; i < 5; i += 1) assert.equal((await attempt(victim)).status, 401); // LOGIN_RATE_LIMIT=5 in tests

    const blocked = await attempt(victim, PASSWORD); // even the right password is refused now
    assert.equal(blocked.status, 429);
    assert.match(blocked.data.error, /Too many sign-in attempts/);

    const otherAccount = await attempt(email, PASSWORD); // same IP, different account
    assert.equal(otherAccount.status, 200);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without a session', async () => {
    const res = await createClient(baseUrl).get('/api/auth/me');
    assert.equal(res.status, 401);
  });

  it('returns the signed-in user', async () => {
    const client = createClient(baseUrl);
    const email = uniqueEmail('me');
    await register(client, { email });
    const res = await client.get('/api/auth/me');

    assert.equal(res.status, 200);
    assert.equal(res.data.user.email, email);
    assert.equal(res.data.user.passwordHash, undefined);
  });

  it('rejects and clears a tampered token', async () => {
    const client = createClient(baseUrl);
    await register(client);
    const [header, , signature] = client.cookie.split('.');
    const fakePayload = Buffer.from(JSON.stringify({ sub: '000000000000000000000000', ver: 0 })).toString('base64url');
    client.cookie = `${header}.${fakePayload}.${signature}`;

    const res = await client.get('/api/auth/me');
    assert.equal(res.status, 401);
    assert.match(sessionCookie(res), /Expires=Thu, 01 Jan 1970/);
  });

  it('rejects a token signed with another secret', async () => {
    const client = createClient(baseUrl);
    const { data } = await register(client);
    client.cookie = forge({ ver: 0 }, 'some-other-secret-that-is-long-enough-to-pass', { subject: data.user.id });
    assert.equal((await client.get('/api/auth/me')).status, 401);
  });

  it('rejects an unsigned ("alg: none") token', async () => {
    const client = createClient(baseUrl);
    const { data } = await register(client);
    const part = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    client.cookie = `gk_session=${part({ alg: 'none', typ: 'JWT' })}.${part({ sub: data.user.id, ver: 0 })}.`;
    assert.equal((await client.get('/api/auth/me')).status, 401);
  });

  it('rejects an expired token', async () => {
    const client = createClient(baseUrl);
    const { data } = await register(client);
    client.cookie = forge({ ver: 0, exp: Math.floor(Date.now() / 1000) - 60 }, TEST_JWT_SECRET, { subject: data.user.id });
    assert.equal((await client.get('/api/auth/me')).status, 401);
  });

  it('rejects the session of a deleted account', async () => {
    const client = createClient(baseUrl);
    const { data } = await register(client);
    await User.deleteOne({ _id: data.user.id });
    assert.equal((await client.get('/api/auth/me')).status, 401);
  });
});

describe('POST /api/auth/logout and /logout-all', () => {
  it('logout clears the session cookie', async () => {
    const client = createClient(baseUrl);
    await register(client);

    const res = await client.post('/api/auth/logout');
    assert.equal(res.status, 204);
    assert.match(sessionCookie(res), /Expires=Thu, 01 Jan 1970/);
    assert.equal((await client.get('/api/auth/me')).status, 401);
  });

  it('logout works even without a session', async () => {
    assert.equal((await createClient(baseUrl).post('/api/auth/logout')).status, 204);
  });

  it('logout-all revokes sessions on every device, but allows signing in again', async () => {
    const email = uniqueEmail('devices');
    const laptop = createClient(baseUrl);
    const phone = createClient(baseUrl);
    await register(laptop, { email });
    await phone.post('/api/auth/login', { email, password: PASSWORD });
    assert.equal((await phone.get('/api/auth/me')).status, 200);

    assert.equal((await laptop.post('/api/auth/logout-all')).status, 204);
    assert.equal((await phone.get('/api/auth/me')).status, 401);
    assert.equal((await laptop.get('/api/auth/me')).status, 401);

    const again = await phone.post('/api/auth/login', { email, password: PASSWORD });
    assert.equal(again.status, 200);
    assert.equal((await phone.get('/api/auth/me')).status, 200);
  });

  it('logout-all requires a session', async () => {
    assert.equal((await createClient(baseUrl).post('/api/auth/logout-all')).status, 401);
  });
});

describe('role middleware', () => {
  let roleUrl;
  let roleServer;

  // Mounts the real middleware on a tiny app, since no admin routes exist yet.
  before(async () => {
    const express = (await import('express')).default;
    const cookieParser = (await import('cookie-parser')).default;
    const { authenticate, requireAdmin, requireAuth, requireRole } = await import('../src/middleware/auth.js');
    const { errorHandler } = await import('../src/middleware/errorHandler.js');

    const app = express();
    app.use(cookieParser(), authenticate);
    app.get('/signed-in', requireAuth, (req, res) => res.json({ role: req.user.role }));
    app.get('/admin', requireAdmin, (_req, res) => res.json({ ok: true }));
    app.get('/staff', requireRole('admin', 'customer'), (_req, res) => res.json({ ok: true }));
    app.use(errorHandler);

    roleServer = app.listen(0);
    await new Promise((resolve) => roleServer.once('listening', resolve));
    roleUrl = `http://127.0.0.1:${roleServer.address().port}`;
  });

  after(() => new Promise((resolve) => roleServer.close(resolve)));

  // Signs in through the real API, then reuses the cookie against the role app.
  async function signedInAs(role) {
    const email = uniqueEmail(role);
    await User.create({ name: `Test ${role}`, email, role, passwordHash: await hashPassword(PASSWORD) });
    const api = createClient(baseUrl);
    await api.post('/api/auth/login', { email, password: PASSWORD });
    const client = createClient(roleUrl);
    client.cookie = api.cookie;
    return { client, email };
  }

  it('anonymous requests get 401', async () => {
    const anon = createClient(roleUrl);
    for (const path of ['/signed-in', '/admin', '/staff']) assert.equal((await anon.get(path)).status, 401, path);
  });

  it('customers get 403 on admin routes but pass shared routes', async () => {
    const { client: customer } = await signedInAs('customer');
    const denied = await customer.get('/admin');
    assert.equal(denied.status, 403);
    assert.equal(denied.data.error, 'You do not have access to this resource');
    assert.equal((await customer.get('/staff')).status, 200);
    assert.equal((await customer.get('/signed-in')).data.role, 'customer');
  });

  it('admins pass admin routes', async () => {
    const { client: admin } = await signedInAs('admin');
    assert.equal((await admin.get('/admin')).status, 200);
    assert.equal((await admin.get('/staff')).status, 200);
  });

  it('a demoted admin loses access immediately (role is read from the database, not the token)', async () => {
    const { client: admin, email } = await signedInAs('admin');
    assert.equal((await admin.get('/signed-in')).data.role, 'admin');

    await User.updateOne({ email }, { role: 'customer' });
    assert.equal((await admin.get('/admin')).status, 403);
  });
});
