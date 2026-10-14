import { z } from 'zod';
import { Gem } from '../models/Gem.js';
import { AppError } from '../utils/AppError.js';
import { escapeRegex } from '../utils/slugify.js';

const SORTS = {
  newest: { createdAt: -1 },
  'price-asc': { pricePKR: 1 },
  'price-desc': { pricePKR: -1 },
  'carat-desc': { carat: -1 },
};

const csv = z
  .string()
  .trim()
  .transform((s) => s.split(',').map((v) => v.trim()).filter(Boolean))
  .optional();

const num = z.coerce.number().nonnegative().optional();

export const listGemsQuery = z.object({
  q: z.string().trim().max(80).optional(),
  type: csv,
  origin: csv,
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

export async function listGems(req, res) {
  const { q, type, origin, minPrice, maxPrice, minCarat, maxCarat, featured, inStock, sort, page, limit } =
    req.validated.query;

  const filter = { isActive: true };
  if (type?.length) filter.type = { $in: type };
  if (origin?.length) filter.origin = { $in: origin };
  if (featured) filter.isFeatured = featured === 'true';
  if (inStock === 'true') filter.stock = { $gt: 0 };
  const price = range(minPrice, maxPrice);
  if (price) filter.pricePKR = price;
  const carat = range(minCarat, maxCarat);
  if (carat) filter.carat = carat;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ name: rx }, { type: rx }, { color: rx }, { origin: rx }];
  }

  const [items, total] = await Promise.all([
    Gem.find(filter).sort({ ...SORTS[sort], _id: -1 }).skip((page - 1) * limit).limit(limit),
    Gem.countDocuments(filter),
  ]);

  res.json({ items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
}

// Facets for the shop filter sidebar
export async function getGemFilters(_req, res) {
  const [types, origins, [bounds]] = await Promise.all([
    Gem.distinct('type', { isActive: true }),
    Gem.distinct('origin', { isActive: true }),
    Gem.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$pricePKR' },
          maxPrice: { $max: '$pricePKR' },
          minCarat: { $min: '$carat' },
          maxCarat: { $max: '$carat' },
        },
      },
    ]),
  ]);

  const { _id, ...rest } = bounds ?? { minPrice: 0, maxPrice: 0, minCarat: 0, maxCarat: 0 };
  res.json({ types: types.sort(), origins: origins.filter(Boolean).sort(), ...rest });
}

export const slugParams = z.object({ slug: z.string().trim().min(1).max(160) });

export async function getGemBySlug(req, res) {
  const gem = await Gem.findOne({ slug: req.validated.params.slug, isActive: true });
  if (!gem) throw new AppError(404, 'Gem not found');

  const related = await Gem.find({ isActive: true, type: gem.type, _id: { $ne: gem._id } })
    .sort({ createdAt: -1 })
    .limit(4);

  res.json({ gem, related });
}
