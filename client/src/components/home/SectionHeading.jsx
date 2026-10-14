import { Link } from 'react-router-dom'
import { ArrowRight } from '../icons.jsx'

export default function SectionHeading({ eyebrow, title, action, align = 'left', id }) {
  return (
    <div className={`mb-10 flex gap-4 ${align === 'center' ? 'flex-col items-center text-center' : 'flex-wrap items-end justify-between'}`}>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 id={id} className="mt-2 text-4xl sm:text-5xl">{title}</h2>
      </div>
      {action && (
        <Link to={action.to} className="group inline-flex items-center gap-2 text-[13px] uppercase tracking-[0.16em] text-emerald-900 hover:text-gold-600">
          {action.label}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  )
}
