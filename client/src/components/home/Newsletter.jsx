import { useState } from 'react'
import { api } from '../../lib/api.js'
import { CheckIcon } from '../icons.jsx'

// Slim band: heading on the left, inline email field on the right.
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
    <section aria-labelledby="newsletter" className="bg-mist">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-12 sm:px-6 lg:flex-row lg:justify-between">
        <div className="text-center lg:text-left">
          <h2 id="newsletter" className="font-serif text-2xl uppercase tracking-[0.14em] text-emerald-900 sm:text-3xl">Get new stones first</h2>
          <p className="mt-1 text-sm text-muted">One-of-a-kind gems sell quickly. We write only when new stones arrive.</p>
        </div>

        {state.status === 'done' ? (
          <p role="status" className="inline-flex items-center gap-2 text-sm text-emerald-900">
            <CheckIcon className="h-5 w-5" strokeWidth={2} /> {state.message}
          </p>
        ) : (
          <div className="w-full max-w-md">
            <form onSubmit={submit} className="flex rounded-full border border-ivory-200 bg-white p-1 focus-within:border-emerald-700" noValidate>
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                aria-invalid={state.status === 'error' || undefined}
                aria-describedby={state.status === 'error' ? 'newsletter-error' : undefined}
                className="min-w-0 flex-1 rounded-full bg-transparent px-4 text-sm focus:outline-none"
              />
              <button type="submit" className="btn-sm btn-primary py-2.5!" disabled={state.status === 'sending'}>
                {state.status === 'sending' ? 'Joining…' : 'Subscribe'}
              </button>
            </form>
            {state.status === 'error' && <p id="newsletter-error" role="alert" className="mt-2 px-4 text-sm text-red-700">{state.message}</p>}
          </div>
        )}
      </div>
    </section>
  )
}
