import { Settings } from '../models/Settings.js';

export async function getCurrency(_req, res) {
  const settings = await Settings.get();
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ base: 'PKR', pkrPerUsd: settings.pkrPerUsd, updatedAt: settings.updatedAt });
}
