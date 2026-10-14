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
- Luxury, elegant, minimal. Reference: docs/design/reference-jewellery.png
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

## Layout
- root: `scripts/dev.js` runs both apps (no extra dependency)
- server/src: `config/` (env via dotenv + Zod, db), `models/`, `controllers/`, `routes/`, `middleware/` (validate, errorHandler), `scripts/`
- client/src: `pages/`, `components/`, `store/` (Zustand), `hooks/`, `lib/api.js`
- Theme tokens (emerald/gold/ivory, fonts) live in `client/src/index.css` under `@theme`
