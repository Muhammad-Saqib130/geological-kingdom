import { useState } from 'react'
import { api } from '../../lib/api.js'
import { CheckIcon } from '../icons.jsx'

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState({ status: 'idle', message: '' })

  const submit = async (e) => {
    e.preventDefault()
    setState({ status: 'sending', message: '' })
    try {
      const { message } = await api('/newsletter', { method: 'POST', json: { email, source: 'home' } })
      setState({ status: 'done', message })
      setEmail('')
    } catch (err) {
      setState({ status: 'error', message: err.fieldErrors?.email ?? err.message })
    }
  }

  return (
    <section aria-labelledby="newsletter" className="border-t border-ivory-200 bg-ivory-100">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <p className="eyebrow">The first look</p>
        <h2 id="newsletter" className="mt-2 text-4xl sm:text-5xl">New stones, before anyone else</h2>
        <p className="mx-auto mt-4 max-w-lg text-muted">
          One-of-a-kind gems sell quickly. Join the list and we will write when new stones arrive from the mountains. No spam, unsubscribe any time.
        </p>

        {state.status === 'done' ? (
          <p role="status" className="mx-auto mt-10 inline-flex items-center gap-3 border border-emerald-900/20 bg-white px-6 py-4 text-emerald-900">
            <CheckIcon className="h-5 w-5" strokeWidth={2} /> {state.message}
          </p>
        ) : (
          <form onSubmit={submit} className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row" noValidate>
            <label htmlFor="newsletter-email" className="sr-only">Email address</label>
            <input
              id="newsletter-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              aria-invalid={state.status === 'error' || undefined}
              aria-describedby={state.status === 'error' ? 'newsletter-error' : undefined}
              className="min-w-0 flex-1 border border-ivory-200 bg-white px-4 py-3 text-sm focus:border-emerald-700 focus:outline-none"
            />
            <button type="submit" className="btn-primary" disabled={state.status === 'sending' || !email}>
              {state.status === 'sending' ? 'Joining…' : 'Join the list'}
            </button>
          </form>
        )}
        {state.status === 'error' && <p id="newsletter-error" role="alert" className="mt-3 text-sm text-red-700">{state.message}</p>}
      </div>
    </section>
  )
}
