import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import {
  getHome,
  listTestimonials,
  quoteBody,
  quoteCart,
  subscribe,
  subscribeBody,
} from '../controllers/storefrontController.js';
import { validate } from '../middleware/validate.js';

const router = Router();

const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many sign-ups from this network. Please try again later.' },
});

router.get('/home', getHome);
router.get('/testimonials', listTestimonials);
router.post('/newsletter', newsletterLimiter, validate(subscribeBody), subscribe);
router.post('/cart/quote', validate(quoteBody), quoteCart);

export default router;
