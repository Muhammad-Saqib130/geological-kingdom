import { formatMoney, useCurrency, useDisplayCurrency } from '../store/currencyStore.js'

export default function Price({ pkr, className = '' }) {
  const currency = useDisplayCurrency()
  const rate = useCurrency((s) => s.pkrPerUsd)
  const amount = currency === 'USD' ? pkr / rate : pkr
  return <span className={className}>{formatMoney(amount, currency)}</span>
}
