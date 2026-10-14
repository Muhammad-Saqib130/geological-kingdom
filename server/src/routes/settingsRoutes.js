import { Router } from 'express';
import { getCurrency, getStoreInfo } from '../controllers/settingsController.js';

const router = Router();

// Admin update (PUT /currency) is added together with auth.
router.get('/currency', getCurrency);
router.get('/store', getStoreInfo);

export default router;
