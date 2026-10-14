# Geological Kingdom — E-commerce for a gemstone business (Namak Mandi, Peshawar)

## Business
- Sells loose gemstones online, to Pakistan and internationally
- Extra service: "Gem Investigation" — customers who bought a gem elsewhere pay $10 to have it checked for authenticity. Requests are submitted via form; payment is arranged later via WhatsApp/contact.
- Currencies: PKR and USD (user can toggle; prices stored in PKR, USD derived from an admin-set exchange rate)

## Stack
- Frontend: React (Vite) + Tailwind CSS + React Router + Zustand (cart/currency state)
- Backend: Node.js + Express, MongoDB Atlas via Mongoose
- Auth: JWT in httpOnly cookies, bcrypt, roles: customer / admin
- Images: Cloudinary. Payments: Stripe + manual bank/JazzCash/Easypaisa (with proof upload) + COD
- Monorepo: /client and /server

## Conventions
- ES modules, async/await, no TypeScript
- Validate all input with Zod; centralized error handler; never trust client prices (recompute totals on server)
- Env vars in .env (never commit); keep a .env.example updated
- Small commits per feature; ask before adding new dependencies

## Design direction
- Luxury, elegant, minimal. Reference: docs/design/reference-jewellery.png (structure followed: top bar, centred-logo header + menu row, dark hero, icon tabs + 2x2 cards, dark promo banner, tall-card grid (by origin), grey trust band, featured cards with overlapping pill, split testimonial, newsletter band, light footer)
- Take inspiration only (layout rhythm, section ideas). Do NOT copy it. Use our own brand name, palette, copy and imagery.
- Palette: deep emerald green + warm gold accent + off-white. Serif headings (Cormorant Garamond), clean sans body (Inter)
- Mobile-first, accessible, fast

## Commands
Requires Node >= 22. First time: `npm run setup`, then copy `server/.env.example` -> `server/.env` (set MONGODB_URI) and `client/.env.example` -> `client/.env`.
- `npm run dev` (root) — starts API (http://localhost:5000) and site (http://localhost:5173) together; Ctrl+C stops both
- `npm run dev:server` / `npm run dev:client` — start one side only
- `npm run seed` — upsert 8 categories, 12 sample products, the exchange rate and the admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`
  (`npm run seed --prefix server -- --fresh` wipes categories/products first; `-- --reset-admin-password` re-applies the env password)
- `npm test --prefix server` — API tests (node:test). Uses an in-memory MongoDB, or `MONGODB_URI_TEST` (db name must contain "test"; it is wiped)
- `npm run lint` / `npm run build` — client lint / production build
- `GET /api/health` — 200 `{status:"ok", db:"connected"}` when the DB answers a ping, 503 otherwise

## Auth
- Session = JWT (HS256, `sub` = user id, `ver` = tokenVersion) in the httpOnly cookie `gk_session`, SameSite=Lax, Secure in production
- `authenticate` runs on every request and sets `req.user` (role is read from the DB, never trusted from the token)
- Guards: `requireAuth`, `requireRole(...roles)`, `requireAdmin` in `server/src/middleware/auth.js`
- `POST /api/auth/logout-all` bumps tokenVersion to revoke every session; registration can never set `role`

## Storefront & admin (client)
- Pages: `/` home sections, `/shop` (filters in the URL; multi-value filters are repeated params because origins contain commas), `/gems/:slug`, `/cart`, `/info/:slug`, `/login`; admin under `/admin` (lazy-loaded bundle)
- Cart: Zustand `gk-cart` in localStorage; `POST /api/cart/quote` re-prices from the DB on the cart page; checkout not built yet (WhatsApp order link meanwhile)
- Session check uses `GET /api/auth/session` (200 `{user:null}` for guests); `/api/auth/me` stays 401 for guests
- Home page photos (hero, "Verified" banner, testimonial) are uploaded in Admin > Homepage (`/api/admin/settings/homepage`); empty slots show illustrated fallbacks
- Storefront buttons are pills via `--btn-radius`; the admin layout sets it to 0 (square). Section titles use the `section-title` / `section-subtitle` utilities
- Modals (drawers, lightbox) use `hooks/useDialog.js`; anything inside a sticky/transformed parent must be portalled to `document.body`
- `<title>`/`<meta>` are rendered in page components (React 19 hoists them). index.html only has home-page defaults marked `data-seo` (for crawlers on `/`); `main.jsx` removes every `data-seo` tag on start
- `ErrorBoundary` (reset on navigation) shows an error page; after a deploy a stale lazy chunk triggers one automatic reload

## Admin dashboard & settings
- `/admin` is the dashboard (`GET /api/admin/dashboard`): sales = money received (payment.status paid, not cancelled, dated by `payment.paidAt`; COD counts once delivered), bucketed in Asia/Karachi time — 30 days and 12 months; plus orders by status, top products (12 months, by revenue), low stock, open investigations, recent orders
- Charts are hand-made SVG (`components/admin/BarChart.jsx`, no chart library): hover/focus tooltip, sr-only table
- Settings (`/admin/settings`, `PUT /api/admin/settings/store`): exchange rate, shipping, payment accounts, `whatsappNumber` (digits, must start with the country code) and `lowStockThreshold`
- The storefront loads `GET /api/settings/store` on start (`loadStoreInfo` in `lib/whatsapp.js`); components read the number via `useWhatsapp()`. `VITE_WHATSAPP_NUMBER` is only the fallback until one is saved

## Orders & payments
- Totals are always recomputed on the server (`services/pricing.js`); `expectedTotalPKR` from the client only guards against silent price changes (409)
- Stock is reserved at order time with atomic conditional `$inc` per stone and rolled back on partial failure (`services/stock.js`); cancellation releases it once (`stockReleased` flag). Needs real MongoDB: FerretDB is not atomic
- Holds: card 35 min, manual transfer 48 h without proof (none while under review), COD until shipped/cancelled; `jobs/expireOrders.js` cancels overdue orders every 5 min
- Statuses: pending → paid/shipped(COD only)/cancelled; paid → shipped/cancelled; shipped → delivered (COD delivered = paid). Rules in `models/Order.js` TRANSITIONS
- Guest order links use an HMAC token (`services/orderAccess.js`), not stored; owners and admins need no token; everyone else gets 404
- Stripe Checkout charges USD at the order's rate; webhook at `/api/webhooks/stripe` (raw body, registered before `express.json`); the order page also verifies `session_id` on return. `STRIPE_API_BASE` can point at stripe-mock locally
- Email: order confirmation only (`emails/orderConfirmation.js`), sent on placement (COD/manual) or on payment (card). Without SMTP it is saved to `server/mail-outbox/`
- Shipping rates, exchange rate and payment account details live in Settings (Admin > Settings)

## Gem Investigation
- Public: `/investigation` (explainer + request form), `/investigation/track[/:trackingId]` (tracking ID + email, or `?token=` from the email link)
- API: `POST /api/investigations` (fee = $10 × gem count, computed on the server), `POST /api/investigations/track`, photo uploads via `/api/investigations/uploads/*` (folder `investigations`, rate-limited by `INVESTIGATION_RATE_LIMIT`)
- Tracking IDs are random `GI-XXXX-XXXX` (no 0/O/1/I/L); `normalizeTrackingId` accepts loose input. Link tokens are HMACs (`services/orderAccess.js`)
- Statuses: received → contacted → payment_arranged → in_progress → completed, plus cancelled; admin may set any status, but completed needs a saved verdict + summary
- Customers never see internal notes or status notes; the result shows only once completed. Emails: on receipt and on completion (`emails/investigation.js`)
- Admin: `/admin/investigations`; reports (image or PDF) upload to folder `investigation-reports` (the only folder that accepts PDF); replaced reports are deleted

## Images
- `server/src/services/storage`: Cloudinary when `CLOUDINARY_*` are set (signed direct uploads), otherwise local files in `server/uploads` (dev only; production requires Cloudinary unless `ALLOW_LOCAL_UPLOADS=true` for a throwaway preview)
- Only assets uploaded through `/api/admin/uploads` can be attached to products; removed images are deleted after save
- Client: `lib/images.js` adds Cloudinary `f_auto,q_auto,w_*` transforms

## Deployment
- Guide: `DEPLOY.md`. Client on Vercel (`client/vercel.json`), API on Render (`render.yaml`, `rootDir: server`) or Railway, MongoDB Atlas, Cloudinary
- Vercel forwards `/api`, `/uploads`, `/sitemap.xml`, `/robots.txt` and crawler user agents to the server, so the browser sees one origin (first-party SameSite=Lax cookies). The server address is hard-coded in vercel.json (the build fails while it still says YOUR-SERVER)
- Server env for that setup: `SERVE_CLIENT=false`, `TRUST_PROXY=2`, `CLIENT_URL` = the Vercel address (also the default allowed origin)
- Alternative single service: Express serves `client/dist` (`SERVE_CLIENT` defaults to true in production)
- `SEED_ON_START=true` seeds an empty DB and creates the admin (`services/seeding.js`, shared with `npm run seed`)
- CSP: helmet in `app.js` (API + server-rendered pages) and `headers` in vercel.json (the site); both allow Google Fonts, `res.cloudinary.com` images, `api.cloudinary.com` uploads and `blob:` previews — update both when adding external hosts

## Security & SEO
- Rate limits: per-IP API ceiling (`API_RATE_LIMIT`), auth/login/register, per-account failed logins (`ACCOUNT_LOGIN_LIMIT`), orders, investigations, uploads, newsletter
- `middleware/security.js`: rejects unsafe methods from foreign `Origin`s; API responses default to `Cache-Control: no-store` (public endpoints opt in to caching)
- Uploads: magic-byte sniffing (no SVG/HTML), 10 MB cap, folder allow-lists; only `investigation-reports` accepts PDF
- `services/seo.js`: page title/description/canonical/Open Graph/JSON-LD rendered into index.html for every storefront route (escaped for HTML and `<script>`), 404 + noindex for unknown/archived products, noindex for private pages; `/sitemap.xml` and `/robots.txt`. `client/public/og-default.jpg` is the fallback preview image

## Layout
- root: `scripts/dev.js` runs both apps (no extra dependency)
- server/src: `config/` (env via dotenv + Zod, db), `models/`, `controllers/`, `routes/`, `middleware/` (validate, errorHandler), `scripts/`
- client/src: `pages/`, `components/`, `store/` (Zustand), `hooks/`, `lib/api.js`
- Theme tokens (emerald/gold/ivory, fonts) live in `client/src/index.css` under `@theme`
