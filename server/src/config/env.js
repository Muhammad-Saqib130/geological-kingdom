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
  // Defaults to RENDER_EXTERNAL_URL on Render, otherwise the Vite dev server
  CLIENT_ORIGIN: z.string().optional(),
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
  // Optional API host override, e.g. http://localhost:12111 for stripe-mock in development
  STRIPE_API_BASE: z.string().url().optional(),
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
  // Fill an empty database with the sample catalog and create the admin on startup
  SEED_ON_START: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  // Allow local upload storage in production. Files vanish whenever the host restarts or
  // redeploys (Render free plan), so use this for a preview only, never for real orders.
  ALLOW_LOCAL_UPLOADS: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  // Serve the built client (client/dist) from Express. Defaults to on in production.
  SERVE_CLIENT: z.enum(['true', 'false']).optional(),
  // Set by Render to the service's public URL; used when CLIENT_ORIGIN is not set
  RENDER_EXTERNAL_URL: z.string().url().optional(),
});

const CLOUDINARY_KEYS = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];

const parsed = schema
  .refine((e) => [0, 3].includes(CLOUDINARY_KEYS.filter((k) => e[k]).length), {
    message: `Set all of ${CLOUDINARY_KEYS.join(', ')}, or none of them`,
    path: ['CLOUDINARY_CLOUD_NAME'],
  })
  // Local upload storage is lost on redeploy on most hosts, so production must use Cloudinary.
  .refine((e) => e.NODE_ENV !== 'production' || e.CLOUDINARY_CLOUD_NAME || e.ALLOW_LOCAL_UPLOADS, {
    message: 'Cloudinary is required in production (or set ALLOW_LOCAL_UPLOADS=true for a preview)',
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

const data = parsed.data;
const clientOrigin = data.CLIENT_ORIGIN || data.RENDER_EXTERNAL_URL || 'http://localhost:5173';
const clientOrigins = clientOrigin.split(',').map((o) => o.trim().replace(/\/$/, ''));

export const env = {
  ...data,
  CLIENT_ORIGIN: clientOrigin,
  clientOrigins,
  isProd: data.NODE_ENV === 'production',
  cloudinaryEnabled: Boolean(data.CLOUDINARY_CLOUD_NAME),
  stripeEnabled: Boolean(data.STRIPE_SECRET_KEY),
  clientUrl: (data.CLIENT_URL ?? clientOrigins[0]).replace(/\/$/, ''),
  serveClient: data.SERVE_CLIENT ? data.SERVE_CLIENT === 'true' : data.NODE_ENV === 'production',
};
