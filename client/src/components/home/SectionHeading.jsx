import { Link } from 'react-router-dom'
import { ArrowRight } from '../icons.jsx'

// Centred title with a spaced subtitle, as used across the home page.
export default function SectionHeading({ title, subtitle, id, action, className = 'mb-12' }) {
  return (
    <div className={className}>
      <h2 id={id} className="section-title">{title}</h2>
      {subtitle && <p className="section-subtitle">{subtitle}</p>}
      <span className="mx-auto mt-5 block h-px w-14 bg-gold-500" aria-hidden="true" />
      {action && (
        <p className="mt-4 text-center">
          <Link to={action.to} className="group inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-gold-600 hover:text-emerald-900">
            {action.label} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </p>
      )}
    </div>
  )
}
