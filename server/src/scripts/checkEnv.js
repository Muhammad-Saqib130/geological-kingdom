// Runs before `npm run dev`: fail early with a clear message when server/.env is missing.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

if (!existsSync(fileURLToPath(new URL('../../.env', import.meta.url)))) {
  console.error('Missing server/.env. Copy server/.env.example to server/.env and fill in MONGODB_URI.');
  process.exit(1);
}
