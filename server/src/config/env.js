import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

// Always load server/.env, whatever directory the process was started from.
// Variables already set in the environment (e.g. by the host in production) take precedence.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  DEFAULT_PKR_PER_USD: z.coerce.number().positive().default(280),
});

const parsed = schema.safeParse(process.env);

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
};
