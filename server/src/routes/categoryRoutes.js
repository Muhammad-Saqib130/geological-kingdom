import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { getCategoryBySlug, listCategories } from '../controllers/categoryController.js';
import { slugParams } from '../controllers/productController.js';

const router = Router();

router.get('/', listCategories);
router.get('/:slug', validate(slugParams, 'params'), getCategoryBySlug);

export default router;
