import { z } from 'zod';
import * as local from '../../services/storage/local.js';
import { MAX_UPLOAD_BYTES, UPLOAD_FOLDERS, storage } from '../../services/storage/index.js';
import { AppError } from '../../utils/AppError.js';

// Customers upload payment proofs through their order's own endpoints, not here.
const ADMIN_FOLDERS = UPLOAD_FOLDERS.filter((f) => f !== 'payment-proofs');
export const signBody = z.object({ folder: z.enum(ADMIN_FOLDERS) });
export const localQuery = z.object({ folder: z.enum(ADMIN_FOLDERS) });

// Returns what the browser needs to upload one file directly to storage.
export function signUpload(req, res) {
  res.set('Cache-Control', 'no-store');
  res.json(storage.signUpload(req.validated.body.folder, { maxBytes: MAX_UPLOAD_BYTES }));
}

// Development fallback: receives the raw file bytes (body parsed by express.raw).
export async function uploadLocal(req, res) {
  if (storage.name !== 'local') throw new AppError(404, 'Not found');
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new AppError(400, 'No file received');

  const saved = await local.save(req.validated.query.folder, req.body);
  if (!saved) throw new AppError(415, 'Unsupported file type. Use JPG, PNG, WebP, GIF or AVIF.');
  res.status(201).json(saved);
}
