import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './config/env.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // Trust the first proxy (Render/Railway/Nginx) so req.ip and secure cookies work in production
  if (env.isProd) app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.clientOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use('/api', apiRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
