import { z } from 'zod';
import { storage } from '../services/storage/index.js';

// Only references to files uploaded through /api/admin/uploads are accepted.
export const imageRef = z
  .object({
    url: z.string().max(500),
    publicId: z.string().max(300),
    alt: z.string().trim().max(160).optional(),
    width: z.number().int().positive().max(50_000).optional(),
    height: z.number().int().positive().max(50_000).optional(),
  })
  .refine((img) => storage.isOwnedAsset(img), { message: 'Upload images through the admin panel' });

// An uploaded image or PDF (investigation reports)
export const fileRef = z
  .object({
    url: z.string().max(500),
    publicId: z.string().max(300),
    format: z.string().trim().toLowerCase().regex(/^[a-z0-9]{2,5}$/).optional(),
    bytes: z.number().int().nonnegative().optional(),
  })
  .refine((f) => storage.isOwnedAsset(f), { message: 'Upload the file through the admin panel' });
