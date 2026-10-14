import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SelectField, TextArea, TextField } from '../../components/admin/form.jsx'
import { CertificateIcon, CheckIcon, GemIcon, LoupeIcon, ShieldIcon, WhatsAppIcon } from '../../components/icons.jsx'
import PhotoPicker from '../../components/investigation/PhotoPicker.jsx'
import { api } from '../../lib/api.js'
import { COUNTRIES } from '../../lib/geo.js'
import { FEE_USD, GEM_SUGGESTIONS, MAX_GEMS, MAX_PHOTOS, VERDICTS } from '../../lib/investigationLabels.js'
import { whatsappLink } from '../../lib/whatsapp.js'
import { useAuth } from '../../store/authStore.js'
import { formatMoney, useCurrency } from '../../store/currencyStore.js'

const STEPS = [
  { title: 'Send photos and details', body: 'Fill in the form below with clear photos of the stone, where you bought it and what the seller told you. Sending a request is free.' },
  { title: 'We contact you on WhatsApp', body: `We confirm what we need and arrange the fee of $${FEE_USD} per gemstone. If the stone has to be seen in person, we explain how to send or bring it to us in Namak Mandi, Peshawar.` },
  { title: 'Our gemologist examines it', body: 'We compare what we see with the seller’s claims and any certificate you have. You can follow each step with your tracking ID.' },
  { title: 'You receive a verdict and report', body: 'We email you the verdict with a written explanation, and a report you can keep. It is also shown on your tracking page.' },
]

const CHECKS = [
  { icon: GemIcon, title: 'Identity', body: 'Is it really the gem it was sold as, or a look-alike such as glass, quartz or a cheaper stone?' },
  { icon: LoupeIcon, title: 'Natural or lab-grown', body: 'Signs that separate a natural crystal from a synthetic grown in a laboratory.' },
  { icon: ShieldIcon, title: 'Treatments', body: 'Heating, oil or resin in emeralds, glass filling in rubies, dyeing and coatings.' },
  { icon: CertificateIcon, title: 'Claims and certificate', body: 'Whether the seller’s description, weight and any certificate match the stone in front of us.' },
]

const EMPTY = {
  contact: { name: '', email: '', whatsapp: '', country: 'PK' },
  gem: { type: '', count: '1', purchasedFrom: '', sellerClaims: '', description: '' },
}

function clientErrors(f, photos) {
  const e = {}
  const req = (key, value, msg) => !String(value ?? '').trim() && (e[key] = msg)
  req('contact.name', f.contact.name, 'Enter your name')
  req('contact.email', f.contact.email, 'Enter your email')
  if (f.contact.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.contact.email.trim())) e['contact.email'] = 'Enter a valid email address'
  req('contact.whatsapp', f.contact.whatsapp, 'Enter your WhatsApp number')
  req('gem.type', f.gem.type, 'Tell us what gemstone it is said to be')
  const count = Number(f.gem.count)
  if (!Number.isInteger(count) || count < 1 || count > MAX_GEMS) e['gem.count'] = `Enter a number from 1 to ${MAX_GEMS}`
  req('gem.purchasedFrom', f.gem.purchasedFrom, 'Tell us where you bought it')
  if (!photos.length) e.photos = 'Add at least one photo'
  return e
}

export default function Investigation() {
  const formRef = useRef(null)
  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const pkrPerUsd = useCurrency((s) => s.pkrPerUsd)
  const help = whatsappLink('Hello Geological Kingdom, I have a question about Gem Investigation.')

  return (
    <>
      <title>Gem Investigation · Geological Kingdom</title>
      <meta name="description" content={`Bought a gemstone elsewhere? Our gemologists check identity, treatments and the seller’s claims for $${FEE_USD} per stone.`} />

      <section className="bg-sparkle text-ivory-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_320px] lg:items-center lg:py-24">
          <div>
            <p className="eyebrow text-gold-300!">Gem Investigation</p>
            <h1 className="mt-4 text-4xl text-ivory-50! sm:text-5xl lg:text-6xl">Bought a gem elsewhere? Let us check it.</h1>
            <p className="mt-5 max-w-xl leading-relaxed text-ivory-100/80">
              Send us photos of a stone you already own. Our gemologists in Namak Mandi, Peshawar check what it really is, whether it has been treated, and whether it matches what you were told.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={scrollToForm} className="btn-light">Start a request</button>
              <Link to="/investigation/track" className="btn border border-ivory-50/40 text-ivory-50 hover:bg-ivory-50/10">Track a request</Link>
            </div>
          </div>
          <div className="border border-gold-500/40 bg-emerald-950/60 p-8 text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-gold-300">Fee</p>
            <p className="mt-3 font-serif text-6xl text-ivory-50">${FEE_USD}</p>
            <p className="mt-1 text-sm uppercase tracking-[0.2em] text-ivory-100/80">per gemstone</p>
            {pkrPerUsd && <p className="mt-3 text-xs text-ivory-100/60">About {formatMoney(FEE_USD * pkrPerUsd, 'PKR')}</p>}
            <p className="mt-5 border-t border-ivory-50/15 pt-5 text-xs leading-relaxed text-ivory-100/70">Sending a request is free. You pay only after we contact you and confirm we can help.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="how" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <h2 id="how" className="section-title">How it works</h2>
        <p className="section-subtitle">Four steps, start to finish</p>
        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="border-t border-gold-500/50 pt-5">
              <span className="font-serif text-4xl text-gold-600">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-2 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-emerald-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="checks" className="bg-mist">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <h2 id="checks" className="section-title">What we check</h2>
          <p className="section-subtitle">The questions buyers ask most</p>
          <ul className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {CHECKS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="text-center">
                <Icon className="mx-auto h-10 w-10 text-gold-600" strokeWidth={1.1} />
                <h3 className="mt-4 font-sans text-xs font-semibold uppercase tracking-[0.22em] text-emerald-900">{title}</h3>
                <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ul>

          <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_1fr]">
            <div className="bg-white p-6 sm:p-8">
              <h3 className="font-serif text-2xl">The verdicts you can receive</h3>
              <dl className="mt-4 divide-y divide-ivory-200">
                {VERDICTS.map((v) => (
                  <div key={v.value} className="py-3">
                    <dt className="text-sm font-semibold text-emerald-900">{v.label}</dt>
                    <dd className="mt-0.5 text-sm text-muted">{v.body}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="bg-white p-6 sm:p-8">
              <h3 className="font-serif text-2xl">What photos can and cannot show</h3>
              <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
                <p>Good photos answer many questions: obvious glass, plastic, doublets and a lot of look-alike stones. Other questions, such as some treatments or telling natural from lab-grown, need the stone under magnification and instruments.</p>
                <p>When that is the case, we tell you before you pay and explain how to get the stone to us. We would rather say “inconclusive” than guess.</p>
                <p>Geographic origin (for example Swat or Colombia for an emerald) usually needs an advanced gem laboratory, and we will say so if it cannot be confirmed.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={formRef} aria-labelledby="request" className="mx-auto max-w-4xl scroll-mt-24 px-4 py-16 sm:px-6 lg:py-20">
        <h2 id="request" className="section-title">Request an investigation</h2>
        <p className="section-subtitle">${FEE_USD} per gemstone · pay after we contact you</p>
        <RequestForm />
        <div className="mt-10 flex flex-col items-center gap-3 text-center text-sm text-muted sm:flex-row sm:justify-center">
          <span>Already sent a request?</span>
          <Link to="/investigation/track" className="text-emerald-900 underline underline-offset-4">Track it with your tracking ID</Link>
          {help && (
            <>
              <span className="hidden sm:inline" aria-hidden="true">·</span>
              <a href={help} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-emerald-900 underline underline-offset-4"><WhatsAppIcon className="h-4 w-4" /> Questions? WhatsApp us</a>
            </>
          )}
        </div>
      </section>
    </>
  )
}

function RequestForm() {
  const user = useAuth((s) => s.user)
  const [form, setForm] = useState(EMPTY)
  const [photos, setPhotos] = useState([])
  const [certificate, setCertificate] = useState([])
  const [uploading, setUploading] = useState({ photos: false, certificate: false })
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(null)
  const topRef = useRef(null)

  // Prefill for signed-in customers
  const [prefilled, setPrefilled] = useState(false)
  if (user && !prefilled) {
    setPrefilled(true)
    setForm((f) => ({ ...f, contact: { ...f.contact, name: f.contact.name || user.name, email: f.contact.email || user.email, whatsapp: f.contact.whatsapp || user.phone || '' } }))
  }

  const set = (group, key) => (e) => {
    const value = e.target.value
    setForm((f) => ({ ...f, [group]: { ...f[group], [key]: value } }))
    const errKey = `${group}.${key}`
    if (errors[errKey]) setErrors(({ [errKey]: _removed, ...rest }) => rest)
  }
  const err = (key) => errors[key]
  const busy = uploading.photos || uploading.certificate
  const count = Number(form.gem.count)
  const fee = Number.isInteger(count) && count >= 1 && count <= MAX_GEMS ? FEE_USD * count : null

  const submit = async (e) => {
    e.preventDefault()
    setNotice(null)
    const found = clientErrors(form, photos)
    setErrors(found)
    if (Object.keys(found).length) {
      setNotice('Please check the highlighted fields.')
      requestAnimationFrame(() => document.querySelector('[aria-invalid="true"], [data-error="true"]')?.focus())
      return
    }
    setSending(true)
    try {
      const trim = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || undefined : v]))
      const body = {
        contact: trim(form.contact),
        gem: { ...trim(form.gem), count },
        photos,
        certificate: certificate[0],
      }
      const res = await api('/investigations', { method: 'POST', json: body })
      setDone({ ...res, email: body.contact.email, whatsapp: body.contact.whatsapp })
      requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    } catch (error) {
      if (error.fieldErrors) setErrors(error.fieldErrors)
      setNotice(error.message)
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return (
      <div ref={topRef} className="mx-auto mt-10 max-w-xl scroll-mt-24 border border-emerald-900/20 bg-white p-8 text-center" role="status">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-900 text-ivory-50"><CheckIcon className="h-7 w-7" strokeWidth={2} /></span>
        <h3 className="mt-5 font-serif text-3xl">Request received</h3>
        <p className="mt-4 text-[11px] uppercase tracking-[0.25em] text-muted">Your tracking ID</p>
        <p className="mt-1 flex items-center justify-center gap-3 font-mono text-2xl font-semibold tracking-wider text-emerald-900">
          {done.trackingId}
          <CopyButton text={done.trackingId} />
        </p>
        <p className="mt-5 text-sm leading-relaxed text-muted">
          We have emailed a confirmation to <strong className="text-ink">{done.email}</strong>. We will contact you on WhatsApp at <strong className="text-ink">{done.whatsapp}</strong> to arrange the fee of <strong className="text-ink">${done.feeUSD}</strong>.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to={`/investigation/track/${done.trackingId}?token=${encodeURIComponent(done.token)}`} className="btn-primary">Track your request</Link>
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              setDone(null)
              setPhotos([])
              setCertificate([])
              setForm((f) => ({ ...f, gem: EMPTY.gem }))
            }}
          >
            Check another gem
          </button>
        </div>
      </div>
    )
  }

  return (
    <form ref={topRef} onSubmit={submit} noValidate className="mt-10 scroll-mt-24 space-y-8">
      {notice && <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{notice}</p>}

      <fieldset className="border border-ivory-200 bg-white p-5 sm:p-7">
        <legend className="px-2 font-serif text-2xl text-emerald-900">Your details</legend>
        <div className="mt-2 grid gap-5 sm:grid-cols-2">
          <TextField label="Full name" required autoComplete="name" value={form.contact.name} onChange={set('contact', 'name')} error={err('contact.name')} maxLength={80} />
          <TextField label="Email" required type="email" autoComplete="email" value={form.contact.email} onChange={set('contact', 'email')} error={err('contact.email')} hint="Your confirmation and result are sent here" maxLength={254} />
          <TextField label="WhatsApp number" required type="tel" autoComplete="tel" value={form.contact.whatsapp} onChange={set('contact', 'whatsapp')} error={err('contact.whatsapp')} hint="With country code, e.g. +92 300 1234567" maxLength={20} />
          <SelectField label="Country" required autoComplete="country" value={form.contact.country} onChange={set('contact', 'country')} error={err('contact.country')} options={COUNTRIES.map((c) => ({ value: c.code, label: c.name }))} />
        </div>
      </fieldset>

      <fieldset className="border border-ivory-200 bg-white p-5 sm:p-7">
        <legend className="px-2 font-serif text-2xl text-emerald-900">The gemstone</legend>
        <div className="mt-2 grid gap-5 sm:grid-cols-[1fr_180px]">
          <TextField label="What were you told it is?" required list="gem-suggestions" value={form.gem.type} onChange={set('gem', 'type')} error={err('gem.type')} placeholder="e.g. Emerald" maxLength={80} />
          <datalist id="gem-suggestions">{GEM_SUGGESTIONS.map((g) => <option key={g} value={g} />)}</datalist>
          <TextField
            label="Number of gemstones"
            required
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_GEMS}
            value={form.gem.count}
            onChange={set('gem', 'count')}
            error={err('gem.count')}
            hint={fee ? `Fee: $${fee}` : `1 to ${MAX_GEMS}`}
          />
          <TextField className="sm:col-span-2" label="Where did you buy it?" required value={form.gem.purchasedFrom} onChange={set('gem', 'purchasedFrom')} error={err('gem.purchasedFrom')} placeholder="Shop, market, city or website" maxLength={160} />
          <TextArea className="sm:col-span-2" label="What did the seller claim?" value={form.gem.sellerClaims} onChange={set('gem', 'sellerClaims')} error={err('gem.sellerClaims')} placeholder="e.g. Natural, unheated, from Swat, 2.1 carats, price paid" maxLength={1000} rows={3} />
          <TextArea className="sm:col-span-2" label="Anything else we should know?" value={form.gem.description} onChange={set('gem', 'description')} error={err('gem.description')} placeholder="Size or weight, colour, how it looks under light, anything that made you doubt it" maxLength={2000} rows={3} />
        </div>
      </fieldset>

      <fieldset className="border border-ivory-200 bg-white p-5 sm:p-7">
        <legend className="px-2 font-serif text-2xl text-emerald-900">Photos</legend>
        <div className="mt-2 space-y-8" data-error={errors.photos ? 'true' : undefined} tabIndex={errors.photos ? -1 : undefined}>
          <PhotoPicker
            label={`Gemstone photos (1 to ${MAX_PHOTOS}) *`}
            photos={photos}
            onChange={(next) => {
              setPhotos(next)
              if (next.length && errors.photos) setErrors(({ photos: _removed, ...rest }) => rest)
            }}
            max={MAX_PHOTOS}
            error={errors.photos}
            onBusyChange={(b) => setUploading((u) => (u.photos === b ? u : { ...u, photos: b }))}
            hint="Daylight or a white lamp, on a plain background. Show the top, the side and the back, and put a coin or ruler next to the stone for size. JPG, PNG or WebP, up to 10 MB each."
          />
          <PhotoPicker
            label="Certificate photo (optional)"
            photos={certificate}
            onChange={setCertificate}
            max={1}
            onBusyChange={(b) => setUploading((u) => (u.certificate === b ? u : { ...u, certificate: b }))}
            hint="If the seller gave you a lab certificate or card, a clear photo of it helps us compare."
          />
        </div>
      </fieldset>

      <div className="flex flex-col items-center gap-3 text-center">
        <button type="submit" className="btn-primary w-full sm:w-auto sm:min-w-72" disabled={sending || busy}>
          {busy ? 'Uploading photos…' : sending ? 'Sending…' : 'Send request'}
        </button>
        <p className="max-w-md text-xs text-muted">
          Sending is free. We will contact you on WhatsApp to arrange the fee{fee ? ` of $${fee}` : ''} before we start.
        </p>
      </div>
    </form>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          // clipboard unavailable; the ID is selectable text
        }
      }}
      className="rounded-full border border-ivory-200 px-2.5 py-0.5 font-sans text-[10px] font-normal uppercase tracking-[0.12em] text-muted hover:text-emerald-900"
      aria-label="Copy tracking ID"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
