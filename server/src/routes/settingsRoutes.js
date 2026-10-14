import { Router } from 'express';
import { getCurrency } from '../controllers/settingsController.js';

const router = Router();

// Admin update (PUT /currency) is added together with auth.
router.get('/currency', getCurrency);

export default router;
