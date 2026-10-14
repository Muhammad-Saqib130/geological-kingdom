import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './config/env.js';
import { stripeWebhook } from './controllers/webhookController.js';
import { authenticate } from './middleware/auth.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';
import { storage } from './services/storage/index.js';
import { UPLOAD_DIR } from './services/storage/local.js';

// The built storefront (npm run build), served by Express in production so the site and API share
// one origin: cookies stay first-party and no CORS setup is needed.
const CLIENT_DIST = fileURLToPath(new URL('../../client/dist', import.meta.url));

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // Trust the first proxy (Render/Railway/Nginx) so req.ip and secure cookies work in production
  if (env.isProd) app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        // blob: for upload previews; Cloudinary hosts product images in production
        'img-src': ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
        // Admin and payment-proof uploads go straight from the browser to Cloudinary
        'connect-src': ["'self'", 'https://api.cloudinary.com'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
      },
    },
  }));
  app.use(cors({ origin: env.clientOrigins, credentials: true }));
  // Stripe signs the raw body, so the webhook must be registered before the JSON parser
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json', limit: '1mb' }), stripeWebhook);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(authenticate);

  app.use('/api', apiRoutes);

  // Local image storage (development, or a production preview with ALLOW_LOCAL_UPLOADS)
  if (storage.name === 'local') {
    app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '1d', immutable: true, index: false }));
  }

  if (env.serveClient) {
    if (!existsSync(`${CLIENT_DIST}/index.html`)) {
      throw new Error('client/dist is missing. Run `npm run build` first, or set SERVE_CLIENT=false.');
    }
    // Hashed asset files never change; index.html must be re-checked so new deploys show up
    app.use('/assets', express.static(`${CLIENT_DIST}/assets`, { maxAge: '1y', immutable: true }));
    app.use(express.static(CLIENT_DIST, { index: false, maxAge: '1h' }));
    // Client-side routes (/shop, /gems/ruby, …) all load the single-page app
    app.get(/^\/(?!api\/|api$|uploads\/|assets\/).*/, (req, res) => {
      res.set('Cache-Control', 'no-cache').sendFile(`${CLIENT_DIST}/index.html`);
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
