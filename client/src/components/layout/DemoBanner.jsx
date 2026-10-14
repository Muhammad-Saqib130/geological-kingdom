import { DEMO } from '../../lib/api.js'

// Shown only in the demo build
export default function DemoBanner() {
  if (!DEMO) return null
  return (
    <div className="bg-gold-500 px-4 py-2 text-center text-xs font-medium text-emerald-950">
      Demo preview with sample stones. Nothing is charged, shipped or saved outside this browser.
    </div>
  )
}
