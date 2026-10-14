import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { createClient, mailDir, signedInClient, startTestServer, stopTestServer } from './helpers.js';

let baseUrl;
let anon;
let admin;
let customer;
let Investigation;

const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c4944415408d763f8cfc000000301010018dd8db00000000049454e44ae426082',
  'hex',
);
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

before(async () => {
  baseUrl = await startTestServer();
  ({ Investigation } = await import('../src/models/Investigation.js'));
  anon = createClient(baseUrl);
  admin = await signedInClient(baseUrl, 'admin');
  customer = await signedInClient(baseUrl, 'customer');
}, { timeout: 120_000 });

after(stopTestServer);

// Uploads a customer photo through the public endpoints, as the form does
async function uploadPhoto(client = anon, bytes = PNG) {
  const ticket = await client.post('/api/investigations/uploads/sign');
  assert.equal(ticket.status, 200);
  const res = await client.post(ticket.data.uploadUrl, undefined, { rawBody: bytes, headers: { 'content-type': 'application/octet-stream' } });
  return res;
}

async function uploadReport(bytes = PDF) {
  const ticket = await admin.post('/api/admin/uploads/sign', { folder: 'investigation-reports' });
  assert.equal(ticket.status, 200);
  assert.ok(ticket.data.accept.includes('pdf'));
  return admin.post(`${ticket.data.uploadUrl}`, undefined, { rawBody: bytes, headers: { 'content-type': 'application/octet-stream' } });
}

const email = () => `buyer.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@example.com`;

async function request(overrides = {}) {
  const photo = (await uploadPhoto()).data;
  return {
    contact: { name: 'Bilal Ahmed', email: email(), whatsapp: '+92 300 7654321', country: 'PK' },
    gem: { type: 'Blue sapphire', count: 2, purchasedFrom: 'A dealer in Ratnapura', sellerClaims: 'Unheated, Ceylon', description: 'Two oval stones, about 1 ct each' },
    photos: [photo],
    ...overrides,
  };
}

async function submit(overrides) {
  const body = await request(overrides);
  const res = await anon.post('/api/investigations', body);
  return { res, body };
}

async function latestMail(to) {
  const files = (await readdir(mailDir)).sort();
  for (const f of files.reverse()) {
    // Undo quoted-printable soft line breaks and escapes
    const content = (await readFile(path.join(mailDir, f), 'utf8')).replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    if (content.includes(to)) return content;
  }
  return null;
}

describe('submitting a request', () => {
  it('creates a request with a tracking ID, computes the fee and emails a confirmation', async () => {
    const { res, body } = await submit({ feeUSD: 1 });
    assert.equal(res.status, 201);
    assert.match(res.data.trackingId, /^GI-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
    assert.equal(res.data.feeUSD, 20); // $10 x 2 gems; client-sent fee ignored
    assert.equal(res.data.token.length, 32);

    const inv = await Investigation.findOne({ trackingId: res.data.trackingId });
    assert.equal(inv.status, 'received');
    assert.equal(inv.contact.email, body.contact.email);
    assert.ok(inv.receivedEmailAt);

    const mail = await latestMail(body.contact.email);
    assert.ok(mail.includes(res.data.trackingId));
    assert.ok(mail.includes('/investigation/track/'));
  });

  it('accepts up to five photos and an optional certificate photo', async () => {
    const photos = [];
    for (let i = 0; i < 5; i++) photos.push((await uploadPhoto()).data);
    const certificate = (await uploadPhoto()).data;
    const { res } = await submit({ photos, certificate });
    assert.equal(res.status, 201);
    const inv = await Investigation.findOne({ trackingId: res.data.trackingId });
    assert.equal(inv.photos.length, 5);
    assert.equal(inv.certificate.url, certificate.url);

    const six = await submit({ photos: [...photos, certificate] });
    assert.equal(six.res.status, 400);
  });

  it('validates required fields', async () => {
    const res = await anon.post('/api/investigations', { contact: {}, gem: { count: 0 }, photos: [] });
    assert.equal(res.status, 400);
    const paths = res.data.details.map((d) => d.path);
    for (const p of ['contact.name', 'contact.email', 'contact.whatsapp', 'contact.country', 'gem.type', 'gem.count', 'gem.purchasedFrom', 'photos']) {
      assert.ok(paths.includes(p), `missing error for ${p}`);
    }
  });

  it('rejects photos that were not uploaded through the form', async () => {
    const forged = { url: 'https://evil.example/x.png', publicId: 'local/investigations/' + 'a'.repeat(32) + '.png' };
    assert.equal((await submit({ photos: [forged] })).res.status, 400);

    // An admin product image is not a customer photo
    const ticket = await admin.post('/api/admin/uploads/sign', { folder: 'products' });
    const productImg = (await admin.post(ticket.data.uploadUrl, undefined, { rawBody: PNG, headers: { 'content-type': 'image/png' } })).data;
    assert.equal((await submit({ photos: [productImg] })).res.status, 400);
  });

  it('only stores images from the public upload endpoint', async () => {
    assert.equal((await uploadPhoto(anon, Buffer.from('<html><script>alert(1)</script></html>'))).status, 415);
    assert.equal((await uploadPhoto(anon, PDF)).status, 415);
  });

  it('links the request to the signed-in customer', async () => {
    const body = await request();
    const res = await customer.post('/api/investigations', body);
    assert.equal(res.status, 201);
    const inv = await Investigation.findOne({ trackingId: res.data.trackingId });
    assert.ok(inv.user);
  });
});

describe('tracking a request', () => {
  it('finds a request by tracking ID and email, in any letter case and spacing', async () => {
    const { res, body } = await submit();
    const loose = res.data.trackingId.toLowerCase().replace(/-/g, ' ');
    const found = await anon.post('/api/investigations/track', { trackingId: loose, email: body.contact.email.toUpperCase() });
    assert.equal(found.status, 200);
    const inv = found.data.investigation;
    assert.equal(inv.trackingId, res.data.trackingId);
    assert.equal(inv.status, 'received');
    // Private fields are not exposed
    assert.equal(inv.notes, undefined);
    assert.equal(inv.contact.email, undefined);
    assert.equal(inv.contact.whatsapp, undefined);
    assert.equal(inv.result, undefined);
  });

  it('finds a request with the link token from the email', async () => {
    const { res } = await submit();
    const found = await anon.post('/api/investigations/track', { trackingId: res.data.trackingId, token: res.data.token });
    assert.equal(found.status, 200);
  });

  it('answers the same 404 for a wrong email, a wrong token and an unknown ID', async () => {
    const { res } = await submit();
    const wrongEmail = await anon.post('/api/investigations/track', { trackingId: res.data.trackingId, email: 'someone@example.com' });
    const wrongToken = await anon.post('/api/investigations/track', { trackingId: res.data.trackingId, token: 'x'.repeat(32) });
    const unknown = await anon.post('/api/investigations/track', { trackingId: 'GI-2222-2222', email: 'someone@example.com' });
    assert.equal(wrongEmail.status, 404);
    assert.equal(wrongToken.status, 404);
    assert.equal(unknown.status, 404);
    assert.equal(wrongEmail.data.error, unknown.data.error);
  });

  it('rejects malformed tracking IDs', async () => {
    const res = await anon.post('/api/investigations/track', { trackingId: 'hello', email: 'a@example.com' });
    assert.equal(res.status, 400);
  });
});

describe('admin', () => {
  it('is admin-only', async () => {
    assert.equal((await anon.get('/api/admin/investigations')).status, 401);
    assert.equal((await customer.get('/api/admin/investigations')).status, 403);
  });

  it('lists, filters and searches requests with status counts', async () => {
    const { res, body } = await submit({ gem: { type: 'Paraiba tourmaline', count: 1, purchasedFrom: 'Online' } });
    const list = await admin.get('/api/admin/investigations?status=received');
    assert.equal(list.status, 200);
    assert.ok(list.data.items.every((i) => i.status === 'received'));
    assert.ok(list.data.counts.received >= 1);

    const search = await admin.get(`/api/admin/investigations?q=${encodeURIComponent('paraiba')}`);
    assert.deepEqual(search.data.items.map((i) => i.trackingId), [res.data.trackingId]);
    const byEmail = await admin.get(`/api/admin/investigations?q=${encodeURIComponent(body.contact.email)}`);
    assert.equal(byEmail.data.items.length, 1);
  });

  it('moves a request through the statuses, adds notes and completes it with a result', async () => {
    const { res, body } = await submit();
    const id = res.data.trackingId;
    const url = `/api/admin/investigations/${id}`;

    assert.equal((await admin.patch(`${url}/status`, { status: 'contacted', note: 'Messaged on WhatsApp' })).status, 200);
    assert.equal((await admin.patch(`${url}/status`, { status: 'contacted' })).status, 400); // unchanged
    assert.equal((await admin.patch(`${url}/status`, { status: 'payment_arranged' })).status, 200);
    assert.equal((await admin.patch(`${url}/status`, { status: 'in_progress' })).status, 200);

    const note = await admin.post(`${url}/notes`, { text: 'Customer will courier the stone' });
    assert.equal(note.status, 201);
    assert.equal(note.data.investigation.notes[0].text, 'Customer will courier the stone');
    assert.equal(note.data.investigation.notes[0].by.name, 'Test admin');

    // Cannot complete without a verdict
    const early = await admin.patch(`${url}/status`, { status: 'completed' });
    assert.equal(early.status, 400);

    const report = (await uploadReport()).data;
    assert.equal(report.format, 'pdf');
    const saved = await admin.put(`${url}/result`, { verdict: 'natural_treated', summary: 'Natural sapphire showing signs of heat treatment.', report });
    assert.equal(saved.status, 200);
    assert.equal(saved.data.investigation.result.report.url, report.url);

    // Not visible to the customer until completed
    const before = await anon.post('/api/investigations/track', { trackingId: id, email: body.contact.email });
    assert.equal(before.data.investigation.result, undefined);

    const done = await admin.patch(`${url}/status`, { status: 'completed' });
    assert.equal(done.status, 200);
    assert.ok(done.data.investigation.completedEmailAt);
    assert.deepEqual(done.data.investigation.statusHistory.map((h) => h.status), ['received', 'contacted', 'payment_arranged', 'in_progress', 'completed']);

    const mail = await latestMail(body.contact.email);
    assert.ok(mail.includes('Natural, treated'));
    assert.ok(mail.includes(`http://shop.test${report.url}`));

    const after = await anon.post('/api/investigations/track', { trackingId: id, email: body.contact.email });
    assert.equal(after.data.investigation.result.verdict, 'natural_treated');
    assert.equal(after.data.investigation.result.report.url, report.url);
    assert.equal(after.data.investigation.notes, undefined);
    assert.ok(after.data.investigation.statusHistory.every((h) => h.by === undefined && h.note === undefined));
  });

  it('replaces the report and deletes the old file', async () => {
    const { res } = await submit();
    const url = `/api/admin/investigations/${res.data.trackingId}`;
    const first = (await uploadReport()).data;
    await admin.put(`${url}/result`, { verdict: 'synthetic', summary: 'Lab-grown corundum.', report: first });
    assert.equal((await fetch(baseUrl + first.url)).status, 200);

    const second = (await uploadReport(PNG)).data;
    await admin.put(`${url}/result`, { verdict: 'synthetic', summary: 'Lab-grown corundum.', report: second });
    assert.equal((await fetch(baseUrl + first.url)).status, 404);

    const cleared = await admin.put(`${url}/result`, { verdict: 'synthetic', summary: 'Lab-grown corundum.', report: null });
    assert.equal(cleared.data.investigation.result.report, undefined);
    assert.equal((await fetch(baseUrl + second.url)).status, 404);
  });

  it('rejects a report that was not uploaded as a report', async () => {
    const { res } = await submit();
    const photo = (await uploadPhoto()).data;
    const r = await admin.put(`/api/admin/investigations/${res.data.trackingId}/result`, { verdict: 'imitation', summary: 'Glass imitation.', report: photo });
    assert.equal(r.status, 400);
  });

  it('does not email the customer when a request is cancelled', async () => {
    const { res, body } = await submit();
    const before = (await readdir(mailDir)).length;
    const r = await admin.patch(`/api/admin/investigations/${res.data.trackingId}/status`, { status: 'cancelled', note: 'Spam' });
    assert.equal(r.status, 200);
    assert.equal((await readdir(mailDir)).length, before);
    assert.ok(body);
  });
});
