import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './config/env.js';
import { authenticate } from './middleware/auth.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';
import { storage } from './services/storage/index.js';
import { UPLOAD_DIR } from './services/storage/local.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // Trust the first proxy (Render/Railway/Nginx) so req.ip and secure cookies work in production
  if (env.isProd) app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.clientOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(authenticate);

  app.use('/api', apiRoutes);

  // Development image storage (production always uses Cloudinary; see config/env.js)
  if (storage.name === 'local') {
    app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '1d', immutable: true, index: false }));
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
