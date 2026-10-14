// Loads sample gems and the default exchange rate. Usage: npm run seed [-- --fresh]
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Gem } from '../models/Gem.js';
import { Settings } from '../models/Settings.js';

const gems = [
  { name: 'Swat Emerald', type: 'Emerald', color: 'Vivid green', colorHex: '#1f7a4d', carat: 1.42, dimensionsMm: '7.9 x 6.1 x 4.2', shape: 'Emerald', clarity: 'Eye clean', origin: 'Swat, Pakistan', treatment: 'Oiled', pricePKR: 185000, isFeatured: true, description: 'A bright, saturated emerald from the historic Mingora mines of Swat, with a classic step cut that shows its depth of colour.' },
  { name: 'Panjshir Emerald', type: 'Emerald', color: 'Deep green', colorHex: '#0f5a3a', carat: 2.1, dimensionsMm: '9.0 x 7.0 x 4.8', shape: 'Oval', clarity: 'Slightly included', origin: 'Panjshir, Afghanistan', treatment: 'Oiled', pricePKR: 320000, isFeatured: true, description: 'Rich, cool-toned green with lively brilliance.' },
  { name: 'Pink Kunzite', type: 'Kunzite', color: 'Soft pink', colorHex: '#e7a6c8', carat: 8.35, dimensionsMm: '14.2 x 10.1 x 7.6', shape: 'Cushion', clarity: 'Loupe clean', origin: 'Nuristan, Afghanistan', treatment: 'None', pricePKR: 96000, isFeatured: true, description: 'A large, clean kunzite with gentle pink colour that glows in daylight.' },
  { name: 'Hunza Ruby', type: 'Ruby', color: 'Pinkish red', colorHex: '#b3123a', carat: 0.95, dimensionsMm: '6.3 x 5.1 x 3.4', shape: 'Oval', clarity: 'Slightly included', origin: 'Hunza, Pakistan', treatment: 'None', pricePKR: 140000, description: 'Unheated ruby from the marble deposits of the Hunza valley.' },
  { name: 'Skardu Aquamarine', type: 'Aquamarine', color: 'Sky blue', colorHex: '#7fc4dc', carat: 4.6, dimensionsMm: '12.0 x 9.0 x 6.2', shape: 'Emerald', clarity: 'Eye clean', origin: 'Skardu, Pakistan', treatment: 'None', pricePKR: 88000, isFeatured: true, description: 'Crisp, icy blue aquamarine from the high Karakoram.' },
  { name: 'Bicolor Tourmaline', type: 'Tourmaline', color: 'Pink & green', colorHex: '#c9677f', carat: 3.2, dimensionsMm: '11.5 x 7.0 x 5.1', shape: 'Emerald', clarity: 'Eye clean', origin: 'Gilgit, Pakistan', treatment: 'None', pricePKR: 72000, description: 'A watermelon-style tourmaline showing both pink and green zones.' },
  { name: 'Cornflower Sapphire', type: 'Sapphire', color: 'Cornflower blue', colorHex: '#2c4fa3', carat: 1.15, dimensionsMm: '6.8 x 5.6 x 3.9', shape: 'Cushion', clarity: 'Eye clean', origin: 'Sri Lanka', treatment: 'Heated', pricePKR: 210000, description: 'Velvety mid-blue sapphire with even colour.' },
  { name: 'Golden Topaz', type: 'Topaz', color: 'Sherry gold', colorHex: '#d99a3a', carat: 5.8, dimensionsMm: '13.0 x 9.2 x 6.4', shape: 'Pear', clarity: 'Loupe clean', origin: 'Katlang, Pakistan', treatment: 'None', pricePKR: 115000, description: 'Warm sherry-toned topaz from the Katlang deposit near Mardan.' },
  { name: 'Peridot Cushion', type: 'Peridot', color: 'Olive green', colorHex: '#8fb83a', carat: 6.1, dimensionsMm: '11.8 x 11.6 x 7.0', shape: 'Cushion', clarity: 'Eye clean', origin: 'Kohistan, Pakistan', treatment: 'None', pricePKR: 54000, description: 'Lively, high-altitude peridot from Kohistan with excellent transparency.' },
  { name: 'Pink Spinel', type: 'Spinel', color: 'Hot pink', colorHex: '#d6336c', carat: 1.05, dimensionsMm: '6.4 x 5.2 x 3.6', shape: 'Oval', clarity: 'Eye clean', origin: 'Hunza, Pakistan', treatment: 'None', pricePKR: 78000, description: 'Untreated spinel with bright, neon-leaning pink.' },
  { name: 'Morganite Oval', type: 'Morganite', color: 'Peach', colorHex: '#f2b8a0', carat: 3.9, dimensionsMm: '11.0 x 9.0 x 6.0', shape: 'Oval', clarity: 'Eye clean', origin: 'Nuristan, Afghanistan', treatment: 'None', pricePKR: 46000, description: 'Soft peach morganite with a warm, gentle tone.' },
  { name: 'Lapis Lazuli Cabochon', type: 'Lapis Lazuli', color: 'Royal blue', colorHex: '#1d3a8a', carat: 12.4, dimensionsMm: '18.0 x 13.0 x 5.5', shape: 'Cabochon', clarity: 'Opaque', origin: 'Badakhshan, Afghanistan', treatment: 'None', pricePKR: 18500, description: 'Deep blue lapis with fine golden pyrite flecks.' },
];

await connectDB();
try {
  if (process.argv.includes('--fresh')) await Gem.deleteMany({});
  for (const g of gems) {
    // Upsert by name so re-running the seed does not create duplicates
    const existing = await Gem.findOne({ name: g.name });
    if (existing) existing.set(g);
    await (existing ?? new Gem(g)).save();
  }
  const settings = await Settings.get();
  console.log(`Seeded ${gems.length} gems. Exchange rate: ${settings.pkrPerUsd} PKR/USD`);
} finally {
  await mongoose.disconnect();
}
