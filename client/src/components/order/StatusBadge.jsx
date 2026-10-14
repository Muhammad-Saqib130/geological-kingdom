import { PAYMENT_LABELS, STATUS_LABELS } from '../../lib/orderLabels.js'

const tones = {
  pending: 'bg-gold-500/15 text-gold-600',
  paid: 'bg-emerald-900/10 text-emerald-900',
  shipped: 'bg-sky-100 text-sky-800',
  delivered: 'bg-emerald-900 text-ivory-50',
  cancelled: 'bg-ink/10 text-muted',
  awaiting_review: 'bg-amber-100 text-amber-800',
  rejected: 'bg-red-100 text-red-800',
  unpaid: 'bg-ivory-200 text-muted',
}

export default function StatusBadge({ status, kind = 'order' }) {
  const label = (kind === 'payment' ? PAYMENT_LABELS : STATUS_LABELS)[status] ?? status
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] ${tones[status] ?? 'bg-ivory-200 text-muted'}`}>{label}</span>
}
