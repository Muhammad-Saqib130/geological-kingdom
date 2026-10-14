import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';

try {
  await connectDB();
} catch (err) {
  console.error(`Failed to connect to MongoDB: ${err.message}`);
  console.error('Check MONGODB_URI in server/.env and that your IP is allowed in Atlas Network Access.');
  process.exit(1);
}

const server = createApp().listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

server.on('error', (err) => {
  console.error(err.code === 'EADDRINUSE' ? `Port ${env.PORT} is already in use` : err);
  process.exit(1);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);
  server.close();
  await disconnectDB();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
