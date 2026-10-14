import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center">
      <title>Page not found · Geological Kingdom</title>
      <meta name="robots" content="noindex" />
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-4xl">This stone could not be found</h1>
      <p className="mt-4 text-muted">The page you are looking for may have moved or no longer exists.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/shop" className="btn-primary">Browse the collection</Link>
        <Link to="/" className="btn-outline">Home page</Link>
      </div>
    </section>
  )
}
