import { Product } from '../models/Product.js';
import { Settings } from '../models/Settings.js';

export const DOMESTIC_COUNTRY = 'PK';

// Shipping fee in PKR for a destination and subtotal, from the admin settings.
export function shippingFor(country, subtotalPKR, settings) {
  const s = settings.shipping ?? {};
  if (country === DOMESTIC_COUNTRY) {
    const free = s.freeDomesticOverPKR > 0 && subtotalPKR >= s.freeDomesticOverPKR;
    return { zone: 'domestic', feePKR: free ? 0 : Math.round(s.domesticPKR ?? 0), free };
  }
  return { zone: 'international', feePKR: Math.ceil((s.internationalUSD ?? 0) * settings.pkrPerUsd), free: false };
}

// Prices a cart from the database. Never uses prices, names or totals sent by the browser.
// Returns { lines, unavailable, subtotalPKR, shipping, totalPKR, pkrPerUsd }.
export async function priceCart(items, country) {
  const [settings, products] = await Promise.all([
    Settings.get(),
    Product.find({ _id: { $in: items.map((i) => i.productId) } }).populate('category', 'name'),
  ]);
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines = [];
  const unavailable = [];
  for (const { productId, qty } of items) {
    const p = byId.get(productId);
    if (!p || !p.isActive) {
      unavailable.push({ productId, reason: 'no_longer_listed' });
    } else if (p.stock < qty) {
      unavailable.push({ productId, name: p.name, reason: p.stock === 0 ? 'sold_out' : 'not_enough_stock', available: p.stock });
    } else {
      lines.push({
        product: p._id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        category: p.category?.name,
        carat: p.carat,
        colorHex: p.colorHex,
        image: p.images[0] ? { url: p.images[0].url, alt: p.images[0].alt } : undefined,
        unitPricePKR: p.pricePKR,
        qty,
        lineTotalPKR: p.pricePKR * qty,
      });
    }
  }

  const subtotalPKR = lines.reduce((sum, l) => sum + l.lineTotalPKR, 0);
  const shipping = shippingFor(country, subtotalPKR, settings);
  return { lines, unavailable, subtotalPKR, shipping, totalPKR: subtotalPKR + shipping.feePKR, pkrPerUsd: settings.pkrPerUsd, settings };
}
