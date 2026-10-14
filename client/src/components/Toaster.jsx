import { useToasts } from '../store/toastStore.js'

const tones = {
  success: 'border-emerald-700 bg-emerald-900 text-ivory-50',
  error: 'border-red-800 bg-red-700 text-white',
  info: 'border-ivory-200 bg-white text-ink',
}

export default function Toaster() {
  const toasts = useToasts((s) => s.toasts)
  const dismiss = useToasts((s) => s.dismiss)

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
      {toasts.map((t) => (
        <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'} className={`pointer-events-auto flex max-w-sm items-start gap-3 border px-4 py-3 text-sm shadow-lg ${tones[t.tone]}`}>
          <p className="flex-1">{t.message}</p>
          <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="opacity-70 hover:opacity-100">✕</button>
        </div>
      ))}
    </div>
  )
}
