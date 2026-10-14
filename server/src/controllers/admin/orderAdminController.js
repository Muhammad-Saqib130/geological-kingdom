import { z } from 'zod';
import { ORDER_STATUSES, Order } from '../../models/Order.js';
import { Settings } from '../../models/Settings.js';
import { changeStatus, reviewProof } from '../../services/orderService.js';
import { AppError } from '../../utils/AppError.js';
import { escapeRegex } from '../../utils/slugify.js';

export const orderParams = z.object({ number: z.string().regex(/^GK-\d{4}-\d{6}$/, 'Invalid order number') });

export const listQuery = z.object({
  status: z.enum([...ORDER_STATUSES, 'review', 'refund']).optional(), // review = proofs awaiting approval
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export async function listOrders(req, res) {
  const { status, q, page, limit } = req.validated.query;
  const filter = {};
  if (status === 'review') filter['payment.status'] = 'awaiting_review';
  else if (status === 'refund') filter['payment.needsRefund'] = true;
  else if (status) filter.status = status;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ orderNumber: rx }, { 'contact.email': rx }, { 'contact.name': rx }, { 'contact.phone': rx }];
  }

  const countBy = (f) => Order.countDocuments(f);
  const [items, total, ...counts] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('-statusHistory'),
    Order.countDocuments(filter),
    countBy({ 'payment.status': 'awaiting_review' }),
    countBy({ 'payment.needsRefund': true }),
    ...ORDER_STATUSES.map((s) => countBy({ status: s })),
  ]);
  const [review, refund, ...byStatus] = counts;

  res.json({
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    counts: { review, refund, ...Object.fromEntries(ORDER_STATUSES.map((s, i) => [s, byStatus[i]])) },
  });
}

async function load(number) {
  const order = await Order.findOne({ orderNumber: number }).populate('statusHistory.by', 'name').populate('user', 'name email');
  if (!order) throw new AppError(404, 'Order not found');
  return order;
}

export async function getOrder(req, res) {
  res.json({ order: await load(req.validated.params.number) });
}

export const statusBody = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500).optional(),
  tracking: z.object({ carrier: z.string().trim().max(60).optional(), number: z.string().trim().max(80).optional() }).optional(),
});

export async function updateStatus(req, res) {
  const order = await load(req.validated.params.number);
  await changeStatus(order, { ...req.validated.body, by: req.user });
  res.json({ order: await load(order.orderNumber) });
}

export const rejectBody = z.object({ reason: z.string().trim().min(3, 'Tell the customer why').max(300) });

export async function approveProof(req, res) {
  const order = await load(req.validated.params.number);
  await reviewProof(order, { approve: true, by: req.user });
  res.json({ order: await load(order.orderNumber) });
}

export async function rejectProof(req, res) {
  const order = await load(req.validated.params.number);
  await reviewProof(order, { approve: false, reason: req.validated.body.reason, by: req.user });
  res.json({ order: await load(order.orderNumber) });
}

// Store settings: exchange rate, shipping and payment accounts
const money = z.number().min(0).max(10_000_000);
const s = (max) => z.string().trim().max(max).optional();
export const storeSettingsBody = z.object({
  pkrPerUsd: z.number().min(1).max(10_000).optional(),
  shipping: z.object({ domesticPKR: money.int(), internationalUSD: money, freeDomesticOverPKR: money.int() }).partial().optional(),
  paymentAccounts: z
    .object({
      bank: z.object({ bankName: s(80), accountTitle: s(80), accountNumber: s(40), iban: s(40) }).optional(),
      jazzcash: z.object({ accountTitle: s(80), number: s(20) }).optional(),
      easypaisa: z.object({ accountTitle: s(80), number: s(20) }).optional(),
    })
    .optional(),
  // Typed as "+92 300 1234567" or "0092…"; stored as digits only. Empty clears it.
  whatsappNumber: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s()-]/g, '').replace(/^(\+|00)/, ''))
    .pipe(z.string().regex(/^(\d{8,15})?$/, 'Enter the number in international format, e.g. +92 300 1234567'))
    .optional(),
  lowStockThreshold: z.number().int().min(0).max(1000).optional(),
});

const storeJSON = (st) => ({
  pkrPerUsd: st.pkrPerUsd,
  shipping: st.shipping,
  paymentAccounts: st.paymentAccounts ?? {},
  whatsappNumber: st.whatsappNumber ?? '',
  lowStockThreshold: st.lowStockThreshold ?? 1,
});

export async function getStoreSettings(_req, res) {
  res.json({ settings: storeJSON(await Settings.get()) });
}

export async function updateStoreSettings(req, res) {
  const st = await Settings.get();
  const { pkrPerUsd, shipping, paymentAccounts, whatsappNumber, lowStockThreshold } = req.validated.body;
  if (pkrPerUsd !== undefined) st.pkrPerUsd = pkrPerUsd;
  if (whatsappNumber !== undefined) st.whatsappNumber = whatsappNumber;
  if (lowStockThreshold !== undefined) st.lowStockThreshold = lowStockThreshold;
  for (const [k, v] of Object.entries(shipping ?? {})) st.set(`shipping.${k}`, v);
  for (const [method, fields] of Object.entries(paymentAccounts ?? {})) {
    for (const [k, v] of Object.entries(fields)) st.set(`paymentAccounts.${method}.${k}`, v);
  }
  await st.save();
  res.json({ settings: storeJSON(st) });
}
