import { Router } from 'express';
import { dbState, pingDB } from '../config/db.js';
import gemRoutes from './gemRoutes.js';
import settingsRoutes from './settingsRoutes.js';

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
router.use('/gems', gemRoutes);
router.use('/settings', settingsRoutes);

export default router;
