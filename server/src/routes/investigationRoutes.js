import express, { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { createBody, signUpload, submit, track, trackBody, uploadLocal } from '../controllers/investigationController.js';
import { validate } from '../middleware/validate.js';
import { MAX_UPLOAD_BYTES } from '../services/storage/index.js';

const router = Router();

const limiter = (windowMs, limit, message) =>
  rateLimit({ windowMs, limit, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: message } });
const HOUR = 60 * 60 * 1000;
const submitLimiter = limiter(HOUR, env.INVESTIGATION_RATE_LIMIT, 'Too many requests from this network. Please try again later.');
// Six files per request (five photos and a certificate), with room for retries
const uploadLimiter = limiter(HOUR, env.INVESTIGATION_RATE_LIMIT * 10, 'Too many uploads. Please try again later.');
const trackLimiter = limiter(15 * 60 * 1000, 30, 'Too many lookups. Please wait a few minutes and try again.');

router.post('/uploads/sign', uploadLimiter, signUpload);
router.post('/uploads/local', uploadLimiter, express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }), uploadLocal);
router.post('/', submitLimiter, validate(createBody), submit);
router.post('/track', trackLimiter, validate(trackBody), track);

export default router;
