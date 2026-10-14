// Cloudinary signing and ownership checks (no network, no database).
import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

let cloudinary;

before(async () => {
  Object.assign(process.env, {
    NODE_ENV: 'test',
    MONGODB_URI: 'mongodb://127.0.0.1:1/unused',
    JWT_SECRET: 'x'.repeat(40),
    CLOUDINARY_CLOUD_NAME: 'demo',
    CLOUDINARY_API_KEY: '123456',
    CLOUDINARY_API_SECRET: 'abcd',
    CLOUDINARY_FOLDER: 'geological-kingdom',
  });
  cloudinary = await import('../src/services/storage/cloudinary.js');
});

describe('cloudinary storage', () => {
  it('matches the signature from Cloudinary’s documentation example', () => {
    const signature = cloudinary.sign({ eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop', public_id: 'sample_image', timestamp: 1315060510 });
    assert.equal(signature, 'bfd09f95f331f558cbd1320e67aa8d488770583e');
  });

  it('signs uploads into the store folder with a verifiable signature', () => {
    const { provider, uploadUrl, fields } = cloudinary.signUpload('products', { maxBytes: 1 });
    assert.equal(provider, 'cloudinary');
    assert.equal(uploadUrl, 'https://api.cloudinary.com/v1_1/demo/image/upload');
    assert.equal(fields.folder, 'geological-kingdom/products');
    assert.equal(fields.api_key, '123456');

    const { api_key: _key, signature, ...signed } = fields;
    assert.equal(signature, cloudinary.sign(signed));
    assert.ok(!('api_secret' in fields));
  });

  it('only recognises assets in this store’s folder on this cloud', () => {
    const own = { url: 'https://res.cloudinary.com/demo/image/upload/v1/geological-kingdom/products/abc.jpg', publicId: 'geological-kingdom/products/abc' };
    assert.equal(cloudinary.isOwnedAsset(own), true);
    assert.equal(cloudinary.isOwnedAsset({ ...own, publicId: 'someone-else/abc' }), false);
    assert.equal(cloudinary.isOwnedAsset({ ...own, url: own.url.replace('/demo/', '/other/') }), false);
    assert.equal(cloudinary.isOwnedAsset({ ...own, publicId: 'geological-kingdom/../abc' }), false);
    assert.equal(cloudinary.isOwnedAsset({ url: 'https://evil.example/geological-kingdom/products/abc.jpg', publicId: own.publicId }), false);
  });
});
