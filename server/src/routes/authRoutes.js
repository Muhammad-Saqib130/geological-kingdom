import { Router } from 'express';
import { login, loginBody, logout, logoutAll, me, register, registerBody, session } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authIpLimiter, loginLimiter, registerLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post('/register', authIpLimiter, registerLimiter, validate(registerBody), register);
router.post('/login', authIpLimiter, loginLimiter, validate(loginBody), login);
router.post('/logout', logout);
router.post('/logout-all', requireAuth, logoutAll);
router.get('/me', requireAuth, me);
router.get('/session', session);

export default router;
