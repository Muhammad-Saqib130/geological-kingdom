import { Router } from 'express';
import { dbState, pingDB } from '../config/db.js';
import adminRoutes from './admin/index.js';
import authRoutes from './authRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import productRoutes from './productRoutes.js';
import orderRoutes from './orderRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import storefrontRoutes from './storefrontRoutes.js';

const router = Router();

router.get('/health', async (_req, res) => {
  const ok = await pingDB();
  res.set('Cache-Control', 'no-store');
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'degraded',
    db: ok ? 'connected' : dbState() === 'connected' ? 'unreachable' : dbState(),
    uptime: Math.round(process.uptime()),
  });
});
router.use('/admin', adminRoutes);
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/settings', settingsRoutes);
router.use('/', storefrontRoutes);
router.use('/', orderRoutes);

export default router;
