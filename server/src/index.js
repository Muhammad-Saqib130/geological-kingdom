import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';

try {
  await connectDB();
} catch (err) {
  console.error('Failed to connect to MongoDB:', err.message);
  process.exit(1);
}

createApp().listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
