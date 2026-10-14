// Gem Investigation constants shared by the public pages and the admin (mirror server/src/models/Investigation.js)
export const FEE_USD = 10 // per gemstone
export const MAX_GEMS = 20
export const MAX_PHOTOS = 5

export const STEPS = ['received', 'contacted', 'payment_arranged', 'in_progress', 'completed']

export const INVESTIGATION_STATUS_LABELS = {
  received: 'Received',
  contacted: 'Contacted',
  payment_arranged: 'Payment arranged',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

// What the customer is told at each stage
export const STATUS_MESSAGES = {
  received: 'We have your request and photos. We will contact you on WhatsApp to arrange payment.',
  contacted: 'We have messaged you on WhatsApp about payment and next steps. Please check your messages.',
  payment_arranged: 'Payment is confirmed. Your gemstone is in the queue for examination.',
  in_progress: 'Our gemologist is examining your gemstone.',
  completed: 'The examination is complete. Your result is below.',
  cancelled: 'This request has been closed. If you think this is a mistake, please contact us.',
}

export const VERDICTS = [
  { value: 'natural', label: 'Natural, no treatment detected', body: 'The stone is the natural gem it was sold as, and we found no sign of treatment.' },
  { value: 'natural_treated', label: 'Natural, treated', body: 'A natural gem whose colour or clarity has been improved, for example by heating, oiling or filling.' },
  { value: 'synthetic', label: 'Synthetic (lab-grown)', body: 'The same material as the natural gem, but grown in a laboratory.' },
  { value: 'imitation', label: 'Imitation or a different stone', body: 'Glass, a composite (doublet or triplet), or a different, usually less valuable, gemstone.' },
  { value: 'inconclusive', label: 'Inconclusive', body: 'We could not reach a reliable answer from what we could examine. We explain why and what would settle it.' },
]
export const VERDICT_LABELS = Object.fromEntries(VERDICTS.map((v) => [v.value, v.label]))

export const GEM_SUGGESTIONS = ['Emerald', 'Ruby', 'Blue sapphire', 'Pink sapphire', 'Tourmaline', 'Aquamarine', 'Peridot', 'Spinel', 'Topaz', 'Kunzite', 'Garnet', 'Tanzanite', 'Morganite', 'Lapis lazuli']
