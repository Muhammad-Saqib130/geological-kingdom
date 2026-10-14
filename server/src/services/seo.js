// Search and link-preview metadata for storefront pages, rendered into the HTML on the server.
// WhatsApp, Facebook and most crawlers do not run JavaScript, so titles, Open Graph tags and
// structured data must already be in the HTML they download.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { Settings } from '../models/Settings.js';

const SITE_NAME = 'Geological Kingdom';
const DEFAULT_DESCRIPTION =
  'Natural loose gemstones hand-selected in Namak Mandi, Peshawar: emerald, ruby, sapphire, tourmaline and more, with origin and treatment disclosed on every stone. Shipped across Pakistan and worldwide.';
const CLIENT_INDEX = fileURLToPath(new URL('../../../client/dist/index.html', import.meta.url));

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// JSON inside <script>: escape "<" so a product name can never close the tag
const jsonForScript = (data) => JSON.stringify(data).replace(/</g, '\\u003c');
const truncate = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export const absoluteUrl = (path) => (/^https?:\/\//.test(path) ? path : `${env.clientUrl}${path.startsWith('/') ? '' : '/'}${path}`);

// 1200x630 preview image; Cloudinary pads the (usually square) photo onto an ivory canvas
function previewImage(url) {
  if (!url) return absoluteUrl('/og-default.jpg');
  if (url.includes('res.cloudinary.com/') && url.includes('/image/upload/')) {
    return url.replace('/image/upload/', '/image/upload/c_pad,w_1200,h_630,b_rgb:fbf9f4,f_jpg,q_auto/');
  }
  return absoluteUrl(url);
}

const PAGES = {
  '/': {
    title: `${SITE_NAME} · Natural gemstones from Namak Mandi, Peshawar`,
    description: DEFAULT_DESCRIPTION,
  },
  '/shop': {
    title: `Shop natural gemstones · ${SITE_NAME}`,
    description: 'Browse loose emeralds, rubies, sapphires, tourmalines, aquamarines and more. Filter by gem, origin, carat, treatment and price, in PKR or USD.',
  },
  '/investigation': {
    title: `Gem Investigation: check a gem you bought elsewhere · ${SITE_NAME}`,
    description: 'Bought a gemstone elsewhere? Our gemologists check what it really is, whether it has been treated, and whether it matches the seller’s claims, for $10 per stone.',
  },
  '/investigation/track': {
    title: `Track a Gem Investigation · ${SITE_NAME}`,
    description: 'Check the status of your Gem Investigation request with your tracking ID.',
  },
  '/info/shipping': { title: `Shipping & delivery · ${SITE_NAME}`, description: 'Insured, tracked shipping for loose gemstones across Pakistan and worldwide.' },
  '/info/returns': { title: `Returns · ${SITE_NAME}`, description: 'Our returns policy for gemstones bought from Geological Kingdom.' },
  '/info/treatments': { title: `Gem treatments, explained · ${SITE_NAME}`, description: 'Heating, oiling, filling and other gemstone treatments, and why every stone we sell states its treatment.' },
};

// Pages that exist but should not appear in search results
const PRIVATE = [/^\/cart$/, /^\/checkout$/, /^\/order\//, /^\/account\//, /^\/login$/, /^\/register$/, /^\/admin(\/|$)/, /^\/investigation\/track\/./];

function productJsonLd(p, url) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description || undefined,
    sku: p.sku || undefined,
    url,
    image: p.images.map((i) => absoluteUrl(i.url)),
    brand: { '@type': 'Brand', name: SITE_NAME },
    category: p.category?.name,
    color: p.color || undefined,
    weight: { '@type': 'QuantitativeValue', value: p.carat, unitText: 'ct' },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'PKR',
      price: p.pricePKR,
      availability: `https://schema.org/${p.stock > 0 ? 'InStock' : 'SoldOut'}`,
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  };
}

function breadcrumbs(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: absoluteUrl(path) })),
  };
}

// Returns { status, title, description, canonical, image, type, noindex, extra, jsonLd[] } for a page URL
export async function pageMeta(pathname, query = {}) {
  const path = pathname.replace(/\/+$/, '') || '/';
  const base = { status: 200, canonical: absoluteUrl(path), type: 'website', image: null, jsonLd: [], extra: [] };

  const product = /^\/gems\/([a-z0-9-]{1,140})$/.exec(path);
  if (product) {
    const p = await Product.findOne({ slug: product[1], isActive: true }).populate('category', 'name slug').lean();
    if (!p) return notFound();
    const url = absoluteUrl(path);
    const parts = [`${p.carat} ct`, p.color, p.origin && `from ${p.origin}`, p.treatment && p.treatment !== 'Unknown' && p.treatment.toLowerCase()].filter(Boolean);
    const settings = await Settings.get();
    return {
      ...base,
      title: `${p.name}, ${p.carat} ct · ${SITE_NAME}`,
      description: truncate(p.description || `${p.name}: ${parts.join(', ')}. Natural gemstone from ${SITE_NAME}, Namak Mandi, Peshawar.`, 160),
      type: 'product',
      image: previewImage(p.images[0]?.url),
      imageAlt: p.images[0]?.alt || p.name,
      extra: [
        ['product:price:amount', String(p.pricePKR)],
        ['product:price:currency', 'PKR'],
        ['product:availability', p.stock > 0 ? 'in stock' : 'out of stock'],
        // Also in USD for international visitors
        ['og:price:amount', (p.pricePKR / settings.pkrPerUsd).toFixed(2)],
        ['og:price:currency', 'USD'],
      ],
      jsonLd: [
        productJsonLd(p, url),
        breadcrumbs([['Home', '/'], ['Shop', '/shop'], ...(p.category ? [[p.category.name, `/shop?category=${p.category.slug}`]] : []), [p.name, path]]),
      ],
    };
  }

  if (path === '/shop' && typeof query.category === 'string' && /^[a-z0-9-]{1,60}$/.test(query.category)) {
    const c = await Category.findOne({ slug: query.category, isActive: true }).lean();
    if (c) {
      return {
        ...base,
        canonical: absoluteUrl(`/shop?category=${c.slug}`),
        title: `${c.name} gemstones · ${SITE_NAME}`,
        description: truncate(c.description || `Natural ${c.name.toLowerCase()} gemstones, hand-selected in Namak Mandi, Peshawar, with origin and treatment disclosed.`, 160),
        image: previewImage(c.image?.url),
      };
    }
  }

  if (PAGES[path]) {
    const meta = { ...base, ...PAGES[path] };
    if (path === '/') {
      const settings = await Settings.get();
      meta.image = previewImage(settings.homepage?.heroImage?.url);
      meta.jsonLd = [
        { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: absoluteUrl('/') },
        {
          '@context': 'https://schema.org',
          '@type': 'Store',
          name: SITE_NAME,
          url: absoluteUrl('/'),
          image: meta.image,
          description: DEFAULT_DESCRIPTION,
          address: { '@type': 'PostalAddress', streetAddress: 'Namak Mandi', addressLocality: 'Peshawar', addressRegion: 'Khyber Pakhtunkhwa', addressCountry: 'PK' },
          ...(settings.whatsappNumber && { telephone: `+${settings.whatsappNumber}` }),
        },
      ];
    }
    return meta;
  }

  if (PRIVATE.some((rx) => rx.test(path))) {
    return { ...base, title: SITE_NAME, description: DEFAULT_DESCRIPTION, noindex: true };
  }
  return notFound();

  function notFound() {
    return { ...base, status: 404, title: `Page not found · ${SITE_NAME}`, description: DEFAULT_DESCRIPTION, canonical: null, noindex: true };
  }
}

// Tags carry data-seo so the app can remove them once it starts and manages <head> itself
export function headTags(meta) {
  const tag = (name, value, attr = 'property') => (value ? `<meta data-seo ${attr}="${esc(name)}" content="${esc(value)}">` : '');
  const image = meta.image ?? absoluteUrl('/og-default.jpg');
  return [
    `<title data-seo>${esc(meta.title)}</title>`,
    tag('description', meta.description, 'name'),
    meta.noindex ? tag('robots', 'noindex', 'name') : '',
    meta.canonical ? `<link data-seo rel="canonical" href="${esc(meta.canonical)}">` : '',
    tag('og:site_name', SITE_NAME),
    tag('og:type', meta.type),
    tag('og:title', meta.title.replace(` · ${SITE_NAME}`, '')),
    tag('og:description', meta.description),
    meta.canonical ? tag('og:url', meta.canonical) : '',
    tag('og:image', image),
    tag('og:image:alt', meta.imageAlt ?? SITE_NAME),
    tag('og:locale', 'en_GB'),
    tag('twitter:card', 'summary_large_image', 'name'),
    ...meta.extra.map(([k, v]) => tag(k, v)),
    ...meta.jsonLd.map((d) => `<script data-seo type="application/ld+json">${jsonForScript(d)}</script>`),
  ]
    .filter(Boolean)
    .join('\n    ');
}

// The app's index.html: from client/dist when this server hosts the site, otherwise downloaded
// from the site (e.g. Vercel) and cached briefly, so new deploys are picked up within minutes.
let cached = { html: null, at: 0 };
const SHELL = '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><div id="root"></div></body></html>';

export async function indexTemplate() {
  if (env.serveClient) return readFile(CLIENT_INDEX, 'utf8');
  if (cached.html && Date.now() - cached.at < 5 * 60_000) return cached.html;
  try {
    const res = await fetch(absoluteUrl('/index.html'), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    cached = { html: await res.text(), at: Date.now() };
    return cached.html;
  } catch (err) {
    console.warn(`Could not load the site's index.html for SEO rendering: ${err.message}`);
    return cached.html ?? SHELL; // crawlers only need the tags
  }
}

export const renderPage = (template, meta) => template.replace('</head>', `  ${headTags(meta)}\n  </head>`);

// sitemap.xml: public pages, categories and every active product
export async function sitemapXml() {
  const [products, categories] = await Promise.all([
    Product.find({ isActive: true }).select('slug updatedAt').sort({ updatedAt: -1 }).lean(),
    Category.find({ isActive: true }).select('slug updatedAt').lean(),
  ]);
  const entry = (path, lastmod) => `  <url><loc>${esc(absoluteUrl(path))}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}</url>`;
  const lines = [
    ...['/', '/shop', '/investigation', '/info/shipping', '/info/returns', '/info/treatments'].map((p) => entry(p)),
    ...categories.map((c) => entry(`/shop?category=${c.slug}`, c.updatedAt)),
    ...products.map((p) => entry(`/gems/${p.slug}`, p.updatedAt)),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines.join('\n')}\n</urlset>\n`;
}

export function robotsTxt() {
  return [
    'User-agent: *',
    'Disallow: /admin',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /order/',
    'Disallow: /account/',
    'Disallow: /investigation/track/',
    'Disallow: /api/',
    '',
    `Sitemap: ${absoluteUrl('/sitemap.xml')}`,
    '',
  ].join('\n');
}
