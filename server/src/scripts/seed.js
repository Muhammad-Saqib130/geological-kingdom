// Seeds sample categories, products, the default exchange rate and the admin user.
// Usage: npm run seed            upsert (safe to re-run)
//        npm run seed -- --fresh  delete all categories and products first (users are kept)
import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { Settings } from '../models/Settings.js';
import { User } from '../models/User.js';
import { hashPassword } from '../services/authService.js';
import { slugify } from '../utils/slugify.js';
import { categories, products } from './seedData.js';

async function seedCatalog() {
  const ids = new Map();
  for (const c of categories) {
    const doc = (await Category.findOne({ slug: slugify(c.name) })) ?? new Category();
    doc.set(c);
    await doc.save();
    ids.set(c.name, doc._id);
  }

  for (const { category, ...p } of products) {
    const doc = (await Product.findOne({ sku: p.sku })) ?? new Product();
    doc.set({ ...p, category: ids.get(category) });
    await doc.save();
  }
  console.log(`Categories: ${categories.length}, products: ${products.length}`);
}

// Creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD. An existing account is promoted to admin,
// but its password is only replaced when --reset-admin-password is passed.
async function seedAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn('Admin skipped: set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env to create one.');
    return;
  }
  if (ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');

  const email = ADMIN_EMAIL.trim().toLowerCase();
  const existing = await User.findOne({ email }).select('+tokenVersion');

  if (!existing) {
    await User.create({ name: ADMIN_NAME, email, role: 'admin', passwordHash: await hashPassword(ADMIN_PASSWORD) });
    console.log(`Admin created: ${email}`);
    return;
  }

  existing.role = 'admin';
  if (process.argv.includes('--reset-admin-password')) {
    existing.passwordHash = await hashPassword(ADMIN_PASSWORD);
    existing.tokenVersion += 1; // sign out old sessions
  }
  await existing.save();
  console.log(`Admin exists: ${email}${process.argv.includes('--reset-admin-password') ? ' (password reset)' : ''}`);
}

await connectDB();
try {
  if (process.argv.includes('--fresh')) {
    await Promise.all([Product.deleteMany({}), Category.deleteMany({})]);
    console.log('Removed existing categories and products');
  }
  await seedCatalog();
  const settings = await Settings.get();
  console.log(`Exchange rate: ${settings.pkrPerUsd} PKR/USD`);
  await seedAdmin();
} catch (err) {
  console.error(`Seed failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
