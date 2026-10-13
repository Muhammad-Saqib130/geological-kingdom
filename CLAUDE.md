# Geological Kingdom

E-commerce site for a gemstone business based in Namak Mandi, Peshawar, Pakistan.

## Features

1. **Store**: sells unique gemstones to INTERNATIONAL customers (USD pricing).
2. **"Gem Investigation" service**: customers who bought a gem elsewhere pay $10,
   upload photos/videos, and the owner reviews them and issues a verdict
   (Authentic / Not authentic / Inconclusive) as a downloadable PDF report.

## Stack

- Monorepo: `/client` (React + Vite + Tailwind + React Router) and `/server` (Node, Express, MongoDB/Mongoose)
- Auth: JWT in httpOnly cookies; roles: `customer`, `admin`
- Images/videos: Cloudinary
- Payments: Stripe (test mode), wrapped behind a `PaymentProvider` interface so it can be swapped
- PDFs: pdfkit (server-side)

## Rules

- Each gemstone is usually ONE-OF-A-KIND: stock is 0 or 1 by default, and must be reserved during checkout.
- Validate all input on the server (zod). Never trust the client for prices.
- Never commit secrets; use `.env` and keep `.env.example` updated.
- Work in small steps; after each step, summarize what changed and how to run it.
- Design inspiration lives in `/docs/design-reference`. Use it for layout feel only, never copy its branding, text or assets.

## Brand

- Name: Geological Kingdom. Tone: trustworthy, premium, expert.
