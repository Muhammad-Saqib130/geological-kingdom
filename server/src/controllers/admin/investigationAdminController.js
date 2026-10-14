import { z } from 'zod';
import { INVESTIGATION_STATUSES, Investigation, TRACKING_ID, VERDICTS } from '../../models/Investigation.js';
import { addNote, changeStatus, saveResult } from '../../services/investigationService.js';
import { AppError } from '../../utils/AppError.js';
import { escapeRegex } from '../../utils/slugify.js';
import { fileRef } from '../../validators/image.js';

export const idParams = z.object({ trackingId: z.string().regex(TRACKING_ID, 'Invalid tracking ID') });

export const listQuery = z.object({
  status: z.enum(INVESTIGATION_STATUSES).optional(),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export async function listInvestigations(req, res) {
  const { status, q, page, limit } = req.validated.query;
  const filter = {};
  if (status) filter.status = status;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ trackingId: rx }, { 'contact.email': rx }, { 'contact.name': rx }, { 'contact.whatsapp': rx }, { 'gem.type': rx }];
  }

  const [items, total, ...byStatus] = await Promise.all([
    Investigation.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('-statusHistory -notes'),
    Investigation.countDocuments(filter),
    ...INVESTIGATION_STATUSES.map((s) => Investigation.countDocuments({ status: s })),
  ]);

  res.json({
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    counts: Object.fromEntries(INVESTIGATION_STATUSES.map((s, i) => [s, byStatus[i]])),
  });
}

async function load(trackingId) {
  const inv = await Investigation.findOne({ trackingId })
    .populate('statusHistory.by', 'name')
    .populate('notes.by', 'name')
    .populate('user', 'name email');
  if (!inv) throw new AppError(404, 'Request not found');
  return inv;
}

export async function getInvestigation(req, res) {
  res.json({ investigation: await load(req.validated.params.trackingId) });
}

export const statusBody = z.object({
  status: z.enum(INVESTIGATION_STATUSES),
  note: z.string().trim().max(500).optional(),
});

export async function updateStatus(req, res) {
  const inv = await load(req.validated.params.trackingId);
  await changeStatus(inv, { ...req.validated.body, by: req.user });
  res.json({ investigation: await load(inv.trackingId) });
}

export const noteBody = z.object({ text: z.string().trim().min(1, 'Write a note').max(2000) });

export async function createNote(req, res) {
  const inv = await load(req.validated.params.trackingId);
  await addNote(inv, { text: req.validated.body.text, by: req.user });
  res.status(201).json({ investigation: await load(inv.trackingId) });
}

export const resultBody = z.object({
  verdict: z.enum(VERDICTS, { error: 'Choose a verdict' }),
  summary: z.string().trim().min(10, 'Write a short summary for the customer').max(5000),
  report: fileRef.refine((f) => f.publicId.includes('/investigation-reports/'), 'Upload the report on this page').nullable().optional(),
});

export async function updateResult(req, res) {
  const inv = await load(req.validated.params.trackingId);
  await saveResult(inv, req.validated.body);
  res.json({ investigation: await load(inv.trackingId) });
}
