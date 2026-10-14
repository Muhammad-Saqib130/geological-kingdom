import express, { Router } from 'express';
import {
  createProduct,
  createProductBody,
  deleteProduct,
  getProduct,
  idParams,
  listCategoryOptions,
  listProducts,
  listQuery,
  updateProduct,
  updateProductBody,
} from '../../controllers/admin/productAdminController.js';
import { localQuery, signBody, signUpload, uploadLocal } from '../../controllers/admin/uploadController.js';
import { requireAdmin } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { MAX_UPLOAD_BYTES } from '../../services/storage/index.js';

const router = Router();

// Everything under /api/admin requires an admin session.
router.use(requireAdmin);
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/products', validate(listQuery, 'query'), listProducts);
router.post('/products', validate(createProductBody), createProduct);
router.get('/products/:id', validate(idParams, 'params'), getProduct);
router.patch('/products/:id', validate(idParams, 'params'), validate(updateProductBody), updateProduct);
router.delete('/products/:id', validate(idParams, 'params'), deleteProduct);

router.get('/categories', listCategoryOptions);

router.post('/uploads/sign', validate(signBody), signUpload);
router.post(
  '/uploads/local',
  validate(localQuery, 'query'),
  express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }),
  uploadLocal,
);

export default router;
