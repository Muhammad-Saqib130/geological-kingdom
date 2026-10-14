import { z } from 'zod';
import { Category } from '../models/Category.js';
import { PRODUCT_TREATMENTS, Product } from '../models/Product.js';
import { AppError } from '../utils/AppError.js';
import { escapeRegex } from '../utils/slugify.js';

const SORTS = {
  newest: { createdAt: -1 },
  'price-asc': { pricePKR: 1 },
  'price-desc': { pricePKR: -1 },
  'carat-desc': { carat: -1 },
};

const CATEGORY_FIELDS = 'name slug';

// Multi-value filters: repeated params (?origin=a&origin=b) always work.
// Values that can never contain a comma (slugs, enum names) may also be comma-separated.
const multi = ({ commas }) =>
  z
    .union([z.string(), z.array(z.string())])
    .transform((v) =>
      (Array.isArray(v) ? v : [v])
        .flatMap((s) => (commas ? s.split(',') : [s]))
        .map((s) => s.trim())
        .filter(Boolean),
    )
    .optional();

const num = z.coerce.number().nonnegative().optional();

export const listProductsQuery = z.object({
  q: z.string().trim().max(80).optional(),
  category: multi({ commas: true }), // category slugs
  origin: multi({ commas: false }), // origins contain commas: "Swat, Pakistan"
  treatment: multi({ commas: true }).pipe(z.array(z.enum(PRODUCT_TREATMENTS)).optional()),
  minPrice: num, // PKR
  maxPrice: num, // PKR
  minCarat: num,
  maxCarat: num,
  featured: z.enum(['true', 'false']).optional(),
  inStock: z.enum(['true', 'false']).optional(),
  sort: z.enum(Object.keys(SORTS)).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

const range = (min, max) => {
  if (min === undefined && max === undefined) return undefined;
  return { ...(min !== undefined && { $gte: min }), ...(max !== undefined && { $lte: max }) };
};

export async function listProducts(req, res) {
  const { q, category, origin, treatment, minPrice, maxPrice, minCarat, maxCarat, featured, inStock, sort, page, limit } =
    req.validated.query;

  const filter = { isActive: true };
  if (category?.length) {
    const ids = await Category.find({ slug: { $in: category } }).distinct('_id');
    filter.category = { $in: ids };
  }
  if (origin?.length) filter.origin = { $in: origin };
  if (treatment?.length) filter.treatment = { $in: treatment };
  if (featured) filter.isFeatured = featured === 'true';
  if (inStock === 'true') filter.stock = { $gt: 0 };
  const price = range(minPrice, maxPrice);
  if (price) filter.pricePKR = price;
  const carat = range(minCarat, maxCarat);
  if (carat) filter.carat = carat;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    const categoryIds = await Category.find({ name: rx }).distinct('_id');
    filter.$or = [{ name: rx }, { color: rx }, { origin: rx }, { category: { $in: categoryIds } }];
  }

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate('category', CATEGORY_FIELDS)
      .sort({ ...SORTS[sort], _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({ items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
}

// Facets for the shop filter sidebar
export async function getProductFilters(_req, res) {
  const active = { isActive: true };
  const edge = (field, dir) => Product.findOne(active).sort({ [field]: dir }).select(field).lean();

  const [categoryIds, origins, treatments, cheapest, priciest, smallest, largest] = await Promise.all([
    Product.distinct('category', active),
    Product.distinct('origin', active),
    Product.distinct('treatment', active),
    edge('pricePKR', 1),
    edge('pricePKR', -1),
    edge('carat', 1),
    edge('carat', -1),
  ]);
  const categories = await Category.find({ _id: { $in: categoryIds }, isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .select(CATEGORY_FIELDS);

  res.json({
    categories,
    origins: origins.filter(Boolean).sort(),
    // Keep the canonical order (Natural first) rather than alphabetical
    treatments: PRODUCT_TREATMENTS.filter((t) => treatments.includes(t)),
    minPrice: cheapest?.pricePKR ?? 0,
    maxPrice: priciest?.pricePKR ?? 0,
    minCarat: smallest?.carat ?? 0,
    maxCarat: largest?.carat ?? 0,
  });
}

export const slugParams = z.object({ slug: z.string().trim().min(1).max(160) });

export async function getProductBySlug(req, res) {
  const product = await Product.findOne({ slug: req.validated.params.slug, isActive: true }).populate(
    'category',
    CATEGORY_FIELDS,
  );
  if (!product) throw new AppError(404, 'Product not found');

  const related = await Product.find({ isActive: true, category: product.category?._id, _id: { $ne: product._id } })
    .populate('category', CATEGORY_FIELDS)
    .sort({ createdAt: -1 })
    .limit(4);

  res.json({ product, related });
}
