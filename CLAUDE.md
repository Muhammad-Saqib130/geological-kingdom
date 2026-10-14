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
- `<title>`/`<meta>` are rendered in page components (React 19 hoists them); keep none in index.html

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
- Render Blueprint in `render.yaml`, step-by-step guide in `DEPLOY.md` (Render + MongoDB Atlas)
- One web service: in production Express serves `client/dist` with an SPA fallback (`SERVE_CLIENT`), so site and API share one origin
- `CLIENT_ORIGIN` defaults to `RENDER_EXTERNAL_URL`; `SEED_ON_START=true` seeds an empty DB and creates the admin (`services/seeding.js`, shared with `npm run seed`)
- CSP (helmet in `app.js`) allows Google Fonts, `res.cloudinary.com` images, `api.cloudinary.com` uploads and `blob:` previews; update it when adding external hosts

## Layout
- root: `scripts/dev.js` runs both apps (no extra dependency)
- server/src: `config/` (env via dotenv + Zod, db), `models/`, `controllers/`, `routes/`, `middleware/` (validate, errorHandler), `scripts/`
- client/src: `pages/`, `components/`, `store/` (Zustand), `hooks/`, `lib/api.js`
- Theme tokens (emerald/gold/ivory, fonts) live in `client/src/index.css` under `@theme`
