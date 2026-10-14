import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  getProductBySlug,
  getProductFilters,
  listProducts,
  listProductsQuery,
  slugParams,
} from '../controllers/productController.js';

const router = Router();

router.get('/', validate(listProductsQuery, 'query'), listProducts);
router.get('/filters', getProductFilters);
router.get('/:slug', validate(slugParams, 'params'), getProductBySlug);

export default router;
