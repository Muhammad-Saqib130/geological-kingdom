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
