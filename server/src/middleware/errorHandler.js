import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';

export function notFound(req, _res, next) {
  next(new AppError(404, `Not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  // Body parser errors (malformed JSON, payload too large) carry a safe 4xx status
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  if (err?.expose && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: `Invalid ${err.path}` });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ error: 'Validation failed', details: Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })) });
  }
  // Database unreachable (network drop, Atlas failover): temporary, so tell clients to retry
  if (['MongoNetworkError', 'MongoServerSelectionError', 'MongoNetworkTimeoutError'].includes(err?.name)) {
    console.error(`Database unavailable: ${err.message}`);
    return res.status(503).set('Retry-After', '10').json({ error: 'Service temporarily unavailable. Please try again shortly.' });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ error: 'Duplicate value', details: err.keyValue });
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error', ...(env.isProd ? {} : { message: err.message }) });
}
