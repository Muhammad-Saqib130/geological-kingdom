import { createHash } from 'node:crypto';
import { env } from '../../config/env.js';

export const name = 'cloudinary';
const ACCEPT = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'heic', 'heif'];

const api = (path) => `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/${path}`;

// https://cloudinary.com/documentation/authentication_signatures
export function sign(params) {
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return createHash('sha1').update(toSign + env.CLOUDINARY_API_SECRET).digest('hex');
}

export function signUpload(folder, { maxBytes }) {
  const params = {
    allowed_formats: ACCEPT.join(','),
    folder: `${env.CLOUDINARY_FOLDER}/${folder}`,
    timestamp: Math.floor(Date.now() / 1000),
  };
  return {
    provider: name,
    uploadUrl: api('upload'),
    fields: { ...params, api_key: env.CLOUDINARY_API_KEY, signature: sign(params) },
    maxBytes,
    accept: ACCEPT,
  };
}

const deliveryPrefix = () => `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/`;

// Only accept assets in this store's folder on this cloud, so a crafted publicId
// can never be used to delete someone else's files.
export function isOwnedAsset({ url, publicId }) {
  return (
    typeof url === 'string' &&
    typeof publicId === 'string' &&
    publicId.startsWith(`${env.CLOUDINARY_FOLDER}/`) &&
    !publicId.includes('..') &&
    url.startsWith(deliveryPrefix()) &&
    url.includes(`/${publicId}.`)
  );
}

export async function destroy(publicId) {
  const params = { public_id: publicId, timestamp: Math.floor(Date.now() / 1000) };
  const body = new URLSearchParams({ ...params, api_key: env.CLOUDINARY_API_KEY, signature: sign(params) });
  const res = await fetch(api('destroy'), { method: 'POST', body, signal: AbortSignal.timeout(10_000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !['ok', 'not found'].includes(data.result)) {
    throw new Error(`Cloudinary destroy ${publicId}: ${data.error?.message ?? data.result ?? res.status}`);
  }
}
