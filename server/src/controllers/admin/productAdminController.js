import mongoose from 'mongoose';
import { z } from 'zod';
import { Category } from '../../models/Category.js';
import { MAX_PRODUCT_IMAGES, PRODUCT_SHAPES, PRODUCT_TREATMENTS, Product, SLUG_PATTERN } from '../../models/Product.js';
import { destroyAssets } from '../../services/storage/index.js';
import { AppError } from '../../utils/AppError.js';
import { escapeRegex } from '../../utils/slugify.js';
import { imageRef } from '../../validators/image.js';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const text = (max) => z.string().trim().max(max);

const fields = {
  name: text(120).min(2, 'Name is required'),
  // Empty string = generate from the name
  slug: z.union([z.literal(''), z.string().trim().toLowerCase().max(140).regex(SLUG_PATTERN, 'Use lowercase letters, numbers and hyphens')]),
  category: objectId,
  sku: z.union([z.literal(''), z.string().trim().toUpperCase().max(40).regex(/^[A-Z0-9-]+$/, 'Use letters, numbers and hyphens')]),
  description: text(5000),
  carat: z.number({ error: 'Carat weight is required' }).positive('Carat must be greater than 0').max(10_000),
  dimensionsMm: text(60),
  color: text(60),
  colorHex: z.union([z.literal(''), z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #1f7a4d')]),
  clarity: text(60),
  shape: z.enum(PRODUCT_SHAPES),
  origin: text(100),
  treatment: z.enum(PRODUCT_TREATMENTS),
  certificate: z.object({
    lab: text(80).optional(),
    number: text(80).optional(),
    image: imageRef.nullable().optional(),
  }),
  pricePKR: z.number({ error: 'Price is required' }).int('Price must be whole rupees').min(0).max(1_000_000_000),
  stock: z.number().int().min(0).max(10_000),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
  images: z.array(imageRef).max(MAX_PRODUCT_IMAGES, `At most ${MAX_PRODUCT_IMAGES} images`),
};

const base = z.object(fields);
export const createProductBody = base.partial().required({ name: true, category: true, carat: true, pricePKR: true });
export const updateProductBody = base.partial().refine((b) => Object.keys(b).length > 0, 'Nothing to update');
export const idParams = z.object({ id: objectId });

const SORTS = {
  newest: { createdAt: -1 },
  updated: { updatedAt: -1 },
  name: { name: 1 },
  'price-asc': { pricePKR: 1 },
  'price-desc': { pricePKR: -1 },
  'stock-asc': { stock: 1 },
};

export const listQuery = z.object({
  q: z.string().trim().max(80).optional(),
  category: objectId.optional(),
  status: z.enum(['all', 'active', 'archived']).default('all'),
  featured: z.enum(['true', 'false']).optional(),
  stock: z.enum(['in', 'out']).optional(),
  sort: z.enum(Object.keys(SORTS)).default('updated'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const populateCategory = (query) => query.populate('category', 'name slug');

// Every stored file a product references (gallery + certificate scan).
const assetIds = (p) => [...(p.images ?? []).map((i) => i.publicId), p.certificate?.image?.publicId].filter(Boolean);

async function assertCategoryExists(id) {
  if (id && !(await Category.exists({ _id: id }))) {
    throw new AppError(400, 'Validation failed', [{ path: 'category', message: 'Category not found' }]);
  }
}

async function assertSlugFree(slug, excludeId) {
  if (slug && (await Product.exists({ slug, ...(excludeId && { _id: { $ne: excludeId } }) }))) {
    throw new AppError(409, 'This slug is already in use', [{ path: 'slug', message: 'This slug is already in use' }]);
  }
}

async function assertSkuFree(sku, excludeId) {
  if (sku && (await Product.exists({ sku: sku.toUpperCase(), ...(excludeId && { _id: { $ne: excludeId } }) }))) {
    throw new AppError(409, 'This SKU is already in use', [{ path: 'sku', message: 'This SKU is already in use' }]);
  }
}

// Orders do not exist yet; this keeps the "never hard-delete a sold product" rule
// enforced as soon as an `orders` collection with items[].product appears.
async function hasOrders(productId) {
  const { db } = mongoose.connection;
  if (!(await db.listCollections({ name: 'orders' }, { nameOnly: true }).hasNext())) return false;
  return Boolean(await db.collection('orders').findOne({ 'items.product': productId }, { projection: { _id: 1 } }));
}

// Normalises empty form values: '' clears optional fields; empty sku is removed (sparse unique index).
function applyBody(product, body) {
  const { sku, slug, certificate, ...rest } = body;
  product.set(rest);
  if (sku !== undefined) product.sku = sku || undefined;
  if (slug !== undefined) product.slug = slug || undefined; // undefined -> regenerated in pre('validate')
  if (certificate !== undefined) {
    product.certificate = {
      lab: certificate.lab ?? product.certificate?.lab,
      number: certificate.number ?? product.certificate?.number,
      image: certificate.image === undefined ? product.certificate?.image : certificate.image ?? undefined,
    };
  }
}

export async function listProducts(req, res) {
  const { q, category, status, featured, stock, sort, page, limit } = req.validated.query;

  const filter = {};
  if (status !== 'all') filter.isActive = status === 'active';
  if (category) filter.category = category;
  if (featured) filter.isFeatured = featured === 'true';
  if (stock) filter.stock = stock === 'in' ? { $gt: 0 } : 0;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { sku: rx }, { origin: rx }, { slug: rx }];
  }

  const [items, total, active, archived] = await Promise.all([
    populateCategory(Product.find(filter))
      .sort({ ...SORTS[sort], _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: false }),
  ]);

  res.json({ items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)), counts: { active, archived } });
}

export async function getProduct(req, res) {
  const product = await populateCategory(Product.findById(req.validated.params.id));
  if (!product) throw new AppError(404, 'Product not found');
  res.json({ product });
}

export async function createProduct(req, res) {
  const body = req.validated.body;
  await assertCategoryExists(body.category);
  await assertSlugFree(body.slug);
  await assertSkuFree(body.sku);

  const product = new Product();
  applyBody(product, body);
  await product.save();
  await product.populate('category', 'name slug');
  res.status(201).json({ product });
}

export async function updateProduct(req, res) {
  const { id } = req.validated.params;
  const body = req.validated.body;

  const product = await Product.findById(id);
  if (!product) throw new AppError(404, 'Product not found');
  await assertCategoryExists(body.category);
  await assertSlugFree(body.slug, id);
  await assertSkuFree(body.sku, id);

  const before = assetIds(product);
  applyBody(product, body);
  await product.save();

  // Remove files that are no longer referenced, only after the save succeeded.
  const after = new Set(assetIds(product));
  await destroyAssets(before.filter((pid) => !after.has(pid)));

  await product.populate('category', 'name slug');
  res.json({ product });
}

export async function deleteProduct(req, res) {
  const product = await Product.findById(req.validated.params.id);
  if (!product) throw new AppError(404, 'Product not found');
  if (await hasOrders(product._id)) {
    throw new AppError(409, 'This product has orders, so it cannot be deleted. Archive it instead.');
  }

  await product.deleteOne();
  await destroyAssets(assetIds(product));
  res.status(204).end();
}

// Lightweight list for the product form's category dropdown (includes inactive categories).
export async function listCategoryOptions(_req, res) {
  const items = await Category.find().sort({ sortOrder: 1, name: 1 }).select('name slug isActive');
  res.json({ items });
}
