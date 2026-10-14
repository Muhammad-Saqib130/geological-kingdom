// In-browser stand-in for the API, used only by the demo build (VITE_DEMO=true), which is
// published as a static page without a server. It mirrors the real API's rules closely
// enough to click through the shop: prices from the catalogue, shipping zones, COD only in
// Pakistan, stock reservation, payment proofs. Orders live in this browser's localStorage.
import { categories as seedCategories, products as seedProducts, testimonials as seedTestimonials } from '../../../server/src/scripts/seedData.js'
import { ApiError } from '../lib/api.js'

const PKR_PER_USD = 280
const SHIPPING = { domesticPKR: 350, internationalUSD: 40, freeDomesticOverPKR: 300000 }
// Clearly fake details so nobody sends real money to a demo
const ACCOUNTS = {
  bank: { bankName: 'Demo Bank (not real)', accountTitle: 'Geological Kingdom (demo)', accountNumber: '0000-DEMO-0000', iban: 'PK00 DEMO 0000 0000 0000 0000' },
  jazzcash: { accountTitle: 'Geological Kingdom (demo)', number: '0300 0000000' },
  easypaisa: { accountTitle: 'Geological Kingdom (demo)', number: '0345 0000000' },
}
const STORE_KEY = 'gk-demo-store'

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const day = 86_400_000

const categories = seedCategories.map((c, i) => ({ id: `c${i + 1}`, slug: slugify(c.name), isActive: true, showOnHome: false, ...c }))
const catByName = new Map(categories.map((c) => [c.name, c]))
const baseProducts = seedProducts.map((p, i) => {
  const c = catByName.get(p.category)
  return {
    ...p,
    id: `p${i + 1}`,
    slug: slugify(p.name),
    category: { id: c.id, name: c.name, slug: c.slug },
    images: [],
    stock: 1,
    isActive: true,
    isFeatured: Boolean(p.isFeatured),
    createdAt: new Date(Date.now() - i * day).toISOString(),
  }
})
const testimonials = seedTestimonials.map((t, i) => ({ id: `t${i + 1}`, isSample: true, ...t }))

// Persistent demo state: stock levels and orders (per browser)
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null')
    if (s?.orders) return s
  } catch {
    // storage unavailable
  }
  return { stock: {}, orders: [], seq: 0 }
}
let state = load()
function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state))
  } catch {
    // storage full or blocked: keep working in memory
  }
}
const products = () => baseProducts.map((p) => ({ ...p, stock: state.stock[p.id] ?? p.stock }))
const productBy = (pred) => products().find(pred)

// Matches the server's rule: unpaid orders past their hold release their stones
function expireOrders() {
  let changed = false
  for (const o of state.orders) {
    if (o.status === 'pending' && ['unpaid', 'rejected'].includes(o.payment.status) && o.expiresAt && new Date(o.expiresAt) < new Date()) {
      cancel(o, 'No payment proof received within 48 hours')
      changed = true
    }
  }
  if (changed) save()
}

function cancel(order, note) {
  if (!order.stockReleased) {
    for (const i of order.items) state.stock[i.product] = (state.stock[i.product] ?? 1) + i.qty
    order.stockReleased = true
  }
  order.status = 'cancelled'
  order.expiresAt = null
  order.statusHistory.push({ status: 'cancelled', at: new Date().toISOString(), note })
  order.updatedAt = new Date().toISOString()
}

const ok = (data) => structuredClone(data)
const fail = (status, message, details) => {
  throw new ApiError(status, message, details)
}

function shippingFor(country, subtotal) {
  if (country === 'PK') {
    const free = SHIPPING.freeDomesticOverPKR > 0 && subtotal >= SHIPPING.freeDomesticOverPKR
    return { zone: 'domestic', feePKR: free ? 0 : SHIPPING.domesticPKR, free }
  }
  return { zone: 'international', feePKR: Math.ceil(SHIPPING.internationalUSD * PKR_PER_USD), free: false }
}

function priceCart(items, country) {
  const lines = []
  const unavailable = []
  for (const { productId, qty } of items) {
    const p = productBy((x) => x.id === productId)
    if (!p) unavailable.push({ productId, reason: 'no_longer_listed' })
    else if (p.stock < qty) unavailable.push({ productId, name: p.name, reason: p.stock === 0 ? 'sold_out' : 'not_enough_stock' })
    else
      lines.push({
        product: p.id,
        productId: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        category: p.category.name,
        carat: p.carat,
        colorHex: p.colorHex,
        unitPricePKR: p.pricePKR,
        qty,
        lineTotalPKR: p.pricePKR * qty,
      })
  }
  const subtotalPKR = lines.reduce((s, l) => s + l.lineTotalPKR, 0)
  const shipping = shippingFor(country, subtotalPKR)
  return { lines, unavailable, subtotalPKR, shipping, totalPKR: subtotalPKR + shipping.feePKR, pkrPerUsd: PKR_PER_USD, codAvailable: country === 'PK' }
}

function listProducts(q) {
  const many = (k) => q.getAll(k).flatMap((v) => (k === 'origin' ? [v] : v.split(','))).filter(Boolean)
  let list = products()
  const cats = many('category')
  if (cats.length) list = list.filter((p) => cats.includes(p.category.slug))
  const origins = many('origin')
  if (origins.length) list = list.filter((p) => origins.includes(p.origin))
  const treatments = many('treatment')
  if (treatments.length) list = list.filter((p) => treatments.includes(p.treatment))
  const num = (k) => (q.get(k) ? Number(q.get(k)) : undefined)
  if (num('minPrice') !== undefined) list = list.filter((p) => p.pricePKR >= num('minPrice'))
  if (num('maxPrice') !== undefined) list = list.filter((p) => p.pricePKR <= num('maxPrice'))
  if (num('minCarat') !== undefined) list = list.filter((p) => p.carat >= num('minCarat'))
  if (num('maxCarat') !== undefined) list = list.filter((p) => p.carat <= num('maxCarat'))
  if (q.get('featured') === 'true') list = list.filter((p) => p.isFeatured)
  if (q.get('inStock') === 'true') list = list.filter((p) => p.stock > 0)
  const term = q.get('q')?.trim().toLowerCase()
  if (term) list = list.filter((p) => [p.name, p.color, p.origin, p.category.name].some((v) => v?.toLowerCase().includes(term)))

  const sorts = {
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    'price-asc': (a, b) => a.pricePKR - b.pricePKR,
    'price-desc': (a, b) => b.pricePKR - a.pricePKR,
    'carat-desc': (a, b) => b.carat - a.carat,
  }
  list.sort(sorts[q.get('sort') ?? 'newest'] ?? sorts.newest)
  const limit = Math.min(48, Number(q.get('limit') ?? 12))
  const page = Math.max(1, Number(q.get('page') ?? 1))
  return { items: list.slice((page - 1) * limit, page * limit), page, limit, total: list.length, totalPages: Math.max(1, Math.ceil(list.length / limit)) }
}

function topOrigins() {
  const map = new Map()
  for (const p of products()) {
    const o = map.get(p.origin) ?? { name: p.origin, count: 0, colorHex: p.colorHex, image: null }
    o.count += 1
    map.set(p.origin, o)
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 8)
}

function findOrder(number) {
  expireOrders()
  return state.orders.find((o) => o.orderNumber === number) ?? fail(404, 'Order not found')
}

function createOrder(body) {
  const { items, contact, shippingAddress: address, paymentMethod } = body
  const details = []
  if (!contact?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) details.push({ path: 'contact.email', message: 'Enter a valid email address' })
  if (!contact?.name?.trim()) details.push({ path: 'contact.name', message: 'Enter your name' })
  if (!paymentMethod) details.push({ path: 'paymentMethod', message: 'Choose a payment method' })
  if (paymentMethod === 'cod' && address.country !== 'PK') details.push({ path: 'paymentMethod', message: 'Cash on delivery is only available in Pakistan' })
  if (paymentMethod === 'card') details.push({ path: 'paymentMethod', message: 'Card payments are not available in the demo' })
  if (details.length) fail(400, 'Validation failed', details)

  const quote = priceCart(items, address.country)
  if (quote.unavailable.length) fail(409, 'Some items are no longer available', { reason: 'unavailable', unavailable: quote.unavailable })
  if (body.expectedTotalPKR !== undefined && body.expectedTotalPKR !== quote.totalPKR) {
    fail(409, 'Prices have changed since you loaded the page. Please review your order.', { reason: 'price_changed', totalPKR: quote.totalPKR })
  }

  for (const l of quote.lines) state.stock[l.product] = (productBy((p) => p.id === l.product).stock ?? 1) - l.qty
  state.seq += 1
  const now = new Date().toISOString()
  const order = {
    id: `o${state.seq}`,
    orderNumber: `GK-DEMO-${String(state.seq).padStart(4, '0')}`,
    token: `demo-${state.seq}`,
    contact,
    items: quote.lines.map((l) => {
      const line = { ...l }
      delete line.productId
      return line
    }),
    shippingAddress: address,
    shipping: { zone: quote.shipping.zone, feePKR: quote.shipping.feePKR },
    subtotalPKR: quote.subtotalPKR,
    totalPKR: quote.totalPKR,
    pkrPerUsd: PKR_PER_USD,
    notes: body.notes,
    status: 'pending',
    statusHistory: [{ status: 'pending', at: now, note: 'Order placed' }],
    payment: { method: paymentMethod, status: 'unpaid', proofs: [] },
    expiresAt: paymentMethod === 'cod' ? null : new Date(Date.now() + 2 * day).toISOString(),
    stockReleased: false,
    createdAt: now,
    updatedAt: now,
  }
  state.orders.unshift(order)
  save()
  return { orderNumber: order.orderNumber, token: order.token }
}

// path is like "/products?x=1"; returns parsed JSON-like data or throws ApiError
export async function handle(path, { method = 'GET', body } = {}) {
  await new Promise((r) => setTimeout(r, 120)) // feel like a network call
  const url = new URL(path, 'https://demo.local')
  const p = url.pathname
  const q = url.searchParams
  let m

  if (method === 'GET') {
    if (p === '/settings/currency') return ok({ base: 'PKR', pkrPerUsd: PKR_PER_USD })
    if (p === '/auth/session') return ok({ user: null })
    if (p === '/home') {
      const all = products()
      return ok({
        categories,
        featured: all.filter((x) => x.isFeatured),
        newArrivals: all.filter((x) => x.stock > 0).slice(0, 8),
        testimonials,
        origins: topOrigins(),
        homepage: { heroImage: null, promoImage: null, storyImage: null },
      })
    }
    if (p === '/categories') return ok({ items: categories })
    if (p === '/testimonials') return ok({ items: testimonials })
    if (p === '/products') return ok(listProducts(q))
    if (p === '/products/filters') {
      const all = products()
      const prices = all.map((x) => x.pricePKR)
      const carats = all.map((x) => x.carat)
      const used = new Set(all.map((x) => x.treatment))
      return ok({
        categories: categories.filter((c) => all.some((x) => x.category.id === c.id)).map(({ id, name, slug }) => ({ id, name, slug })),
        origins: [...new Set(all.map((x) => x.origin))].sort(),
        treatments: ['Natural', 'Heated', 'Oiled', 'Irradiated', 'Filled', 'Diffused', 'Unknown'].filter((t) => used.has(t)),
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        minCarat: Math.min(...carats),
        maxCarat: Math.max(...carats),
      })
    }
    if ((m = p.match(/^\/products\/([\w-]+)$/))) {
      const product = productBy((x) => x.slug === m[1]) ?? fail(404, 'Product not found')
      return ok({ product, related: products().filter((x) => x.category.id === product.category.id && x.id !== product.id).slice(0, 4) })
    }
    if (p === '/settings/checkout') {
      return ok({ shipping: SHIPPING, pkrPerUsd: PKR_PER_USD, methods: { cod: true, bank: true, jazzcash: true, easypaisa: true, card: false }, paymentAccounts: ACCOUNTS, holdHours: { manual: 48 } })
    }
    if (p === '/me/orders') fail(401, 'Please sign in to continue')
    if ((m = p.match(/^\/orders\/(GK-DEMO-\d+)$/))) return ok({ order: findOrder(m[1]) })
  }

  if (method === 'POST') {
    if (p === '/cart/quote') {
      const qte = priceCart(body.items, 'PK')
      return ok({
        lines: [
          ...qte.lines.map((l) => ({ ...l, available: true, adjusted: false, pricePKR: l.unitPricePKR, maxQty: 1 })),
          ...qte.unavailable.map((u) => ({ productId: u.productId, available: false, reason: u.reason })),
        ],
        subtotalPKR: qte.subtotalPKR,
      })
    }
    if (p === '/checkout/quote') return ok(priceCart(body.items, body.country))
    if (p === '/orders') return ok(createOrder(body))
    if (p === '/newsletter') return ok({ message: "You're on the list (demo: nothing was saved)." })
    if (['/auth/login', '/auth/register'].includes(p)) fail(400, 'Accounts are available on the live site. In this demo you can shop and check out as a guest.')
    if (p === '/auth/logout') return null
    if ((m = p.match(/^\/orders\/(GK-DEMO-\d+)\/cancel$/))) {
      const order = findOrder(m[1])
      if (order.status !== 'pending' || ['paid', 'awaiting_review'].includes(order.payment.status)) fail(400, 'This order can no longer be cancelled online.')
      cancel(order, 'Cancelled by customer')
      save()
      return ok({ order })
    }
    if ((m = p.match(/^\/orders\/(GK-DEMO-\d+)\/proof\/sign$/))) {
      findOrder(m[1])
      return ok({ provider: 'demo', uploadUrl: '', fields: {}, maxBytes: 10 * 1024 * 1024, accept: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'heic', 'heif'] })
    }
    if ((m = p.match(/^\/orders\/(GK-DEMO-\d+)\/proof$/))) {
      const order = findOrder(m[1])
      if (order.payment.status === 'awaiting_review') fail(409, 'A payment proof is already being reviewed')
      const now = new Date().toISOString()
      order.payment.proofs.push({ id: `pr${order.payment.proofs.length + 1}`, image: body.image, reference: body.reference, uploadedAt: now, status: 'pending' })
      order.payment.status = 'awaiting_review'
      order.expiresAt = null
      order.statusHistory.push({ status: 'pending', at: now, note: 'Payment proof uploaded' })
      order.updatedAt = now
      save()
      return ok({ order })
    }
  }

  fail(404, 'This part of the site needs the live server. The demo covers the shop, cart and checkout.')
}

// Demo "upload": keeps a downscaled copy of the image in the browser instead of sending it anywhere.
export async function demoUpload(file) {
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) throw new ApiError(415, 'Choose an image (JPG, PNG or WebP)')
  const scale = Math.min(1, 600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return { url: canvas.toDataURL('image/jpeg', 0.8), publicId: `demo/${Date.now()}`, width: canvas.width, height: canvas.height }
}
