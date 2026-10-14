// Sample catalog and admin account, shared by `npm run seed` and the optional seed-on-start.
import { env } from '../config/env.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { Testimonial } from '../models/Testimonial.js';
import { User } from '../models/User.js';
import { categories, products, testimonials } from '../scripts/seedData.js';
import { slugify } from '../utils/slugify.js';
import { hashPassword } from './authService.js';

// Upserts the sample categories, products and testimonials (safe to re-run).
export async function seedCatalog() {
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
  // Sample testimonials are replaced wholesale; real ones (isSample: false) are never touched.
  await Testimonial.deleteMany({ isSample: true });
  await Testimonial.insertMany(testimonials.map((t) => ({ ...t, isSample: true })));

  console.log(`Categories: ${categories.length}, products: ${products.length}, sample testimonials: ${testimonials.length}`);
}

// Creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD. An existing account is promoted to admin,
// but its password is only replaced when resetPassword is true.
export async function seedAdmin({ resetPassword = false } = {}) {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn('Admin skipped: set ADMIN_EMAIL and ADMIN_PASSWORD to create one.');
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
  if (resetPassword) {
    existing.passwordHash = await hashPassword(ADMIN_PASSWORD);
    existing.tokenVersion += 1; // sign out old sessions
  }
  await existing.save();
  console.log(`Admin exists: ${email}${resetPassword ? ' (password reset)' : ''}`);
}

// SEED_ON_START: fills an empty database with the sample catalog and makes sure the admin exists,
// so a fresh deploy works without running `npm run seed` by hand. Never overwrites existing data.
export async function seedOnStart() {
  if (!env.SEED_ON_START) return;
  if ((await Category.estimatedDocumentCount()) === 0) {
    console.log('Empty database: adding the sample catalog');
    await seedCatalog();
  }
  await seedAdmin();
}
