// Test harness: an isolated database, a running app on a random port, and a cookie-aware client.
//
// Database: uses MONGODB_URI_TEST when set (its database name must contain "test", since it is
// wiped), otherwise starts a throwaway in-memory MongoDB via mongodb-memory-server.

export const TEST_JWT_SECRET = 'test-only-jwt-secret-0123456789-abcdefghijklmnop';

let mongod;
let server;
let mongoose;
export let uploadDir;

export async function startTestServer() {
  let uri = process.env.MONGODB_URI_TEST;
  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri('gk-test');
  }
  if (!/test/i.test(new URL(uri.replace(/^mongodb(\+srv)?:/, 'http:')).pathname)) {
    throw new Error('MONGODB_URI_TEST must point at a database whose name contains "test" (it is wiped)');
  }

  // Must be set before any app module is imported: config/env.js reads it once at import time.
  const { mkdtemp } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  uploadDir = await mkdtemp(`${tmpdir()}/gk-uploads-`);

  // Cloudinary is never used in tests; clear anything inherited from the shell.
  for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) delete process.env[key];

  Object.assign(process.env, {
    LOCAL_UPLOAD_DIR: uploadDir,
    NODE_ENV: 'test',
    MONGODB_URI: uri,
    JWT_SECRET: TEST_JWT_SECRET,
    SESSION_TTL_DAYS: '7',
    COOKIE_SAMESITE: 'lax',
    LOGIN_RATE_LIMIT: '5',
    CLIENT_ORIGIN: 'http://localhost:5173',
  });

  mongoose = (await import('mongoose')).default;
  const { connectDB } = await import('../src/config/db.js');
  const { createApp } = await import('../src/app.js');

  await connectDB();
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));

  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

export async function stopTestServer() {
  await new Promise((resolve) => (server ? server.close(resolve) : resolve()));
  if (mongoose) {
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.disconnect();
  }
  await mongod?.stop();
  if (uploadDir) await (await import('node:fs/promises')).rm(uploadDir, { recursive: true, force: true });
}

// Creates a user with the given role directly in the database and signs them in.
export async function signedInClient(baseUrl, role = 'customer') {
  const { User } = await import('../src/models/User.js');
  const { hashPassword } = await import('../src/services/authService.js');
  const email = uniqueEmail(role);
  const password = 'correct horse battery';
  await User.create({ name: `Test ${role}`, email, role, passwordHash: await hashPassword(password) });
  const client = createClient(baseUrl);
  const res = await client.post('/api/auth/login', { email, password });
  if (res.status !== 200) throw new Error(`login failed: ${res.status}`);
  return client;
}

// Minimal HTTP client that remembers the session cookie like a browser would.
export function createClient(baseUrl, cookieName = 'gk_session') {
  let cookie = '';

  async function request(method, path, body, { headers = {}, rawBody } = {}) {
    const res = await fetch(baseUrl + path, {
      method,
      headers: {
        ...((body !== undefined || rawBody !== undefined) && { 'content-type': 'application/json' }),
        ...(cookie && { cookie }),
        ...headers,
      },
      body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
    });

    const setCookies = res.headers.getSetCookie();
    for (const header of setCookies) {
      const [pair] = header.split(';');
      const [name, ...rest] = pair.split('=');
      const value = rest.join('=');
      if (name === cookieName) cookie = value ? `${name}=${value}` : '';
    }

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: res.status, data, headers: res.headers, setCookies };
  }

  return {
    get: (path, opts) => request('GET', path, undefined, opts),
    post: (path, body, opts) => request('POST', path, body, opts),
    patch: (path, body, opts) => request('PATCH', path, body, opts),
    delete: (path, opts) => request('DELETE', path, undefined, opts),
    get cookie() {
      return cookie;
    },
    set cookie(value) {
      cookie = value;
    },
  };
}

let counter = 0;
export const uniqueEmail = (label = 'user') => `${label}.${Date.now()}.${++counter}@example.com`;
