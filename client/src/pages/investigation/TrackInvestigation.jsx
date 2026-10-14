import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { TextField } from '../../components/admin/form.jsx'
import { CheckIcon, WhatsAppIcon } from '../../components/icons.jsx'
import InvestigationBadge from '../../components/investigation/InvestigationBadge.jsx'
import { api } from '../../lib/api.js'
import { imageUrl } from '../../lib/images.js'
import { INVESTIGATION_STATUS_LABELS, STATUS_MESSAGES, STEPS, VERDICTS } from '../../lib/investigationLabels.js'
import { useWhatsapp } from '../../lib/whatsapp.js'

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function TrackInvestigation() {
  const { trackingId: idParam } = useParams()
  const [params] = useSearchParams()
  const token = params.get('token') ?? undefined
  const navigate = useNavigate()
  const [form, setForm] = useState({ trackingId: idParam ?? '', email: '' })
  const [state, setState] = useState({ status: idParam && token ? 'loading' : 'idle', error: null, investigation: null })

  const lookup = async (body) => {
    setState((s) => ({ ...s, status: 'loading', error: null }))
    try {
      const { investigation } = await api('/investigations/track', { method: 'POST', json: body })
      setState({ status: 'done', error: null, investigation })
    } catch (err) {
      setState({ status: 'idle', error: err.fieldErrors?.trackingId ?? err.fieldErrors?.email ?? err.message, investigation: null })
    }
  }

  // Link from the email: look up straight away with its token
  useEffect(() => {
    if (idParam && token) lookup({ trackingId: idParam, token })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idParam, token])

  const submit = (e) => {
    e.preventDefault()
    if (!form.trackingId.trim() || !form.email.trim()) {
      setState((s) => ({ ...s, error: 'Enter your tracking ID and the email you used' }))
      return
    }
    lookup({ trackingId: form.trackingId.trim(), email: form.email.trim() })
  }

  const inv = state.investigation
  if (inv) {
    return (
      <Result
        inv={inv}
        onBack={() => {
          setState({ status: 'idle', error: null, investigation: null })
          if (idParam) navigate('/investigation/track', { replace: true })
        }}
      />
    )
  }

  return (
    <section className="mx-auto max-w-lg px-4 py-16 sm:py-24">
      <title>Track a Gem Investigation · Geological Kingdom</title>
      <p className="eyebrow text-center">Gem Investigation</p>
      <h1 className="mt-3 text-center text-4xl sm:text-5xl">Track your request</h1>
      <p className="mt-4 text-center text-muted">Enter the tracking ID from your confirmation email and the email address you used.</p>

      {state.status === 'loading' && idParam && token ? (
        <p className="mt-10 text-center text-sm text-muted" role="status">Loading your request…</p>
      ) : (
        <form onSubmit={submit} noValidate className="mt-10 space-y-5 border border-ivory-200 bg-white p-6 sm:p-8">
          {state.error && <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{state.error}</p>}
          <TextField
            label="Tracking ID"
            required
            value={form.trackingId}
            onChange={(e) => setForm({ ...form, trackingId: e.target.value })}
            placeholder="GI-XXXX-XXXX"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={20}
            className="[&_input]:font-mono [&_input]:uppercase"
          />
          <TextField label="Email" required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={254} />
          <button type="submit" className="btn-primary w-full" disabled={state.status === 'loading'}>{state.status === 'loading' ? 'Checking…' : 'Check status'}</button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-muted">
        Haven’t sent a request yet? <Link to="/investigation" className="text-emerald-900 underline underline-offset-4">Start one here</Link>
      </p>
    </section>
  )
}

function Result({ inv, onBack }) {
  const whatsappApi = useWhatsapp()
  const help = whatsappApi.link(`Hello Geological Kingdom, I have a question about my Gem Investigation ${inv.trackingId}.`)
  const verdict = VERDICTS.find((v) => v.value === inv.result?.verdict)
  const report = inv.result?.report
  const reportIsPdf = report && (report.format === 'pdf' || /\.pdf($|\?)/i.test(report.url))

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
      <title>{`Gem Investigation ${inv.trackingId} · Geological Kingdom`}</title>
      <header className="text-center">
        <p className="eyebrow">Gem Investigation</p>
        <h1 className="mt-2 font-mono text-3xl font-semibold tracking-wider sm:text-4xl">{inv.trackingId}</h1>
        <p className="mt-2 text-sm text-muted">Submitted {fmtDate(inv.createdAt)} · {inv.gem.count} × {inv.gem.type}</p>
      </header>

      <Progress inv={inv} />

      <p className="mx-auto mt-8 max-w-xl text-center text-sm leading-relaxed text-ink">{STATUS_MESSAGES[inv.status]}</p>

      {inv.status === 'completed' && verdict && (
        <section aria-labelledby="result" className="mt-10 border border-gold-500/50 bg-white p-6 sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.25em] text-gold-600">Verdict</p>
          <h2 id="result" className="mt-2 text-3xl sm:text-4xl">{verdict.label}</h2>
          <p className="mt-1 text-sm text-muted">{verdict.body}</p>
          <div className="mt-6 whitespace-pre-line border-t border-ivory-200 pt-6 leading-relaxed text-ink">{inv.result.summary}</div>
          {report && (
            <a href={report.url} target="_blank" rel="noopener noreferrer" className="btn-primary mt-6">
              {reportIsPdf ? 'Download the report (PDF)' : 'View the report'}
            </a>
          )}
        </section>
      )}

      <div className="mt-10 grid gap-6 md:grid-cols-[1fr_300px]">
        <section className="border border-ivory-200 bg-white p-6">
          <h2 className="font-serif text-2xl uppercase tracking-[0.12em]">Your photos</h2>
          <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {[...inv.photos, ...(inv.certificate ? [inv.certificate] : [])].map((p, i) => (
              <li key={p.publicId} className="aspect-square overflow-hidden border border-ivory-200 bg-ivory-50">
                <img loading="lazy" decoding="async" src={imageUrl(p.url, { width: 240 })} alt={p === inv.certificate ? 'Certificate' : `Photo ${i + 1}`} className="h-full w-full object-cover" />
              </li>
            ))}
          </ul>
        </section>
        <aside className="space-y-4">
          <section className="border border-ivory-200 bg-white p-6 text-sm">
            <h2 className="font-serif text-xl uppercase tracking-[0.12em]">Summary</h2>
            <dl className="mt-3 space-y-2">
              <div className="flex justify-between gap-3"><dt className="text-muted">Status</dt><dd><InvestigationBadge status={inv.status} /></dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Gemstones</dt><dd className="text-right">{inv.gem.count} × {inv.gem.type}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Fee</dt><dd>${inv.feeUSD}</dd></div>
            </dl>
          </section>
          {help && (
            <a href={help} target="_blank" rel="noopener noreferrer" className="btn w-full border border-[#1f8f4e] text-[#17703d] hover:bg-[#1f8f4e] hover:text-white">
              <WhatsAppIcon className="h-5 w-5" /> Questions? WhatsApp us
            </a>
          )}
          <button type="button" onClick={onBack} className="block w-full text-center text-xs uppercase tracking-[0.15em] text-muted underline-offset-4 hover:text-emerald-900 hover:underline">
            Look up another request
          </button>
        </aside>
      </div>
    </div>
  )
}

function Progress({ inv }) {
  if (inv.status === 'cancelled') {
    return <p className="mt-8 text-center"><InvestigationBadge status="cancelled" /></p>
  }
  const current = STEPS.indexOf(inv.status)
  const at = (s) => inv.statusHistory.findLast?.((h) => h.status === s)?.at
  return (
    <ol className="mx-auto mt-10 flex max-w-3xl items-start" aria-label="Request progress">
      {STEPS.map((s, i) => (
        <li key={s} className="relative flex flex-1 flex-col items-center text-center" aria-current={i === current ? 'step' : undefined}>
          {i > 0 && <span className={`absolute right-1/2 top-4 h-px w-full ${i <= current ? 'bg-emerald-900' : 'bg-ivory-200'}`} aria-hidden="true" />}
          <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs ${i <= current ? 'bg-emerald-900 text-ivory-50' : 'border border-ivory-200 bg-white text-muted'}`}>
            {i < current || (i === current && s === 'completed') ? <CheckIcon className="h-4 w-4" strokeWidth={2} /> : i + 1}
          </span>
          <span className={`mt-2 px-0.5 text-[10px] uppercase leading-tight tracking-[0.12em] sm:text-[11px] sm:tracking-[0.16em] ${i <= current ? 'text-emerald-900' : 'text-muted'}`}>{INVESTIGATION_STATUS_LABELS[s]}</span>
          {i <= current && at(s) && <span className="mt-0.5 hidden text-[11px] text-muted sm:block">{fmtDate(at(s))}</span>}
        </li>
      ))}
    </ol>
  )
}
