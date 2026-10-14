import { Category } from '../models/Category.js';
import { AppError } from '../utils/AppError.js';

export async function listCategories(_req, res) {
  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
  res.json({ items: categories });
}

export async function getCategoryBySlug(req, res) {
  const category = await Category.findOne({ slug: req.validated.params.slug, isActive: true });
  if (!category) throw new AppError(404, 'Category not found');
  res.json({ category });
}
