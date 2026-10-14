import { z } from 'zod';
import { Settings } from '../../models/Settings.js';
import { destroyAssets } from '../../services/storage/index.js';
import { imageRef } from '../../validators/image.js';

export const HOMEPAGE_SLOTS = ['heroImage', 'promoImage', 'storyImage'];

const homepageJSON = (settings) => {
  const h = settings.homepage?.toObject?.() ?? settings.homepage ?? {};
  return Object.fromEntries(HOMEPAGE_SLOTS.map((k) => [k, h[k] ?? null]));
};

// Each slot: an uploaded image, null to remove it, or omitted to leave it unchanged.
export const homepageBody = z
  .object(Object.fromEntries(HOMEPAGE_SLOTS.map((k) => [k, imageRef.nullable().optional()])))
  .refine((b) => Object.keys(b).length > 0, 'Nothing to update');

export async function getHomepage(_req, res) {
  res.json({ homepage: homepageJSON(await Settings.get()) });
}

export async function updateHomepage(req, res) {
  const settings = await Settings.get();
  const before = homepageJSON(settings);

  for (const [slot, value] of Object.entries(req.validated.body)) {
    settings.set(`homepage.${slot}`, value ?? undefined);
  }
  await settings.save();

  // Delete replaced or removed photos once the new settings are saved.
  const after = homepageJSON(settings);
  const stillUsed = new Set(HOMEPAGE_SLOTS.map((k) => after[k]?.publicId).filter(Boolean));
  await destroyAssets(HOMEPAGE_SLOTS.map((k) => before[k]?.publicId).filter((id) => id && !stillUsed.has(id)));

  res.json({ homepage: after });
}

export { homepageJSON };
