// Seeds sample categories, products, the default exchange rate and the admin user.
// Usage: npm run seed            upsert (safe to re-run)
//        npm run seed -- --fresh  delete all categories and products first (users are kept)
//        npm run seed -- --reset-admin-password  set the admin password from ADMIN_PASSWORD
import { connectDB, disconnectDB } from '../config/db.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { Settings } from '../models/Settings.js';
import { seedAdmin, seedCatalog } from '../services/seeding.js';

await connectDB();
try {
  if (process.argv.includes('--fresh')) {
    await Promise.all([Product.deleteMany({}), Category.deleteMany({})]);
    console.log('Removed existing categories and products');
  }
  await seedCatalog();
  const settings = await Settings.get();
  console.log(`Exchange rate: ${settings.pkrPerUsd} PKR/USD`);
  await seedAdmin({ resetPassword: process.argv.includes('--reset-admin-password') });
} catch (err) {
  console.error(`Seed failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
