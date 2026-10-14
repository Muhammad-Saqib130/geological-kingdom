import { Settings } from '../models/Settings.js';

// Public store details the storefront loads on start
export async function getStoreInfo(_req, res) {
  const settings = await Settings.get();
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ pkrPerUsd: settings.pkrPerUsd, whatsappNumber: settings.whatsappNumber || null });
}

export async function getCurrency(_req, res) {
  const settings = await Settings.get();
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ base: 'PKR', pkrPerUsd: settings.pkrPerUsd, updatedAt: settings.updatedAt });
}
