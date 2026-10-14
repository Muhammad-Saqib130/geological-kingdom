import { Link } from 'react-router-dom'

export default function Logo({ light = false }) {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Geological Kingdom — home">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
        <path fill={light ? '#fbf9f4' : '#0b3d2e'} d="M8 4h16l6 8-14 17L2 12z" />
        <path fill="#c9a24b" d="M8 4l4 8h8l4-8zM2 12h28L16 29z" opacity=".6" />
      </svg>
      <span className={`whitespace-nowrap font-serif text-lg leading-none tracking-wide sm:text-xl ${light ? 'text-ivory-50' : 'text-emerald-900'}`}>
        Geological <span className="italic text-gold-500">Kingdom</span>
      </span>
    </Link>
  )
}
