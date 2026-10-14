// Mirrors server/src/models/Product.js enums (keep in sync).
export const SHAPES = ['Round', 'Oval', 'Cushion', 'Emerald', 'Pear', 'Marquise', 'Heart', 'Princess', 'Trillion', 'Radiant', 'Asscher', 'Cabochon', 'Rough', 'Other']
export const TREATMENTS = ['Natural', 'Heated', 'Oiled', 'Irradiated', 'Filled', 'Diffused', 'Unknown']
export const MAX_PRODUCT_IMAGES = 12

export const TREATMENT_NOTES = {
  Natural: 'No treatment detected',
  Heated: 'Heat-treated to improve colour or clarity (common and stable)',
  Oiled: 'Fissures filled with oil (traditional for emeralds)',
  Irradiated: 'Colour changed by irradiation',
  Filled: 'Fractures or cavities filled with glass or resin',
  Diffused: 'Colour introduced by surface diffusion',
  Unknown: 'Treatment not determined',
}
