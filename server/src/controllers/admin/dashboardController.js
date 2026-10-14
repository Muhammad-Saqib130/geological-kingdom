import { INVESTIGATION_STATUSES, Investigation } from '../../models/Investigation.js';
import { ORDER_STATUSES, Order } from '../../models/Order.js';
import { Product } from '../../models/Product.js';
import { Settings } from '../../models/Settings.js';

// Days and months are counted in the shop's own time zone, not the server's (UTC on most hosts)
export const TIME_ZONE = 'Asia/Karachi';
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const keyOf = (date) => dayKey.format(date); // 2026-10-14
const DAY = 86_400_000;
const OPEN_INVESTIGATIONS = ['received', 'contacted', 'payment_arranged', 'in_progress'];

// Last `n` calendar days (oldest first) and last `n` months, as zero-filled buckets
function dayBuckets(now, n) {
  const keys = new Set();
  for (let i = n - 1; i >= 0; i--) keys.add(keyOf(new Date(now - i * DAY)));
  return [...keys].map((date) => ({ date, totalPKR: 0, orders: 0 }));
}
function monthBuckets(now, n) {
  const [y, m] = keyOf(now).split('-').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (n - 1 - i), 1));
    return { month: d.toISOString().slice(0, 7), totalPKR: 0, orders: 0 };
  });
}

const sum = (rows) => rows.reduce((a, r) => ({ totalPKR: a.totalPKR + r.totalPKR, orders: a.orders + r.orders }), { totalPKR: 0, orders: 0 });

export async function getDashboard(_req, res) {
  const now = new Date();
  const daily = dayBuckets(now, 30);
  const monthly = monthBuckets(now, 12);
  const since = new Date(`${monthly[0].month}-01T00:00:00+05:00`);

  const settings = await Settings.get();
  const threshold = settings.lowStockThreshold ?? 1;
  const lowStockFilter = { isActive: true, stock: { $lte: threshold } };

  const [paid, statusCounts, needsReview, needsRefund, lowStockItems, lowStockCount, invCounts, recentOrders] = await Promise.all([
    // Sales = money received: paid orders (COD counts once delivered), dated by payment, not cancelled
    Order.find({ 'payment.status': 'paid', status: { $ne: 'cancelled' }, 'payment.paidAt': { $gte: since } })
      .select('payment.paidAt totalPKR items.product items.name items.slug items.category items.qty items.lineTotalPKR')
      .lean(),
    Promise.all(ORDER_STATUSES.map((s) => Order.countDocuments({ status: s }))),
    Order.countDocuments({ 'payment.status': 'awaiting_review' }),
    Order.countDocuments({ 'payment.needsRefund': true }),
    Product.find(lowStockFilter).sort({ stock: 1, updatedAt: -1 }).limit(10).select('name slug sku stock pricePKR').lean(),
    Product.countDocuments(lowStockFilter),
    Promise.all(INVESTIGATION_STATUSES.map((s) => Investigation.countDocuments({ status: s }))),
    Order.find().sort({ createdAt: -1 }).limit(8).select('orderNumber contact.name totalPKR status payment.method payment.status createdAt').lean(),
  ]);

  const byDay = new Map(daily.map((b) => [b.date, b]));
  const byMonth = new Map(monthly.map((b) => [b.month, b]));
  const products = new Map();
  for (const o of paid) {
    const key = keyOf(o.payment.paidAt);
    for (const bucket of [byDay.get(key), byMonth.get(key.slice(0, 7))]) {
      if (!bucket) continue;
      bucket.totalPKR += o.totalPKR;
      bucket.orders += 1;
    }
    for (const i of o.items) {
      const id = String(i.product);
      const p = products.get(id) ?? { product: id, name: i.name, slug: i.slug, category: i.category, qty: 0, revenuePKR: 0 };
      p.qty += i.qty;
      p.revenuePKR += i.lineTotalPKR;
      products.set(id, p);
    }
  }

  const last30 = sum(daily);
  const investigations = Object.fromEntries(INVESTIGATION_STATUSES.map((s, i) => [s, invCounts[i]]));

  res.set('Cache-Control', 'no-store');
  res.json({
    timeZone: TIME_ZONE,
    sales: {
      today: { ...daily.at(-1) },
      last7Days: sum(daily.slice(-7)),
      last30Days: last30,
      thisMonth: { ...monthly.at(-1) },
      last12Months: sum(monthly),
      averageOrderPKR: last30.orders ? Math.round(last30.totalPKR / last30.orders) : 0,
    },
    daily,
    monthly,
    orders: {
      byStatus: Object.fromEntries(ORDER_STATUSES.map((s, i) => [s, statusCounts[i]])),
      needsReview,
      needsRefund,
    },
    topProducts: [...products.values()].sort((a, b) => b.revenuePKR - a.revenuePKR || b.qty - a.qty).slice(0, 5),
    lowStock: { threshold, count: lowStockCount, items: lowStockItems.map(({ _id, ...p }) => ({ id: _id, ...p })) },
    investigations: {
      byStatus: investigations,
      new: investigations.received,
      open: OPEN_INVESTIGATIONS.reduce((n, s) => n + investigations[s], 0),
    },
    recentOrders: recentOrders.map(({ _id, ...o }) => ({ id: _id, ...o })),
  });
}
