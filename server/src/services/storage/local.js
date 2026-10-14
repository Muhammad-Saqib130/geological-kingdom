// Development-only storage: files in server/uploads, served at /uploads.
import { randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../../config/env.js';

export const name = 'local';
export const UPLOAD_DIR = env.LOCAL_UPLOAD_DIR
  ? path.resolve(env.LOCAL_UPLOAD_DIR)
  : fileURLToPath(new URL('../../../uploads', import.meta.url));
const ACCEPT = ['jpg', 'png', 'webp', 'gif', 'avif'];
const ID_PATTERN = /^local\/(products|certificates|banners|payment-proofs|investigations|investigation-reports)\/[a-f0-9]{32}\.(jpg|png|webp|gif|avif|pdf)$/;

export function signUpload(folder, { maxBytes, documents = false }) {
  return {
    provider: name,
    // Same-origin endpoint guarded by the admin session cookie; no signature needed.
    uploadUrl: `/api/admin/uploads/local?folder=${folder}`,
    fields: {},
    maxBytes,
    accept: documents ? [...ACCEPT, 'pdf'] : ACCEPT,
  };
}

// Identify the format from the file's first bytes; never trust the Content-Type header.
export function sniffImage(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buf.toString('ascii', 0, 4) === 'GIF8') return 'gif';
  if (buf.toString('ascii', 4, 12) === 'ftypavif') return 'avif';
  return null;
}

export async function save(folder, buf, { documents = false } = {}) {
  const ext = sniffImage(buf) ?? (documents && buf.toString('ascii', 0, 5) === '%PDF-' ? 'pdf' : null);
  if (!ext) return null;
  const file = `${randomBytes(16).toString('hex')}.${ext}`;
  await mkdir(path.join(UPLOAD_DIR, folder), { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, folder, file), buf);
  return { url: `/uploads/${folder}/${file}`, publicId: `local/${folder}/${file}`, format: ext, bytes: buf.length };
}

export function isOwnedAsset({ url, publicId }) {
  return typeof publicId === 'string' && ID_PATTERN.test(publicId) && url === `/uploads/${publicId.slice('local/'.length)}`;
}

export async function destroy(publicId) {
  if (!ID_PATTERN.test(publicId)) throw new Error(`Refusing to delete ${publicId}`);
  await unlink(path.join(UPLOAD_DIR, publicId.slice('local/'.length))).catch((err) => {
    if (err.code !== 'ENOENT') throw err;
  });
}
