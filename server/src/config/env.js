import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

// Always load server/.env, whatever directory the process was started from.
// Variables already set in the environment (e.g. by the host in production) take precedence.
// Tests set their own environment and must not pick up a developer's local settings.
if (process.env.NODE_ENV !== 'test') {
  dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  // 'lax' when client and API share a site (recommended); 'none' only for cross-site deploys (requires HTTPS)
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  // Max login attempts per email+IP in 15 minutes
  LOGIN_RATE_LIMIT: z.coerce.number().int().min(1).default(10),
  // All auth requests (login + register) per IP in 15 minutes
  AUTH_IP_RATE_LIMIT: z.coerce.number().int().min(1).default(100),
  // New accounts per IP per hour
  REGISTER_RATE_LIMIT: z.coerce.number().int().min(1).default(20),
  // Image storage. All three set = Cloudinary; none set = local files (development only).
  CLOUDINARY_CLOUD_NAME: z.string().trim().optional(),
  CLOUDINARY_API_KEY: z.string().trim().optional(),
  CLOUDINARY_API_SECRET: z.string().trim().optional(),
  CLOUDINARY_FOLDER: z.string().trim().regex(/^[a-z0-9_-]+$/i).default('geological-kingdom'),
  // Where local (non-Cloudinary) uploads are written. Defaults to server/uploads.
  LOCAL_UPLOAD_DIR: z.string().optional(),
  // Public URL of the storefront, used in emails and payment redirects (defaults to the first CLIENT_ORIGIN)
  CLIENT_URL: z.string().url().optional(),
  // Stripe (card payments). Card checkout is offered only when the secret key is set.
  STRIPE_SECRET_KEY: z.string().trim().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().trim().optional(),
  // Email. Without SMTP_HOST, emails are written as .eml files to MAIL_OUTBOX_DIR (development).
  SMTP_HOST: z.string().trim().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.enum(['true', 'false']).default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('Geological Kingdom <orders@geologicalkingdom.example>'),
  MAIL_OUTBOX_DIR: z.string().optional(),
  // New orders per IP per hour
  ORDER_RATE_LIMIT: z.coerce.number().int().min(1).default(20),
  // Seed-only: initial admin account (see `npm run seed`)
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_NAME: z.string().default('Store Admin'),
  DEFAULT_PKR_PER_USD: z.coerce.number().positive().default(280),
});

const CLOUDINARY_KEYS = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];

const parsed = schema
  .refine((e) => [0, 3].includes(CLOUDINARY_KEYS.filter((k) => e[k]).length), {
    message: `Set all of ${CLOUDINARY_KEYS.join(', ')}, or none of them`,
    path: ['CLOUDINARY_CLOUD_NAME'],
  })
  // Local upload storage is lost on redeploy on most hosts, so production must use Cloudinary.
  .refine((e) => e.NODE_ENV !== 'production' || e.CLOUDINARY_CLOUD_NAME, {
    message: 'Cloudinary is required in production',
    path: ['CLOUDINARY_CLOUD_NAME'],
  })
  .safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('Copy server/.env.example to server/.env and fill in the values.');
  process.exit(1);
}

export const env = {
  ...parsed.data,
  clientOrigins: parsed.data.CLIENT_ORIGIN.split(',').map((o) => o.trim()),
  isProd: parsed.data.NODE_ENV === 'production',
  cloudinaryEnabled: Boolean(parsed.data.CLOUDINARY_CLOUD_NAME),
  stripeEnabled: Boolean(parsed.data.STRIPE_SECRET_KEY),
  clientUrl: (parsed.data.CLIENT_URL ?? parsed.data.CLIENT_ORIGIN.split(',')[0].trim()).replace(/\/$/, ''),
};
