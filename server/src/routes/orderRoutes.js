import express, { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import {
  cancelByCustomer,
  checkoutSettings,
  createOrderBody,
  getOrder,
  myOrders,
  orderParams,
  placeOrder,
  proofBody,
  quote,
  quoteBody,
  retryCardPayment,
  signProofUpload,
  submitProof,
  uploadProofLocal,
} from '../controllers/orderController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { MAX_UPLOAD_BYTES } from '../services/storage/index.js';

const router = Router();

const limiter = (limit, message) =>
  rateLimit({ windowMs: 60 * 60 * 1000, limit, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: message } });
const orderLimiter = limiter(env.ORDER_RATE_LIMIT, 'Too many orders from this network. Please try again later.');
const proofLimiter = limiter(30, 'Too many uploads. Please try again later.');

const withOrder = validate(orderParams, 'params');

router.get('/settings/checkout', checkoutSettings);
router.post('/checkout/quote', validate(quoteBody), quote);
router.post('/orders', orderLimiter, validate(createOrderBody), placeOrder);
router.get('/me/orders', requireAuth, myOrders);
router.get('/orders/:number', withOrder, getOrder);
router.post('/orders/:number/cancel', withOrder, cancelByCustomer);
router.post('/orders/:number/pay', withOrder, retryCardPayment);
router.post('/orders/:number/proof/sign', proofLimiter, withOrder, signProofUpload);
router.post(
  '/orders/:number/proof/local',
  proofLimiter,
  withOrder,
  express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }),
  uploadProofLocal,
);
router.post('/orders/:number/proof', proofLimiter, withOrder, validate(proofBody), submitProof);

export default router;
