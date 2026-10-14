import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '../../components/admin/form.jsx'
import { WhatsAppIcon } from '../../components/icons.jsx'
import InvestigationBadge from '../../components/investigation/InvestigationBadge.jsx'
import { useApi } from '../../hooks/useApi.js'
import { api } from '../../lib/api.js'
import { countryName } from '../../lib/geo.js'
import { imageUrl } from '../../lib/images.js'
import { INVESTIGATION_STATUS_LABELS, VERDICTS, VERDICT_LABELS } from '../../lib/investigationLabels.js'
import { uploadImage } from '../../lib/upload.js'
import { toast } from '../../store/toastStore.js'

const ORDER = ['received', 'contacted', 'payment_arranged', 'in_progress', 'completed', 'cancelled']
const fmt = (d) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// wa.me needs digits in international format; Pakistani numbers are often typed as 03xx…
function whatsappTo(number, country, message) {
  let digits = number.replace(/\D/g, '')
  if (!number.trim().startsWith('+') && country === 'PK' && digits.startsWith('0')) digits = `92${digits.slice(1)}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

const isPdf = (file) => file && (file.format === 'pdf' || /\.pdf($|\?)/i.test(file.url))

export default function AdminInvestigationDetail() {
  const { trackingId } = useParams()
  const [refresh, setRefresh] = useState(0)
  const [override, setOverride] = useState(null)
  const { data, error } = useApi(`/admin/investigations/${trackingId}`, refresh)
  const inv = override?.trackingId === trackingId ? override : data?.investigation

  if (error) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-3xl">{error.status === 404 ? 'Request not found' : 'Could not load the request'}</h1>
        <Link to="/admin/investigations" className="btn-outline mt-6">Back to investigations</Link>
      </div>
    )
  }
  if (!inv) return <p className="py-16 text-center text-sm text-muted" role="status">Loading request…</p>

  const run = async (path, init, success) => {
    try {
      const res = await api(`/admin/investigations/${inv.trackingId}${path}`, init)
      setOverride(res.investigation)
      toast.success(success)
      return true
    } catch (err) {
      toast.error(err.message)
      setRefresh((r) => r + 1)
      return false
    }
  }

  const g = inv.gem
  const first = inv.contact.name.split(' ')[0]
  const wa = whatsappTo(inv.contact.whatsapp, inv.contact.country, `Hello ${first}, this is Geological Kingdom about your Gem Investigation ${inv.trackingId} (${g.count} × ${g.type}).`)

  return (
    <>
      <div className="mb-6">
        <Link to="/admin/investigations" className="text-xs uppercase tracking-[0.15em] text-muted hover:text-emerald-900">← Investigations</Link>
        <h1 className="font-mono text-3xl font-semibold tracking-wide sm:text-4xl">{inv.trackingId}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
          Submitted {fmt(inv.createdAt)} · <InvestigationBadge status={inv.status} /> · Fee ${inv.feeUSD}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card title="Gemstone">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs uppercase tracking-wider text-muted">Said to be</dt><dd className="mt-0.5 font-medium">{g.type}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-muted">Number of stones</dt><dd className="mt-0.5 font-medium">{g.count} (${inv.feeUSD})</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wider text-muted">Bought from</dt><dd className="mt-0.5">{g.purchasedFrom}</dd></div>
              {g.sellerClaims && <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wider text-muted">Seller’s claims</dt><dd className="mt-0.5 whitespace-pre-line">{g.sellerClaims}</dd></div>}
              {g.description && <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wider text-muted">Customer’s description</dt><dd className="mt-0.5 whitespace-pre-line">{g.description}</dd></div>}
            </dl>
          </Card>

          <Card title={`Photos (${inv.photos.length})`}>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {inv.photos.map((p, i) => (
                <li key={p.publicId}>
                  <a href={p.url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden border border-ivory-200 bg-ivory-50" title="Open full size">
                    <img loading="lazy" decoding="async" src={imageUrl(p.url, { width: 480 })} alt={`Customer photo ${i + 1}`} className="h-full w-full object-cover" />
                  </a>
                </li>
              ))}
            </ul>
            {inv.certificate && (
              <div className="mt-5 border-t border-ivory-200 pt-5">
                <p className="mb-2 text-xs uppercase tracking-wider text-muted">Certificate</p>
                <a href={inv.certificate.url} target="_blank" rel="noreferrer" className="block max-w-sm border border-ivory-200 bg-ivory-50" title="Open full size">
                  <img loading="lazy" decoding="async" src={imageUrl(inv.certificate.url, { width: 720 })} alt="Certificate supplied by the customer" className="max-h-80 w-full object-contain" />
                </a>
              </div>
            )}
          </Card>

          <ResultCard inv={inv} run={run} />

          <Card title="History">
            <ol className="space-y-3 text-sm">
              {[...inv.statusHistory].reverse().map((h, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />
                  <div>
                    <p><strong>{INVESTIGATION_STATUS_LABELS[h.status] ?? h.status}</strong>{h.note && <> · {h.note}</>}</p>
                    <p className="text-xs text-muted">{fmt(h.at)}{h.by?.name && ` · ${h.by.name}`}</p>
                  </div>
                </li>
              ))}
            </ol>
            {(inv.receivedEmailAt || inv.completedEmailAt) && (
              <p className="mt-4 border-t border-ivory-200 pt-3 text-xs text-muted">
                {inv.receivedEmailAt && <>Confirmation emailed {fmt(inv.receivedEmailAt)}. </>}
                {inv.completedEmailAt && <>Result emailed {fmt(inv.completedEmailAt)}.</>}
              </p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <StatusCard inv={inv} run={run} />

          <Card title="Customer">
            <p className="text-sm font-medium">{inv.contact.name}</p>
            <p className="text-sm"><a href={`mailto:${inv.contact.email}`} className="text-emerald-900 hover:underline">{inv.contact.email}</a></p>
            <p className="text-sm">{inv.contact.whatsapp} · {countryName(inv.contact.country)}</p>
            <p className="mt-2 text-xs text-muted">{inv.user ? `Account: ${inv.user.email}` : 'Sent without an account'}</p>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn mt-4 w-full border border-[#1f8f4e] px-4! py-2! text-xs! text-[#17703d] hover:bg-[#1f8f4e] hover:text-white">
              <WhatsAppIcon className="h-4 w-4" /> Message on WhatsApp
            </a>
          </Card>

          <NotesCard inv={inv} run={run} />
        </div>
      </div>
    </>
  )
}

function StatusCard({ inv, run }) {
  const [status, setStatus] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const hasResult = Boolean(inv.result?.verdict && inv.result?.summary)
  const options = ORDER.filter((s) => s !== inv.status)

  const submit = async (e) => {
    e.preventDefault()
    if (!status) return
    setBusy(true)
    const message = status === 'completed' ? 'Marked completed; the result has been emailed to the customer' : `Marked ${INVESTIGATION_STATUS_LABELS[status].toLowerCase()}`
    if (await run('/status', { method: 'PATCH', json: { status, note: note.trim() || undefined } }, message)) {
      setStatus('')
      setNote('')
    }
    setBusy(false)
  }

  return (
    <Card title="Update status">
      <form onSubmit={submit} className="space-y-4">
        <fieldset>
          <legend className="sr-only">New status</legend>
          <div className="flex flex-wrap gap-2">
            {options.map((s) => {
              const blocked = s === 'completed' && !hasResult
              return (
                <label
                  key={s}
                  className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.12em] ${blocked ? 'cursor-not-allowed border-ivory-200 text-muted/60' : 'cursor-pointer'} ${status === s ? (s === 'cancelled' ? 'border-red-700 bg-red-700 text-white' : 'border-emerald-900 bg-emerald-900 text-ivory-50') : blocked ? '' : 'border-ivory-200 text-ink hover:border-emerald-700'}`}
                >
                  <input type="radio" name="status" value={s} checked={status === s} disabled={blocked} onChange={() => setStatus(s)} className="sr-only" />
                  {INVESTIGATION_STATUS_LABELS[s]}
                </label>
              )
            })}
          </div>
        </fieldset>
        {!hasResult && inv.status !== 'completed' && <p className="text-xs text-muted">Save a verdict and summary below before marking the request completed.</p>}
        {status === 'completed' && <p className="border-l-2 border-gold-500 bg-ivory-50 px-3 py-2 text-xs">The customer will be emailed the verdict, summary and report.</p>}
        {status === 'cancelled' && <p className="border-l-2 border-red-700 bg-red-50 px-3 py-2 text-xs text-red-900">The customer is not emailed; their tracking page will show the request as closed.</p>}
        {status && (
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">Note (internal)</span>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="w-full border border-ivory-200 px-3 py-2" placeholder="e.g. Paid by JazzCash, TID 123…" />
          </label>
        )}
        <button type="submit" className="btn-primary w-full" disabled={!status || busy}>{busy ? 'Saving…' : 'Update status'}</button>
      </form>
    </Card>
  )
}

function ResultCard({ inv, run }) {
  const saved = inv.result ?? {}
  const [verdict, setVerdict] = useState(saved.verdict ?? '')
  const [summary, setSummary] = useState(saved.summary ?? '')
  const [report, setReport] = useState(saved.report ?? null)
  const [upload, setUpload] = useState({ busy: false, progress: 0, error: null })
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  const dirty = verdict !== (saved.verdict ?? '') || summary !== (saved.summary ?? '') || (report?.publicId ?? null) !== (saved.report?.publicId ?? null)

  const pick = async (file) => {
    if (!file) return
    setUpload({ busy: true, progress: 0, error: null })
    try {
      const ref = await uploadImage(file, 'investigation-reports', { onProgress: (progress) => setUpload((u) => ({ ...u, progress })) })
      setReport({ url: ref.url, publicId: ref.publicId, format: ref.format, bytes: ref.bytes })
      setUpload({ busy: false, progress: 0, error: null })
    } catch (err) {
      setUpload({ busy: false, progress: 0, error: err.message })
    }
  }

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    const body = { verdict, summary: summary.trim(), report }
    await run('/result', { method: 'PUT', json: body }, inv.status === 'completed' ? 'Result updated (the customer sees the change on their tracking page)' : 'Result saved')
    setBusy(false)
  }

  return (
    <Card title="Result">
      <form onSubmit={save} className="space-y-5">
        <fieldset>
          <legend className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Verdict</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {VERDICTS.map((v) => (
              <label key={v.value} className={`flex cursor-pointer gap-3 border p-3 text-sm ${verdict === v.value ? 'border-emerald-900 bg-emerald-900/5' : 'border-ivory-200 hover:border-emerald-700'}`}>
                <input type="radio" name="verdict" value={v.value} checked={verdict === v.value} onChange={() => setVerdict(v.value)} className="mt-0.5 accent-emerald-900" />
                <span>
                  <span className="block font-medium text-ink">{v.label}</span>
                  <span className="block text-xs text-muted">{v.body}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted">Summary for the customer</span>
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={5000} rows={6} className="w-full border border-ivory-200 px-3 py-2" placeholder="What we examined, what we found, and what it means for the customer." />
        </label>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">Report (PDF or image, optional)</p>
          {report ? (
            <div className="flex flex-wrap items-center gap-3 border border-ivory-200 bg-ivory-50 p-3 text-sm">
              {isPdf(report) ? (
                <span className="flex h-12 w-10 items-center justify-center border border-ivory-200 bg-white text-[10px] font-semibold text-red-800">PDF</span>
              ) : (
                <img loading="lazy" decoding="async" src={imageUrl(report.url, { width: 120 })} alt="Report preview" className="h-12 w-12 border border-ivory-200 object-cover" />
              )}
              <a href={report.url} target="_blank" rel="noreferrer" className="text-emerald-900 underline underline-offset-4">Open report</a>
              <span className="flex-1" />
              <button type="button" className="text-xs uppercase tracking-[0.12em] text-muted hover:text-emerald-900" onClick={() => inputRef.current?.click()} disabled={upload.busy}>Replace</button>
              <button type="button" className="text-xs uppercase tracking-[0.12em] text-red-700" onClick={() => setReport(null)} disabled={upload.busy}>Remove</button>
            </div>
          ) : (
            <button type="button" onClick={() => inputRef.current?.click()} disabled={upload.busy} className="btn-outline px-4! py-2! text-xs!">
              {upload.busy ? `Uploading ${Math.round(upload.progress * 100)}%` : 'Upload report'}
            </button>
          )}
          {upload.busy && report && <p className="mt-2 text-xs text-muted" role="status">Uploading {Math.round(upload.progress * 100)}%…</p>}
          {upload.error && <p role="alert" className="mt-2 text-xs text-red-700">{upload.error}</p>}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            hidden
            onChange={(e) => {
              pick(e.target.files[0])
              e.target.value = ''
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-ivory-200 pt-4">
          <button type="submit" className="btn-primary" disabled={busy || upload.busy || !dirty || !verdict || summary.trim().length < 10}>{busy ? 'Saving…' : 'Save result'}</button>
          {dirty && <span className="text-xs text-muted">Unsaved changes</span>}
          {!dirty && saved.verdict && <span className="text-xs text-muted">Saved: {VERDICT_LABELS[saved.verdict]}{saved.updatedAt && ` · ${fmt(saved.updatedAt)}`}</span>}
        </div>
        <p className="text-xs text-muted">The customer sees the result once the request is marked completed, and is emailed at that moment.</p>
      </form>
    </Card>
  )
}

function NotesCard({ inv, run }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    if (await run('/notes', { method: 'POST', json: { text: text.trim() } }, 'Note added')) setText('')
    setBusy(false)
  }

  return (
    <Card title="Internal notes">
      {inv.notes.length === 0 ? (
        <p className="text-sm text-muted">No notes yet. Customers never see these.</p>
      ) : (
        <ol className="space-y-3">
          {[...inv.notes].reverse().map((n) => (
            <li key={n._id ?? n.id ?? n.at} className="border-l-2 border-gold-500 bg-ivory-50 px-3 py-2 text-sm">
              <p className="whitespace-pre-line">{n.text}</p>
              <p className="mt-1 text-xs text-muted">{fmt(n.at)}{n.by?.name && ` · ${n.by.name}`}</p>
            </li>
          ))}
        </ol>
      )}
      <form onSubmit={submit} className="mt-4 space-y-2">
        <label className="sr-only" htmlFor="new-note">New note</label>
        <textarea id="new-note" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={3} className="w-full border border-ivory-200 px-3 py-2 text-sm" placeholder="e.g. Customer will courier the stone on Monday" />
        <button type="submit" className="btn-outline px-4! py-2! text-xs!" disabled={busy || !text.trim()}>{busy ? 'Adding…' : 'Add note'}</button>
      </form>
    </Card>
  )
}
