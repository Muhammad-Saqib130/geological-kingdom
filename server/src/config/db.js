import mongoose from 'mongoose';
import { env } from './env.js';

const STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

export const dbState = () => STATES[mongoose.connection.readyState] ?? 'unknown';

// readyState can lag a dropped connection by up to one driver heartbeat (~10s),
// so health checks send a real ping with a short timeout.
export async function pingDB(timeoutMs = 2000) {
  if (mongoose.connection.readyState !== 1) return false;
  let timer;
  try {
    return await Promise.race([
      mongoose.connection.db.admin().ping().then(() => true),
      new Promise((resolve) => { timer = setTimeout(() => resolve(false), timeoutMs); }),
    ]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

let closing = false;

export async function connectDB() {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('disconnected', () => {
    if (!closing) console.warn('MongoDB disconnected');
  });
  mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));

  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });
  const { host, name } = mongoose.connection;
  console.log(`MongoDB connected: ${host}/${name}`);
}

export async function disconnectDB() {
  closing = true;
  await mongoose.disconnect();
}
