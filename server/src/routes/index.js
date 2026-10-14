import { Router } from 'express';
import gemRoutes from './gemRoutes.js';
import settingsRoutes from './settingsRoutes.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok' }));
router.use('/gems', gemRoutes);
router.use('/settings', settingsRoutes);

export default router;
