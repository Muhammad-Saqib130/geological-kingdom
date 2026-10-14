import { useCurrency } from '../store/currencyStore.js'

const styles = {
  light: { group: 'border-emerald-900/30', on: 'bg-emerald-900 text-ivory-50', off: 'text-emerald-900 hover:bg-ivory-200' },
  dark: { group: 'border-ivory-50/25', on: 'bg-gold-500 text-emerald-950', off: 'text-ivory-200 hover:bg-white/10' },
}

export default function CurrencyToggle({ dark = false }) {
  const currency = useCurrency((s) => s.currency)
  const setCurrency = useCurrency((s) => s.setCurrency)
  const rateReady = useCurrency((s) => s.pkrPerUsd !== null)
  const s = styles[dark ? 'dark' : 'light']

  return (
    <div role="group" aria-label="Currency" className={`flex overflow-hidden rounded-full border text-xs font-medium tracking-wider ${s.group}`}>
      {['PKR', 'USD'].map((c) => (
        <button
          key={c}
          type="button"
          aria-pressed={currency === c}
          disabled={c === 'USD' && !rateReady}
          onClick={() => setCurrency(c)}
          className={`rounded-full px-3 py-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${currency === c ? s.on : s.off}`}
        >
          {c}
        </button>
      ))}
    </div>
  )
}
