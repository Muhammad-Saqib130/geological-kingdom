import { Component } from 'react'

// After a new deploy, a tab opened earlier may ask for code files that no longer exist
const isStaleBundle = (error) => /dynamically imported module|Importing a module script failed|error loading dynamically imported/i.test(error?.message ?? '')
const RELOADED = 'gk-reloaded-for-update'

// Catches rendering errors so one broken page shows a friendly message instead of a blank screen.
// App passes the current path as resetKey, so navigating elsewhere clears the error.
export default class ErrorBoundary extends Component {
  state = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error) {
    return { error }
  }

  // A new page (resetKey changed) starts without the previous page's error
  static getDerivedStateFromProps(props, state) {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null
  }

  componentDidCatch(error) {
    console.error(error)
    if (isStaleBundle(error)) {
      try {
        // Reload once to fetch the new version; never loop
        if (!sessionStorage.getItem(RELOADED)) {
          sessionStorage.setItem(RELOADED, '1')
          window.location.reload()
        }
      } catch {
        // storage unavailable: show the message instead
      }
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    const stale = isStaleBundle(this.state.error)
    return (
      <section className="mx-auto max-w-xl px-4 py-24 text-center" role="alert">
        <title>Something went wrong · Geological Kingdom</title>
        <meta name="robots" content="noindex" />
        <p className="eyebrow">{stale ? 'Update available' : 'Error'}</p>
        <h1 className="mt-3 text-4xl">{stale ? 'The shop has just been updated' : 'Something went wrong'}</h1>
        <p className="mt-4 text-muted">
          {stale ? 'Please reload the page to continue.' : 'Sorry, this page could not be shown. Reloading usually fixes it. If it keeps happening, please contact us.'}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>Reload the page</button>
          {/* A plain link (not the router) so the app restarts cleanly */}
          <a href="/" className="btn-outline">Go to the home page</a>
        </div>
      </section>
    )
  }
}
