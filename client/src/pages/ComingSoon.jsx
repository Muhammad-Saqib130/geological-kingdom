import { Link } from 'react-router-dom'

export default function ComingSoon({ eyebrow, title, body }) {
  return (
    <section className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">{title}</h1>
      <p className="mt-4 text-muted">{body}</p>
      <Link to="/shop" className="btn-outline mt-8">Browse the collection</Link>
    </section>
  )
}
