import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { TextField } from '../components/admin/form.jsx'
import { useAuth } from '../store/authStore.js'

// Only same-site paths are allowed as a post-login destination (no open redirects).
const safeNext = (next) => (next && next.startsWith('/') && !next.startsWith('//') ? next : null)

export default function Login() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const login = useAuth((s) => s.login)
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const user = await login(form.email, form.password)
      navigate(safeNext(params.get('next')) ?? (user.role === 'admin' ? '/admin/products' : '/'), { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <p className="eyebrow text-center">Welcome back</p>
      <h1 className="mt-2 text-center text-4xl">Sign in</h1>

      <form onSubmit={submit} className="mt-10 space-y-5 border border-ivory-200 bg-white p-6 sm:p-8" noValidate>
        {error && <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <TextField label="Email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <TextField label="Password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button type="submit" className="btn-primary w-full" disabled={busy || !form.email || !form.password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        <Link to="/" className="underline-offset-4 hover:underline">Back to the store</Link>
      </p>
    </section>
  )
}
