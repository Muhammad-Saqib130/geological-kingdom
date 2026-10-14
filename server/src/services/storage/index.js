// Image storage facade. Uses Cloudinary when configured, otherwise local files (development only).
// Both providers expose the same interface:
//   signUpload(folder)          -> { provider, uploadUrl, fields, maxBytes, accept }
//   isOwnedAsset({url, publicId}) -> true only for files this store uploaded
//   destroy(publicId)           -> deletes the file (callers treat failures as non-fatal)
import { env } from '../../config/env.js';
import * as cloudinary from './cloudinary.js';
import * as local from './local.js';

export const UPLOAD_FOLDERS = ['products', 'certificates', 'banners', 'payment-proofs'];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // Cloudinary free plan limit for images

export const storage = env.cloudinaryEnabled ? cloudinary : local;

// Deletes files without failing the request; storage cleanup is best-effort.
export async function destroyAssets(publicIds) {
  const results = await Promise.allSettled(publicIds.filter(Boolean).map((id) => storage.destroy(id)));
  for (const r of results) {
    if (r.status === 'rejected') console.warn(`Could not delete asset: ${r.reason?.message ?? r.reason}`);
  }
}
