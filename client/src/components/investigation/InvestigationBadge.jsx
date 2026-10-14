import { INVESTIGATION_STATUS_LABELS } from '../../lib/investigationLabels.js'

const tones = {
  received: 'bg-gold-500/15 text-gold-600',
  contacted: 'bg-sky-100 text-sky-800',
  payment_arranged: 'bg-emerald-900/10 text-emerald-900',
  in_progress: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-900 text-ivory-50',
  cancelled: 'bg-ink/10 text-muted',
}

export default function InvestigationBadge({ status }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] ${tones[status] ?? 'bg-ivory-200 text-muted'}`}>
      {INVESTIGATION_STATUS_LABELS[status] ?? status}
    </span>
  )
}
