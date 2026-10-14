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
Requires Node >= 20.12. Copy `server/.env.example` -> `server/.env` and `client/.env.example` -> `client/.env` first.
- `npm run dev --prefix server` — API on http://localhost:5000 (auto-restarts via `node --watch`)
- `npm run dev --prefix client` — site on http://localhost:5173 (proxies `/api` to the server)
- `npm run seed --prefix server` — load sample gems + default exchange rate (`-- --fresh` wipes gems first)
- `npm run lint --prefix client` / `npm run build --prefix client`

## Layout
- server/src: `config/` (env via Zod, db), `models/`, `controllers/`, `routes/`, `middleware/` (validate, errorHandler), `scripts/`
- client/src: `pages/`, `components/`, `store/` (Zustand), `hooks/`, `lib/api.js`
- Theme tokens (emerald/gold/ivory, fonts) live in `client/src/index.css` under `@theme`
