import { z } from 'zod';
import * as local from '../../services/storage/local.js';
import { DOCUMENT_FOLDERS, MAX_UPLOAD_BYTES, UPLOAD_FOLDERS, storage } from '../../services/storage/index.js';
import { AppError } from '../../utils/AppError.js';

// Customer uploads (payment proofs, investigation photos) go through their own endpoints, not here.
const ADMIN_FOLDERS = UPLOAD_FOLDERS.filter((f) => !['payment-proofs', 'investigations'].includes(f));
export const signBody = z.object({ folder: z.enum(ADMIN_FOLDERS) });
export const localQuery = z.object({ folder: z.enum(ADMIN_FOLDERS) });

// Returns what the browser needs to upload one file directly to storage.
export function signUpload(req, res) {
  res.set('Cache-Control', 'no-store');
  const { folder } = req.validated.body;
  res.json(storage.signUpload(folder, { maxBytes: MAX_UPLOAD_BYTES, documents: DOCUMENT_FOLDERS.includes(folder) }));
}

// Development fallback: receives the raw file bytes (body parsed by express.raw).
export async function uploadLocal(req, res) {
  if (storage.name !== 'local') throw new AppError(404, 'Not found');
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new AppError(400, 'No file received');

  const { folder } = req.validated.query;
  const documents = DOCUMENT_FOLDERS.includes(folder);
  const saved = await local.save(folder, req.body, { documents });
  if (!saved) throw new AppError(415, `Unsupported file type. Use JPG, PNG, WebP, GIF${documents ? ', AVIF or PDF' : ' or AVIF'}.`);
  res.status(201).json(saved);
}
