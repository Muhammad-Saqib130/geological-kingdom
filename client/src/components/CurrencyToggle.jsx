import { useCurrency } from '../store/currencyStore.js'

export default function CurrencyToggle() {
  const currency = useCurrency((s) => s.currency)
  const setCurrency = useCurrency((s) => s.setCurrency)
  const rateReady = useCurrency((s) => s.pkrPerUsd !== null)

  return (
    <div role="group" aria-label="Currency" className="flex border border-emerald-900/30 text-xs font-medium tracking-wider">
      {['PKR', 'USD'].map((c) => (
        <button
          key={c}
          type="button"
          aria-pressed={currency === c}
          disabled={c === 'USD' && !rateReady}
          onClick={() => setCurrency(c)}
          className={`px-2.5 py-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            currency === c ? 'bg-emerald-900 text-ivory-50' : 'text-emerald-900 hover:bg-ivory-200'
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  )
}
