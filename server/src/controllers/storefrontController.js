import { z } from 'zod';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { Settings } from '../models/Settings.js';
import { Subscriber } from '../models/Subscriber.js';
import { Testimonial } from '../models/Testimonial.js';
import { homepageJSON } from './admin/settingsAdminController.js';

const populateCategory = (q) => q.populate('category', 'name slug');

// Top origins for the "Shop by origin" grid, with a count, a tint and a sample photo.
// Computed in JS: a boutique catalogue is small, and this avoids aggregation operators
// that MongoDB-compatible dev servers may lack.
async function topOrigins(limit = 8) {
  const products = await Product.find({ isActive: true, origin: { $nin: [null, ''] } })
    .sort({ isFeatured: -1, createdAt: -1 })
    .select('origin colorHex images')
    .limit(1000)
    .lean();
  const byOrigin = new Map();
  for (const p of products) {
    const o = byOrigin.get(p.origin) ?? { name: p.origin, count: 0, colorHex: null, image: null };
    o.count += 1;
    if (!o.colorHex && p.colorHex) o.colorHex = p.colorHex;
    if (!o.image && p.images?.[0]) o.image = { url: p.images[0].url, alt: p.images[0].alt };
    byOrigin.set(p.origin, o);
  }
  return [...byOrigin.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, limit);
}

// Everything the home page needs, in one request.
export async function getHome(_req, res) {
  const active = { isActive: true };
  const [categories, featured, newArrivals, testimonials, origins, settings] = await Promise.all([
    Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }),
    populateCategory(Product.find({ ...active, isFeatured: true })).sort({ updatedAt: -1 }).limit(8),
    populateCategory(Product.find({ ...active, stock: { $gt: 0 } })).sort({ createdAt: -1 }).limit(8),
    Testimonial.find({ isPublished: true }).sort({ sortOrder: 1, createdAt: -1 }).limit(6),
    topOrigins(),
    Settings.get(),
  ]);

  res.set('Cache-Control', 'public, max-age=60');
  res.json({ categories, featured, newArrivals, testimonials, origins, homepage: homepageJSON(settings) });
}

export async function listTestimonials(_req, res) {
  const items = await Testimonial.find({ isPublished: true }).sort({ sortOrder: 1, createdAt: -1 }).limit(20);
  res.json({ items });
}

export const subscribeBody = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254)),
  source: z.string().trim().max(40).optional(),
});

// Same response whether or not the address was already subscribed (no list probing).
export async function subscribe(req, res) {
  const { email, source } = req.validated.body;
  await Subscriber.updateOne(
    { email },
    { $setOnInsert: { email, source: source ?? 'footer' }, $unset: { unsubscribedAt: 1 } },
    { upsert: true },
  ).catch((err) => {
    if (err?.code !== 11000) throw err; // two simultaneous sign-ups for one address
  });
  res.status(201).json({ message: "You're on the list. We'll write when new stones arrive." });
}

export const quoteBody = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid product'),
        qty: z.number().int().min(1).max(100),
      }),
    )
    .max(50),
});

// Re-prices a cart from the database. Prices, names and availability always come from here,
// never from the browser.
export async function quoteCart(req, res) {
  const { items } = req.validated.body;
  const products = await populateCategory(Product.find({ _id: { $in: items.map((i) => i.productId) } }));
  const byId = new Map(products.map((p) => [String(p._id), p]));

  let subtotalPKR = 0;
  const lines = items.map(({ productId, qty }) => {
    const p = byId.get(productId);
    if (!p || !p.isActive) return { productId, available: false, reason: 'no_longer_listed', qty: 0 };
    if (p.stock < 1) return { productId, available: false, reason: 'sold_out', qty: 0, ...snapshot(p) };

    const finalQty = Math.min(qty, p.stock);
    const lineTotalPKR = finalQty * p.pricePKR;
    subtotalPKR += lineTotalPKR;
    return { productId, available: true, qty: finalQty, adjusted: finalQty !== qty, lineTotalPKR, ...snapshot(p) };
  });

  res.json({ lines, subtotalPKR, currency: 'PKR' });
}

function snapshot(p) {
  return {
    slug: p.slug,
    name: p.name,
    category: p.category?.name,
    carat: p.carat,
    colorHex: p.colorHex,
    image: p.images[0] ? { url: p.images[0].url, alt: p.images[0].alt } : null,
    pricePKR: p.pricePKR,
    maxQty: p.stock,
  };
}
