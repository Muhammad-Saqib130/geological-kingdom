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
import {
  approveProof,
  getOrder,
  getStoreSettings,
  listOrders,
  listQuery as orderListQuery,
  orderParams,
  rejectBody,
  rejectProof,
  statusBody,
  storeSettingsBody,
  updateStatus,
  updateStoreSettings,
} from '../../controllers/admin/orderAdminController.js';
import { getHomepage, homepageBody, updateHomepage } from '../../controllers/admin/settingsAdminController.js';
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

router.get('/settings/homepage', getHomepage);
router.put('/settings/homepage', validate(homepageBody), updateHomepage);
router.get('/settings/store', getStoreSettings);
router.put('/settings/store', validate(storeSettingsBody), updateStoreSettings);

const withOrder = validate(orderParams, 'params');
router.get('/orders', validate(orderListQuery, 'query'), listOrders);
router.get('/orders/:number', withOrder, getOrder);
router.patch('/orders/:number/status', withOrder, validate(statusBody), updateStatus);
router.post('/orders/:number/payment/approve', withOrder, approveProof);
router.post('/orders/:number/payment/reject', withOrder, validate(rejectBody), rejectProof);

router.post('/uploads/sign', validate(signBody), signUpload);
router.post(
  '/uploads/local',
  validate(localQuery, 'query'),
  express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }),
  uploadLocal,
);

export default router;
