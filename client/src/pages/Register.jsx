import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { TextField } from '../components/admin/form.jsx'
import { useAuth } from '../store/authStore.js'

const safeNext = (next) => (next && next.startsWith('/') && !next.startsWith('//') ? next : null)

export default function Register() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const register = useAuth((s) => s.register)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setErrors({})
    try {
      await register({ ...form, phone: form.phone.trim() || undefined })
      navigate(safeNext(params.get('next')) ?? '/account/orders', { replace: true })
    } catch (err) {
      if (err.details?.length) setErrors(err.fieldErrors)
      else setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <title>Create an account · Geological Kingdom</title>
      <h1 className="section-title">Create an account</h1>
      <p className="section-subtitle">Keep your orders in one place</p>

      <form onSubmit={submit} className="mt-10 space-y-5 border border-ivory-200 bg-white p-6 sm:p-8" noValidate>
        {error && <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <TextField label="Full name" autoComplete="name" required value={form.name} onChange={set('name')} error={errors.name} />
        <TextField label="Email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} error={errors.email} />
        <TextField label="Phone / WhatsApp (optional)" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
        <TextField label="Password" type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={set('password')} error={errors.password} hint="At least 8 characters" />
        <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account? <Link to={`/login${params.get('next') ? `?next=${encodeURIComponent(params.get('next'))}` : ''}`} className="text-emerald-900 underline underline-offset-4">Sign in</Link>
      </p>
    </section>
  )
}
