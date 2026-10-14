import { investigationCompletedEmail, investigationReceivedEmail, trackUrlFor } from '../emails/investigation.js';
import { INVESTIGATION_FEE_USD, Investigation, newTrackingId } from '../models/Investigation.js';
import { AppError } from '../utils/AppError.js';
import { sendMail } from './mail.js';
import { investigationAccessToken } from './orderAccess.js';
import { destroyAssets } from './storage/index.js';

const trackUrl = (inv) => trackUrlFor(inv, investigationAccessToken(inv._id));

export async function createInvestigation({ contact, gem, photos, certificate, user }) {
  // The fee is always computed here, never taken from the client
  const data = { contact, gem, photos, certificate, user: user?._id, feeUSD: INVESTIGATION_FEE_USD * gem.count };
  for (let attempt = 0; ; attempt++) {
    try {
      const inv = await Investigation.create({
        ...data,
        trackingId: newTrackingId(),
        statusHistory: [{ status: 'received' }],
      });
      if (await sendMail(investigationReceivedEmail(inv, { trackUrl: trackUrl(inv) }))) {
        inv.receivedEmailAt = new Date();
        await inv.save();
      }
      return inv;
    } catch (err) {
      // 31^8 IDs make a collision very unlikely; retry a few times if one happens
      if (err?.code !== 11000 || attempt >= 4) throw err;
    }
  }
}

export async function changeStatus(inv, { status, note, by }) {
  if (inv.status === status) throw new AppError(400, `This request is already ${status.replace('_', ' ')}`);
  if (status === 'completed' && !(inv.result?.verdict && inv.result?.summary)) {
    throw new AppError(400, 'Save a verdict and summary before marking the request completed');
  }
  inv.status = status;
  inv.statusHistory.push({ status, by: by?._id, note });
  await inv.save();

  if (status === 'completed' && (await sendMail(investigationCompletedEmail(inv, { trackUrl: trackUrl(inv) })))) {
    inv.completedEmailAt = new Date();
    await inv.save();
  }
  return inv;
}

export async function addNote(inv, { text, by }) {
  inv.notes.push({ text, by: by?._id });
  await inv.save();
  return inv;
}

// Saves the verdict, summary and report. A replaced or removed report file is deleted afterwards.
export async function saveResult(inv, { verdict, summary, report }) {
  const old = inv.result?.report;
  inv.result = { verdict, summary, report: report ?? undefined, updatedAt: new Date() };
  await inv.save();
  if (old && old.publicId !== report?.publicId) await destroyAssets([old.publicId]);
  return inv;
}
