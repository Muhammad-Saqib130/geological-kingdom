// Seeds sample categories, products and the default exchange rate.
// Usage: npm run seed            upsert (safe to re-run)
//        npm run seed -- --fresh  delete all categories and products first 
import { connectDB, disconnectDB } from '../config/db.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { Settings } from '../models/Settings.js';
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

await connectDB();
try {
  if (process.argv.includes('--fresh')) {
    await Promise.all([Product.deleteMany({}), Category.deleteMany({})]);
    console.log('Removed existing categories and products');
  }
  await seedCatalog();
  const settings = await Settings.get();
  console.log(`Exchange rate: ${settings.pkrPerUsd} PKR/USD`);
} catch (err) {
  console.error(`Seed failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
